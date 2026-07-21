import { auth } from "@/lib/auth";
import {
  getPySyncBaseUrl,
  getPySyncServerAddress,
  PYSYNC_API_KEY,
} from "@/lib/pysync";
import prisma from "@/lib/prisma";
import {
  buildErrorResponse,
  notAuthorizeResponse,
} from "@/lib/response";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return notAuthorizeResponse();

  const { accountId } = await params;
  const tradingAccountId = Number(accountId);
  if (!Number.isInteger(tradingAccountId) || tradingAccountId <= 0) {
    return buildErrorResponse(
      "INVALID_TRADING_ACCOUNT_ID",
      "Invalid trading account ID.",
      [],
      400,
    );
  }

  const tradingAccount = await prisma.tradingAccount.findFirst({
    where: {
      id: tradingAccountId,
      userId: session.user.id,
    },
    select: {
      accountId: true,
      server: {
        select: {
          domain: true,
          ipAddress: true,
        },
      },
    },
  });

  if (!tradingAccount) {
    return buildErrorResponse(
      "TRADING_ACCOUNT_NOT_FOUND",
      "Trading account not found.",
      [],
      404,
    );
  }

  if (!tradingAccount.server?.ipAddress) {
    return buildErrorResponse(
      "PYSYNC_SERVER_NOT_CONFIGURED",
      "The pySync server has not been configured for this account.",
      [],
      409,
    );
  }

  const screenshotUrl = `${getPySyncBaseUrl(
    getPySyncServerAddress(tradingAccount.server),
  )}/api/deploy/${encodeURIComponent(tradingAccount.accountId)}/screenshot`;

  let pySyncResponse: Response;
  try {
    pySyncResponse = await fetch(screenshotUrl, {
      headers: {
        Authorization: `Bearer ${PYSYNC_API_KEY}`,
        Accept: "image/png",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    return buildErrorResponse(
      "PYSYNC_SCREENSHOT_UNAVAILABLE",
      error instanceof Error
        ? `Unable to reach the pySync server: ${error.message}`
        : "Unable to reach the pySync server.",
      [],
      502,
    );
  }

  if (!pySyncResponse.ok || !pySyncResponse.body) {
    let message = "The latest MT5 screenshot is not available yet.";

    try {
      const errorBody = (await pySyncResponse.json()) as {
        detail?: string;
      };
      if (errorBody.detail) message = errorBody.detail;
    } catch {
      // pySync may return a plain-text proxy error.
    }

    return buildErrorResponse(
      "PYSYNC_SCREENSHOT_NOT_AVAILABLE",
      message,
      [],
      pySyncResponse.status === 404 ? 404 : 502,
    );
  }

  const responseHeaders = new Headers({
    "Content-Type": pySyncResponse.headers.get("content-type") || "image/png",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  });
  const capturedAt = pySyncResponse.headers.get("x-screenshot-timestamp");
  if (capturedAt) responseHeaders.set("X-Screenshot-Timestamp", capturedAt);

  return new Response(pySyncResponse.body, {
    status: 200,
    headers: responseHeaders,
  });
}
