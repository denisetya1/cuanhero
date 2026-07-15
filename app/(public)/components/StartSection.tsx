import React from "react";
import Image from "next/image";

type StartContent = {
  headingPrefix: string;
  headingHighlight: string;
  steps: readonly {
    title: string;
    description: string;
    icon: string;
  }[];
};

const StartSection = ({ content }: { content: StartContent }) => {
  return (
    <section id="how-to" className="mt-10">
      <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto mb-12">
        <div className="h-px flex-1 bg-linear-to-r from-ch-bg to-ch-primary"></div>
        <h2 className="text-xl md:text-2xl font-bold tracking-widest text-slate-200 uppercase whitespace-nowrap font-sans">
          {content.headingPrefix}{" "}
          <span className="text-ch-primary">{content.headingHighlight}</span>
        </h2>
        <div className="h-px flex-1 bg-linear-to-r from-ch-primary to-ch-bg"></div>
      </div>

      {/* Container holding all the steps */}
      <div className="m-auto step flex flex-row justify-center items-start gap-10 md:gap-20">
        {content.steps.map((s, index) => (
          <div
            key={index}
            className="relative w-20 md:w-60 flex flex-col items-center justify-center"
          >
            <div className="mb-5">
              <Image src={s.icon} alt="" width={170} height={170} priority />
            </div>

            <div className="p-0 md:pl-15">
              <h4 className="mb-5 font-semibold text-center">{s.title}</h4>
              <p className="text-center text-sm hidden md:block">
                {s.description}
              </p>
            </div>
            {/* Arrow sits between cards. Hidden on the last card (index 2) */}
            {index < content.steps.length - 1 && (
              <div className="dot-dashed-arrow hidden md:block"></div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default StartSection;
