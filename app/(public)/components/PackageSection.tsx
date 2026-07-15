import {
  LucideCheck,
  LucideMoveUpRight,
  LucideX,
} from "lucide-react";
import React from "react";

type PackageContent = {
  heading: string;
  popular: string;
  items: readonly {
    title: string;
    price: string;
    duration: string;
    benefits: readonly { item: string; required: boolean }[];
    cta: string;
    premium: boolean;
  }[];
};

const PackageSection = ({ content }: { content: PackageContent }) => {
  return (
    <section className="mt-10" id="package">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto mb-12">
          <div className="h-px flex-1 bg-linear-to-r from-ch-bg to-ch-primary"></div>
          <h2 className="text-xl md:text-2xl font-bold tracking-widest text-slate-200 uppercase whitespace-nowrap font-sans">
            {content.heading}
          </h2>
          <div className="h-px flex-1 bg-linear-to-r from-ch-primary to-ch-bg"></div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center gap-10">
        {content.items.map((p, index) => (
          <div
            key={index}
            className={`w-full md:w-1/3 glass-card package ${p.premium ? "premium" : ""}`}
          >
            {p.premium && (
              <div className="glow-yellow py-2 px-6 border uppercase text-amber-300 font-bold text-sm border-amber-200 rounded-xl w-fit absolute -top-5 left-[50%] bg-ch-bg translate-x-[-50%]">
                <span className="glow-yellow">{content.popular}</span>
              </div>
            )}
            <div className="p-3 md:p-6">
              <h4
                className={`block m-auto w-fit font-bold ${p.premium ? "text-amber-300" : "text-ch-primary"} uppercase text-2xl md:text-3xl`}
              >
                {p.title}
              </h4>
              <div className="my-4 md:my-10 text-center font-semibold">
                <div className="flex flex-row gap-3 items-center justify-center">
                  <span className="block font-light">Rp</span>
                  <span className="block text-4xl">{p.price}</span>
                </div>
                <span className="text-md font-light">{p.duration}</span>
              </div>
              <div>
                <ul>
                  {p.benefits.map((b, i) => (
                    <li key={i} className="flex flex-row gap-3 mb-1 md:mb-3">
                      <span>
                        {b.required ? (
                          <span
                            className={`${p.premium ? "text-amber-300" : "text-green-700"}`}
                          >
                            <LucideCheck />
                          </span>
                        ) : (
                          <span className="text-red-500">
                            <LucideX />
                          </span>
                        )}
                      </span>
                      <span>{b.item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10">
                <a
                  href=""
                  className={`w-full ${p.premium ? "button-yellow text-black" : "button"} px-10 py-3 text-center font-bold text-md flex flex-row justify-center items-center gap-5`}
                >
                  {p.cta} <LucideMoveUpRight />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PackageSection;
