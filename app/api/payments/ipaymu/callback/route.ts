import { verifyIpaymuCallbackSignature } from "@/lib/ipaymu";
import { markOrderPaid } from "@/lib/order-payment";
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

    if (nextStatus === "PAID") {
      await markOrderPaid({
        orderId: order.id,
        paidAt,
        actor: "ipaymu-callback",
        paymentMethod: callbackData.paymentMethod,
        paymentChannel: callbackData.paymentChannel,
        providerTransactionId: callbackData.providerTransactionId,
        providerMessage: callbackData.providerMessage,
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
