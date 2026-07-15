import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  buildErrorResponse,
  buildResponse,
  notAuthorizeResponse,
} from "@/lib/response";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

const SETTINGS_ID = 1;

const settingsSelect = {
  id: true,
  whatsappNumber: true,
  metaTitleEn: true,
  metaTitleId: true,
  metaDescriptionEn: true,
  metaDescriptionId: true,
  orderMessageEn: true,
  orderMessageId: true,
  renewalMessageEn: true,
  renewalMessageId: true,
  consultationMessageEn: true,
  consultationMessageId: true,
  createdAt: true,
  updatedAt: true,
};

const emptySettings = {
  id: SETTINGS_ID,
  whatsappNumber: "",
  metaTitleEn: "",
  metaTitleId: "",
  metaDescriptionEn: "",
  metaDescriptionId: "",
  orderMessageEn: "",
  orderMessageId: "",
  renewalMessageEn: "",
  renewalMessageId: "",
  consultationMessageEn: "",
  consultationMessageId: "",
  createdAt: null,
  updatedAt: null,
};

const ensureAdmin = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user?.role || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return null;
  }

  return session;
};

export const GET = async () => {
  const session = await ensureAdmin();
  if (!session) return notAuthorizeResponse();

  const settings = await prisma.appSetting.findUnique({
    where: { id: SETTINGS_ID },
    select: settingsSelect,
  });

  return buildResponse(settings || emptySettings);
};

export const PATCH = async (req: NextRequest) => {
  const session = await ensureAdmin();
  if (!session) return notAuthorizeResponse();

  const body = await req.json();
  const fields = [
    "whatsappNumber",
    "metaTitleEn",
    "metaTitleId",
    "metaDescriptionEn",
    "metaDescriptionId",
    "orderMessageEn",
    "orderMessageId",
    "renewalMessageEn",
    "renewalMessageId",
    "consultationMessageEn",
    "consultationMessageId",
  ] as const;

  const hasInvalidField = fields.some(
    (field) => typeof body[field] !== "string",
  );

  if (hasInvalidField) {
    return buildErrorResponse(
      "INVALID_SETTINGS",
      "All settings fields must contain text.",
      [],
    );
  }

  const data = Object.fromEntries(
    fields.map((field) => [field, body[field].trim()]),
  ) as Record<(typeof fields)[number], string>;

  if (
    data.whatsappNumber.length > 50 ||
    data.metaTitleEn.length > 191 ||
    data.metaTitleId.length > 191
  ) {
    return buildErrorResponse(
      "INVALID_SETTINGS",
      "WhatsApp number or meta title is too long.",
      [],
    );
  }

  try {
    const settings = await prisma.appSetting.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        ...data,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      },
      update: {
        ...data,
        updatedBy: session.user.id,
      },
      select: settingsSelect,
    });

    return buildResponse(settings);
  } catch (error) {
    console.error("UPDATE_APP_SETTINGS_ERROR:", error);
    return buildErrorResponse(
      "UPDATE_SETTINGS_FAILED",
      "Failed to save application settings.",
      [],
      500,
    );
  }
};
