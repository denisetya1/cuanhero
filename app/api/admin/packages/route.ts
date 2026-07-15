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

const packageSelect = {
  id: true,
  name: true,
  description: true,
  features: true,
  price: true,
  discountPercent: true,
  recurringType: true,
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

  const packages = await prisma.package.findMany({
    orderBy: [{ orderNumber: "asc" }, { createdAt: "desc" }],
    select: packageSelect,
  });

  return buildResponse(packages);
};

export const POST = async (req: NextRequest) => {
  const session = await ensureAdmin();

  if (!session) {
    return notAuthorizeResponse();
  }

  if (session.adminRole !== "SUPER_ADMIN") {
    return buildErrorResponse(
      "SUPER_ADMIN_ONLY",
      "Only super admin can manage packages.",
      [],
      403,
    );
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const description = localizedTextToJson(body.description);
  const price = String(body.price || "").trim();
  const discountPercentRaw =
    body.discountPercent === null || body.discountPercent === undefined
      ? ""
      : String(body.discountPercent).trim();
  const recurringType = String(body.recurringType || "").trim();
  const features = body.features ?? null;
  const orderNumber = Number(body.orderNumber ?? 9999);

  if (!name || !price || !recurringType) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Name, price, and recurring type are required.",
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

  if (!Number.isFinite(Number(price)) || Number(price) < 0) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Price must be a valid number.",
      [],
    );
  }

  const discountPercent =
    discountPercentRaw === "" ? null : Number(discountPercentRaw);

  if (
    discountPercent !== null &&
    (!Number.isInteger(discountPercent) ||
      discountPercent < 0 ||
      discountPercent > 100)
  ) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Discount must be a whole number from 0 to 100.",
      [],
    );
  }

  const existingPackage = await prisma.package.findFirst({
    where: {
      name,
    },
    select: {
      id: true,
    },
  });

  if (existingPackage) {
    return buildErrorResponse(
      "PACKAGE_EXISTS",
      "Package name is already in use.",
      [],
      409,
    );
  }

  try {
    const packageItem = await prisma.package.create({
      data: {
        name,
        description: description ?? Prisma.DbNull,
        features,
        price,
        discountPercent,
        recurringType,
        orderNumber,
        createdBy: session.user.id,
      },
      select: packageSelect,
    });

    return buildResponse(packageItem);
  } catch (error) {
    console.error("CREATE_ADMIN_PACKAGE_ERROR:", error);
    return buildErrorResponse(
      "CREATE_PACKAGE_FAILED",
      "Failed to create package.",
      [],
      500,
    );
  }
};
