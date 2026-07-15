import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d3dpet1g0ty5ed.cloudfront.net",
      },
    ],
  },
};

export default nextConfig;
