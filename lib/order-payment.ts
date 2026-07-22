import prisma from "@/lib/prisma";

export class OrderNotFoundError extends Error {
  constructor() {
    super("Order not found.");
    this.name = "OrderNotFoundError";
  }
}

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

type MarkOrderPaidInput = {
  orderId: number;
  paidAt: Date;
  actor: string;
  paymentProvider?: string;
  paymentMethod?: string | null;
  paymentChannel?: string | null;
  providerTransactionId?: string | null;
  providerMessage?: string | null;
};

export const markOrderPaid = async ({
  orderId,
  paidAt,
  actor,
  paymentProvider,
  paymentMethod,
  paymentChannel,
  providerTransactionId,
  providerMessage,
}: MarkOrderPaidInput) =>
  prisma.$transaction(async (transaction) => {
    const existingOrder = await transaction.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (!existingOrder) throw new OrderNotFoundError();
    if (existingOrder.status === "PAID") {
      return { alreadyPaid: true };
    }

    // Claim exactly once so callback retries and manual actions cannot extend
    // the same subscription more than once.
    const claimed = await transaction.order.updateMany({
      where: { id: orderId, status: { not: "PAID" } },
      data: {
        status: "PAID",
        paidAt,
        ...(paymentProvider !== undefined && { paymentProvider }),
        ...(paymentMethod !== undefined && { paymentMethod }),
        ...(paymentChannel !== undefined && { paymentChannel }),
        ...(providerTransactionId !== undefined && {
          providerTransactionId,
        }),
        ...(providerMessage !== undefined && { providerMessage }),
      },
    });

    if (claimed.count === 0) return { alreadyPaid: true };

    const paidOrder = await transaction.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true,
        amount: true,
        currency: true,
        packageId: true,
        tradingAccountId: true,
        paymentMethod: true,
        package: {
          select: { code: true, recurringType: true },
        },
      },
    });

    if (!paidOrder?.tradingAccountId) {
      return { alreadyPaid: false };
    }

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
        updatedBy: actor,
      },
    });

    await transaction.paymentRecord.create({
      data: {
        tradingAccountId: account.id,
        packageId: paidOrder.packageId,
        amount: paidOrder.amount,
        currency: paidOrder.currency,
        paymentMethod: paidOrder.paymentMethod || "QRIS",
        type: paymentType,
        status: "APPROVED",
        previousEndDate: account.endDate,
        newEndDate,
        paidAt,
        approvedAt: paidAt,
        note: `${paymentType} via order ${paidOrder.orderNumber}`,
        createdBy: actor,
        updatedBy: actor,
      },
    });

    return { alreadyPaid: false };
  });
