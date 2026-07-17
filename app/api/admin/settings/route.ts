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

const settingsFields = [
  "whatsappNumber",
  "tiktokLiveUrl",
  "metaTitleEn",
  "metaTitleId",
  "metaDescriptionEn",
  "metaDescriptionId",
  "orderMessageEn",
  "orderMessageId",
  "freeTrialMessageEn",
  "freeTrialMessageId",
  "renewalMessageEn",
  "renewalMessageId",
  "consultationMessageEn",
  "consultationMessageId",
] as const;

const defaultTextSettings = Object.fromEntries(
  settingsFields.map((field) => [field, ""]),
) as Record<(typeof settingsFields)[number], string>;

const settingsSelect = {
  id: true,
  whatsappNumber: true,
  tiktokLiveEnabled: true,
  tiktokLiveUrl: true,
  metaTitleEn: true,
  metaTitleId: true,
  metaDescriptionEn: true,
  metaDescriptionId: true,
  orderMessageEn: true,
  orderMessageId: true,
  freeTrialMessageEn: true,
  freeTrialMessageId: true,
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
  tiktokLiveEnabled: false,
  tiktokLiveUrl: "",
  metaTitleEn: "",
  metaTitleId: "",
  metaDescriptionEn: "",
  metaDescriptionId: "",
  orderMessageEn: "",
  orderMessageId: "",
  freeTrialMessageEn: "",
  freeTrialMessageId: "",
  renewalMessageEn: "",
  renewalMessageId: "",
  consultationMessageEn: "",
  consultationMessageId: "",
  createdAt: null,
  updatedAt: null,
};

const normalizeSettings = <T extends Record<string, unknown>>(settings: T) => ({
  ...settings,
  ...Object.fromEntries(
    settingsFields.map((field) => [
      field,
      typeof settings[field] === "string" ? settings[field] : "",
    ]),
  ),
});

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

  return buildResponse(normalizeSettings(settings || emptySettings));
};

export const PATCH = async (req: NextRequest) => {
  const session = await ensureAdmin();
  if (!session) return notAuthorizeResponse();

  const body = await req.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return buildErrorResponse(
      "INVALID_SETTINGS",
      "Settings payload must be an object.",
      [],
    );
  }

  const suppliedFields = settingsFields.filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );
  const hasTikTokLiveEnabled = Object.prototype.hasOwnProperty.call(
    body,
    "tiktokLiveEnabled",
  );
  const hasInvalidField = suppliedFields.some(
    (field) => body[field] !== null && typeof body[field] !== "string",
  ) ||
    (hasTikTokLiveEnabled && typeof body.tiktokLiveEnabled !== "boolean");

  if (hasInvalidField) {
    return buildErrorResponse(
      "INVALID_SETTINGS",
      "Settings fields must contain text or be left empty.",
      [],
    );
  }

  const data = Object.fromEntries(
    suppliedFields.map((field) => [
      field,
      typeof body[field] === "string" ? body[field].trim() : "",
    ]),
  ) as Partial<Record<(typeof settingsFields)[number], string>>;
  const booleanData = hasTikTokLiveEnabled
    ? { tiktokLiveEnabled: body.tiktokLiveEnabled as boolean }
    : {};

  if (data.tiktokLiveUrl) {
    try {
      const url = new URL(data.tiktokLiveUrl);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      return buildErrorResponse(
        "INVALID_SETTINGS",
        "TikTok Live URL must be a valid HTTP or HTTPS URL.",
        [],
      );
    }
  }

  if (
    (data.whatsappNumber?.length ?? 0) > 50 ||
    (data.tiktokLiveUrl?.length ?? 0) > 191 ||
    (data.metaTitleEn?.length ?? 0) > 191 ||
    (data.metaTitleId?.length ?? 0) > 191
  ) {
    return buildErrorResponse(
      "INVALID_SETTINGS",
      "WhatsApp number, TikTok URL, or meta title is too long.",
      [],
    );
  }

  try {
    const settings = await prisma.appSetting.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        ...defaultTextSettings,
        ...data,
        ...booleanData,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      },
      update: {
        ...data,
        ...booleanData,
        updatedBy: session.user.id,
      },
      select: settingsSelect,
    });

    return buildResponse(normalizeSettings(settings));
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
