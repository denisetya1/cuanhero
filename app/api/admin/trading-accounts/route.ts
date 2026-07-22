import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { buildResponse, notAuthorizeResponse } from "@/lib/response";
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

export const GET = async () => {
  if (!(await ensureAdmin())) return notAuthorizeResponse();

  const tradingAccounts = await prisma.tradingAccount.findMany({
    where: {
      status: {
        not: 4,
      },
    },
    // Keep monitor rows stable while heartbeat updates lastSync in the
    // background. New accounts are appended instead of reshuffling old rows.
    orderBy: { id: "asc" },
    select: {
      id: true,
      accountId: true,
      accountName: true,
      accountServer: true,
      status: true,
      eaStatus: true,
      lastSync: true,
      endDate: true,
      user: { select: { id: true, name: true, email: true } },
      server: { select: { id: true, name: true } },
      package: { select: { name: true } },
      expertAdvisor: { select: { name: true } },
    },
  });

  return buildResponse(tradingAccounts);
};
