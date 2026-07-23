import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  buildErrorResponse,
  buildResponse,
  notAuthorizeResponse,
} from "@/lib/response";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { localizedTextToJson } from "@/lib/localized-text";
import { Prisma } from "@/lib/generated/prisma/client";

const expertAdvisorSelect = {
  id: true,
  name: true,
  eaFileName: true,
  currentVersion: true,
  defaultConfig: true,
  description: true,
  image: true,
  isActive: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
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
  { params }: { params: Promise<{ expertAdvisorId: string }> },
) => {
  const session = await ensureAdmin();

  if (!session) {
    return notAuthorizeResponse();
  }

  if (session.adminRole !== "SUPER_ADMIN") {
    return buildErrorResponse(
      "SUPER_ADMIN_ONLY",
      "Only super admin can manage Expert Advisors.",
      [],
      403,
    );
  }

  const { expertAdvisorId } = await params;
  const id = Number(expertAdvisorId);
  const body = await req.json();
  const name = String(body.name || "").trim();
  const eaFileName = String(body.eaFileName || "").trim();
  const currentVersion = String(body.currentVersion || "").trim();
  const defaultConfig = body.defaultConfig ?? null;
  const description = localizedTextToJson(body.description);
  const image = String(body.image || "").trim();
  const isActive =
    typeof body.isActive === "boolean" ? body.isActive : undefined;
  const orderNumber = Number(body.orderNumber ?? 9999);

  if (!id || !name) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Name is required.",
      [],
    );
  }

  if (
    defaultConfig !== null &&
    (typeof defaultConfig !== "object" || Array.isArray(defaultConfig))
  ) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Default config must be a JSON object.",
      [],
    );
  }

  if (!Number.isInteger(orderNumber) || orderNumber < 0) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Order number must be a positive whole number.",
      [],
    );
  }

  const [existingExpertAdvisor, duplicateExpertAdvisor] = await Promise.all([
    prisma.expertAdvisor.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    }),
    prisma.expertAdvisor.findFirst({
      where: {
        name,
        NOT: {
          id,
        },
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!existingExpertAdvisor) {
    return buildErrorResponse(
      "EXPERT_ADVISOR_NOT_FOUND",
      "Expert Advisor not found.",
      [],
      404,
    );
  }

  if (duplicateExpertAdvisor) {
    return buildErrorResponse(
      "EXPERT_ADVISOR_EXISTS",
      "Expert Advisor name is already in use.",
      [],
      409,
    );
  }

  try {
    const expertAdvisor = await prisma.expertAdvisor.update({
      where: {
        id,
      },
      data: {
        name,
        eaFileName,
        currentVersion: currentVersion || null,
        defaultConfig: defaultConfig ?? Prisma.DbNull,
        description: description ?? Prisma.DbNull,
        image: image || null,
        ...(typeof isActive === "boolean" && {
          isActive,
        }),
        orderNumber,
        updatedBy: session.user.id,
      },
      select: expertAdvisorSelect,
    });

    return buildResponse(expertAdvisor);
  } catch (error) {
    console.error("UPDATE_ADMIN_EXPERT_ADVISOR_ERROR:", error);
    return buildErrorResponse(
      "UPDATE_EXPERT_ADVISOR_FAILED",
      "Failed to update Expert Advisor.",
      [],
      500,
    );
  }
};

export const DELETE = async (
  _req: NextRequest,
  { params }: { params: Promise<{ expertAdvisorId: string }> },
) => {
  const session = await ensureAdmin();

  if (!session) {
    return notAuthorizeResponse();
  }

  if (session.adminRole !== "SUPER_ADMIN") {
    return buildErrorResponse(
      "SUPER_ADMIN_ONLY",
      "Only super admin can manage Expert Advisors.",
      [],
      403,
    );
  }

  const { expertAdvisorId } = await params;
  const id = Number(expertAdvisorId);

  if (!id) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Invalid Expert Advisor ID.",
      [],
    );
  }

  const expertAdvisor = await prisma.expertAdvisor.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      _count: {
        select: {
          tradingAccounts: true,
        },
      },
    },
  });

  if (!expertAdvisor) {
    return buildErrorResponse(
      "EXPERT_ADVISOR_NOT_FOUND",
      "Expert Advisor not found.",
      [],
      404,
    );
  }

  if (expertAdvisor._count.tradingAccounts > 0) {
    return buildErrorResponse(
      "EXPERT_ADVISOR_IN_USE",
      "Expert Advisor is still used by trading accounts.",
      [],
      409,
    );
  }

  try {
    await prisma.expertAdvisor.delete({
      where: {
        id,
      },
    });

    return buildResponse({ id });
  } catch (error) {
    console.error("DELETE_ADMIN_EXPERT_ADVISOR_ERROR:", error);
    return buildErrorResponse(
      "DELETE_EXPERT_ADVISOR_FAILED",
      "Failed to delete Expert Advisor.",
      [],
      500,
    );
  }
};
