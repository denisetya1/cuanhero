"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
      className="landing-reveal relative w-full overflow-hidden px-4 py-20 text-white md:px-8"
    >
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.34em] text-cyan-300">
          FAQ
        </p>
        <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
          {lang === "en"
            ? "Frequently Asked Questions"
            : "Pertanyaan yang Sering Diajukan"}
        </h2>
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-3">
        {faqs.map(([question, answer], index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={question}
              className={`overflow-hidden rounded-xl border transition-all duration-300 ${
                isOpen
                  ? "border-blue-500/50 bg-linear-to-r from-blue-950/30 to-slate-950 shadow-[0_0_24px_rgba(59,130,246,0.1)]"
                  : "border-slate-800/60 bg-[#090d16]/60 hover:border-slate-700"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleFAQ(index)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer select-none items-center justify-between gap-6 px-5 py-5 text-left text-sm font-medium tracking-wide text-slate-200 transition md:px-7 md:py-6 md:text-base"
              >
                <span>{question}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-blue-400" : "text-slate-400"
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="mx-5 border-t border-slate-800/50 pb-6 pt-5 text-sm leading-7 text-slate-400 md:mx-7 md:pr-14">
                    {answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FAQSection;
