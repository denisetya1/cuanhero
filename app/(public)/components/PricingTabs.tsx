"use client";

import { handleRes } from "@/lib/response";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getLocalizedText } from "@/lib/localized-text";
import type { LandingLang } from "./landing-content";

type ExpertAdvisor = {
  id: number;
  name: string;
  description: Record<string, string> | string | null;
  image: string | null;
  codeName: string;
};

type PackageItem = {
  id: number;
  name: string;
  description: Record<string, string> | string | null;
  features: unknown;
  price: string;
  discountPercent: number | null;
  recurringType: string;
};

type PricingResponse = {
  data: {
    expertAdvisors: ExpertAdvisor[];
    packages: PackageItem[];
    settings: {
      whatsappNumber: string;
      orderMessageEn: string;
      orderMessageId: string;
    };
  };
};

const formatPrice = (price: string, lang: LandingLang) => {
  const parsedPrice = Number(price);

  if (!Number.isFinite(parsedPrice)) {
    return price;
  }

  return new Intl.NumberFormat(lang === "en" ? "en-US" : "id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(parsedPrice);
};

const getDiscountedPrice = (price: string, discountPercent?: number | null) => {
  const parsedPrice = Number(price);

  if (
    !Number.isFinite(parsedPrice) ||
    !discountPercent ||
    discountPercent <= 0
  ) {
    return null;
  }

  return String(parsedPrice - (parsedPrice * discountPercent) / 100);
};

const formatRecurringType = (value: string, lang: LandingLang) => {
  const labels: Record<string, Record<LandingLang, string>> = {
    "24h": { id: "24 jam", en: "24 hours" },
    "30d": { id: "30 hari", en: "30 days" },
    lifetime: { id: "Seumur hidup", en: "Lifetime" },
  };

  return labels[value.toLowerCase()]?.[lang] || value;
};

const normalizeFeatures = (features: unknown, lang: LandingLang) => {
  const localizedFeatures =
    features && typeof features === "object" && !Array.isArray(features)
      ? (features as Record<string, unknown>)[lang]
      : features;

  if (!Array.isArray(localizedFeatures)) return [];

  return localizedFeatures
    .filter((feature) => {
      if (!feature || typeof feature !== "object" || Array.isArray(feature)) {
        return true;
      }
      return (feature as Record<string, unknown>).checked !== false;
    })
    .map((feature) => {
      if (typeof feature === "string") return feature.trim();
      if (!feature || typeof feature !== "object" || Array.isArray(feature)) {
        return "";
      }

      const title = (feature as Record<string, unknown>).title ?? feature;
      return getLocalizedText(title, lang).trim();
    })
    .filter(Boolean);
};

const packageColorClasses = [
  "border-slate-500/55 bg-slate-400/[0.035] hover:border-slate-400 hover:shadow-[0_0_20px_rgba(148,163,184,0.16)]",
  "border-blue-400/55 bg-blue-400/[0.035] hover:border-blue-300 hover:shadow-[0_0_20px_rgba(96,165,250,0.2)]",
  "border-orange-400/55 bg-orange-400/[0.035] hover:border-orange-300 hover:shadow-[0_0_20px_rgba(251,146,60,0.2)]",
  "border-purple-400/55 bg-purple-400/[0.035] hover:border-purple-300 hover:shadow-[0_0_20px_rgba(192,132,252,0.2)]",
] as const;

const packageButtonClasses = [
  "border-slate-400/70 bg-slate-300/10 text-slate-200 hover:border-slate-300 hover:bg-slate-300/15",
  "border-blue-300/70 bg-blue-300/10 text-blue-100 hover:border-blue-300 hover:bg-blue-300/15",
  "border-orange-300/70 bg-orange-300/10 text-orange-100 hover:border-orange-300 hover:bg-orange-300/15",
  "border-purple-300/70 bg-purple-300/10 text-purple-100 hover:border-purple-300 hover:bg-purple-300/15",
] as const;

const pricingCopy = {
  id: {
    eyebrow: "Harga",
    heading: "Pilih Engine EA dan Lisensi Operasional.",
    description:
      "Setiap lisensi memiliki parameter risiko, batas eksekusi, dan cakupan fitur yang berbeda. Pilih paket yang paling sesuai dengan alokasi modal, toleransi risiko, dan kebutuhan deployment trading Anda.",
    loading: "Memuat paket harga...",
    loadError: "Gagal memuat paket harga.",
    noEa: "Belum ada EA aktif.",
    noPackage: "Belum ada paket tersedia.",
    order: "Pesan Lisensi",
    eaFallback: "Pilih EA aktif untuk melihat paket lisensi yang tersedia.",
    featureFallback: [
      "Aktivasi EA",
      "Dukungan setup VPS",
      "Dashboard member",
    ],
  },
  en: {
    eyebrow: "Pricing",
    heading: "Choose Your EA Engine and Operating License.",
    description:
      "Each license offers different risk parameters, execution limits, and features. Choose the package that best matches your capital allocation, risk tolerance, and trading deployment needs.",
    loading: "Loading pricing...",
    loadError: "Failed to load pricing.",
    noEa: "No active EA is available yet.",
    noPackage: "No packages are available yet.",
    order: "Order License",
    eaFallback: "Select an active EA to view the available license packages.",
    featureFallback: [
      "EA activation",
      "VPS setup support",
      "Member dashboard",
    ],
  },
} as const;

export default function PricingTabs({ lang }: { lang: LandingLang }) {
  const copy = pricingCopy[lang];
  const [data, setData] = useState<PricingResponse["data"] | null>(null);
  const [activeEaId, setActiveEaId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const loadPricing = async () => {
      try {
        setIsLoading(true);
        const response = (await fetch("/api/public/landing-pricing").then(
          handleRes,
        )) as PricingResponse;

        if (ignore) {
          return;
        }

        setData(response.data);
        setActiveEaId(response.data.expertAdvisors[0]?.id ?? null);
      } catch {
        if (!ignore) {
          setErrorMessage(copy.loadError);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadPricing();

    return () => {
      ignore = true;
    };
  }, [copy.loadError]);

  const activeEa = useMemo(() => {
    return data?.expertAdvisors.find((ea) => ea.id === activeEaId) ?? null;
  }, [activeEaId, data?.expertAdvisors]);

  const getOrderWhatsappHref = (packageItem: PackageItem) => {
    const number = data?.settings.whatsappNumber.replace(/\D/g, "") || "";
    if (!number || !activeEa) return null;

    const template =
      (lang === "id"
        ? data?.settings.orderMessageId
        : data?.settings.orderMessageEn
      )?.trim() ||
      (lang === "id"
        ? "Halo CuanHero, saya ingin memesan lisensi EA."
        : "Hello CuanHero, I would like to order an EA license.");
    const discountedPrice = getDiscountedPrice(
      packageItem.price,
      packageItem.discountPercent,
    );
    const message = [
      template,
      "",
      `EA: ${activeEa.name}`,
      `${lang === "id" ? "Paket" : "Package"}: ${packageItem.name}`,
      `${lang === "id" ? "Durasi" : "Duration"}: ${formatRecurringType(packageItem.recurringType, lang)}`,
      `${lang === "id" ? "Harga" : "Price"}: ${formatPrice(discountedPrice || packageItem.price, lang)}`,
    ].join("\n");

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  };

  return (
    <section id="pricing" className="landing-reveal relative mx-auto w-full max-w-7xl px-4 py-20 md:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.34em] text-cyan-300">
          {copy.eyebrow}
        </p>
        <h2 className="mt-4 text-3xl font-black leading-tight text-white md:text-5xl">
          {copy.heading}
        </h2>
        <p className="mt-5 text-sm leading-6 text-slate-400 md:text-base">
          {copy.description}
        </p>
      </div>

      <div className="mt-10">
        {isLoading ? (
          <div className="flex min-h-80 items-center justify-center gap-3 rounded-md border border-white/10 bg-white/[0.03] text-sm text-slate-400 backdrop-blur">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
            {copy.loading}
          </div>
        ) : errorMessage ? (
          <div className="flex min-h-80 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-sm text-red-300 backdrop-blur">
            {errorMessage}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 px-1 pb-2 sm:flex sm:justify-center sm:gap-3 sm:overflow-x-auto">
              {data?.expertAdvisors.length ? (
                data.expertAdvisors.map((ea) => {
                  const isActive = ea.id === activeEaId;

                  return (
                    <button
                      key={ea.id}
                      type="button"
                      onClick={() => setActiveEaId(ea.id)}
                      className={`relative min-h-11 w-full border px-3 text-xs font-bold uppercase tracking-[0.1em] transition sm:w-auto sm:shrink-0 sm:px-5 sm:text-sm sm:tracking-[0.16em] ${
                        isActive
                          ? "border-cyan-300 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(103,232,249,0.28)]"
                          : "border-fuchsia-400/70 bg-transparent text-slate-300 hover:border-cyan-300 hover:bg-cyan-300/10 hover:text-white"
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="active-ea-tab"
                          className="absolute inset-0 border border-cyan-200/70 bg-cyan-300/10"
                          transition={{ type: "spring", duration: 0.45, bounce: 0.18 }}
                        />
                      )}
                      <span className="relative z-10">{ea.name}</span>
                    </button>
                  );
                })
              ) : (
                <span className="px-3 py-2 text-sm text-slate-500">
                  {copy.noEa}
                </span>
              )}
            </div>

            <div className="mx-auto mt-5 max-w-3xl text-center">
              <p className="text-lg font-bold text-white">
                {activeEa?.name || "Expert Advisor"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {getLocalizedText(activeEa?.description, lang) ||
                  copy.eaFallback}
              </p>
              {activeEa?.codeName ? (
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
                  {activeEa.codeName}
                </p>
              ) : null}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeEa?.id ?? "empty"}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -14 }}
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.09,
                      delayChildren: 0.04,
                    },
                  },
                }}
                className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              >
                {data?.packages.length ? (
                  data.packages.map((packageItem, index) => (
                    <motion.div
                      key={packageItem.id}
                      variants={{
                        hidden: { y: 26 },
                        visible: {
                          y: 0,
                          transition: {
                            duration: 0.42,
                            ease: "easeOut",
                          },
                        },
                      }}
                      whileHover={{
                        y: -4,
                        transition: { duration: 0.18 },
                      }}
                      className={`flex h-full flex-col border p-5 font-mono backdrop-blur transition-colors duration-300 ${
                        packageColorClasses[index % packageColorClasses.length]
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-bold leading-5 text-white">
                            {packageItem.name}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            {formatRecurringType(packageItem.recurringType, lang)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {packageItem.discountPercent &&
                          getDiscountedPrice(
                            packageItem.price,
                            packageItem.discountPercent,
                          ) ? (
                            <>
                              <p className="whitespace-nowrap text-[10px] font-semibold text-slate-500">
                                <span className="line-through">
                                  {formatPrice(packageItem.price, lang)}
                                </span>{" "}
                                <span className="text-emerald-300">
                                  (-{packageItem.discountPercent}%)
                                </span>
                              </p>
                              <p className="mt-0.5 whitespace-nowrap text-xl font-black leading-6 text-white">
                                {formatPrice(
                                  getDiscountedPrice(
                                    packageItem.price,
                                    packageItem.discountPercent,
                                  ) || packageItem.price,
                                  lang,
                                )}
                              </p>
                            </>
                          ) : (
                            <p className="whitespace-nowrap text-xl font-black leading-6 text-white">
                              {formatPrice(packageItem.price, lang)}
                            </p>
                          )}
                        </div>
                      </div>
                      {getLocalizedText(packageItem.description, lang) ? (
                        <p className="mt-2 text-xs leading-5 text-slate-400">
                          {getLocalizedText(packageItem.description, lang)}
                        </p>
                      ) : null}
                      <ul className="mt-5 flex-1 space-y-3 text-sm text-slate-300">
                        {(normalizeFeatures(packageItem.features, lang).length
                          ? normalizeFeatures(packageItem.features, lang)
                          : copy.featureFallback
                        ).map((item) => (
                          <li key={item} className="flex gap-3">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <a
                        href={getOrderWhatsappHref(packageItem) || undefined}
                        target="_blank"
                        rel="noreferrer"
                        aria-disabled={!getOrderWhatsappHref(packageItem)}
                        className={`mt-7 inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 border text-sm font-bold transition hover:text-white aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${
                          packageButtonClasses[
                            index % packageButtonClasses.length
                          ]
                        }`}
                      >
                        {copy.order}
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full flex min-h-64 items-center justify-center border border-white/10 text-sm text-slate-500">
                    {copy.noPackage}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </section>
  );
}
