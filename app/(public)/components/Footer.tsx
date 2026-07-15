"use client";

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

export default function Footer() {
  const pathname = usePathname();
  const lang: LandingLang =
    pathname === "/en" || pathname.startsWith("/en/") ? "en" : "id";
  const content = landingContent[lang];

  return (
    <footer className="relative z-10 border-t border-white/10 bg-ch-bg">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:px-8">
        <div>
          <Image
            src="/images/logo.png"
            alt="CuanHero"
            width={170}
            height={62}
            className="h-11 w-auto object-contain"
          />
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-400">
            {content.footer.risk} {content.footer.riskNote}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-white">
            {content.footer.navigation}
          </h3>
          <nav className="mt-4 flex flex-col gap-2 text-sm text-slate-400">
            {navItems.map(([key, href]) => (
              <Link key={key} href={href} className="hover:text-ch-primary">
                {content.nav[key]}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-white">
            {content.footer.contact}
          </h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
            <a href="https://wa.me/628511040707" className="hover:text-ch-primary">
              WhatsApp
            </a>
            <Link href="/member/login" className="hover:text-ch-primary">
              {content.nav.memberArea}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
