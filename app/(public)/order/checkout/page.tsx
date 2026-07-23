import { auth } from "@/lib/auth";
import { getLocalizedText } from "@/lib/localized-text";
import prisma from "@/lib/prisma";
import { ArrowLeft, ShieldCheck, UserRound } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import CheckoutPaymentOptions from "../../components/CheckoutPaymentOptions";
import RegisterForm from "../../../member/components/RegisterForm";

const formatPrice = (value: string) => {
  const price = Number(value);
  if (!Number.isFinite(price)) return value;

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
};

export const dynamic = "force-dynamic";

export default async function PublicOrderCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    ea?: string | string[];
    package?: string | string[];
    tradingAccountId?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const eaId = Number(Array.isArray(params.ea) ? params.ea[0] : params.ea);
  const packageId = Number(
    Array.isArray(params.package) ? params.package[0] : params.package,
  );
  const tradingAccountParam = Array.isArray(params.tradingAccountId)
    ? params.tradingAccountId[0]
    : params.tradingAccountId;
  const tradingAccountId = Number(tradingAccountParam);
  const isUpgrade = tradingAccountParam !== undefined;

  if (
    !Number.isInteger(eaId) ||
    !Number.isInteger(packageId) ||
    (isUpgrade && (!Number.isInteger(tradingAccountId) || tradingAccountId <= 0))
  ) {
    redirect("/order");
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const checkoutQuery = new URLSearchParams({
    ea: String(eaId),
    package: String(packageId),
  });
  if (isUpgrade) checkoutQuery.set("tradingAccountId", String(tradingAccountId));
  const checkoutPath = `/order/checkout?${checkoutQuery.toString()}`;

  if (isUpgrade && !session) {
    redirect(`/member/login?ref=${encodeURIComponent(checkoutPath)}`);
  }

  const [upgradeAccount, expertAdvisor, packageItem, paymentSettings] =
    await Promise.all([
    isUpgrade && session
      ? prisma.tradingAccount.findFirst({
          where: {
            id: tradingAccountId,
            userId: session.user.id,
            status: { not: 4 },
          },
          select: {
            id: true,
            accountId: true,
            accountName: true,
            accountServer: true,
            expertAdvisorId: true,
            package: { select: { code: true, name: true } },
          },
        })
      : Promise.resolve(null),
    prisma.expertAdvisor.findFirst({
      where: { id: eaId, isActive: true },
      select: { id: true, name: true, description: true, codeName: true },
    }),
    prisma.package.findUnique({
      where: { id: packageId },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        price: true,
        discountPercent: true,
        recurringType: true,
      },
    }),
    prisma.appSetting.findUnique({
      where: { id: 1 },
      select: { paymentMode: true, staticQrisImage: true },
    }),
  ]);

  if (
    !expertAdvisor ||
    !packageItem ||
    (isUpgrade &&
      (!upgradeAccount ||
        upgradeAccount.expertAdvisorId !== expertAdvisor.id ||
        packageItem.code?.trim().toUpperCase() === "FREE_TRIAL"))
  ) {
    redirect(isUpgrade ? `/order?tradingAccountId=${tradingAccountId}` : "/order");
  }

  const currentUser = session
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { phoneNumber: true },
      })
    : null;

  const price = Number(packageItem.price);
  const discount = packageItem.discountPercent || 0;
  const applyIntroDiscount =
    !upgradeAccount ||
    upgradeAccount.package.code?.trim().toUpperCase() === "FREE_TRIAL";
  const total =
    Number.isFinite(price) && discount > 0 && applyIntroDiscount
      ? String(price - (price * discount) / 100)
      : packageItem.price;
  const showNextBillingAmount =
    packageItem.code?.trim().toUpperCase() !== "FREE_TRIAL" &&
    packageItem.recurringType.trim().toLowerCase() !== "lifetime";

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-16">
      <Link
        href={
          upgradeAccount
            ? `/order?tradingAccountId=${upgradeAccount.id}&package=${packageItem.id}`
            : `/order?ea=${expertAdvisor.id}&package=${packageItem.id}`
        }
        className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Ubah pilihan
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur md:p-8">
          {session ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                    Customer Details
                  </p>
                  <h1 className="text-2xl font-bold text-white">
                    Detail pembeli
                  </h1>
                </div>
              </div>

              <div className="mt-6 grid gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Nama</p>
                  <p className="mt-1 font-semibold text-white">
                    {session.user.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="mt-1 break-all font-semibold text-white">
                    {session.user.email}
                  </p>
                </div>
                {upgradeAccount ? (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-500">Trading Account</p>
                    <p className="mt-1 font-semibold text-emerald-300">
                      {upgradeAccount.accountId}
                      {upgradeAccount.accountName
                        ? ` · ${upgradeAccount.accountName}`
                        : ""}
                    </p>
                  </div>
                ) : null}
              </div>

              <CheckoutPaymentOptions
                expertAdvisorId={expertAdvisor.id}
                packageId={packageItem.id}
                tradingAccountId={upgradeAccount?.id}
                isFree={Number(total) === 0}
                defaultPhone={currentUser?.phoneNumber || ""}
                paymentMode={
                  paymentSettings?.paymentMode === "STATIC"
                    ? "STATIC"
                    : "DYNAMIC"
                }
                staticQrisReady={Boolean(paymentSettings?.staticQrisImage)}
              />
            </>
          ) : (
            <>
              <RegisterForm redirectTo={checkoutPath} />
              <div className="mt-6 border-t border-cyan-400/15 pt-5 text-center">
                <p className="mb-3 text-xs text-slate-500">
                  Sudah memiliki akun CuanHero?
                </p>
                <Link
                  href={`/member/login?ref=${encodeURIComponent(checkoutPath)}`}
                  className="inline-flex h-11 w-full items-center justify-center rounded-md border border-cyan-300/40 bg-cyan-400/5 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/10"
                >
                  Login
                </Link>
              </div>
            </>
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.25)] backdrop-blur lg:sticky lg:top-28">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
            Ringkasan Order
          </p>
          <div className="mt-5 space-y-5 border-y border-white/10 py-5">
            <div>
              {upgradeAccount ? (
                <div className="mb-5">
                  <p className="text-xs text-slate-500">Upgrade Account</p>
                  <p className="mt-1 font-semibold text-emerald-300">
                    {upgradeAccount.accountId}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Current: {upgradeAccount.package.name}
                  </p>
                </div>
              ) : null}
              <p className="text-xs text-slate-500">Expert Advisor</p>
              <p className="mt-1 font-semibold text-white">
                {expertAdvisor.name}
              </p>
              {expertAdvisor.codeName ? (
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  {expertAdvisor.codeName}
                </p>
              ) : null}
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">
                {getLocalizedText(expertAdvisor.description, "id")}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Package</p>
              <p className="mt-1 font-semibold text-white">
                {packageItem.name}
              </p>
              <p className="text-xs text-slate-400">
                {packageItem.recurringType}
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-end justify-between gap-4">
            <span className="text-sm text-slate-400">Total</span>
            <span className="text-xl font-black text-white">
              {formatPrice(total)}
            </span>
          </div>
          {showNextBillingAmount ? (
            <div className="mt-4 flex items-start justify-between gap-4 border-t border-white/10 pt-4">
              <div>
                <p className="text-xs font-semibold text-slate-300">
                  Next Billing Amount
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Dibayar manual saat melakukan renewal.
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-cyan-300">
                {formatPrice(packageItem.price)}
              </p>
            </div>
          ) : null}
          {upgradeAccount && !applyIntroDiscount ? (
            <p className="mt-2 text-right text-xs text-slate-500">
              Renewal menggunakan harga normal tanpa diskon pembelian pertama.
            </p>
          ) : null}
          <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            {paymentSettings?.paymentMode === "STATIC"
              ? "Pembayaran QRIS akan diverifikasi secara manual oleh tim CuanHero."
              : "Pembayaran akan diproses melalui koneksi payment gateway yang aman."}
          </div>
        </aside>
      </div>
    </section>
  );
}
