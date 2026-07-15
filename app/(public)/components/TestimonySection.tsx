"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

type TestimonyContent = {
  heading: string;
  previous: string;
  next: string;
  items: readonly (readonly [string, string, string])[];
};

export default function TestimonialCarousel({
  content,
}: {
  content: TestimonyContent;
}) {
  const testimonies = content.items.map(([name, role, testimonial]) => ({
    name,
    role,
    testimonial,
    rating: 5,
  }));
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const [dotsCount, setDotsCount] = useState(testimonies.length);

  const checkScrollPosition = useCallback(() => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;

      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);

      const index = Math.round(scrollLeft / clientWidth);
      setActiveIndex(index);

      // Hitung jumlah dots secara dinamis di sisi client
      const itemsPerPage =
        window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1;
      setDotsCount(Math.ceil(testimonies.length / itemsPerPage));
    }
  }, [testimonies.length]);

  useEffect(() => {
    checkScrollPosition();

    window.addEventListener("resize", checkScrollPosition);
    return () => window.removeEventListener("resize", checkScrollPosition);
  }, [checkScrollPosition]);

  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const { scrollLeft, clientWidth } = carouselRef.current;
      const offset = direction === "left" ? -clientWidth : clientWidth;

      carouselRef.current.scrollTo({
        left: scrollLeft + offset,
        behavior: "smooth",
      });
    }
  };

  return (
    <section
      id="testimony"
      className="w-full bg-[#030712] py-16 px-4 text-white relative overflow-hidden"
    >
      {/* HEADER SECTION */}
      <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto mb-12">
        <div className="h-px flex-1 bg-linear-to-r from-ch-bg to-ch-primary"></div>
        <h2 className="text-xl md:text-2xl font-bold tracking-widest text-slate-200 uppercase whitespace-nowrap font-sans">
          {content.heading}
        </h2>
        <div className="h-px flex-1 bg-linear-to-r from-ch-primary to-ch-bg"></div>
      </div>

      {/* WRAPPER CAROUSEL */}
      <div className="relative max-w-6xl mx-auto flex items-center group">
        {/* Tombol Navigasi Kiri */}
        <button
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          className="absolute -left-2 md:-left-6 z-10 p-3 rounded-full bg-slate-900/80 text-blue-400 border border-slate-800/80 hover:bg-slate-800 hover:text-blue-300 transition duration-300 cursor-pointer backdrop-blur-sm disabled:opacity-20 disabled:pointer-events-none"
          aria-label={content.previous}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* CONTAINER UTAMA (Snap Scroll) */}
        <div
          ref={carouselRef}
          onScroll={checkScrollPosition}
          className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth w-full px-4 py-4"
          style={{ scrollbarWidth: "none" }}
        >
          {testimonies.map((item, index) => (
            <div
              key={index}
              className="flex-none w-[88%] md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] snap-start snap-always p-[1px] rounded-2xl bg-gradient-to-br from-slate-700/40 via-slate-800/10 to-transparent"
            >
              {/* INNER BOX CARD */}
              <div className="bg-[#090d16] p-6 rounded-[15px] h-64 flex flex-col justify-between shadow-2xl backdrop-blur-md">
                <div>
                  <div className="flex gap-1 mb-5">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-ch-primary text-ch-primary"
                      />
                    ))}
                  </div>
                  <p className="text-slate-300 font-medium text-sm md:text-base leading-relaxed italic">
                    &ldquo;{item.testimonial}&rdquo;
                  </p>
                </div>

                <div className="border-t border-slate-800/50 pt-4">
                  <h4 className="text-sm font-semibold text-white tracking-wide">
                    — {item.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tombol Navigasi Kanan */}
        <button
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          className="absolute -right-2 md:-right-6 z-10 p-3 rounded-full bg-slate-900/80 text-blue-400 border border-slate-800/80 hover:bg-slate-800 hover:text-blue-300 transition duration-300 cursor-pointer backdrop-blur-sm disabled:opacity-20 disabled:pointer-events-none"
          aria-label={content.next}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* DYNAMIC INDICATOR DOTS */}
      <div className="flex justify-center gap-2 mt-8">
        {Array.from({ length: dotsCount }).map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              activeIndex === index
                ? "w-6 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                : "w-2 bg-slate-700"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
