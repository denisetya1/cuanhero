import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  buildErrorResponse,
  buildResponse,
  notAuthorizeResponse,
} from "@/lib/response";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

const allowedRoles = ["MEMBER", "ADMIN", "SUPER_ADMIN"];

const userSelect = {
  id: true,
  name: true,
  email: true,
  phoneNumber: true,
  role: true,
  status: true,
  createdAt: true,
  _count: {
    select: {
      tradingAccounts: true,
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

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) => {
  const session = await ensureAdmin();

  if (!session) {
    return notAuthorizeResponse();
  }

  const { userId } = await params;
  const body = await req.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phoneNumber = String(body.phoneNumber || "").trim();
  const role = String(body.role || "MEMBER").toUpperCase();
  const status = Number(body.status ?? 1);

  if (!name || !email) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Name and email are required.",
      [],
    );
  }

  if (!allowedRoles.includes(role)) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Invalid user role.",
      [],
    );
  }

  if (role === "SUPER_ADMIN" && session.adminRole !== "SUPER_ADMIN") {
    return buildErrorResponse(
      "SUPER_ADMIN_ONLY",
      "Only super admin can assign super admin role.",
      [],
      403,
    );
  }

  if (![0, 1].includes(status)) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Invalid user status.",
      [],
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!existingUser) {
    return buildErrorResponse("USER_NOT_FOUND", "User not found.", [], 404);
  }

  if (
    existingUser.role === "SUPER_ADMIN" &&
    session.adminRole !== "SUPER_ADMIN"
  ) {
    return buildErrorResponse(
      "SUPER_ADMIN_ONLY",
      "Only super admin can update super admin users.",
      [],
      403,
    );
  }

  const existingEmail = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  if (existingEmail && existingEmail.id !== userId) {
    return buildErrorResponse(
      "EMAIL_EXISTS",
      "Email is already registered.",
      [],
      409,
    );
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          name,
          email,
          phoneNumber: phoneNumber || null,
          role,
          status,
        },
        select: userSelect,
      });

      if (status === 0) {
        await tx.tradingAccount.updateMany({
          where: {
            userId,
          },
          data: {
            status: 0,
            eaStatus: 0,
          },
        });
      }

      return updatedUser;
    });

    return buildResponse(user);
  } catch (error) {
    console.error("UPDATE_ADMIN_USER_ERROR:", error);
    return buildErrorResponse(
      "UPDATE_USER_FAILED",
      "Failed to update user.",
      [],
      500,
    );
  }
};

export const DELETE = async (
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) => {
  const session = await ensureAdmin();

  if (!session) {
    return notAuthorizeResponse();
  }

  const { userId } = await params;

  if (userId === session.user.id) {
    return buildErrorResponse(
      "DELETE_SELF_NOT_ALLOWED",
      "You cannot delete your own admin account.",
      [],
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!existingUser) {
    return buildErrorResponse("USER_NOT_FOUND", "User not found.", [], 404);
  }

  if (
    existingUser.role === "SUPER_ADMIN" &&
    session.adminRole !== "SUPER_ADMIN"
  ) {
    return buildErrorResponse(
      "SUPER_ADMIN_ONLY",
      "Only super admin can delete super admin users.",
      [],
      403,
    );
  }

  try {
    await prisma.$transaction([
      prisma.tradingAccount.updateMany({
        where: {
          userId,
        },
        data: {
          userId: null as unknown as string,
        },
      }),
      prisma.user.delete({
        where: {
          id: userId,
        },
      }),
    ]);

    return buildResponse({ id: userId });
  } catch (error) {
    console.error("DELETE_ADMIN_USER_ERROR:", error);
    return buildErrorResponse(
      "DELETE_USER_FAILED",
      "Failed to delete user.",
      [],
      500,
    );
  }
};
