"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { LandingLang } from "./landing-content";
import { landingContent } from "./landing-content";

const navItems = [
  ["home", "#hero"],
  ["package", "#pricing"],
  ["feature", "#benefits"],
  ["faq", "#faq"],
] as const;

export default function MobileDrawer({ lang }: { lang: LandingLang }) {
  const [isOpen, setIsOpen] = useState(false);
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const content = landingContent[lang].nav;

  const toggleDrawer = () => setIsOpen(!isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <>
      {/* --- TOMBOL TRIGGER (HAMBURGER MENU) --- */}
      <button
        onClick={toggleDrawer}
        className="p-2 text-ch-foreground hover:text-ch-primary focus:outline-none md:hidden"
        aria-label={lang === "en" ? "Toggle menu" : "Buka atau tutup menu"}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            // Icon X (Close) jika terbuka
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            // Icon Hamburger jika tertutup
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {isMounted &&
        createPortal(
          <>
            <button
              type="button"
              aria-label={lang === "en" ? "Close menu" : "Tutup menu"}
              className={`fixed inset-0 z-60 bg-black/80 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
                isOpen
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
              onClick={() => setIsOpen(false)}
            />

            <aside
              aria-hidden={!isOpen}
              className={`fixed inset-y-0 left-0 z-70 flex w-[min(82vw,20rem)] flex-col overflow-hidden border-r border-cyan-300/20 bg-[#030914] shadow-[20px_0_60px_rgba(0,0,0,0.75),0_0_40px_rgba(0,217,255,0.1)] transition-transform duration-300 ease-in-out md:hidden ${
                isOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,217,255,0.14),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.1),transparent_30%)]" />

              <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-5">
                <span className="font-mono text-sm font-bold uppercase tracking-[0.22em] text-cyan-200">
                  {content.menu}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label={lang === "en" ? "Close menu" : "Tutup menu"}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <nav className="relative flex flex-col gap-2 p-5">
                {navItems.map(([key, href]) => (
                  <a
                    key={key}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl border border-transparent px-4 py-3 text-base font-semibold text-slate-200 transition hover:border-cyan-300/20 hover:bg-cyan-300/10 hover:text-cyan-200"
                  >
                    {content[key]}
                  </a>
                ))}
              </nav>
            </aside>
          </>,
          document.body,
        )}
    </>
  );
}
