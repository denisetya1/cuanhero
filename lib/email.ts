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

type DeploymentReadyEmail = {
  accountId: string;
  expertAdvisorName: string;
  memberUrl: string;
  name?: string | null;
  to: string;
};

type HealthcheckOfflineEmail = {
  checkedAt: Date;
  dashboardUrl: string;
  offlineAccounts: Array<{
    accountId: string;
    serverName: string;
  }>;
  offlineServers: Array<{
    address: string;
    error?: string;
    name: string;
  }>;
  to: string[];
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

export async function sendDeploymentReadyEmail({
  accountId,
  expertAdvisorName,
  memberUrl,
  name,
  to,
}: DeploymentReadyEmail) {
  const displayName = name?.trim() || "CuanHero Member";
  const safeName = escapeHtml(displayName);
  const safeAccountId = escapeHtml(accountId);
  const safeExpertAdvisorName = escapeHtml(expertAdvisorName);
  const safeMemberUrl = escapeHtml(memberUrl);
  const { from, resend } = getResendConfig();
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Robot CuanHero untuk akun ${accountId} sudah siap`,
    text: [
      `Halo ${displayName},`,
      "",
      `Robot ${expertAdvisorName} untuk trading account ${accountId} sudah selesai di-deploy dan siap digunakan.`,
      "",
      "Silakan buka Member Dashboard, aktifkan Enable Auto Trade, kemudian klik Save Changes agar robot mulai melakukan trading otomatis.",
      "",
      `Buka Member Dashboard: ${memberUrl}`,
      "",
      "Pastikan pengaturan akun sudah sesuai sebelum mengaktifkan Auto Trade.",
    ].join("\n"),
    html: `
      <div style="background:#020713;padding:32px 16px;font-family:Arial,sans-serif;color:#dbeafe">
        <div style="max-width:560px;margin:0 auto;border:1px solid #155e75;border-radius:16px;background:#071225;padding:32px">
          <p style="margin:0 0 8px;color:#22d3ee;font-size:12px;letter-spacing:2px;text-transform:uppercase">CuanHero Deployment</p>
          <h1 style="margin:0 0 20px;color:#fff;font-size:24px">Robot Anda sudah siap</h1>
          <p style="margin:0 0 12px;line-height:1.6">Halo ${safeName},</p>
          <p style="margin:0 0 20px;line-height:1.6;color:#94a3b8">Robot telah selesai di-deploy dan siap digunakan.</p>
          <div style="margin:0 0 24px;border:1px solid #164e63;border-radius:12px;background:#020b18;padding:16px;line-height:1.8;color:#cbd5e1">
            <div><span style="color:#64748b">Trading account:</span> ${safeAccountId}</div>
            <div><span style="color:#64748b">Expert Advisor:</span> ${safeExpertAdvisorName}</div>
          </div>
          <div style="margin:0 0 24px;border-left:3px solid #22d3ee;background:#083344;padding:14px 16px;line-height:1.6;color:#cffafe">
            Buka Member Dashboard, aktifkan <strong>Enable Auto Trade</strong>, lalu klik <strong>Save Changes</strong> agar robot mulai melakukan trading otomatis.
          </div>
          <a href="${safeMemberUrl}" style="display:inline-block;border-radius:10px;background:#0891b2;padding:13px 20px;color:#fff;text-decoration:none;font-weight:700">Open Member Dashboard</a>
          <p style="margin:24px 0 0;line-height:1.6;color:#64748b;font-size:13px">Pastikan pengaturan akun sudah sesuai sebelum mengaktifkan Auto Trade.</p>
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(
      `Resend failed to send deployment ready email: ${error.message}`,
    );
  }
}

export async function sendHealthcheckOfflineEmail({
  checkedAt,
  dashboardUrl,
  offlineAccounts,
  offlineServers,
  to,
}: HealthcheckOfflineEmail) {
  const formattedCheckedAt = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(checkedAt);
  const incidentCount = offlineServers.length + offlineAccounts.length;
  const safeDashboardUrl = escapeHtml(dashboardUrl);
  const serverRows = offlineServers
    .map(
      (server) => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #1e293b">Server</td>
          <td style="padding:10px;border-bottom:1px solid #1e293b">${escapeHtml(server.name)}</td>
          <td style="padding:10px;border-bottom:1px solid #1e293b">${escapeHtml(server.address)}</td>
          <td style="padding:10px;border-bottom:1px solid #1e293b;color:#fca5a5">${escapeHtml(server.error || "Offline")}</td>
        </tr>`,
    )
    .join("");
  const accountRows = offlineAccounts
    .map(
      (account) => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #1e293b">Trading account</td>
          <td style="padding:10px;border-bottom:1px solid #1e293b">${escapeHtml(account.accountId)}</td>
          <td style="padding:10px;border-bottom:1px solid #1e293b">${escapeHtml(account.serverName)}</td>
          <td style="padding:10px;border-bottom:1px solid #1e293b;color:#fca5a5">Offline</td>
        </tr>`,
    )
    .join("");
  const textLines = [
    `CuanHero detected ${incidentCount} new offline incident${incidentCount === 1 ? "" : "s"}.`,
    `Checked at: ${formattedCheckedAt}`,
    "",
    ...offlineServers.map(
      (server) =>
        `Server: ${server.name} (${server.address}) - ${server.error || "Offline"}`,
    ),
    ...offlineAccounts.map(
      (account) =>
        `Trading account: ${account.accountId} on ${account.serverName} - Offline`,
    ),
    "",
    `Open Admin Dashboard: ${dashboardUrl}`,
  ];
  const { from, resend } = getResendConfig();
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `[CuanHero Alert] ${incidentCount} service${incidentCount === 1 ? "" : "s"} offline`,
    text: textLines.join("\n"),
    html: `
      <div style="background:#020713;padding:32px 16px;font-family:Arial,sans-serif;color:#dbeafe">
        <div style="max-width:760px;margin:0 auto;border:1px solid #7f1d1d;border-radius:16px;background:#071225;padding:32px">
          <p style="margin:0 0 8px;color:#f87171;font-size:12px;letter-spacing:2px;text-transform:uppercase">CuanHero Healthcheck Alert</p>
          <h1 style="margin:0 0 12px;color:#fff;font-size:24px">Service offline detected</h1>
          <p style="margin:0 0 20px;color:#94a3b8;line-height:1.6">The scheduled healthcheck detected ${incidentCount} new offline incident${incidentCount === 1 ? "" : "s"} at ${formattedCheckedAt}.</p>
          <div style="overflow-x:auto;margin-bottom:24px">
            <table style="width:100%;border-collapse:collapse;background:#020b18;color:#cbd5e1;font-size:13px">
              <thead><tr style="color:#94a3b8;text-align:left"><th style="padding:10px">Type</th><th style="padding:10px">Name / Account</th><th style="padding:10px">Address / Server</th><th style="padding:10px">Status</th></tr></thead>
              <tbody>${serverRows}${accountRows}</tbody>
            </table>
          </div>
          <a href="${safeDashboardUrl}" style="display:inline-block;border-radius:10px;background:#dc2626;padding:13px 20px;color:#fff;text-decoration:none;font-weight:700">Open Admin Dashboard</a>
          <p style="margin:20px 0 0;color:#64748b;font-size:12px;line-height:1.5">This notification is sent only when a service changes to offline. It is not repeated during every healthcheck.</p>
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(
      `Resend failed to send healthcheck alert email: ${error.message}`,
    );
  }
}
