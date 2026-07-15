"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { landingContent, type LandingLang } from "./landing-content";
import MobileDrawer from "./MobileDrawer";

const navItems = [
  ["home", "#hero"],
  ["package", "#pricing"],
  ["feature", "#benefits"],
  ["faq", "#faq"],
] as const;

const Header = () => {
  const pathname = usePathname();
  const lang: LandingLang =
    pathname === "/en" || pathname.startsWith("/en/") ? "en" : "id";
  const content = landingContent[lang].nav;
  const languageHref =
    lang === "en"
      ? pathname.replace(/^\/en(?=\/|$)/, "") || "/"
      : pathname === "/"
        ? "/en"
        : `/en${pathname}`;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ch-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-22 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <Link href={lang === "en" ? "/en" : "/"} className="flex items-center">
          <Image
            src="/images/logo.png"
            alt="CuanHero"
            width={170}
            height={62}
            className="h-11 w-auto object-contain"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-300 md:flex">
          {navItems.map(([key, href]) => (
            <Link
              key={key}
              href={href}
              className="transition hover:text-ch-primary"
            >
              {content[key]}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href={languageHref}
            className="button-outline inline-flex h-10 items-center px-4 text-xs font-bold text-white hover:text-white"
          >
            {content.language}
          </Link>
          <Link
            href="/member/login"
            className="button inline-flex h-10 items-center px-5 text-xs font-bold text-white"
          >
            {content.memberLogin}
          </Link>
        </div>

        <MobileDrawer lang={lang} />
      </div>
    </header>
  );
};

export default Header;
