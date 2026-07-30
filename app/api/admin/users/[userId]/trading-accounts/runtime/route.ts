import { auth } from "@/lib/auth";
import { decryptText } from "@/lib/encryption";
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
import { NextRequest } from "next/server";

const ensureAdmin = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return user?.role && ["ADMIN", "SUPER_ADMIN"].includes(user.role)
    ? session
    : null;
};

const readPySyncResponse = async (response: Response) => {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { detail: text };
  }
};

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) => {
  const session = await ensureAdmin();
  if (!session) return notAuthorizeResponse();

  const { userId } = await params;
  const body = await req.json();
  const tradingAccountId = Number(body.tradingAccountId);
  const action = String(body.action || "").toLowerCase();

  if (
    !tradingAccountId ||
    !["deploy", "pause", "resume", "restart", "terminate", "health"].includes(
      action,
    )
  ) {
    return buildErrorResponse(
      "INVALID_RUNTIME_ACTION",
      "Trading account dan runtime action tidak valid.",
      [],
    );
  }

  const account = await prisma.tradingAccount.findFirst({
    where: { id: tradingAccountId, userId },
    select: {
      id: true,
      accountId: true,
      accountPassword: true,
      accountServer: true,
      eaConfiguration: true,
      status: true,
      eaStatus: true,
      lastSync: true,
      server: {
        select: { ipAddress: true, domain: true, status: true },
      },
      expertAdvisor: { select: { eaFileName: true } },
    },
  });

  if (!account) {
    return buildErrorResponse(
      "TRADING_ACCOUNT_NOT_FOUND",
      "Trading account tidak ditemukan.",
      [],
      404,
    );
  }

  if (!account.server.ipAddress) {
    return buildErrorResponse(
      "PYSYNC_SERVER_NOT_CONFIGURED",
      "Alamat pySync pada VPS server belum dikonfigurasi.",
      [],
    );
  }

  if (action === "deploy" && account.status !== 1) {
    return buildErrorResponse(
      "TRADING_ACCOUNT_INACTIVE",
      "Trading account harus aktif sebelum bot dapat dideploy.",
      [],
    );
  }

  if (action === "deploy" && !account.expertAdvisor.eaFileName.trim()) {
    return buildErrorResponse(
      "EA_FILE_NOT_CONFIGURED",
      "EA File Name pada Expert Advisor belum dikonfigurasi.",
      [],
    );
  }

  const eaConfiguration =
    account.eaConfiguration &&
    typeof account.eaConfiguration === "object" &&
    !Array.isArray(account.eaConfiguration)
      ? account.eaConfiguration
      : null;

  if (action === "deploy" && !eaConfiguration) {
    return buildErrorResponse(
      "EA_CONFIG_NOT_CONFIGURED",
      "Konfigurasi EA belum tersedia. Simpan konfigurasi bot terlebih dahulu.",
      [],
    );
  }

  if (action === "pause" && account.eaStatus !== 1) {
    return buildErrorResponse(
      "BOT_NOT_RUNNING",
      "Bot hanya dapat dipause setelah berhasil dideploy dan sedang berjalan.",
      [],
    );
  }

  if (action === "resume" && account.eaStatus !== 2) {
    return buildErrorResponse(
      "BOT_NOT_PAUSED",
      "Bot hanya dapat di-resume setelah dipause.",
      [],
    );
  }

  if (action === "restart" && [0, 4].includes(account.eaStatus)) {
    return buildErrorResponse(
      "BOT_NOT_DEPLOYED",
      "Force restart hanya tersedia untuk bot yang sudah pernah dideploy.",
      [],
    );
  }

  let password = "";
  if (action === "deploy") {
    if (!account.accountPassword || !account.accountServer) {
      return buildErrorResponse(
        "INCOMPLETE_TRADING_ACCOUNT",
        "Password dan trading server wajib tersedia untuk deploy.",
        [],
      );
    }

    try {
      password = decryptText(account.accountPassword);
    } catch {
      return buildErrorResponse(
        "TRADING_PASSWORD_DECRYPT_FAILED",
        "Trading password tidak dapat dibaca.",
        [],
        500,
      );
    }
  }

  const clientId = encodeURIComponent(account.accountId);
  const pySyncBaseUrl = getPySyncBaseUrl(
    getPySyncServerAddress(account.server),
  );
  let configSyncedAt: Date | null = null;

  if (action === "deploy" && eaConfiguration) {
    try {
      const updateConfigResponse = await fetch(
        `${pySyncBaseUrl}/api/config/update-config`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PYSYNC_API_KEY}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientId: account.accountId,
            eaConfig: eaConfiguration,
          }),
          signal: AbortSignal.timeout(10_000),
          cache: "no-store",
        },
      );
      const updateConfigData = await readPySyncResponse(updateConfigResponse);

      if (!updateConfigResponse.ok) {
        const detail = updateConfigData?.detail;
        return buildErrorResponse(
          "PYSYNC_CONFIG_UPDATE_FAILED",
          typeof detail === "string"
            ? detail
            : `pySync gagal memperbarui config dengan status ${updateConfigResponse.status}.`,
          [],
          502,
        );
      }

      configSyncedAt = new Date();
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "TimeoutError";
      return buildErrorResponse(
        "PYSYNC_CONFIG_UNREACHABLE",
        isTimeout
          ? "Koneksi ke pySync timeout saat memperbarui konfigurasi."
          : "Tidak dapat mengirim konfigurasi ke pySync sebelum deploy.",
        [],
        502,
      );
    }

    account.lastSync = configSyncedAt;
    await prisma.tradingAccount.update({
      where: { id: account.id },
      data: {
        lastSync: configSyncedAt,
        updatedBy: session.user.id,
      },
    });
  }

  const suffix =
    action === "terminate"
      ? "/terminate"
      : action === "restart"
        ? "/restart"
        : action === "resume"
          ? "/resume"
          : "";
  const url =
    action === "health"
      ? `${pySyncBaseUrl}/api/health/status/${clientId}`
      : `${pySyncBaseUrl}/api/deploy/${clientId}${suffix}`;

  try {
    const response = await fetch(url, {
      method:
        action === "deploy" || action === "resume" || action === "restart"
          ? "POST"
          : action === "health"
            ? "GET"
            : "DELETE",
      headers: {
        Authorization: `Bearer ${PYSYNC_API_KEY}`,
        Accept: "application/json",
        ...(action === "deploy" && { "Content-Type": "application/json" }),
      },
      ...(action === "deploy" && {
        body: JSON.stringify({
          login: account.accountId,
          password,
          server: account.accountServer,
          ...(account.expertAdvisor.eaFileName && {
            expert: account.expertAdvisor.eaFileName,
          }),
        }),
      }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    const responseData = await readPySyncResponse(response);

    if (!response.ok) {
      const detail = responseData?.detail;
      return buildErrorResponse(
        "PYSYNC_RUNTIME_ACTION_FAILED",
        typeof detail === "string"
          ? detail
          : `pySync merespons dengan status ${response.status}.`,
        [],
        response.status >= 400 && response.status < 600
          ? response.status
          : 502,
      );
    }

    let eaStatus =
      action === "deploy" || action === "resume" || action === "restart"
        ? 1
        : action === "pause"
          ? 2
          : 4;

    if (action === "health") {
      const runtimeBot = responseData?.bot;
      const bot =
        runtimeBot && typeof runtimeBot === "object"
          ? (runtimeBot as Record<string, unknown>)
          : null;
      const isRunning = bot?.isRunning === true;
      const heartbeatAt =
        typeof bot?.lastHeartbeatAt === "number"
          ? bot.lastHeartbeatAt
          : Number(bot?.lastHeartbeatAt || 0);

      eaStatus = isRunning
        ? 1
        : account.eaStatus === 2 || account.eaStatus === 4
          ? account.eaStatus
          : 3;

      if (Number.isFinite(heartbeatAt) && heartbeatAt > 0) {
        account.lastSync = new Date(heartbeatAt * 1000);
      }
    }

    await prisma.tradingAccount.update({
      where: { id: account.id },
      data: {
        eaStatus,
        ...(action === "health" && account.lastSync && {
          lastSync: account.lastSync,
        }),
        updatedBy: session.user.id,
      },
    });

    return buildResponse({
      action,
      eaStatus,
      lastSync: account.lastSync,
      runtime: responseData,
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    return buildErrorResponse(
      "PYSYNC_UNREACHABLE",
      isTimeout
        ? "Koneksi ke pySync timeout."
        : "Tidak dapat terhubung ke pySync server.",
      [],
      502,
    );
  }
};
