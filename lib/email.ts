import { Resend } from "resend";

type PasswordResetEmail = {
  name?: string | null;
  resetUrl: string;
  to: string;
};

type SubscriptionRenewalEmail = {
  accountId: string;
  endDate: Date;
  expertAdvisorName: string;
  memberUrl: string;
  name?: string | null;
  packageName: string;
  reminderDays: number;
  to: string;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getResendConfig = () => {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL || "CuanHero <no-reply@cuanhero.com>";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return { from, resend: new Resend(apiKey) };
};

export async function sendPasswordResetEmail({
  name,
  resetUrl,
  to,
}: PasswordResetEmail) {
  const safeName = escapeHtml(name?.trim() || "CuanHero Member");
  const safeResetUrl = escapeHtml(resetUrl);
  const { from, resend } = getResendConfig();
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Reset your CuanHero password",
    text: [
      `Hi ${name?.trim() || "CuanHero Member"},`,
      "",
      "We received a request to reset your CuanHero password.",
      `Open this link within 1 hour: ${resetUrl}`,
      "",
      "If you did not request this, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <div style="background:#020713;padding:32px 16px;font-family:Arial,sans-serif;color:#dbeafe">
        <div style="max-width:560px;margin:0 auto;border:1px solid #155e75;border-radius:16px;background:#071225;padding:32px">
          <p style="margin:0 0 8px;color:#22d3ee;font-size:12px;letter-spacing:2px;text-transform:uppercase">CuanHero Security</p>
          <h1 style="margin:0 0 20px;color:#fff;font-size:24px">Reset your password</h1>
          <p style="margin:0 0 12px;line-height:1.6">Hi ${safeName},</p>
          <p style="margin:0 0 24px;line-height:1.6;color:#94a3b8">We received a request to reset your CuanHero password. This link is valid for 1 hour.</p>
          <a href="${safeResetUrl}" style="display:inline-block;border-radius:10px;background:#0891b2;padding:13px 20px;color:#fff;text-decoration:none;font-weight:700">Reset Password</a>
          <p style="margin:24px 0 0;line-height:1.6;color:#64748b;font-size:13px">If you did not request this, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(
      `Resend failed to send password reset email: ${error.message}`,
    );
  }
}

export async function sendSubscriptionRenewalEmail({
  accountId,
  endDate,
  expertAdvisorName,
  memberUrl,
  name,
  packageName,
  reminderDays,
  to,
}: SubscriptionRenewalEmail) {
  const displayName = name?.trim() || "CuanHero Member";
  const formattedEndDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(endDate);
  const deadlineText =
    reminderDays === 0
      ? "ends today"
      : reminderDays === 1
        ? "ends tomorrow"
        : `ends in ${reminderDays} days`;
  const safeName = escapeHtml(displayName);
  const safeAccountId = escapeHtml(accountId);
  const safePackageName = escapeHtml(packageName);
  const safeExpertAdvisorName = escapeHtml(expertAdvisorName);
  const safeMemberUrl = escapeHtml(memberUrl);
  const { from, resend } = getResendConfig();
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Your CuanHero subscription ${deadlineText}`,
    text: [
      `Hi ${displayName},`,
      "",
      `Your CuanHero subscription ${deadlineText}.`,
      `End date: ${formattedEndDate}`,
      `Trading account: ${accountId}`,
      `Package: ${packageName}`,
      `Expert Advisor: ${expertAdvisorName}`,
      "",
      `Open your member dashboard: ${memberUrl}`,
      "",
      "Please renew before the end date to avoid interruption to your EA service.",
    ].join("\n"),
    html: `
      <div style="background:#020713;padding:32px 16px;font-family:Arial,sans-serif;color:#dbeafe">
        <div style="max-width:560px;margin:0 auto;border:1px solid #155e75;border-radius:16px;background:#071225;padding:32px">
          <p style="margin:0 0 8px;color:#22d3ee;font-size:12px;letter-spacing:2px;text-transform:uppercase">CuanHero Subscription</p>
          <h1 style="margin:0 0 20px;color:#fff;font-size:24px">Renewal reminder</h1>
          <p style="margin:0 0 12px;line-height:1.6">Hi ${safeName},</p>
          <p style="margin:0 0 20px;line-height:1.6;color:#94a3b8">Your CuanHero subscription <strong style="color:#fbbf24">${deadlineText}</strong>. Please renew before the end date to avoid interruption to your EA service.</p>
          <div style="margin:0 0 24px;border:1px solid #164e63;border-radius:12px;background:#020b18;padding:16px;line-height:1.8;color:#cbd5e1">
            <div><span style="color:#64748b">End date:</span> ${formattedEndDate}</div>
            <div><span style="color:#64748b">Trading account:</span> ${safeAccountId}</div>
            <div><span style="color:#64748b">Package:</span> ${safePackageName}</div>
            <div><span style="color:#64748b">Expert Advisor:</span> ${safeExpertAdvisorName}</div>
          </div>
          <a href="${safeMemberUrl}" style="display:inline-block;border-radius:10px;background:#0891b2;padding:13px 20px;color:#fff;text-decoration:none;font-weight:700">Open Member Dashboard</a>
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(
      `Resend failed to send subscription renewal email: ${error.message}`,
    );
  }
}
