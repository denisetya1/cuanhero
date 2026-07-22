import prisma from "@/lib/prisma";
import { sendHealthcheckOfflineEmail } from "@/lib/email";
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

const CRON_UPDATED_BY = "healthcheck-cron";
const STOPPABLE_EA_STATUSES = new Set([1, 3]);

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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.name === "TimeoutError"
    ? "Server healthcheck timeout."
    : error instanceof Error
      ? error.message
      : "pySync server tidak dapat dihubungi.";

export const POST = async (req: NextRequest) => {
  if (!isAuthorized(req.headers.get("authorization"))) {
    return buildErrorResponse(
      "NOT_AUTHORIZED",
      "Invalid cron authorization token.",
      [],
      401,
    );
  }

  try {
    const servers = await prisma.server.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        ipAddress: true,
        domain: true,
        tradingAccounts: {
          select: {
            id: true,
            accountId: true,
            eaStatus: true,
          },
        },
      },
      orderBy: { orderNumber: "asc" },
    });

    const registeredAccounts = new Map(
      servers.flatMap((server) =>
        server.tradingAccounts.map((account) => [
          account.accountId,
          { accountId: account.accountId, serverId: server.id },
        ] as const),
      ),
    );

    const results = await Promise.all(
      servers.map(async (server) => {
        const startedAt = Date.now();
        const serverName = server.name?.trim() || `Server #${server.id}`;

        try {
          const response = await fetch(
            `${getPySyncBaseUrl(getPySyncServerAddress(server))}/api/health/status`,
            {
              headers: {
                Accept: "application/json",
                Authorization: `Bearer ${PYSYNC_API_KEY}`,
              },
              signal: AbortSignal.timeout(15_000),
              cache: "no-store",
            },
          );

          if (!response.ok) {
            throw new Error(`pySync returned HTTP ${response.status}.`);
          }

          const runtime = asRecord(await response.json());
          const bots = Array.isArray(runtime?.bots) ? runtime.bots : [];
          const botsByAccountId = new Map<string, Record<string, unknown>>();
          const offlineAccounts: Array<{
            accountId: string;
            serverName: string;
          }> = [];

          for (const value of bots) {
            const bot = asRecord(value);
            const accountId = String(bot?.client_id || "").trim();
            if (bot && accountId) botsByAccountId.set(accountId, bot);
          }

          const unexpectedBots = [...botsByAccountId.entries()].flatMap(
            ([accountId, bot]) => {
              const processAlive =
                bot.processAlive === true ||
                bot.isRunning === true ||
                bot.isPaused === true;
              if (!processAlive) return [];

              const registeredAccount = registeredAccounts.get(accountId);
              if (registeredAccount?.serverId === server.id) return [];

              return [
                {
                  accountId,
                  reason: registeredAccount
                    ? ("WRONG_SERVER" as const)
                    : ("NOT_REGISTERED" as const),
                  registeredServerId: registeredAccount?.serverId || null,
                  runtimeStatus:
                    typeof bot.status === "string" ? bot.status : "unknown",
                  isRunning: bot.isRunning === true,
                  isPaused: bot.isPaused === true,
                  pid: Number(bot.pid || 0) || null,
                  lastHeartbeatAt: Number(bot.lastHeartbeatAt || 0) || null,
                },
              ];
            },
          );

          const accountUpdates = server.tradingAccounts.flatMap((account) => {
            const bot = botsByAccountId.get(account.accountId);
            let nextEaStatus = account.eaStatus;

            if (bot?.isPaused === true) {
              nextEaStatus = 2;
            } else if (bot?.isRunning === true) {
              nextEaStatus = 1;
            } else if (STOPPABLE_EA_STATUSES.has(account.eaStatus)) {
              // Preserve paused, never-deployed, and terminated accounts, but
              // surface missing previously deployed bots as stopped.
              nextEaStatus = 3;
            }

            const heartbeatAt = Number(bot?.lastHeartbeatAt || 0);
            const hasHeartbeat =
              Number.isFinite(heartbeatAt) && heartbeatAt > 0;
            const statusChanged = nextEaStatus !== account.eaStatus;

            if (account.eaStatus === 1 && nextEaStatus === 3) {
              offlineAccounts.push({
                accountId: account.accountId,
                serverName,
              });
            }

            if (!statusChanged && !hasHeartbeat) return [];

            return [
              prisma.tradingAccount.update({
                where: { id: account.id },
                data: {
                  eaStatus: nextEaStatus,
                  ...(hasHeartbeat && {
                    lastSync: new Date(heartbeatAt * 1000),
                  }),
                  updatedBy: CRON_UPDATED_BY,
                },
              }),
            ];
          });

          await prisma.$transaction([
            prisma.server.update({
              where: { id: server.id },
              data: { status: 1, updatedBy: CRON_UPDATED_BY },
            }),
            ...accountUpdates,
          ]);

          return {
            serverId: server.id,
            serverName,
            online: true,
            latencyMs: Date.now() - startedAt,
            bots: bots.length,
            unexpectedBots,
            offlineAccounts,
          };
        } catch (error) {
          await prisma.server.update({
            where: { id: server.id },
            data: { status: 0, updatedBy: CRON_UPDATED_BY },
          });

          return {
            serverId: server.id,
            serverName,
            serverAddress: server.domain || server.ipAddress,
            wasOnline: server.status !== 0,
            online: false,
            latencyMs: Date.now() - startedAt,
            error: getErrorMessage(error),
          };
        }
      }),
    );

    const unexpectedBots = results.flatMap((result) =>
      Array.isArray(result.unexpectedBots)
        ? result.unexpectedBots.map((bot) => ({
            serverId: result.serverId,
            serverName: result.serverName,
            ...bot,
          }))
        : [],
    );

    const newlyOfflineServers = results.flatMap((result) =>
      !result.online && result.wasOnline
        ? [
            {
              name: result.serverName,
              address: result.serverAddress,
              error: result.error,
            },
          ]
        : [],
    );
    const newlyOfflineAccounts = results.flatMap((result) =>
      result.online && Array.isArray(result.offlineAccounts)
        ? result.offlineAccounts
        : [],
    );

    const detectedAt = new Date();
    const persistedIssues = unexpectedBots.length
      ? await prisma.$transaction(
          unexpectedBots.map((bot) =>
            prisma.runtimeHealthIssue.upsert({
              where: {
                serverId_accountId_reason: {
                  serverId: bot.serverId,
                  accountId: bot.accountId,
                  reason: bot.reason,
                },
              },
              create: {
                serverId: bot.serverId,
                accountId: bot.accountId,
                reason: bot.reason,
                registeredServerId: bot.registeredServerId,
                runtimeStatus: bot.runtimeStatus,
                isRunning: bot.isRunning,
                isPaused: bot.isPaused,
                pid: bot.pid,
                lastHeartbeatAt: bot.lastHeartbeatAt
                  ? new Date(bot.lastHeartbeatAt * 1000)
                  : null,
                firstDetectedAt: detectedAt,
                lastDetectedAt: detectedAt,
              },
              update: {
                registeredServerId: bot.registeredServerId,
                runtimeStatus: bot.runtimeStatus,
                isRunning: bot.isRunning,
                isPaused: bot.isPaused,
                pid: bot.pid,
                lastHeartbeatAt: bot.lastHeartbeatAt
                  ? new Date(bot.lastHeartbeatAt * 1000)
                  : null,
                lastDetectedAt: detectedAt,
                detectionCount: { increment: 1 },
                resolvedAt: null,
              },
              select: { id: true },
            }),
          ),
        )
      : [];

    const onlineServerIds = results
      .filter((result) => result.online)
      .map((result) => result.serverId);
    const activeIssueIds = persistedIssues.map((issue) => issue.id);

    // Only resolve incidents for servers successfully checked in this run.
    // An offline server cannot prove that its previously reported bot stopped.
    if (onlineServerIds.length) {
      await prisma.runtimeHealthIssue.updateMany({
        where: {
          serverId: { in: onlineServerIds },
          resolvedAt: null,
          ...(activeIssueIds.length && { id: { notIn: activeIssueIds } }),
        },
        data: { resolvedAt: detectedAt },
      });
    }

    let notificationEmailSent = false;
    let notificationRecipientCount = 0;
    let notificationEmailError: string | null = null;
    if (newlyOfflineServers.length || newlyOfflineAccounts.length) {
      const settings = await prisma.appSetting.findUnique({
        where: { id: 1 },
        select: { notificationEmails: true },
      });
      const recipients = [
        ...new Set(
          (settings?.notificationEmails || "")
            .split(",")
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean),
        ),
      ];
      notificationRecipientCount = recipients.length;

      if (recipients.length) {
        try {
          const dashboardUrl = `${(
            process.env.BETTER_AUTH_URL || "https://cuanhero.com"
          ).replace(/\/$/, "")}/admin/trading-accounts`;
          await sendHealthcheckOfflineEmail({
            checkedAt: detectedAt,
            dashboardUrl,
            offlineAccounts: newlyOfflineAccounts,
            offlineServers: newlyOfflineServers,
            to: recipients,
          });
          notificationEmailSent = true;
        } catch (emailError) {
          notificationEmailError = getErrorMessage(emailError);
          console.error("HEALTHCHECK_NOTIFICATION_EMAIL_ERROR:", emailError);
        }
      }
    }

    return buildResponse({
      checkedAt: new Date().toISOString(),
      total: results.length,
      online: results.filter((result) => result.online).length,
      offline: results.filter((result) => !result.online).length,
      unexpectedBotsCount: unexpectedBots.length,
      unexpectedBots,
      newlyOfflineServers,
      newlyOfflineAccounts,
      notificationEmailSent,
      notificationRecipientCount,
      notificationEmailError,
      reportStored: true,
      results,
    });
  } catch (error) {
    console.error("CRON_HEALTHCHECK_ERROR:", error);
    return buildErrorResponse(
      "HEALTHCHECK_FAILED",
      "Failed to process scheduled healthchecks.",
      [],
      500,
    );
  }
};
