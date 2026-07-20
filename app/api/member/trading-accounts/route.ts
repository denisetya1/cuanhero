import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getPySyncBaseUrl,
  getPySyncServerAddress,
  PYSYNC_API_KEY,
} from "@/lib/pysync";
import { headers } from "next/headers";
import {
  buildErrorResponse,
  buildResponse,
  notAuthorizeResponse,
} from "@/lib/response";
import { NextRequest } from "next/server";
import { isSubscriptionConfigLocked } from "@/lib/subscription-expiration";

const tradingAccountSelect = {
  id: true,
  accountName: true,
  accountId: true,
  accountBalance: true,
  accountServer: true,
  eaConfiguration: true,
  status: true,
  eaStatus: true,
  lastSync: true,
  endDate: true,
  package: {
    select: {
      id: true,
      code: true,
      name: true,
      price: true,
      recurringType: true,
    },
  },
  expertAdvisor: {
    select: {
      id: true,
      name: true,
      defaultConfig: true,
    },
  },
};

export const GET = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // 2. Proteksi API: Jika tidak ada session (belum login), tolak request (401 Unauthorized)
  if (!session) {
    return notAuthorizeResponse();
  }

  const tradingAccounts = await prisma.tradingAccount.findMany({
    where: {
      userId: session?.user?.id,
      status: {
        not: 4,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: tradingAccountSelect,
  });

  return buildResponse(tradingAccounts);
};

export const PATCH = async (req: NextRequest) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return notAuthorizeResponse();
  }

  const body = await req.json();
  const accountId = Number(body.accountId);
  const configuration = body.configuration;
  const eaStatus =
    body.eaStatus === undefined || body.eaStatus === null
      ? undefined
      : Number(body.eaStatus);

  if (
    !accountId ||
    (configuration === undefined && eaStatus === undefined) ||
    (configuration !== undefined &&
      (configuration === null ||
        typeof configuration !== "object" ||
        Array.isArray(configuration))) ||
    (eaStatus !== undefined && ![0, 1, 2, 3, 4].includes(eaStatus))
  ) {
    return buildErrorResponse(
      "INVALID_REQUEST",
      "Invalid trading account data.",
      [],
    );
  }

  const existingAccount = await prisma.tradingAccount.findFirst({
    where: {
      id: accountId,
      userId: session.user.id,
    },
    select: {
      id: true,
      accountId: true,
      endDate: true,
      server: {
        select: {
          ipAddress: true,
          domain: true,
        },
      },
    },
  });

  if (!existingAccount) {
    return buildErrorResponse(
      "DATA_NOT_EXISTS",
      "Trading account not found.",
      [],
      404,
    );
  }

  if (
    configuration !== undefined &&
    isSubscriptionConfigLocked(existingAccount.endDate)
  ) {
    return buildErrorResponse(
      "SUBSCRIPTION_CONFIG_LOCKED",
      "Bot configuration is locked because the subscription is within one hour of expiration or has expired.",
      [],
      403,
    );
  }

  let configSyncedAt: Date | null = null;

  if (configuration !== undefined) {
    if (!existingAccount.server.ipAddress) {
      return buildErrorResponse(
        "PYSYNC_SERVER_NOT_CONFIGURED",
        "The pySync address has not been configured on the VPS server.",
        [],
      );
    }

    const updateConfigUrl = `${getPySyncBaseUrl(
      getPySyncServerAddress(existingAccount.server),
    )}/api/config/update-config`;

    try {
      const pySyncResponse = await fetch(updateConfigUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PYSYNC_API_KEY}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: existingAccount.accountId,
          eaConfig: configuration,
        }),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });

      if (!pySyncResponse.ok) {
        const responseText = await pySyncResponse.text();
        let detail = responseText;

        try {
          const responseData = JSON.parse(responseText) as {
            detail?: unknown;
          };
          if (typeof responseData.detail === "string") {
            detail = responseData.detail;
          }
        } catch {
          // Gunakan response text jika pySync tidak mengembalikan JSON.
        }

        return buildErrorResponse(
          "PYSYNC_CONFIG_UPDATE_FAILED",
          detail || `pySync responded with status ${pySyncResponse.status}.`,
          [],
          pySyncResponse.status >= 400 && pySyncResponse.status < 600
            ? pySyncResponse.status
            : 502,
        );
      }

      configSyncedAt = new Date();
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "TimeoutError";
      return buildErrorResponse(
        "PYSYNC_UNREACHABLE",
        isTimeout
          ? "The pySync connection timed out while updating the configuration."
          : "Unable to send the configuration to the pySync server.",
        [],
        502,
      );
    }
  }

  const updatedAccount = await prisma.tradingAccount.update({
    where: {
      id: accountId,
    },
    data: {
      ...(configuration !== undefined && {
        eaConfiguration: configuration,
      }),
      ...(configSyncedAt && {
        lastSync: configSyncedAt,
      }),
      ...(eaStatus !== undefined && {
        eaStatus,
      }),
    },
    select: tradingAccountSelect,
  });

  return buildResponse(updatedAccount);
};
