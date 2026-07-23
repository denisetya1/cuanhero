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
  "notificationEmails",
  "staticQrisImage",
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
  notificationEmails: true,
  paymentMode: true,
  staticQrisImage: true,
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
  notificationEmails: "",
  paymentMode: "DYNAMIC",
  staticQrisImage: "",
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
  const hasPaymentMode = Object.prototype.hasOwnProperty.call(
    body,
    "paymentMode",
  );
  const hasInvalidField = suppliedFields.some(
    (field) => body[field] !== null && typeof body[field] !== "string",
  ) ||
    (hasTikTokLiveEnabled && typeof body.tiktokLiveEnabled !== "boolean") ||
    (hasPaymentMode &&
      !["DYNAMIC", "STATIC"].includes(
        String(body.paymentMode || "").toUpperCase(),
      ));

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
  const paymentData = hasPaymentMode
    ? {
        paymentMode: String(body.paymentMode).toUpperCase() as
          | "DYNAMIC"
          | "STATIC",
      }
    : {};

  if (data.staticQrisImage) {
    const imageMatch = data.staticQrisImage.match(
      /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/,
    );
    const estimatedBytes = imageMatch
      ? Math.floor((imageMatch[2].length * 3) / 4)
      : Number.POSITIVE_INFINITY;

    if (!imageMatch || estimatedBytes > 2 * 1024 * 1024) {
      return buildErrorResponse(
        "INVALID_QRIS_IMAGE",
        "QRIS image must be PNG, JPG, or WebP and no larger than 2 MB.",
        [],
      );
    }
  }

  const existingPaymentSettings = await prisma.appSetting.findUnique({
    where: { id: SETTINGS_ID },
    select: { paymentMode: true, staticQrisImage: true },
  });
  const nextPaymentMode =
    paymentData.paymentMode ||
    existingPaymentSettings?.paymentMode ||
    "DYNAMIC";
  const nextStaticQrisImage =
    data.staticQrisImage !== undefined
      ? data.staticQrisImage
      : existingPaymentSettings?.staticQrisImage || "";

  if (nextPaymentMode === "STATIC" && !nextStaticQrisImage) {
    return buildErrorResponse(
      "STATIC_QRIS_REQUIRED",
      "Upload a QRIS image before enabling static payment mode.",
      [],
    );
  }

  if (
    data.staticQrisImage === "" &&
    existingPaymentSettings?.staticQrisImage
  ) {
    const pendingStaticOrders = await prisma.order.count({
      where: { status: "PENDING", paymentProvider: "STATIC_QRIS" },
    });
    if (pendingStaticOrders > 0) {
      return buildErrorResponse(
        "STATIC_QRIS_IN_USE",
        "QRIS image cannot be removed while static payment orders are still pending.",
        [],
      );
    }
  }

  if (data.notificationEmails !== undefined) {
    const notificationEmails = [
      ...new Set(
        data.notificationEmails
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    const invalidEmail = notificationEmails.some(
      (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    );

    if (invalidEmail || notificationEmails.length > 20) {
      return buildErrorResponse(
        "INVALID_NOTIFICATION_EMAILS",
        "Enter up to 20 valid notification emails separated by commas.",
        [],
      );
    }

    data.notificationEmails = notificationEmails.join(", ");
  }

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
    (data.notificationEmails?.length ?? 0) > 2000 ||
    (data.tiktokLiveUrl?.length ?? 0) > 191 ||
    (data.metaTitleEn?.length ?? 0) > 191 ||
    (data.metaTitleId?.length ?? 0) > 191
  ) {
    return buildErrorResponse(
      "INVALID_SETTINGS",
      "WhatsApp number, notification emails, TikTok URL, or meta title is too long.",
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
        ...paymentData,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      },
      update: {
        ...data,
        ...booleanData,
        ...paymentData,
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
