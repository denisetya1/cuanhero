import prisma from "@/lib/prisma";
import {
  getPySyncBaseUrl,
  getPySyncServerAddress,
  PYSYNC_API_KEY,
} from "@/lib/pysync";
import { buildErrorResponse, buildResponse } from "@/lib/response";
import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CRON_TIME_ZONE = "Asia/Jakarta";
const DEPLOYED_EA_STATUSES = [1, 2, 3];
const CRON_UPDATED_BY = "subscription-expiration-cron";

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

const getTodayUtc = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: CRON_TIME_ZONE,
  }).formatToParts(new Date());
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return new Date(
    Date.UTC(getPart("year"), getPart("month") - 1, getPart("day")),
  );
};

const getDateKey = (date: Date) =>
  [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");

const readPySyncError = async (response: Response) => {
  const text = await response.text();
  if (!text) return `pySync responded with status ${response.status}.`;

  try {
    const data = JSON.parse(text) as { detail?: unknown };
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
  } catch {
    // Use the original response when pySync does not return JSON.
  }

  return text;
};

const runSubscriptionExpirations = async (req: NextRequest) => {
  if (!isAuthorized(req.headers.get("authorization"))) {
    return buildErrorResponse(
      "NOT_AUTHORIZED",
      "Invalid cron authorization token.",
      [],
      401,
    );
  }

  const today = getTodayUtc();

  try {
    // endDate remains valid for the whole date. Cleanup starts the next day.
    // Accounts with a failed runtime cleanup stay eligible for the next run.
    const accounts = await prisma.tradingAccount.findMany({
      where: {
        endDate: { lt: today },
        OR: [
          { status: { not: 4 } },
          { eaStatus: { in: DEPLOYED_EA_STATUSES } },
        ],
      },
      select: {
        id: true,
        accountId: true,
        status: true,
        eaStatus: true,
        endDate: true,
        server: {
          select: {
            domain: true,
            ipAddress: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    let terminated = 0;
    let closed = 0;
    const failures: Array<{ accountId: string; message: string }> = [];

    for (const account of accounts) {
      const hasDeployedRuntime = DEPLOYED_EA_STATUSES.includes(
        account.eaStatus,
      );

      if (hasDeployedRuntime) {
        try {
          if (!account.server.ipAddress.trim()) {
            throw new Error("pySync server address is not configured.");
          }

          const clientId = encodeURIComponent(account.accountId);
          const terminateUrl = `${getPySyncBaseUrl(
            getPySyncServerAddress(account.server),
          )}/api/deploy/${clientId}/terminate`;
          const response = await fetch(terminateUrl, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${PYSYNC_API_KEY}`,
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(30_000),
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error(await readPySyncError(response));
          }

          terminated += 1;
        } catch (error) {
          const isTimeout =
            error instanceof Error && error.name === "TimeoutError";
          failures.push({
            accountId: account.accountId,
            message: isTimeout
              ? "pySync termination request timed out."
              : error instanceof Error
                ? error.message
                : "Unable to terminate the pySync runtime.",
          });

          // Access is disabled immediately, while eaStatus is deliberately
          // preserved so a later cron run retries the runtime cleanup.
          await prisma.tradingAccount.update({
            where: { id: account.id },
            data: {
              status: 4,
              updatedBy: CRON_UPDATED_BY,
            },
          });
          continue;
        }
      }

      await prisma.tradingAccount.update({
        where: { id: account.id },
        data: {
          status: 4,
          eaStatus: 4,
          updatedBy: CRON_UPDATED_BY,
        },
      });
      closed += 1;
    }

    return buildResponse({
      date: getDateKey(today),
      timeZone: CRON_TIME_ZONE,
      matched: accounts.length,
      closed,
      terminated,
      pendingCleanup: failures.length,
      failures,
    });
  } catch (error) {
    console.error("SUBSCRIPTION_EXPIRATION_CRON_ERROR:", error);
    return buildErrorResponse(
      "SUBSCRIPTION_EXPIRATION_CRON_FAILED",
      "Failed to terminate expired subscriptions.",
      [],
      500,
    );
  }
};

export const GET = runSubscriptionExpirations;
export const POST = runSubscriptionExpirations;
