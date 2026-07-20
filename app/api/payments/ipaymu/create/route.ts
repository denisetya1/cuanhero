import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { verifyExnessPartnerAccount } from "@/lib/exness-partner";
import { IB_VERIFICATION_PACKAGE_CODES } from "@/lib/ib-verification";
import { createIpaymuDirectPayment } from "@/lib/ipaymu";
import prisma from "@/lib/prisma";
import {
  buildErrorResponse,
  buildResponse,
  notAuthorizeResponse,
} from "@/lib/response";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

const getAppUrl = () =>
  (process.env.BETTER_AUTH_URL || "https://cuanhero.com").replace(/\/$/, "");

const createOrderNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `CH-${date}-${suffix}`;
};

const parseExpiration = (value: string) => {
  if (!value) return undefined;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export const POST = async (request: NextRequest) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return notAuthorizeResponse();

  let input: {
    expertAdvisorId?: unknown;
    packageId?: unknown;
    paymentMethod?: unknown;
    phone?: unknown;
    tradingAccountId?: unknown;
    termsAccepted?: unknown;
  };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return buildErrorResponse("INVALID_JSON", "Payload tidak valid.", []);
  }

  const expertAdvisorId = Number(input.expertAdvisorId);
  const packageId = Number(input.packageId);
  const paymentMethod = String(input.paymentMethod || "").toLowerCase();
  const hasTradingAccount =
    input.tradingAccountId !== undefined &&
    input.tradingAccountId !== null &&
    String(input.tradingAccountId).trim() !== "";
  const tradingAccountId = Number(input.tradingAccountId);

  if (input.termsAccepted !== true) {
    return buildErrorResponse(
      "TERMS_NOT_ACCEPTED",
      "Anda harus menyetujui Syarat dan Ketentuan sebelum melanjutkan.",
      [],
    );
  }

  if (
    !Number.isInteger(expertAdvisorId) ||
    !Number.isInteger(packageId) ||
    !["qris", "free"].includes(paymentMethod) ||
    (hasTradingAccount &&
      (!Number.isInteger(tradingAccountId) || tradingAccountId <= 0))
  ) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Expert Advisor, package, dan metode QRIS wajib dipilih.",
      [],
    );
  }

  const [user, expertAdvisor, packageItem, upgradeAccount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, phoneNumber: true, status: true },
    }),
    prisma.expertAdvisor.findFirst({
      where: { id: expertAdvisorId, isActive: true },
      select: { id: true, name: true },
    }),
    prisma.package.findUnique({
      where: { id: packageId },
      select: {
        id: true,
        code: true,
        name: true,
        price: true,
        discountPercent: true,
      },
    }),
    hasTradingAccount
      ? prisma.tradingAccount.findFirst({
          where: {
            id: tradingAccountId,
            userId: session.user.id,
            status: { not: 4 },
          },
          select: {
            id: true,
            accountId: true,
            expertAdvisorId: true,
            packageId: true,
            package: { select: { code: true } },
          },
        })
      : Promise.resolve(null),
  ]);

  if (!user || user.status !== 1) {
    return buildErrorResponse(
      "USER_INACTIVE",
      "Akun belum aktif atau tidak ditemukan.",
      [],
      403,
    );
  }

  if (!expertAdvisor || !packageItem) {
    return buildErrorResponse(
      "ORDER_ITEM_NOT_FOUND",
      "Expert Advisor atau package tidak ditemukan.",
      [],
      404,
    );
  }

  if (
    hasTradingAccount &&
    (!upgradeAccount ||
      upgradeAccount.expertAdvisorId !== expertAdvisor.id ||
      packageItem.code?.trim().toUpperCase() === "FREE_TRIAL")
  ) {
    return buildErrorResponse(
      "INVALID_UPGRADE_ACCOUNT",
      "Trading account upgrade tidak valid atau bukan milik Anda.",
      [],
      403,
    );
  }

  const packageCode = packageItem.code?.trim().toUpperCase() || "";

  // IB membership can change after initial activation. Re-check the existing
  // MT5 account before creating every renewal/upgrade payment for an IB plan.
  if (
    upgradeAccount &&
    IB_VERIFICATION_PACKAGE_CODES.has(packageCode)
  ) {
    try {
      const verification = await verifyExnessPartnerAccount(
        upgradeAccount.accountId,
      );

      if (!verification.verified) {
        return buildErrorResponse(
          "IB_ACCOUNT_NOT_VERIFIED",
          "Trading account ini sudah tidak terdaftar di bawah Exness IB CuanHero. Hubungi admin sebelum melakukan renewal atau upgrade.",
          [],
          422,
        );
      }
    } catch (error) {
      console.error("VERIFY_RENEWAL_EXNESS_IB_ERROR:", error);
      return buildErrorResponse(
        "IB_VERIFICATION_UNAVAILABLE",
        error instanceof Error
          ? error.message
          : "Verifikasi IB sedang tidak tersedia. Silakan coba kembali.",
        [],
        502,
      );
    }
  }

  const basePrice = Number(packageItem.price);
  const baseAmount = Math.round(basePrice);
  const discount = Math.max(0, packageItem.discountPercent || 0);
  const isFreeTrialUpgrade =
    upgradeAccount?.package.code?.trim().toUpperCase() === "FREE_TRIAL";
  // Discount is only for acquisition. Existing paid accounts renew at the
  // regular price, while an upgrade from Free Trial stays eligible.
  const applyIntroDiscount = !upgradeAccount || isFreeTrialUpgrade;
  const amount = Math.round(
    applyIntroDiscount
      ? basePrice - (basePrice * discount) / 100
      : basePrice,
  );
  const appliedDiscountPercent = applyIntroDiscount ? discount : 0;
  const discountAmount = Math.max(0, baseAmount - amount);
  const orderType = !upgradeAccount
    ? "NEW"
    : upgradeAccount.packageId === packageItem.id && !isFreeTrialUpgrade
      ? "RENEWAL"
      : "UPGRADE";

  if (
    !Number.isFinite(baseAmount) ||
    baseAmount < 0 ||
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return buildErrorResponse(
      "INVALID_ORDER_AMOUNT",
      "Nominal order tidak valid.",
      [],
    );
  }

  const orderNumber = createOrderNumber();
  const appUrl = getAppUrl();

  if (amount === 0) {
    if (paymentMethod !== "free" || upgradeAccount) {
      return buildErrorResponse(
        "INVALID_FREE_ORDER",
        "Aktivasi gratis hanya tersedia untuk order baru dengan package gratis.",
        [],
      );
    }

    const isFreeTrial =
      packageItem.code?.trim().toUpperCase() === "FREE_TRIAL";
    const activated = await prisma.$transaction(async (transaction) => {
      if (isFreeTrial) {
        const [claim, previousTrialOrder, previousTrialAccount] =
          await Promise.all([
            transaction.user.findUnique({
              where: { id: user.id },
              select: { freeTrialClaimedAt: true },
            }),
            transaction.order.findFirst({
              where: {
                userId: user.id,
                status: "PAID",
                package: { code: "FREE_TRIAL" },
              },
              select: { id: true },
            }),
            transaction.tradingAccount.findFirst({
              where: {
                userId: user.id,
                package: { code: "FREE_TRIAL" },
              },
              select: { id: true },
            }),
          ]);

        if (claim?.freeTrialClaimedAt || previousTrialOrder || previousTrialAccount) {
          if (!claim?.freeTrialClaimedAt) {
            await transaction.user.update({
              where: { id: user.id },
              data: { freeTrialClaimedAt: new Date() },
            });
          }
          return false;
        }

        // Atomic claim prevents two simultaneous requests from activating two
        // Free Trial orders for the same member.
        const claimed = await transaction.user.updateMany({
          where: { id: user.id, freeTrialClaimedAt: null },
          data: { freeTrialClaimedAt: new Date() },
        });
        if (claimed.count !== 1) return false;
      }

      await transaction.order.create({
        data: {
          orderNumber,
          userId: user.id,
          expertAdvisorId: expertAdvisor.id,
          packageId: packageItem.id,
          baseAmount,
          discountPercent: appliedDiscountPercent,
          discountAmount,
          amount: 0,
          type: "NEW",
          status: "PAID",
          termsAcceptedAt: new Date(),
          paymentProvider: "FREE",
          paymentMethod: "FREE",
          providerMessage: "Free package activated",
          paidAt: new Date(),
        },
      });
      return true;
    });

    if (!activated) {
      return buildErrorResponse(
        "FREE_TRIAL_ALREADY_CLAIMED",
        "Free Trial hanya dapat digunakan satu kali untuk setiap akun member.",
        [],
        409,
      );
    }

    return buildResponse({
      orderNumber,
      statusUrl: `/order/payment?order=${encodeURIComponent(orderNumber)}`,
    });
  }

  if (paymentMethod !== "qris") {
    return buildErrorResponse(
      "PAYMENT_REQUIRED",
      "Package berbayar wajib dibayar melalui QRIS.",
      [],
    );
  }

  const phone = String(input.phone || user.phoneNumber || "").replace(/\D/g, "");
  if (phone.length < 9 || phone.length > 16) {
    return buildErrorResponse(
      "INVALID_PHONE_NUMBER",
      "Nomor WhatsApp/telepon wajib diisi untuk pembayaran iPaymu.",
      [],
    );
  }

  if (phone !== user.phoneNumber) {
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneNumber: phone },
    });
  }

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: user.id,
      expertAdvisorId: expertAdvisor.id,
      packageId: packageItem.id,
      tradingAccountId: upgradeAccount?.id || null,
      baseAmount,
      discountPercent: appliedDiscountPercent,
      discountAmount,
      amount,
      type: orderType,
      termsAcceptedAt: new Date(),
    },
    select: { id: true },
  });

  try {
    const payment = await createIpaymuDirectPayment({
      name: user.name,
      phone,
      email: user.email,
      amount,
      product: [
        upgradeAccount
          ? `${orderType === "RENEWAL" ? "Renewal" : "Upgrade"} ${upgradeAccount.accountId} - ${packageItem.name}`
          : `${expertAdvisor.name} - ${packageItem.name}`,
      ],
      qty: ["1"],
      price: [String(amount)],
      notifyUrl: `${appUrl}/api/payments/ipaymu/callback`,
      referenceId: orderNumber,
      paymentMethod: "qris",
      // Merchant absorbs the gateway fee so the buyer pays the package price.
      feeDirection: "MERCHANT",
      expired: 1,
      expiredType: "hours",
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        providerSessionId: payment.sessionId,
        providerTransactionId: payment.transactionId || null,
        paymentMethod: payment.via,
        paymentChannel: payment.channel,
        paymentNumber: payment.paymentNumber,
        paymentName: payment.paymentName || null,
        fee: Number.isFinite(payment.fee) ? payment.fee : null,
        expiresAt: parseExpiration(payment.expired),
        providerMessage: payment.message,
      },
    });

    return buildResponse({
      orderNumber,
      statusUrl: `/order/payment?order=${encodeURIComponent(orderNumber)}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal membuat pembayaran iPaymu.";

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED", providerMessage: message },
    });

    console.error("IPAYMU_CREATE_PAYMENT_ERROR:", error);
    return buildErrorResponse("IPAYMU_PAYMENT_FAILED", message, [], 502);
  }
};
