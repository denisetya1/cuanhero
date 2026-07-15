import Image from "next/image";

export default function ExnessBanner() {
  return (
    <section
      aria-label="Exness partner offer"
      className="relative z-10 border-t border-white/8 px-4 py-10 md:px-8 md:py-14"
    >
      <a
        href="https://one.exnessonelink.com/intl/en/a/zll3ee21aq"
        target="_blank"
        rel="sponsored noreferrer"
        aria-label="View Exness trading offer"
        className="group mx-auto block max-w-[980px] overflow-hidden rounded-2xl border border-white/10 bg-[#071525] shadow-[0_20px_70px_rgba(0,0,0,0.35)] transition duration-300 hover:-translate-y-1 hover:border-cyan-300/30 hover:shadow-[0_24px_80px_rgba(0,217,255,0.1)]"
      >
        <Image
          src="https://d3dpet1g0ty5ed.cloudfront.net/EN_Spreads_50_lower_980x250.jpg"
          width={980}
          height={250}
          alt="Exness trading spreads offer"
          className="h-auto w-full object-cover transition duration-500 group-hover:scale-[1.01]"
        />
      </a>
    </section>
  );
}

