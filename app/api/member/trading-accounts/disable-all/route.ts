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

type AccountResult = {
  id: number;
  accountId: string;
  status: "DISABLED" | "FAILED";
  message?: string;
};

const readPySyncError = async (response: Response) => {
  const responseText = await response.text();
  if (!responseText) {
    return `pySync responded with status ${response.status}.`;
  }

  try {
    const responseData = JSON.parse(responseText) as { detail?: unknown };
    if (typeof responseData.detail === "string") return responseData.detail;
  } catch {
    // Use the raw response when pySync does not return JSON.
  }

  return responseText;
};

export const POST = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return notAuthorizeResponse();

  const accounts = await prisma.tradingAccount.findMany({
    where: {
      userId: session.user.id,
      status: 1,
    },
    orderBy: { id: "asc" },
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

  if (!accounts.length) {
    return buildErrorResponse(
      "NO_ACTIVE_TRADING_ACCOUNTS",
      "No active trading accounts were found.",
      [],
      404,
    );
  }

  const results: AccountResult[] = [];

  // Process sequentially so one member cannot send a simultaneous burst to
  // every pySync server when using the emergency bulk-disable action.
  for (const account of accounts) {
    const storedConfiguration = account.eaConfiguration;
    if (
      !storedConfiguration ||
      typeof storedConfiguration !== "object" ||
      Array.isArray(storedConfiguration)
    ) {
      results.push({
        id: account.id,
        accountId: account.accountId,
        status: "FAILED",
        message: "EA configuration is not available.",
      });
      continue;
    }

    const configuration = {
      ...(storedConfiguration as Record<string, unknown>),
      EnableBot: false,
    };
    const runtimeIsDeployed = ![0, 4].includes(account.eaStatus);
    let configSyncedAt: Date | null = null;

    if (runtimeIsDeployed) {
      const serverAddress = getPySyncServerAddress(account.server);
      if (!serverAddress) {
        results.push({
          id: account.id,
          accountId: account.accountId,
          status: "FAILED",
          message: "pySync server address is not configured.",
        });
        continue;
      }

      try {
        const response = await fetch(
          `${getPySyncBaseUrl(serverAddress)}/api/config/update-config`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${PYSYNC_API_KEY}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              clientId: account.accountId,
              eaConfig: configuration,
            }),
            signal: AbortSignal.timeout(10_000),
            cache: "no-store",
          },
        );

        if (!response.ok) {
          results.push({
            id: account.id,
            accountId: account.accountId,
            status: "FAILED",
            message: await readPySyncError(response),
          });
          continue;
        }

        configSyncedAt = new Date();
      } catch (error) {
        results.push({
          id: account.id,
          accountId: account.accountId,
          status: "FAILED",
          message:
            error instanceof Error && error.name === "TimeoutError"
              ? "The pySync connection timed out."
              : "Unable to connect to the pySync server.",
        });
        continue;
      }
    }

    try {
      await prisma.tradingAccount.update({
        where: { id: account.id },
        data: {
          eaConfiguration: configuration,
          ...(configSyncedAt ? { lastSync: configSyncedAt } : {}),
          updatedBy: session.user.id,
        },
      });
    } catch (error) {
      console.error("MEMBER_DISABLE_ALL_BOTS_DB_ERROR:", {
        accountId: account.accountId,
        error,
      });
      results.push({
        id: account.id,
        accountId: account.accountId,
        status: "FAILED",
        message: "The disabled configuration could not be saved.",
      });
      continue;
    }

    results.push({
      id: account.id,
      accountId: account.accountId,
      status: "DISABLED",
    });
  }

  const disabled = results.filter((result) => result.status === "DISABLED");
  const failed = results.filter((result) => result.status === "FAILED");

  return buildResponse({
    total: accounts.length,
    disabledCount: disabled.length,
    failedCount: failed.length,
    results,
  });
};
