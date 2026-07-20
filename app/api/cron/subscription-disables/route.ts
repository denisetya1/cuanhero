import prisma from "@/lib/prisma";
import {
  getPySyncBaseUrl,
  getPySyncServerAddress,
  PYSYNC_API_KEY,
} from "@/lib/pysync";
import { buildErrorResponse, buildResponse } from "@/lib/response";
import { getSubscriptionConfigLockAt } from "@/lib/subscription-expiration";
import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEPLOYED_EA_STATUSES = [1, 2, 3];
const CRON_UPDATED_BY = "subscription-disable-cron";

const isAuthorized = (authorization: string | null) => {
  const expected = process.env.CRON_SECRET || "";
  const supplied = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);

  return (
    expectedBuffer.length > 0 &&
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
};

const readPySyncError = async (response: Response) => {
  const text = await response.text();
  if (!text) return `pySync responded with status ${response.status}.`;

  try {
    const data = JSON.parse(text) as { detail?: unknown };
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
  } catch {
    // Preserve non-JSON pySync responses for diagnostics.
  }

  return text;
};

const runSubscriptionDisables = async (req: NextRequest) => {
  if (!isAuthorized(req.headers.get("authorization"))) {
    return buildErrorResponse(
      "NOT_AUTHORIZED",
      "Invalid cron authorization token.",
      [],
      401,
    );
  }

  const now = new Date();

  try {
    const candidates = await prisma.tradingAccount.findMany({
      where: {
        endDate: { not: null },
        status: { not: 4 },
      },
      select: {
        id: true,
        accountId: true,
        endDate: true,
        eaStatus: true,
        eaConfiguration: true,
        server: {
          select: {
            domain: true,
            ipAddress: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    const accounts = candidates.filter((account) => {
      if (!account.endDate) return false;
      const lockAt = getSubscriptionConfigLockAt(account.endDate);
      const config = account.eaConfiguration;
      const isEnabled =
        config && typeof config === "object" && !Array.isArray(config)
          ? config.EnableBot !== false
          : true;

      return Boolean(
        lockAt && lockAt.getTime() <= now.getTime() && isEnabled,
      );
    });

    let disabled = 0;
    const failures: Array<{ accountId: string; message: string }> = [];

    for (const account of accounts) {
      const currentConfig =
        account.eaConfiguration &&
        typeof account.eaConfiguration === "object" &&
        !Array.isArray(account.eaConfiguration)
          ? account.eaConfiguration
          : {};
      const configuration = { ...currentConfig, EnableBot: false };
      const hasDeployedRuntime = DEPLOYED_EA_STATUSES.includes(
        account.eaStatus,
      );

      if (hasDeployedRuntime) {
        try {
          if (!account.server.ipAddress.trim()) {
            throw new Error("pySync server address is not configured.");
          }

          const response = await fetch(
            `${getPySyncBaseUrl(
              getPySyncServerAddress(account.server),
            )}/api/config/update-config`,
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
            throw new Error(await readPySyncError(response));
          }
        } catch (error) {
          failures.push({
            accountId: account.accountId,
            message:
              error instanceof Error
                ? error.message
                : "Unable to disable the bot through pySync.",
          });
          continue;
        }
      }

      await prisma.tradingAccount.update({
        where: { id: account.id },
        data: {
          eaConfiguration: configuration,
          lastSync: hasDeployedRuntime ? now : undefined,
          updatedBy: CRON_UPDATED_BY,
        },
      });
      disabled += 1;
    }

    return buildResponse({
      checkedAt: now.toISOString(),
      matched: accounts.length,
      disabled,
      failed: failures.length,
      failures,
    });
  } catch (error) {
    console.error("SUBSCRIPTION_DISABLE_CRON_ERROR:", error);
    return buildErrorResponse(
      "SUBSCRIPTION_DISABLE_CRON_FAILED",
      "Failed to disable subscriptions approaching expiration.",
      [],
      500,
    );
  }
};

export const GET = runSubscriptionDisables;
export const POST = runSubscriptionDisables;

