import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  buildErrorResponse,
  buildResponse,
  notAuthorizeResponse,
} from "@/lib/response";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

const serverSelect = {
  id: true,
  name: true,
  ipAddress: true,
  domain: true,
  status: true,
  maxAccounts: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      tradingAccounts: {
        where: {
          status: {
            not: 4,
          },
        },
      },
    },
  },
};

const ensureAdmin = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      role: true,
    },
  });

  if (!user?.role || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return null;
  }

  return { ...session, adminRole: user.role };
};

export const GET = async () => {
  const session = await ensureAdmin();

  if (!session) {
    return notAuthorizeResponse();
  }

  const servers = await prisma.server.findMany({
    orderBy: { createdAt: "desc" },
    select: serverSelect,
  });

  return buildResponse(servers);
};

export const POST = async (req: NextRequest) => {
  const session = await ensureAdmin();

  if (!session) {
    return notAuthorizeResponse();
  }

  if (session.adminRole !== "SUPER_ADMIN") {
    return buildErrorResponse(
      "SUPER_ADMIN_ONLY",
      "Only super admin can manage servers.",
      [],
      403,
    );
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const ipAddress = String(body.ipAddress || "").trim();
  const domain = String(body.domain || "").trim().toLowerCase();
  const status = Number(body.status ?? 1);
  const maxAccounts = Number(body.maxAccounts ?? 4);

  if (!name || !ipAddress) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Name and IP address are required.",
      [],
    );
  }

  if (![0, 1].includes(status)) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Invalid server status.",
      [],
    );
  }

  if (
    domain &&
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
      domain,
    )
  ) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Enter a valid domain without protocol or path.",
      [],
    );
  }

  if (!Number.isInteger(maxAccounts) || maxAccounts < 1) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Max accounts must be at least 1.",
      [],
    );
  }

  const existingServer = await prisma.server.findFirst({
    where: {
      OR: [{ name }, { ipAddress }, ...(domain ? [{ domain }] : [])],
    },
    select: {
      id: true,
    },
  });

  if (existingServer) {
    return buildErrorResponse(
      "SERVER_EXISTS",
      "Server name, IP address, or domain is already in use.",
      [],
      409,
    );
  }

  try {
    const server = await prisma.server.create({
      data: {
        name,
        ipAddress,
        domain: domain || null,
        status,
        maxAccounts,
        createdBy: session.user.id,
      },
      select: serverSelect,
    });

    return buildResponse(server);
  } catch (error) {
    console.error("CREATE_ADMIN_SERVER_ERROR:", error);
    return buildErrorResponse(
      "CREATE_SERVER_FAILED",
      "Failed to create server.",
      [],
      500,
    );
  }
};
