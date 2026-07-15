This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## pySync server registration

The main application automatically creates a proxied Cloudflare DNS record
when a new pySync VPS registers. Configure these server-only environment
variables:

```env
PYSYNC_REGISTRATION_KEY=shared-registration-secret
CLOUDFLARE_API_TOKEN=cloudflare-token-with-dns-edit
CLOUDFLARE_ZONE_ID=cloudflare-zone-id
CLOUDFLARE_ZONE_NAME=cuanhero.com
PYSYNC_SUBDOMAIN_PREFIX=mt5-vps
```

The Cloudflare token only needs `Zone / DNS / Edit` access for the
`cuanhero.com` zone. A server with database ID `12`, for example, receives
`mt5-vps-12.cuanhero.com`. The `servers.ip_address` field keeps the original
public IP while `servers.domain` keeps the proxied hostname.

## Password reset email

Password reset links are delivered through Resend. Verify the sending domain
in Resend, then configure these server-only environment variables:

```env
BETTER_AUTH_URL=https://cuanhero.com
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=CuanHero <no-reply@cuanhero.com>
```

The reset link expires after one hour and successfully changing a password
revokes the user's existing sessions.

## Exness IB account verification

Creating a `FREE_TRIAL` or `IB_MONTHLY` trading account from the admin panel
requires verification against the Exness Partner Client Accounts report. Add
these server-only variables:

```env
EXNESS_PARTNER_EMAIL=partner@example.com
EXNESS_PARTNER_PASSWORD=your-partner-password
EXNESS_AUTH_URL=https://my.exnessaffiliates.com/api/auth/
EXNESS_CLIENT_ACCOUNTS_URL=https://my.exnessaffiliates.com/api/your-client-accounts-endpoint/{accountId}
EXNESS_PARTNER_CODE=your-partner-code
IB_VERIFICATION_SECRET=a-long-random-secret
```

Copy the exact Client Accounts endpoint from the Exness Partnership API schema.
Use `{accountId}` in the URL when the endpoint accepts the account in its path.
If it uses a query parameter, omit the placeholder and optionally set
`EXNESS_ACCOUNT_QUERY_PARAM` (the default is `client_account`).
`EXNESS_PARTNER_CODE` is optional when the report only returns clients assigned
to the authenticated partner. The verification token is valid for 15 minutes
and is checked again by the create-account API.

## Subscription renewal cron

The renewal cron sends email reminders 7, 3, and 1 day before a subscription
ends, and once more on its end date. Configure a private cron token and,
optionally, customize the reminder days:

```env
CRON_SECRET=your-random-cron-secret
RENEWAL_REMINDER_DAYS=7,3,1,0
```

Call the endpoint once per day using Jakarta time:

```bash
curl -X POST https://cuanhero.com/api/cron/subscription-renewals \
  -H "Authorization: Bearer $CRON_SECRET"
```

Each successful reminder is recorded, so retrying the endpoint does not send
the same reminder twice for the same trading account and end date.

## Subscription expiration cron

The expiration cron disables subscriptions after their full `endDate` has
passed, terminates deployed pySync instances, and marks both the account and EA
runtime as terminated. It uses the same `CRON_SECRET` as the renewal cron.

Call it once per day shortly after midnight in Jakarta:

```bash
curl -X POST https://cuanhero.com/api/cron/subscription-expirations \
  -H "Authorization: Bearer $CRON_SECRET"
```

If pySync cannot be reached, member access is still disabled immediately and
the runtime cleanup is retried on the next cron run.
