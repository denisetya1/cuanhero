import { sendDeploymentReadyEmail } from "@/lib/email";
import { getAdminSession } from "@/lib/admin-session";
import prisma from "@/lib/prisma";
import {
  buildErrorResponse,
  buildResponse,
  notAuthorizeResponse,
} from "@/lib/response";
import { NextRequest } from "next/server";
import { sanitizeMemberRedirect } from "@/lib/member-redirect";

export const dynamic = "force-dynamic";

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) => {
  const session = await getAdminSession();
  if (!session) return notAuthorizeResponse();

  const { userId } = await params;
  const body = await req.json();
  const accountId = Number(body.accountId);

  if (!Number.isInteger(accountId) || accountId <= 0) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "A valid trading account is required.",
      [],
    );
  }

  const account = await prisma.tradingAccount.findFirst({
    where: { id: accountId, userId },
    select: {
      accountId: true,
      status: true,
      eaStatus: true,
      expertAdvisor: { select: { name: true } },
      user: {
        select: { email: true, name: true, status: true },
      },
    },
  });

  if (!account) {
    return buildErrorResponse(
      "TRADING_ACCOUNT_NOT_FOUND",
      "Trading account not found.",
      [],
      404,
    );
  }

  if (account.status !== 1 || account.eaStatus !== 1) {
    return buildErrorResponse(
      "ROBOT_NOT_READY",
      "The trading account and robot must be active before notifying the user.",
      [],
      409,
    );
  }

  if (account.user.status !== 1) {
    return buildErrorResponse(
      "USER_INACTIVE",
      "The user is inactive and cannot access the member dashboard.",
      [],
      409,
    );
  }

  const baseUrl = (
    process.env.BETTER_AUTH_URL || "https://cuanhero.com"
  ).replace(/\/$/, "");
  const memberPath = sanitizeMemberRedirect(
    `/member/home?account=${encodeURIComponent(account.accountId)}`,
  );
  const memberUrl = `${baseUrl}/member/login?ref=${encodeURIComponent(memberPath)}`;

  try {
    await sendDeploymentReadyEmail({
      accountId: account.accountId,
      expertAdvisorName: account.expertAdvisor.name,
      memberUrl,
      name: account.user.name,
      to: account.user.email,
    });

    return buildResponse({
      accountId: account.accountId,
      email: account.user.email,
      sent: true,
    });
  } catch (error) {
    console.error("SEND_DEPLOYMENT_READY_EMAIL_ERROR:", error);
    return buildErrorResponse(
      "EMAIL_SEND_FAILED",
      error instanceof Error
        ? error.message
        : "Failed to send the deployment notification email.",
      [],
      502,
    );
  }
};
