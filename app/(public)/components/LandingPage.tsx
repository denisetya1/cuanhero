import Image from "next/image";
import Link from "next/link";
import { LucideMoveUpRight } from "lucide-react";
import FAQSection from "./FAQSection";
import { landingContent, type LandingLang } from "./landing-content";
import PricingTabs from "./PricingTabs";

export default function LandingPage({ lang }: { lang: LandingLang }) {
  const content = landingContent[lang];

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
            <Link
              href="/member/register"
              className="button inline-flex items-center justify-center gap-3 px-6 py-3 text-sm font-bold text-white"
            >
              {content.hero.primaryCta}
              <LucideMoveUpRight className="h-5 w-5" />
            </Link>
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
        className="landing-reveal mx-auto w-full max-w-7xl px-4 py-20 md:px-8"
        id="benefits"
      >
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.34em] text-cyan-300">
            {lang === "en" ? "Benefits" : "Keunggulan"}
          </p>
          <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
            {content.benefits.headingPrefix}{" "}
            <span className="text-ch-primary">CuanHero</span>
          </h2>
          <p className="mt-5 text-sm leading-6 text-slate-300 md:text-base">
            {content.benefits.description}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {content.benefits.items.map((item) => (
            <div key={item.title} className="glass-card small">
              <div className="glass-card-content h-full p-6">
                <Image
                  src={item.icon}
                  alt=""
                  width={56}
                  height={56}
                  className="mb-5 h-14 w-14 object-contain"
                />
                <h3 className="text-xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <FAQSection faqs={content.faqs} lang={lang} />
    </>
  );
}
