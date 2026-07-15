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

  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
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
    },
  });

  return buildResponse(users);
};

export const POST = async (req: NextRequest) => {
  const session = await ensureAdmin();

  if (!session) {
    return notAuthorizeResponse();
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const phoneNumber = String(body.phoneNumber || "").trim();
  const role = String(body.role || "MEMBER").toUpperCase();
  const status = Number(body.status ?? 1);

  if (!name || !email || !password) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Name, email, and password are required.",
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
      "Only super admin can create super admin users.",
      [],
      403,
    );
  }

  if (password.length < 8) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Password must be at least 8 characters.",
      [],
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return buildErrorResponse(
      "EMAIL_EXISTS",
      "Email is already registered.",
      [],
      409,
    );
  }

  try {
    const signUpResult = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
      headers: await headers(),
    });

    const userId = signUpResult.user.id;

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role,
        status: Number.isNaN(status) ? 1 : status,
        phoneNumber: phoneNumber || null,
      },
      select: {
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
      },
    });

    return buildResponse(user);
  } catch (error) {
    console.error("CREATE_ADMIN_USER_ERROR:", error);
    return buildErrorResponse(
      "CREATE_USER_FAILED",
      "Failed to create user.",
      [],
      500,
    );
  }
};
