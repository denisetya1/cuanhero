"use client";

import { handleRes } from "@/lib/response";
import { getLocalizedText } from "@/lib/localized-text";
import { ArrowRight, Bot, Check, Loader2, PackageCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { LandingLang } from "./landing-content";

type ExpertAdvisor = {
  id: number;
  name: string;
  description: Record<string, string> | string | null;
  codeName: string;
};

type PackageItem = {
  id: number;
  code: string | null;
  name: string;
  description: Record<string, string> | string | null;
  price: string;
  discountPercent: number | null;
  recurringType: string;
};

type UpgradeAccount = {
  id: number;
  accountId: string;
  accountName: string | null;
  accountServer: string | null;
  expertAdvisor: { id: number; name: string };
  package: { code: string | null; name: string; recurringType: string };
};

type TradingAccountsResponse = {
  data: UpgradeAccount[];
};

type PricingResponse = {
  data: {
    expertAdvisors: ExpertAdvisor[];
    packages: PackageItem[];
  };
};

const copy = {
  id: {
    eyebrow: "Order CuanHero",
    title: "Pilih robot dan paket Anda.",
    description:
      "Pilih kombinasi EA dan lisensi terlebih dahulu. Setelah itu Anda akan diminta login atau membuat akun sebelum melanjutkan ke pembayaran.",
    ea: "1. Pilih Robot EA",
    plan: "2. Pilih Paket",
    summary: "Ringkasan Order",
    continue: "Checkout",
    loading: "Memuat pilihan order...",
    error: "Pilihan order tidak dapat dimuat.",
    selectBoth: "Pilih robot dan paket untuk melanjutkan.",
    account: "Trading Account untuk Upgrade",
    lockedEa: "Robot mengikuti trading account yang sedang digunakan.",
    invalidAccount: "Trading account upgrade tidak ditemukan atau bukan milik Anda.",
  },
  en: {
    eyebrow: "CuanHero Order",
    title: "Choose your robot and plan.",
    description:
      "Select an EA and license first. You will be asked to sign in or create an account before proceeding to payment.",
    ea: "1. Choose an EA Robot",
    plan: "2. Choose a Plan",
    summary: "Order Summary",
    continue: "Checkout",
    loading: "Loading order options...",
    error: "Order options could not be loaded.",
    selectBoth: "Choose a robot and plan to continue.",
    account: "Trading Account to Upgrade",
    lockedEa: "The robot follows the Expert Advisor currently used by this account.",
    invalidAccount: "The upgrade trading account was not found or does not belong to you.",
  },
} as const;

const formatPrice = (value: string, lang: LandingLang) => {
  const price = Number(value);
  if (!Number.isFinite(price)) return value;

  return new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
};

const finalPrice = (item: PackageItem, applyDiscount = true) => {
  const price = Number(item.price);
  const discount = item.discountPercent || 0;
  if (!Number.isFinite(price) || discount <= 0 || !applyDiscount) {
    return item.price;
  }
  return String(price - (price * discount) / 100);
};

export default function OrderPage({ lang }: { lang: LandingLang }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = copy[lang];
  const [data, setData] = useState<PricingResponse["data"] | null>(null);
  const [eaId, setEaId] = useState<number | null>(null);
  const [packageId, setPackageId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upgradeAccount, setUpgradeAccount] = useState<UpgradeAccount | null>(
    null,
  );

  useEffect(() => {
    let ignore = false;

    const requestedTradingAccount = searchParams.get("tradingAccountId");
    const requestedTradingAccountId = Number(requestedTradingAccount);
    const isUpgrade =
      requestedTradingAccount !== null &&
      Number.isInteger(requestedTradingAccountId) &&
      requestedTradingAccountId > 0;

    Promise.all([
      fetch("/api/public/landing-pricing").then(handleRes) as Promise<PricingResponse>,
      isUpgrade
        ? (fetch("/api/member/trading-accounts").then(handleRes) as Promise<TradingAccountsResponse>)
        : Promise.resolve(null),
    ])
      .then(([response, accountsResponse]) => {
        if (ignore) return;
        const account = isUpgrade
          ? accountsResponse?.data.find(
              (item) => item.id === requestedTradingAccountId,
            ) || null
          : null;

        if (isUpgrade && !account) {
          throw new Error(text.invalidAccount);
        }

        const requestedEa = Number(searchParams.get("ea"));
        const requestedPackage = Number(searchParams.get("package"));
        const selectedEa = account
          ? account.expertAdvisor.id
          : response.data.expertAdvisors.some((item) => item.id === requestedEa)
            ? requestedEa
            : response.data.expertAdvisors[0]?.id || null;
        const selectedPackage = response.data.packages.some(
          (item) =>
            item.id === requestedPackage &&
            (!account || item.code?.trim().toUpperCase() !== "FREE_TRIAL"),
        )
          ? requestedPackage
          : null;

        setData(response.data);
        setUpgradeAccount(account);
        setEaId(selectedEa);
        setPackageId(selectedPackage);
      })
      .catch((loadError: unknown) => {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : text.error);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [searchParams, text.error, text.invalidAccount]);

  const availablePackages = useMemo(
    () =>
      upgradeAccount
        ? (data?.packages || []).filter(
            (item) => item.code?.trim().toUpperCase() !== "FREE_TRIAL",
          )
        : data?.packages || [],
    [data?.packages, upgradeAccount],
  );

  const selectedEa = useMemo(
    () => data?.expertAdvisors.find((item) => item.id === eaId) || null,
    [data, eaId],
  );
  const selectedPackage = useMemo(
    () => data?.packages.find((item) => item.id === packageId) || null,
    [data, packageId],
  );
  const applyIntroDiscount =
    !upgradeAccount ||
    upgradeAccount.package.code?.trim().toUpperCase() === "FREE_TRIAL";

  const continueOrder = () => {
    if (!selectedEa || !selectedPackage) return;
    const query = new URLSearchParams({
      ea: String(selectedEa.id),
      package: String(selectedPackage.id),
    });
    if (upgradeAccount) {
      query.set("tradingAccountId", String(upgradeAccount.id));
    }
    const checkoutPath = `/order/checkout?${query.toString()}`;
    router.push(checkoutPath);
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.34em] text-cyan-300">
          {text.eyebrow}
        </p>
        <h1 className="mt-4 text-3xl font-black text-white md:text-5xl">
          {text.title}
        </h1>
        <p className="mt-5 text-sm leading-7 text-slate-400 md:text-base">
          {text.description}
        </p>
      </div>

      {loading ? (
        <div className="mt-12 flex min-h-72 items-center justify-center gap-3 border border-cyan-400/20 bg-white/[0.025] text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
          {text.loading}
        </div>
      ) : error ? (
        <div className="mt-12 flex min-h-72 items-center justify-center border border-red-400/30 bg-red-500/5 text-red-300">
          {error}
        </div>
      ) : (
        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            {upgradeAccount ? (
              <div className="border border-emerald-400/25 bg-emerald-400/[0.06] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                  {text.account}
                </p>
                <p className="mt-2 text-lg font-black text-white">
                  {upgradeAccount.accountId}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {upgradeAccount.accountName || upgradeAccount.accountServer || "MT5"}
                  {" · "}
                  {upgradeAccount.package.name}
                </p>
              </div>
            ) : null}

            <div>
              <div className="mb-4 flex items-center gap-3">
                <Bot className="h-5 w-5 text-cyan-300" />
                <h2 className="text-lg font-bold text-white">{text.ea}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {data?.expertAdvisors
                  .filter(
                    (item) =>
                      !upgradeAccount ||
                      item.id === upgradeAccount.expertAdvisor.id,
                  )
                  .map((item) => {
                  const active = item.id === eaId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (!upgradeAccount) setEaId(item.id);
                      }}
                      className={`relative min-h-36 border p-5 text-left transition ${
                        active
                          ? "border-cyan-300 bg-cyan-300/10 shadow-[0_0_28px_rgba(34,211,238,0.14)]"
                          : "border-white/10 bg-white/[0.025] hover:border-cyan-400/50"
                      }`}
                    >
                      {active ? (
                        <Check className="absolute right-4 top-4 h-5 w-5 text-cyan-300" />
                      ) : null}
                      <p className="pr-8 font-bold text-white">{item.name}</p>
                      {item.codeName ? (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                          {item.codeName}
                        </p>
                      ) : null}
                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">
                        {getLocalizedText(item.description, lang)}
                      </p>
                    </button>
                  );
                })}
              </div>
              {upgradeAccount ? (
                <p className="mt-3 text-xs text-slate-500">{text.lockedEa}</p>
              ) : null}
            </div>

            <div>
              <div className="mb-4 flex items-center gap-3">
                <PackageCheck className="h-5 w-5 text-fuchsia-300" />
                <h2 className="text-lg font-bold text-white">{text.plan}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {availablePackages.map((item) => {
                  const active = item.id === packageId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPackageId(item.id)}
                      className={`relative min-h-32 border p-5 text-left transition ${
                        active
                          ? "border-fuchsia-300 bg-fuchsia-300/10 shadow-[0_0_28px_rgba(217,70,239,0.12)]"
                          : "border-white/10 bg-white/[0.025] hover:border-fuchsia-400/50"
                      }`}
                    >
                      {active ? (
                        <Check className="absolute right-4 top-4 h-5 w-5 text-fuchsia-300" />
                      ) : null}
                      <p className="pr-8 font-bold text-white">{item.name}</p>
                      <p className="mt-2 text-xl font-black text-white">
                        {formatPrice(finalPrice(item, applyIntroDiscount), lang)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                        {item.recurringType}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="h-fit border border-cyan-400/25 bg-[#071225]/90 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)] lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              {text.summary}
            </p>
            <div className="mt-6 space-y-5 border-y border-white/10 py-5">
              {upgradeAccount ? (
                <div>
                    <p className="text-xs text-slate-500">Trading Account</p>
                    <p className="mt-1 font-bold text-emerald-300">
                      {upgradeAccount.accountId}
                    </p>
                </div>
              ) : null}
              <div>
                <p className="text-xs text-slate-500">Expert Advisor</p>
                <p className="mt-1 font-bold text-white">
                  {selectedEa?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Package</p>
                <p className="mt-1 font-bold text-white">
                  {selectedPackage?.name || "—"}
                </p>
              </div>
              <div className="flex items-end justify-between gap-4">
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-xl font-black text-white">
                  {selectedPackage
                    ? formatPrice(
                        finalPrice(selectedPackage, applyIntroDiscount),
                        lang,
                      )
                    : "—"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={continueOrder}
              disabled={!selectedEa || !selectedPackage}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 bg-cyan-500 px-5 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              {text.continue}
              <ArrowRight className="h-4 w-4" />
            </button>
            {!selectedEa || !selectedPackage ? (
              <p className="mt-3 text-center text-xs text-slate-500">
                {text.selectBoth}
              </p>
            ) : null}
          </aside>
        </div>
      )}
    </section>
  );
}
