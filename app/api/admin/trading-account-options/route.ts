import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { buildResponse, notAuthorizeResponse } from "@/lib/response";
import { headers } from "next/headers";

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

  const [packages, expertAdvisors, servers, tradingAccountServers] =
    await Promise.all([
    prisma.package.findMany({
      orderBy: [{ orderNumber: "asc" }, { id: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        price: true,
        recurringType: true,
      },
    }),
    prisma.expertAdvisor.findMany({
      orderBy: [{ orderNumber: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.server.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        maxAccounts: true,
      },
    }),
    prisma.tradingAccount.findMany({
      where: {
        status: {
          not: 4,
        },
      },
      select: {
        serverId: true,
      },
    }),
  ]);

  const serverCountMap = tradingAccountServers.reduce<Map<number, number>>(
    (countMap, account) => {
      if (!account.serverId) {
        return countMap;
      }

      countMap.set(account.serverId, (countMap.get(account.serverId) || 0) + 1);
      return countMap;
    },
    new Map(),
  );

  return buildResponse({
    packages,
    expertAdvisors,
    servers: servers.map((server) => ({
      ...server,
      tradingAccountCount: serverCountMap.get(server.id) || 0,
      hasCapacity:
        (serverCountMap.get(server.id) || 0) < server.maxAccounts,
    })),
  });
};
