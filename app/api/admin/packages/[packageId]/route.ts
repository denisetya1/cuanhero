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
  code: true,
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

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ packageId: string }> },
) => {
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

  const { packageId } = await params;
  const id = Number(packageId);
  const body = await req.json();
  const code = String(body.code || "").trim().toUpperCase() || null;
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

  if (!id || !name || !price || !recurringType) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Name, price, and recurring type are required.",
      [],
    );
  }

  if (code && !/^[A-Z0-9_]+$/.test(code)) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Package code may only contain uppercase letters, numbers, and underscores.",
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

  const [existingPackage, duplicatePackage] = await Promise.all([
    prisma.package.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    }),
    prisma.package.findFirst({
      where: {
        OR: [{ name }, ...(code ? [{ code }] : [])],
        NOT: {
          id,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    }),
  ]);

  if (!existingPackage) {
    return buildErrorResponse(
      "PACKAGE_NOT_FOUND",
      "Package not found.",
      [],
      404,
    );
  }

  if (duplicatePackage) {
    return buildErrorResponse(
      "PACKAGE_EXISTS",
      duplicatePackage.code === code && code
        ? "Package code is already in use."
        : "Package name is already in use.",
      [],
      409,
    );
  }

  try {
    const packageItem = await prisma.package.update({
      where: {
        id,
      },
      data: {
        code,
        name,
        description: description ?? Prisma.DbNull,
        features,
        price,
        discountPercent,
        recurringType,
        orderNumber,
        updatedBy: session.user.id,
      },
      select: packageSelect,
    });

    return buildResponse(packageItem);
  } catch (error) {
    console.error("UPDATE_ADMIN_PACKAGE_ERROR:", error);
    return buildErrorResponse(
      "UPDATE_PACKAGE_FAILED",
      "Failed to update package.",
      [],
      500,
    );
  }
};

export const DELETE = async (
  _req: NextRequest,
  { params }: { params: Promise<{ packageId: string }> },
) => {
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

  const { packageId } = await params;
  const id = Number(packageId);

  if (!id) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Invalid package ID.",
      [],
    );
  }

  const packageItem = await prisma.package.findUnique({
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

  if (!packageItem) {
    return buildErrorResponse(
      "PACKAGE_NOT_FOUND",
      "Package not found.",
      [],
      404,
    );
  }

  if (packageItem._count.tradingAccounts > 0) {
    return buildErrorResponse(
      "PACKAGE_IN_USE",
      "Package is still used by trading accounts.",
      [],
      409,
    );
  }

  try {
    await prisma.package.delete({
      where: {
        id,
      },
    });

    return buildResponse({ id });
  } catch (error) {
    console.error("DELETE_ADMIN_PACKAGE_ERROR:", error);
    return buildErrorResponse(
      "DELETE_PACKAGE_FAILED",
      "Failed to delete package.",
      [],
      500,
    );
  }
};
