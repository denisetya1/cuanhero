"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import type { LandingLang } from "./landing-content";

const FAQSection = ({
  faqs,
  lang,
}: {
  faqs: readonly (readonly [string, string])[];
  lang: LandingLang;
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id="faq"
      className="landing-reveal relative w-full overflow-hidden px-4 py-20 text-white md:px-8 md:py-28"
    >
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-blue-500/8 blur-[110px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="mb-12 grid items-end gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-10 bg-cyan-300/70" />
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.34em] text-cyan-300">
                FAQ / {lang === "en" ? "Support" : "Bantuan"}
              </p>
            </div>
            <h2 className="max-w-3xl text-3xl font-bold leading-tight text-white md:text-5xl">
              {lang === "en"
                ? "Everything you need to know, "
                : "Semua yang perlu Anda tahu, "}
              <span className="bg-linear-to-r from-cyan-300 to-sky-500 bg-clip-text text-transparent">
                {lang === "en" ? "answered." : "terjawab di sini."}
              </span>
            </h2>
          </div>

          <div className="lg:border-l lg:border-white/10 lg:pl-10">
            <p className="max-w-xl text-sm leading-7 text-slate-300 md:text-base">
              {lang === "en"
                ? "Find quick answers about how CuanHero works, account security, monitoring, and getting started."
                : "Temukan jawaban singkat seputar cara kerja CuanHero, keamanan akun, monitoring, dan langkah memulai."}
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {faqs.length} {lang === "en" ? "Common Questions" : "Pertanyaan Umum"}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          {faqs.map(([question, answer], index) => {
            const isOpen = openIndex === index;
            const answerId = `faq-answer-${index}`;

            return (
              <article
                key={question}
                className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                  isOpen
                    ? "border-cyan-300/35 bg-[#09182a] shadow-[0_20px_60px_rgba(0,217,255,0.06)]"
                    : "border-white/8 bg-[#07111f]/65 hover:border-white/15 hover:bg-[#091522]"
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-y-0 left-0 w-px bg-linear-to-b from-transparent via-cyan-300 to-transparent transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
                />
                <button
                  type="button"
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  className="grid w-full cursor-pointer select-none grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-5 text-left md:gap-7 md:px-8 md:py-7"
                >
                  <span
                    className={`font-mono text-[11px] tracking-[0.2em] transition-colors ${isOpen ? "text-cyan-300" : "text-slate-600"}`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`text-sm font-semibold tracking-wide transition-colors md:text-base ${isOpen ? "text-white" : "text-slate-300 group-hover:text-white"}`}
                  >
                    {question}
                  </span>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                      isOpen
                        ? "rotate-45 border-cyan-300/40 bg-cyan-300/10 text-cyan-300"
                        : "border-white/10 bg-white/5 text-slate-400 group-hover:border-cyan-300/25 group-hover:text-cyan-300"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                </button>

                <div
                  id={answerId}
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="border-t border-white/8 pb-7 pt-5 text-sm leading-7 text-slate-400 max-md:mx-5 md:ml-[5.2rem] md:mr-8 md:pr-16">
                      {answer}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
