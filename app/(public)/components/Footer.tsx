"use client";

import { ArrowUpRight, ChevronRight, Globe2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { landingContent, type LandingLang } from "./landing-content";

const navItems = [
  ["home", "#hero"],
  ["package", "#pricing"],
  ["feature", "#benefits"],
  ["faq", "#faq"],
] as const;

const whatsappHref = "https://wa.me/628511040707";
const serviceWhatsappNumber = "6281808103331";

const extraServices = [
  {
    label: "Develop Custom Indicator & EA",
    message: "Halo, saya tertarik untuk membuat Custom Indicator atau EA.",
  },
  {
    label: "Web Development",
    message: "Halo, saya tertarik dengan layanan Web Development.",
  },
] as const;

export default function Footer() {
  const pathname = usePathname();
  const lang: LandingLang =
    pathname === "/en" || pathname.startsWith("/en/") ? "en" : "id";
  const content = landingContent[lang];
  const landingPath = lang === "en" ? "/en" : "/";
  const languageHref =
    lang === "en"
      ? pathname.replace(/^\/en(?=\/|$)/, "") || "/"
      : pathname === "/"
        ? "/en"
        : `/en${pathname}`;

  return (
    <footer className="relative z-10 overflow-hidden border-t border-white/8 bg-[#020710] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(0,217,255,0.1),transparent_65%)]" />

      <div className="relative mx-auto w-full max-w-7xl px-4 md:px-8">
        <div className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_0.65fr_1fr_0.8fr] lg:gap-12 lg:py-16">
          <div>
            <Link
              href={lang === "en" ? "/en" : "/"}
              className="inline-flex items-center"
            >
              <Image
                src="/images/logo.png"
                alt="CuanHero"
                width={170}
                height={62}
                className="h-12 w-auto object-contain"
              />
            </Link>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
              {lang === "en"
                ? "Automated trading technology built for more practical monitoring, flexible risk control, and complete account ownership."
                : "Teknologi trading otomatis untuk monitoring yang lebih praktis, pengaturan risiko fleksibel, dan kendali akun sepenuhnya di tangan Anda."}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/5 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
              <span className="landing-status-dot h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {lang === "en" ? "EA System Online" : "Sistem EA Aktif"}
            </div>
          </div>

          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-6 bg-cyan-300/60" />
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-white">
                {content.footer.navigation}
              </h3>
            </div>
            <nav className="flex flex-col gap-1">
              {navItems.map(([key, href]) => (
                <Link
                  key={key}
                  href={`${landingPath}${href}`}
                  className="group flex items-center gap-2 py-2 text-sm text-slate-400 transition hover:translate-x-1 hover:text-cyan-300"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:text-cyan-300" />
                  {content.nav[key]}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-6 bg-cyan-300/60" />
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-white">
                {lang === "en" ? "Extra Services" : "Layanan Lainnya"}
              </h3>
            </div>
            <div className="flex flex-col gap-1">
              {extraServices.map((service) => (
                <a
                  key={service.label}
                  href={`https://wa.me/${serviceWhatsappNumber}?text=${encodeURIComponent(service.message)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start gap-2 py-2 text-sm leading-6 text-slate-400 transition hover:translate-x-1 hover:text-cyan-300"
                >
                  <ChevronRight className="mt-1.5 h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-cyan-300" />
                  {service.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-6 bg-cyan-300/60" />
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-white">
                {content.footer.contact}
              </h3>
            </div>
            <div className="flex flex-col gap-2">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-slate-300 transition hover:border-cyan-300/25 hover:text-cyan-300"
              >
                WhatsApp
                <ArrowUpRight className="h-4 w-4 text-slate-600 transition group-hover:text-cyan-300" />
              </a>
              <Link
                href="/member/login"
                className="group flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-slate-300 transition hover:border-cyan-300/25 hover:text-cyan-300"
              >
                {content.nav.memberArea}
                <ArrowUpRight className="h-4 w-4 text-slate-600 transition group-hover:text-cyan-300" />
              </Link>
              <Link
                href={languageHref}
                className="group flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-slate-300 transition hover:border-cyan-300/25 hover:text-cyan-300"
              >
                <span className="inline-flex items-center gap-2">
                  <Globe2 className="h-4 w-4" />
                  {lang === "en" ? "Bahasa Indonesia" : "English"}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:text-cyan-300" />
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 border-t border-white/8 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-3xl items-start gap-3 text-xs leading-5 text-slate-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/70" />
            <p>
              {content.footer.risk} {content.footer.riskNote}
            </p>
          </div>
          <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600">
            © {new Date().getFullYear()} CuanHero
          </p>
        </div>
      </div>
    </footer>
  );
}
