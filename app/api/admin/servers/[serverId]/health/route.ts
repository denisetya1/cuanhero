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

export const POST = async (
  _req: Request,
  { params }: { params: Promise<{ serverId: string }> },
) => {
  const session = await ensureAdmin();
  if (!session) return notAuthorizeResponse();

  const { serverId } = await params;
  const id = Number(serverId);
  if (!id) {
    return buildErrorResponse("INVALID_SERVER_ID", "Invalid server ID.", []);
  }

  const server = await prisma.server.findUnique({
    where: { id },
    select: { id: true, ipAddress: true, domain: true },
  });
  if (!server) {
    return buildErrorResponse(
      "SERVER_NOT_FOUND",
      "Server not found.",
      [],
      404,
    );
  }

  const startedAt = Date.now();

  try {
    const response = await fetch(
      `${getPySyncBaseUrl(getPySyncServerAddress(server))}/api/health/status`,
      {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${PYSYNC_API_KEY}`,
      },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`pySync returned HTTP ${response.status}`);
    }

    const runtime = (await response.json()) as {
      bots?: unknown;
    };
    const latencyMs = Date.now() - startedAt;

    const bots = Array.isArray(runtime.bots) ? runtime.bots : [];
    const heartbeatUpdates = bots.flatMap((value) => {
      if (!value || typeof value !== "object") return [];

      const bot = value as Record<string, unknown>;
      const clientId = String(bot.client_id || "").trim();
      const heartbeatAt = Number(bot.lastHeartbeatAt || 0);

      if (!clientId || !Number.isFinite(heartbeatAt) || heartbeatAt <= 0) {
        return [];
      }

      return [
        prisma.tradingAccount.updateMany({
          where: {
            serverId: server.id,
            accountId: clientId,
          },
          data: {
            lastSync: new Date(heartbeatAt * 1000),
            updatedBy: session.user.id,
          },
        }),
      ];
    });

    await prisma.$transaction([
      prisma.server.update({
        where: { id: server.id },
        data: { status: 1, updatedBy: session.user.id },
      }),
      ...heartbeatUpdates,
    ]);

    return buildResponse({ online: true, latencyMs, runtime });
  } catch (error) {
    await prisma.server.update({
      where: { id: server.id },
      data: { status: 0, updatedBy: session.user.id },
    });

    return buildErrorResponse(
      "PYSYNC_SERVER_OFFLINE",
      error instanceof Error && error.name === "TimeoutError"
        ? "Server healthcheck timeout."
        : "pySync server tidak dapat dihubungi.",
      [],
      502,
    );
  }
};
