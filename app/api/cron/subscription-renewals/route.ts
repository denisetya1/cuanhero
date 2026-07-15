import { sendSubscriptionRenewalEmail } from "@/lib/email";
import prisma from "@/lib/prisma";
import { buildErrorResponse, buildResponse } from "@/lib/response";
import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_REMINDER_DAYS = [7, 3, 1, 0];
const CRON_TIME_ZONE = "Asia/Jakarta";

const isAuthorized = (authorization: string | null) => {
  const expected = process.env.CRON_SECRET || "";
  const supplied = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);

  return (
    expectedBuffer.length > 0 &&
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
};

const getReminderDays = () => {
  const configured = process.env.RENEWAL_REMINDER_DAYS;
  if (!configured) return DEFAULT_REMINDER_DAYS;

  const parsed = [
    ...new Set(
      configured
        .split(",")
        .map((value) => Number(value.trim()))
        .filter(
          (value) => Number.isInteger(value) && value >= 0 && value <= 90,
        ),
    ),
  ].sort((a, b) => b - a);

  return parsed.length ? parsed : DEFAULT_REMINDER_DAYS;
};

const getTodayUtc = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: CRON_TIME_ZONE,
  }).formatToParts(new Date());
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return new Date(
    Date.UTC(getPart("year"), getPart("month") - 1, getPart("day")),
  );
};

const addUtcDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const getDateKey = (date: Date) =>
  [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");

const isUniqueConstraintError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "P2002";

const runRenewalNotifications = async (req: NextRequest) => {
  if (!isAuthorized(req.headers.get("authorization"))) {
    return buildErrorResponse(
      "NOT_AUTHORIZED",
      "Invalid cron authorization token.",
      [],
      401,
    );
  }

  const reminderDays = getReminderDays();
  const today = getTodayUtc();
  const targetDates = reminderDays.map((days) => addUtcDays(today, days));
  const daysByDate = new Map(
    targetDates.map((date, index) => [getDateKey(date), reminderDays[index]]),
  );
  const memberUrl = `${(process.env.BETTER_AUTH_URL || "https://cuanhero.com").replace(/\/$/, "")}/member/home`;

  try {
    const accounts = await prisma.tradingAccount.findMany({
      where: {
        endDate: { in: targetDates },
        status: { not: 4 },
        user: { status: 1 },
      },
      select: {
        id: true,
        accountId: true,
        endDate: true,
        expertAdvisor: { select: { name: true } },
        package: { select: { name: true } },
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    let sent = 0;
    let skipped = 0;
    const failures: Array<{ accountId: string; message: string }> = [];

    for (const account of accounts) {
      if (!account.endDate) continue;
      const days = daysByDate.get(getDateKey(account.endDate));
      if (days === undefined) continue;

      let notificationId: number;
      try {
        const notification =
          await prisma.subscriptionRenewalNotification.create({
            data: {
              tradingAccountId: account.id,
              endDate: account.endDate,
              reminderDays: days,
              recipientEmail: account.user.email,
            },
            select: { id: true },
          });
        notificationId = notification.id;
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          skipped += 1;
          continue;
        }
        throw error;
      }

      try {
        await sendSubscriptionRenewalEmail({
          to: account.user.email,
          name: account.user.name,
          accountId: account.accountId,
          endDate: account.endDate,
          packageName: account.package.name,
          expertAdvisorName: account.expertAdvisor.name,
          reminderDays: days,
          memberUrl,
        });
        await prisma.subscriptionRenewalNotification.update({
          where: { id: notificationId },
          data: { sentAt: new Date() },
        });
        sent += 1;
      } catch (error) {
        await prisma.subscriptionRenewalNotification
          .delete({
            where: { id: notificationId },
          })
          .catch(() => undefined);
        failures.push({
          accountId: account.accountId,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return buildResponse({
      date: getDateKey(today),
      timeZone: CRON_TIME_ZONE,
      reminderDays,
      matched: accounts.length,
      sent,
      skipped,
      failed: failures.length,
      failures,
    });
  } catch (error) {
    console.error("SUBSCRIPTION_RENEWAL_CRON_ERROR:", error);
    return buildErrorResponse(
      "RENEWAL_CRON_FAILED",
      "Failed to process subscription renewal notifications.",
      [],
      500,
    );
  }
};

export const GET = runRenewalNotifications;
export const POST = runRenewalNotifications;
