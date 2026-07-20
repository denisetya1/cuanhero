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
EXNESS_AUTH_URL=https://my.exnessaffiliates.com/api/v2/auth/
EXNESS_AUTH_LOGIN_FIELD=login
EXNESS_CLIENT_ACCOUNTS_URL=https://my.exnessaffiliates.com/api/reports/clients/accounts/
EXNESS_ACCOUNT_QUERY_PARAM=client_account
IB_VERIFICATION_SECRET=a-long-random-secret
```

The verification request calls the Client Accounts report with
`client_account=<MT5 login>`. `EXNESS_CLIENT_ACCOUNTS_URL` and
`EXNESS_ACCOUNT_QUERY_PARAM` are optional overrides; the values above are the
application defaults.
Because this report is scoped to the authenticated Partner account, a row whose
`client_account` matches the MT5 login is considered verified. Its
`partner_code` is returned as metadata and is not restricted to one code. The
verification token is valid for 15 minutes and is checked again by the
create-account API.

The application defaults to the `login` request field for v2 and `email` for
the legacy endpoint. Use `EXNESS_AUTH_LOGIN_FIELD` to override this when
required by the live Swagger schema.

## iPaymu checkout

Checkout menggunakan API Direct Payment iPaymu dengan metode QRIS. QR code
pembayaran ditampilkan pada halaman status order tanpa redirect ke hosted
payment page iPaymu. Biaya transaksi menggunakan `feeDirection: MERCHANT`,
sehingga pelanggan tetap membayar sesuai harga package. API key
hanya digunakan dari server. Gunakan credential sandbox untuk pengujian dan
ganti environment ke `production` setelah siap live:

```env
IPAYMU_ENV=sandbox
IPAYMU_VA=your-ipaymu-va
IPAYMU_API_KEY=your-ipaymu-api-key
```

Callback URL yang didaftarkan/digunakan adalah:

```text
https://cuanhero.com/api/payments/ipaymu/callback
```

Set callback notification di dashboard iPaymu ke JSON bila tersedia. Setelah
schema berubah, sinkronkan database menggunakan workflow project ini:

```bash
npx prisma db push
npx prisma generate
```

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

The expiration flow has two stages and uses the same `CRON_SECRET` as the
renewal cron:

1. One hour before the end of the subscription date (23:00 WIB), Auto Trade is
   changed to `false` in pySync and the member configuration is locked.
2. After a three-day grace period has fully elapsed, the deployed pySync
   instance is terminated and both the account and EA runtime are marked as
   terminated.

Run the disable endpoint every minute so the one-hour cutoff is applied on
time:

```bash
* * * * * /usr/bin/curl --fail-with-body --silent --show-error --max-time 60 -X POST https://cuanhero.com/api/cron/subscription-disables -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/cuanhero-subscription-disable.log 2>&1
```

Call the termination endpoint once per day after 00:00 WIB:

```bash
curl -X POST https://cuanhero.com/api/cron/subscription-expirations \
  -H "Authorization: Bearer $CRON_SECRET"
```

If pySync cannot be reached, the disable or runtime cleanup is retried on the
next cron run. Member config writes are independently blocked by the API after
the one-hour cutoff.

## Runtime healthcheck cron

The healthcheck cron calls the bulk pySync health endpoint for every server,
updates each server's online status, and synchronizes deployed bot runtime
status and heartbeat time. It uses the same `CRON_SECRET` as the subscription
cron endpoints.

Run it every five minutes:

```bash
curl -X POST https://cuanhero.com/api/cron/healthchecks \
  -H "Authorization: Bearer $CRON_SECRET"
```

An unreachable server is marked offline without immediately changing its bot
statuses, preventing a temporary network failure from being recorded as every
bot stopping.

Live pySync bot processes whose account ID is missing from the trading accounts
table or registered to a different server are stored in the
`runtime_health_issues` table. Repeated detections update the same incident;
when the process is no longer detected, `resolved_at` is populated. The cron
only records these processes and does not terminate them automatically.
