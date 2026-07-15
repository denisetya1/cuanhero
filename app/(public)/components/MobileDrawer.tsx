"use client";

import { useState } from "react";
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
  const content = landingContent[lang].nav;

  const toggleDrawer = () => setIsOpen(!isOpen);

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

      {/* --- OVERLAY LATER BELAKANG (Gelap Transparan) --- */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleDrawer}
      />

      {/* --- KONTEN DRAWER (MENU SAMPING) --- */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white p-6 shadow-xl transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header Drawer */}
        <div className="flex items-center justify-between border-b pb-4">
          <span className="text-xl font-bold text-gray-800">
            {content.menu}
          </span>
          <button
            onClick={toggleDrawer}
            aria-label={lang === "en" ? "Close menu" : "Tutup menu"}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Menu Links */}
        <nav className="mt-6 flex flex-col gap-4">
          {navItems.map(([key, href]) => (
            <a
              key={key}
              href={href}
              onClick={toggleDrawer}
              className="text-lg font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              {content[key]}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
