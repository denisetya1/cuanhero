import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  buildResponse,
  buildErrorResponse,
  notAuthorizeResponse,
} from "@/lib/response";
import { headers } from "next/headers";

export const GET = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return notAuthorizeResponse();
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return buildErrorResponse(
      "ADMIN_ONLY",
      "This account does not have admin access.",
      [],
      403,
    );
  }

  return buildResponse(user);
};
