import Image from "next/image";

type BenefitContent = {
  headingPrefix: string;
  description: string;
  items: readonly {
    title: string;
    description: string;
    icon: string;
  }[];
};

const BenefitSection = ({ content }: { content: BenefitContent }) => {
  return (
    <section className="w-full flex flex-col md:flex-row justify-between gap-8">
      <div className="flex-none w-80">
        <h2 className="text-3xl font-orbitron">
          {content.headingPrefix}{" "}
          <span className="block text-5xl my-5">
            CUAN<span className="text-ch-primary">HERO</span>
          </span>
        </h2>
        <p>{content.description}</p>
      </div>
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-5">
        {content.items.map((b, index) => (
          <div
            key={index}
            className="glass-card small flex flex-col md:flex-row gap-3"
          >
            <div className="flex-none m-auto w-12 flex justify-center items-center">
              <Image src={b.icon} alt="" width={100} height={100} priority />
            </div>
            <div>
              <h3 className="flex-1 text-center md:text-left text-sm mb-5 font-bold">
                {b.title}
              </h3>
              <p className="text-sm text-center md:text-left">
                {b.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BenefitSection;
