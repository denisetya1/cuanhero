import Image from "next/image";

type SLAItem = {
  title: string;
  caption1: string;
  caption2: string;
  img: string;
};

const SLA = ({ items }: { items: readonly SLAItem[] }) => {
  return (
    <section id="feature" className="big glass-card mt-10">
      <div className="glass-card-content badges w-full inline-flex gap-0 justify-between items-center bg-cuan-card/60 p-1 md:p-3">
        {items.map((item, index) => (
          <div key={index} className="w-1/3 flex items-center">
            <div className="flex flex-col md:flex-row items-center p-0 md:p-3 px-2 md:px-10">
              <div className="flex h-15 w-15 md:h-22 md:w-22 md:mr-5 items-center justify-center">
                <Image
                  src={item.img}
                  alt=""
                  width={200}
                  height={200}
                  priority
                />
              </div>

              <div className="p-3 md:pr-5">
                <p className="text-center md:text-left font-bold text-xl md:text-3xl text-white">
                  {item.title}
                </p>
                <p className="text-center md:text-left text-md font-semibold text-white">
                  {item.caption1}
                </p>
                <p className="text-center md:text-left hidden md:block text-sm text-white">
                  {item.caption2}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SLA;
