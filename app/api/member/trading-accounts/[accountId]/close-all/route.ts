import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getPySyncBaseUrl,
  getPySyncServerAddress,
  PYSYNC_API_KEY,
} from "@/lib/pysync";
import {
  buildErrorResponse,
  buildResponse,
  notAuthorizeResponse,
} from "@/lib/response";
import { headers } from "next/headers";

const readPySyncError = async (response: Response) => {
  const responseText = await response.text();
  if (!responseText) {
    return `pySync responded with status ${response.status}.`;
  }

  try {
    const responseData = JSON.parse(responseText) as { detail?: unknown };
    if (typeof responseData.detail === "string") return responseData.detail;
  } catch {
    // Return a safe generic error for an HTML/non-JSON upstream response.
  }

  return `pySync rejected the command (HTTP ${response.status}).`;
};

export const POST = async (
  _: Request,
  context: { params: Promise<{ accountId: string }> },
) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return notAuthorizeResponse();

  const { accountId: accountIdParam } = await context.params;
  const accountId = Number(accountIdParam);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return buildErrorResponse(
      "INVALID_TRADING_ACCOUNT",
      "Invalid trading account.",
      [],
      422,
    );
  }

  const account = await prisma.tradingAccount.findFirst({
    where: {
      id: accountId,
      userId: session.user.id,
      status: 1,
    },
    select: {
      id: true,
      accountId: true,
      eaStatus: true,
      eaConfiguration: true,
      server: {
        select: {
          ipAddress: true,
          domain: true,
        },
      },
    },
  });

  if (!account) {
    return buildErrorResponse(
      "TRADING_ACCOUNT_NOT_FOUND",
      "Trading account was not found.",
      [],
      404,
    );
  }

  if (account.eaStatus !== 1) {
    return buildErrorResponse(
      "EA_NOT_RUNNING",
      "Close All is only available while the EA status is running.",
      [],
      409,
    );
  }

  const storedConfiguration = account.eaConfiguration;
  if (
    !storedConfiguration ||
    typeof storedConfiguration !== "object" ||
    Array.isArray(storedConfiguration)
  ) {
    return buildErrorResponse(
      "EA_CONFIG_NOT_AVAILABLE",
      "EA configuration is not available.",
      [],
      409,
    );
  }

  const serverAddress = getPySyncServerAddress(account.server);
  if (!serverAddress) {
    return buildErrorResponse(
      "PYSYNC_SERVER_NOT_CONFIGURED",
      "pySync server address is not configured.",
      [],
      409,
    );
  }

  // Persist the emergency stop first. If the runtime request temporarily
  // fails, a retry remains safe and the dashboard cannot re-enable entries
  // accidentally.
  const configuration = {
    ...(storedConfiguration as Record<string, unknown>),
    EnableBot: false,
  };
  await prisma.tradingAccount.update({
    where: { id: account.id },
    data: {
      eaConfiguration: configuration,
      updatedBy: session.user.id,
    },
  });

  try {
    const response = await fetch(
      `${getPySyncBaseUrl(serverAddress)}/api/control/${encodeURIComponent(account.accountId)}/close-all`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PYSYNC_API_KEY}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return buildErrorResponse(
        "PYSYNC_CLOSE_ALL_FAILED",
        await readPySyncError(response),
        [],
        response.status >= 400 && response.status < 500 ? response.status : 502,
      );
    }

    const result = (await response.json()) as {
      command_id?: string;
      status?: string;
      queued?: boolean;
    };

    return buildResponse({
      accountId: account.accountId,
      commandId: result.command_id || "",
      status: result.status || "pending",
      queued: result.queued !== false,
    });
  } catch (error) {
    console.error("MEMBER_CLOSE_ALL_PYSYNC_ERROR:", {
      accountId: account.accountId,
      error,
    });
    return buildErrorResponse(
      "PYSYNC_UNREACHABLE",
      error instanceof Error && error.name === "TimeoutError"
        ? "The pySync connection timed out."
        : "Unable to connect to the pySync server.",
      [],
      502,
    );
  }
};
