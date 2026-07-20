import { verifyIpaymuCallbackSignature } from "@/lib/ipaymu";
import prisma from "@/lib/prisma";
import { buildErrorResponse, buildResponse } from "@/lib/response";
import { NextRequest } from "next/server";

const parseCallback = async (request: NextRequest) => {
  const rawBody = await request.text();
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";

  if (contentType.includes("application/json")) {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid JSON callback payload.");
    }
    return parsed as Record<string, unknown>;
  }

  return Object.fromEntries(new URLSearchParams(rawBody).entries());
};

const stringValue = (value: unknown) =>
  value === undefined || value === null ? "" : String(value).trim();

const parsePaidAt = (value: unknown) => {
  const raw = stringValue(value);
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const getOrderStatus = (payload: Record<string, unknown>) => {
  const status = stringValue(payload.status).toLowerCase();
  const statusCode = Number(payload.status_code);

  if (status === "berhasil" || status === "success" || statusCode === 1) {
    return "PAID";
  }
  if (status === "expired" || statusCode === -2) return "EXPIRED";
  if (status === "cancelled" || status === "canceled") return "CANCELLED";
  if (status === "pending" || statusCode === 0) return "PENDING";
  return "FAILED";
};

const startOfUtcDay = (value = new Date()) =>
  new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );

const calculateSubscriptionEndDate = ({
  currentEndDate,
  currentRecurringType,
  currentPackageCode,
  nextRecurringType,
}: {
  currentEndDate: Date | null;
  currentRecurringType: string;
  currentPackageCode: string | null;
  nextRecurringType: string;
}) => {
  const normalizedNextType = nextRecurringType.trim().toLowerCase();
  if (normalizedNextType === "lifetime") return null;

  const durationMatch = normalizedNextType.match(/^(\d+)\s*d$/);
  const durationDays = durationMatch
    ? Math.max(1, Number(durationMatch[1]))
    : normalizedNextType.includes("year")
      ? 365
      : 30;
  const today = startOfUtcDay();
  const upgradingFromTrial =
    currentPackageCode?.trim().toUpperCase() === "FREE_TRIAL" ||
    currentRecurringType.trim().toLowerCase() === "24h";
  const current = currentEndDate ? startOfUtcDay(currentEndDate) : null;
  const base =
    !upgradingFromTrial && current && current.getTime() > today.getTime()
      ? current
      : today;

  base.setUTCDate(base.getUTCDate() + durationDays);
  return base;
};

export const POST = async (request: NextRequest) => {
  let payload: Record<string, unknown>;

  try {
    payload = await parseCallback(request);
  } catch (error) {
    return buildErrorResponse(
      "INVALID_CALLBACK",
      error instanceof Error ? error.message : "Callback payload tidak valid.",
      [],
    );
  }

  const signature = request.headers.get("x-signature");
  if (!verifyIpaymuCallbackSignature(payload, signature)) {
    return buildErrorResponse(
      "INVALID_SIGNATURE",
      "Signature callback iPaymu tidak valid.",
      [],
      401,
    );
  }

  const orderNumber =
    stringValue(payload.reference_id) || stringValue(payload.referenceId);
  if (!orderNumber) {
    return buildErrorResponse(
      "MISSING_REFERENCE_ID",
      "Reference ID tidak ditemukan.",
      [],
    );
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      amount: true,
      fee: true,
      status: true,
      tradingAccountId: true,
    },
  });

  if (!order) {
    return buildErrorResponse("ORDER_NOT_FOUND", "Order tidak ditemukan.", [], 404);
  }

  const nextStatus = getOrderStatus(payload);
  const callbackAmount = Number(payload.amount ?? payload.total);
  const expectedAmount = Number(order.amount);
  const expectedTotal = expectedAmount + Number(order.fee || 0);
  if (
    nextStatus === "PAID" &&
    Number.isFinite(callbackAmount) &&
    callbackAmount !== expectedAmount &&
    callbackAmount !== expectedTotal
  ) {
    return buildErrorResponse(
      "AMOUNT_MISMATCH",
      "Nominal callback tidak sesuai dengan order.",
      [],
    );
  }

  // Callback bisa dikirim ulang oleh iPaymu. Order PAID tidak boleh diturunkan
  // kembali menjadi PENDING/FAILED oleh callback yang datang terlambat.
  if (order.status !== "PAID") {
    const paidAt = parsePaidAt(payload.paid_at) || new Date();
    const callbackData = {
      status: nextStatus,
      providerTransactionId:
        stringValue(payload.trx_id) || stringValue(payload.transaction_id) || null,
      paymentMethod: stringValue(payload.via) || null,
      paymentChannel: stringValue(payload.channel) || null,
      paidAt: nextStatus === "PAID" ? paidAt : undefined,
      providerMessage: stringValue(payload.status) || nextStatus,
    };

    if (nextStatus === "PAID" && order.tradingAccountId) {
      await prisma.$transaction(async (transaction) => {
        // Claim the payment once. Duplicate callbacks must never extend the
        // same subscription more than once.
        const claimed = await transaction.order.updateMany({
          where: { id: order.id, status: { not: "PAID" } },
          data: callbackData,
        });
        if (claimed.count === 0) return;

        const paidOrder = await transaction.order.findUnique({
          where: { id: order.id },
          select: {
            orderNumber: true,
            amount: true,
            packageId: true,
            tradingAccountId: true,
            paymentMethod: true,
            package: {
              select: { code: true, recurringType: true },
            },
          },
        });
        if (!paidOrder?.tradingAccountId) return;

        const account = await transaction.tradingAccount.findUnique({
          where: { id: paidOrder.tradingAccountId },
          select: {
            id: true,
            packageId: true,
            endDate: true,
            package: { select: { code: true, recurringType: true } },
          },
        });
        if (!account) {
          throw new Error("Upgrade trading account no longer exists.");
        }

        const newEndDate = calculateSubscriptionEndDate({
          currentEndDate: account.endDate,
          currentRecurringType: account.package.recurringType,
          currentPackageCode: account.package.code,
          nextRecurringType: paidOrder.package.recurringType,
        });
        const paymentType =
          account.packageId === paidOrder.packageId ? "RENEWAL" : "UPGRADE";

        await transaction.tradingAccount.update({
          where: { id: account.id },
          data: {
            packageId: paidOrder.packageId,
            recurringPrice: paidOrder.amount,
            endDate: newEndDate,
            status: 1,
            updatedBy: "ipaymu-callback",
          },
        });

        await transaction.paymentRecord.create({
          data: {
            tradingAccountId: account.id,
            packageId: paidOrder.packageId,
            amount: paidOrder.amount,
            currency: "IDR",
            paymentMethod: paidOrder.paymentMethod || "QRIS",
            type: paymentType,
            status: "APPROVED",
            previousEndDate: account.endDate,
            newEndDate,
            paidAt,
            approvedAt: paidAt,
            note: `${paymentType} via order ${paidOrder.orderNumber}`,
            createdBy: "ipaymu-callback",
            updatedBy: "ipaymu-callback",
          },
        });
      });
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: callbackData,
      });
    }
  }

  return buildResponse({ received: true, orderNumber, status: nextStatus });
};
