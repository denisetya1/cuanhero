import Image from "next/image";
import Link from "next/link";
import { LucideMoveUpRight, MessageCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import FAQSection from "./FAQSection";
import { landingContent, type LandingLang } from "./landing-content";
import PricingTabs from "./PricingTabs";

const freeTrialFallback: Record<LandingLang, string> = {
  en: "Hello CuanHero, I would like to start a free trial of CuanHero.",
  id: "Halo CuanHero, saya ingin memulai uji coba gratis CuanHero.",
};

export default async function LandingPage({ lang }: { lang: LandingLang }) {
  const content = landingContent[lang];
  const settings = await prisma.appSetting.findUnique({
    where: { id: 1 },
    select: {
      whatsappNumber: true,
      freeTrialMessageEn: true,
      freeTrialMessageId: true,
    },
  });
  const whatsappNumber = settings?.whatsappNumber.replace(/\D/g, "") ?? "";
  const configuredMessage =
    lang === "id"
      ? settings?.freeTrialMessageId
      : settings?.freeTrialMessageEn;
  const freeTrialMessage = configuredMessage?.trim() || freeTrialFallback[lang];
  const freeTrialHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(freeTrialMessage)}`
    : undefined;

  return (
    <>
      <section
        id="hero"
        className="relative mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-7xl flex-col items-center justify-center px-4 py-20 text-center md:px-8"
      >
        <div className="landing-ambient-glow pointer-events-none absolute inset-x-4 top-10 h-72 rounded-full bg-[linear-gradient(90deg,rgba(0,217,255,0.26),rgba(217,70,239,0.2),rgba(255,214,102,0.14),rgba(0,217,255,0.2))] blur-3xl" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
              <span className="landing-status-dot h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {lang === "en" ? "EA System Online" : "Sistem EA Aktif"}
            </span>
          </div>
          <p className="mb-5 text-base font-semibold text-ch-primary md:text-2xl">
            {content.hero.subtitle}{" "}
            <span className="text-white">{content.hero.subtitleHighlight}</span>
          </p>
          <h1 className="text-5xl font-black leading-[0.98] text-white md:text-7xl lg:text-8xl">
            {content.hero.titleTop}
            <br />
            <span className="text-ch-primary">{content.hero.titleMiddle}</span>
            <br />
            {content.hero.titleBottom}
          </h1>
          <p className="mx-auto mt-7 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
            <span className="font-semibold text-white">CuanHero</span>{" "}
            {content.hero.description}
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={freeTrialHref}
              target={freeTrialHref ? "_blank" : undefined}
              rel={freeTrialHref ? "noreferrer" : undefined}
              aria-disabled={!freeTrialHref}
              className="button inline-flex items-center justify-center gap-3 px-6 py-3 text-sm font-bold text-white aria-disabled:pointer-events-none aria-disabled:opacity-50"
            >
              {content.hero.primaryCta}
              <MessageCircle className="h-5 w-5" />
            </a>
            <Link
              href="#pricing"
              className="button-outline inline-flex items-center justify-center gap-3 px-6 py-3 text-sm font-bold text-white hover:text-white"
            >
              {content.hero.secondaryCta}
              <LucideMoveUpRight className="h-5 w-5" />
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {content.hero.badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-100"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      <PricingTabs lang={lang} />

      <section
        className="landing-reveal relative mx-auto w-full max-w-7xl overflow-hidden px-4 py-20 md:px-8 md:py-28"
        id="benefits"
      >
        <div className="pointer-events-none absolute left-1/2 top-28 h-56 w-[70%] -translate-x-1/2 rounded-full bg-cyan-400/8 blur-[100px]" />

        <div className="relative mb-12 grid items-end gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-10 bg-cyan-300/70" />
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.34em] text-cyan-300">
                {lang === "en" ? "System Features" : "Fitur Sistem"}
              </p>
            </div>
            <h2 className="max-w-2xl text-3xl font-bold leading-tight text-white md:text-5xl">
              {content.benefits.headingPrefix}{" "}
              <span className="bg-linear-to-r from-cyan-300 to-sky-500 bg-clip-text text-transparent">
                CuanHero
              </span>
            </h2>
          </div>

          <div className="lg:border-l lg:border-white/10 lg:pl-10">
            <p className="max-w-xl text-sm leading-7 text-slate-300 md:text-base">
              {content.benefits.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-1.5 text-emerald-300">
                {lang === "en" ? "24/7 Active" : "Aktif 24/7"}
              </span>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1.5 text-cyan-200">
                {lang === "en" ? "Full Control" : "Kontrol Penuh"}
              </span>
            </div>
          </div>
        </div>

        <div className="relative grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          {content.benefits.items.map((item, index) => {
            const isPrimary = index < 2;
            const gridClass =
              index === 0
                ? "lg:col-span-7"
                : index === 1
                  ? "lg:col-span-5"
                  : "lg:col-span-3";

            return (
              <article
                key={item.title}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[#07111f]/80 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-[#09182a] ${gridClass}`}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(34,211,238,0.12),transparent_42%)] opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-300/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div
                  className={`relative flex h-full flex-col p-6 ${isPrimary ? "min-h-64 md:p-8" : "min-h-56"}`}
                >
                  <div className="flex items-start justify-between gap-5">
                    <div
                      className={`flex items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/5 ${isPrimary ? "h-16 w-16" : "h-14 w-14"}`}
                    >
                      <Image
                        src={item.icon}
                        alt=""
                        width={64}
                        height={64}
                        className={`${isPrimary ? "h-11 w-11" : "h-9 w-9"} object-contain transition-transform duration-300 group-hover:scale-110`}
                      />
                    </div>
                    <span className="font-mono text-xs tracking-[0.18em] text-slate-600 transition-colors group-hover:text-cyan-300/70">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="mt-auto pt-8">
                    <h3
                      className={`${isPrimary ? "text-2xl" : "text-lg"} font-semibold text-white`}
                    >
                      {item.title}
                    </h3>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 transition-colors group-hover:text-slate-300">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-6 h-px w-full overflow-hidden bg-white/8">
                    <div className="h-full w-0 bg-linear-to-r from-cyan-300 to-sky-500 transition-all duration-500 group-hover:w-full" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <FAQSection faqs={content.faqs} lang={lang} />
    </>
  );
}
