import { auth } from "@/lib/auth";
import { enqueueDeploymentJob } from "@/lib/deployment-queue";
import { encryptText } from "@/lib/encryption";
import { verifyExnessPartnerAccount } from "@/lib/exness-partner";
import { IB_VERIFICATION_PACKAGE_CODES } from "@/lib/ib-verification";
import prisma from "@/lib/prisma";
import {
  buildErrorResponse,
  buildResponse,
  notAuthorizeResponse,
} from "@/lib/response";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> },
) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return notAuthorizeResponse();

  let input: {
    accountId?: unknown;
    password?: unknown;
    accountServer?: unknown;
  };

  try {
    input = (await request.json()) as typeof input;
  } catch {
    return buildErrorResponse("INVALID_JSON", "Invalid request payload.", []);
  }

  const accountId = String(input.accountId || "").trim();
  const password = String(input.password || "");
  const accountServer = String(input.accountServer || "").trim();

  if (!/^\d{5,20}$/.test(accountId)) {
    return buildErrorResponse(
      "INVALID_ACCOUNT_ID",
      "MT5 Account ID must contain 5–20 digits.",
      [],
    );
  }

  if (!password || password.length > 255) {
    return buildErrorResponse(
      "INVALID_PASSWORD",
      "MT5 password is required and must not exceed 255 characters.",
      [],
    );
  }

  if (!accountServer || accountServer.length > 100) {
    return buildErrorResponse(
      "INVALID_ACCOUNT_SERVER",
      "Broker server is required and must not exceed 100 characters.",
      [],
    );
  }

  const { orderNumber } = await params;
  const order = await prisma.order.findFirst({
    where: {
      orderNumber,
      userId: session.user.id,
    },
    select: {
      id: true,
      status: true,
      tradingAccountId: true,
      package: { select: { code: true } },
      setupRequest: { select: { id: true } },
    },
  });

  if (!order) {
    return buildErrorResponse("ORDER_NOT_FOUND", "Order not found.", [], 404);
  }

  if (order.status !== "PAID") {
    return buildErrorResponse(
      "ORDER_NOT_PAID",
      "Trading account setup is only available for paid orders.",
      [],
      403,
    );
  }

  if (order.tradingAccountId) {
    return buildErrorResponse(
      "UPGRADE_ORDER_DOES_NOT_REQUIRE_SETUP",
      "This upgrade order is already linked to an existing trading account.",
      [],
      409,
    );
  }

  if (order.setupRequest) {
    return buildErrorResponse(
      "SETUP_ALREADY_REQUESTED",
      "A setup request already exists for this order.",
      [],
      409,
    );
  }

  const [existingTradingAccount, existingSetupRequest] = await Promise.all([
    prisma.tradingAccount.findUnique({
      where: { accountId },
      select: { id: true },
    }),
    prisma.tradingAccountSetupRequest.findUnique({
      where: { accountId },
      select: { id: true },
    }),
  ]);

  if (existingTradingAccount || existingSetupRequest) {
    return buildErrorResponse(
      "ACCOUNT_ALREADY_EXISTS",
      "This MT5 Account ID is already registered or awaiting setup.",
      [],
      409,
    );
  }

  const packageCode = order.package.code?.trim().toUpperCase() || "";

  if (IB_VERIFICATION_PACKAGE_CODES.has(packageCode)) {
    try {
      const verification = await verifyExnessPartnerAccount(accountId);

      if (!verification.verified) {
        return buildErrorResponse(
          "IB_ACCOUNT_NOT_VERIFIED",
          "This trading account is not registered under the configured Exness IB.",
          [],
          422,
        );
      }
    } catch (error) {
      console.error("VERIFY_SETUP_REQUEST_EXNESS_IB_ERROR:", error);
      return buildErrorResponse(
        "IB_VERIFICATION_UNAVAILABLE",
        error instanceof Error
          ? error.message
          : "IB verification is temporarily unavailable.",
        [],
        502,
      );
    }
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const setupRequest = await transaction.tradingAccountSetupRequest.create({
        data: {
          orderId: order.id,
          accountId,
          accountPassword: encryptText(password),
          accountServer,
          status: "QUEUED",
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      });

      const deploymentJob = await transaction.deploymentJob.create({
        data: {
          setupRequestId: setupRequest.id,
        },
        select: {
          id: true,
          status: true,
        },
      });

      return { setupRequest, deploymentJob };
    });

    // The database is the durable source of truth. If Redis is temporarily
    // unavailable, the Python worker's outbox reconciliation will enqueue it.
    try {
      await enqueueDeploymentJob(result.deploymentJob.id);
    } catch (queueError) {
      console.error("ENQUEUE_DEPLOYMENT_JOB_ERROR:", queueError);
    }

    return buildResponse({
      ...result.setupRequest,
      deploymentJobId: result.deploymentJob.id,
      deploymentStatus: result.deploymentJob.status,
    });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";

    if (code === "P2002") {
      return buildErrorResponse(
        "SETUP_REQUEST_CONFLICT",
        "This order or MT5 Account ID already has a setup request.",
        [],
        409,
      );
    }

    console.error("CREATE_TRADING_ACCOUNT_SETUP_REQUEST_ERROR:", error);
    return buildErrorResponse(
      "SETUP_REQUEST_FAILED",
      "Failed to submit trading account setup request.",
      [],
      500,
    );
  }
};
