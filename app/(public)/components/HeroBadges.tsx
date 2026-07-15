import Image from "next/image";

const badgeImages = [
  "/images/icon-gear-glow.png",
  "/images/icon-gear-glow.png",
  "/images/icon-cloud-glow.png",
  "/images/icon-support-glow.png",
];

const HeroBadges = ({ badges }: { badges: readonly string[] }) => {
  return (
    <section className="glass-card mt-8">
      <div className="glass-card-content badges w-full inline-flex justify-between items-center bg-cuan-card/60 px-3 py-3">
        {badges.map((title, index) => (
          <div key={index} className="flex items-center px-3">
            <div className="flex items-center gap-4 pl-2">
              <div className="flex h-9 w-9 items-center justify-center">
                <Image
                  src={badgeImages[index] ?? badgeImages[0]}
                  alt=""
                  width={200}
                  height={200}
                  priority
                />
              </div>

              <span className="text-sm text-white">{title}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HeroBadges;
