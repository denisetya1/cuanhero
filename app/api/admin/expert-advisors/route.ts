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

export const GET = async () => {
  const session = await ensureAdmin();

  if (!session) {
    return notAuthorizeResponse();
  }

  const expertAdvisors = await prisma.expertAdvisor.findMany({
    orderBy: [{ orderNumber: "asc" }, { createdAt: "desc" }],
    select: expertAdvisorSelect,
  });

  return buildResponse(expertAdvisors);
};

export const POST = async (req: NextRequest) => {
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

  const body = await req.json();
  const name = String(body.name || "").trim();
  const eaFileName = String(body.eaFileName || "").trim();
  const currentVersion = String(body.currentVersion || "").trim();
  const defaultConfig = body.defaultConfig ?? null;
  const description = localizedTextToJson(body.description);
  const image = String(body.image || "").trim();
  const isActive =
    typeof body.isActive === "boolean" ? body.isActive : true;
  const orderNumber = Number(body.orderNumber ?? 9999);

  if (!name) {
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

  const existingExpertAdvisor = await prisma.expertAdvisor.findFirst({
    where: {
      name,
    },
    select: {
      id: true,
    },
  });

  if (existingExpertAdvisor) {
    return buildErrorResponse(
      "EXPERT_ADVISOR_EXISTS",
      "Expert Advisor name is already in use.",
      [],
      409,
    );
  }

  try {
    const expertAdvisor = await prisma.expertAdvisor.create({
      data: {
        name,
        eaFileName,
        currentVersion: currentVersion || null,
        defaultConfig: defaultConfig ?? Prisma.DbNull,
        description: description ?? Prisma.DbNull,
        image: image || null,
        isActive,
        orderNumber,
        createdBy: session.user.id,
      },
      select: expertAdvisorSelect,
    });

    return buildResponse(expertAdvisor);
  } catch (error) {
    console.error("CREATE_ADMIN_EXPERT_ADVISOR_ERROR:", error);
    return buildErrorResponse(
      "CREATE_EXPERT_ADVISOR_FAILED",
      "Failed to create Expert Advisor.",
      [],
      500,
    );
  }
};
