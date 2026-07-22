import { auth } from "@/lib/auth";
import {
  markOrderPaid,
  OrderNotFoundError,
} from "@/lib/order-payment";
import prisma from "@/lib/prisma";
import {
  buildErrorResponse,
  buildResponse,
  notAuthorizeResponse,
} from "@/lib/response";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

export const POST = async (
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return notAuthorizeResponse();

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (admin?.role !== "SUPER_ADMIN") {
    return buildErrorResponse(
      "SUPER_ADMIN_ONLY",
      "Only super admin can manually mark an order as paid.",
      [],
      403,
    );
  }

  const { orderId } = await params;
  const id = Number(orderId);

  if (!Number.isInteger(id) || id <= 0) {
    return buildErrorResponse("INVALID_ORDER_ID", "Invalid order ID.", []);
  }

  try {
    const paidAt = new Date();
    const result = await markOrderPaid({
      orderId: id,
      paidAt,
      actor: `manual-paid:${session.user.id}`,
      paymentProvider: "MANUAL",
      paymentMethod: "MANUAL_ADMIN",
      paymentChannel: "ADMIN_DASHBOARD",
      providerMessage: "Manually marked as paid by super admin",
    });

    return buildResponse({
      orderId: id,
      paidAt,
      alreadyPaid: result.alreadyPaid,
    });
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return buildErrorResponse(
        "ORDER_NOT_FOUND",
        "Order not found.",
        [],
        404,
      );
    }

    console.error("MANUAL_MARK_ORDER_PAID_ERROR:", error);
    return buildErrorResponse(
      "MANUAL_PAYMENT_FAILED",
      "Failed to manually mark the order as paid.",
      [],
      500,
    );
  }
};
