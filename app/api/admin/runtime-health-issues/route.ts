import { auth } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";
import { buildResponse, notAuthorizeResponse } from "@/lib/response";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

const ALLOWED_REASONS = new Set(["NOT_REGISTERED", "WRONG_SERVER"]);

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

const parsePositiveInteger = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const GET = async (req: NextRequest) => {
  const session = await ensureAdmin();
  if (!session) return notAuthorizeResponse();

  const params = req.nextUrl.searchParams;
  const page = parsePositiveInteger(params.get("page"), 1);
  const pageSize = Math.min(
    parsePositiveInteger(params.get("pageSize"), 30),
    100,
  );
  const status = params.get("status") || "active";
  const reason = params.get("reason") || "all";
  const serverId = Number(params.get("serverId") || 0);
  const search = (params.get("search") || "").trim();

  const where: Prisma.RuntimeHealthIssueWhereInput = {
    ...(status === "active" && { resolvedAt: null }),
    ...(status === "resolved" && { resolvedAt: { not: null } }),
    ...(ALLOWED_REASONS.has(reason) && { reason }),
    ...(Number.isInteger(serverId) && serverId > 0 && { serverId }),
    ...(search && {
      OR: [
        { accountId: { contains: search } },
        { runtimeStatus: { contains: search } },
        { server: { name: { contains: search } } },
        { server: { domain: { contains: search } } },
        { server: { ipAddress: { contains: search } } },
      ],
    }),
  };

  const [items, total, active, unregistered, wrongServer, resolved, servers] =
    await prisma.$transaction([
      prisma.runtimeHealthIssue.findMany({
        where,
        orderBy: [{ resolvedAt: "asc" }, { lastDetectedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          accountId: true,
          reason: true,
          registeredServerId: true,
          runtimeStatus: true,
          isRunning: true,
          isPaused: true,
          pid: true,
          lastHeartbeatAt: true,
          firstDetectedAt: true,
          lastDetectedAt: true,
          detectionCount: true,
          resolvedAt: true,
          server: {
            select: {
              id: true,
              name: true,
              domain: true,
              ipAddress: true,
            },
          },
        },
      }),
      prisma.runtimeHealthIssue.count({ where }),
      prisma.runtimeHealthIssue.count({ where: { resolvedAt: null } }),
      prisma.runtimeHealthIssue.count({
        where: { resolvedAt: null, reason: "NOT_REGISTERED" },
      }),
      prisma.runtimeHealthIssue.count({
        where: { resolvedAt: null, reason: "WRONG_SERVER" },
      }),
      prisma.runtimeHealthIssue.count({
        where: { resolvedAt: { not: null } },
      }),
      prisma.server.findMany({
        orderBy: [{ orderNumber: "asc" }, { name: "asc" }],
        select: { id: true, name: true, domain: true, ipAddress: true },
      }),
    ]);

  return buildResponse({
    items,
    summary: { active, unregistered, wrongServer, resolved },
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    servers,
  });
};
