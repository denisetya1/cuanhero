"use client";

import { ArrowUpRight, MessageCircle } from "lucide-react";

type BottomBannerContent = {
  heading: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
};

export default function BottomBanner({
  content,
}: {
  content: BottomBannerContent;
}) {
  return (
    <section className="px-0 py-10">
      <div
        className="
          relative mx-auto flex flex-col md:flex-row max-w-7xl items-center justify-between gap-8
          overflow-hidden rounded-2xl border border-ch-primary
          bg-[#050A14]/80 px-8 py-8 pl-8 lg:pl-70
          shadow-[0_0_40px_rgba(0,153,255,0.15)]
          backdrop-blur-xl
          bottom-banner
        "
      >
        <div className="relative flex-1">
          <h2 className="font-orbitron text-2xl font-bold text-white md:text-2xl">
            {content.heading}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
            {content.description}
          </p>
        </div>

        <div className="relative flex shrink-0 flex-col gap-3 sm:flex-row">
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-cyan-300/60 bg-[#075985] px-6 font-semibold text-white shadow-[0_0_24px_rgba(0,217,255,.22)]">
            {content.primaryCta}
            <ArrowUpRight size={18} />
          </button>

          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-black/30 px-6 font-semibold text-white backdrop-blur-md">
            {content.secondaryCta}
            <MessageCircle size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
