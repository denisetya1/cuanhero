import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets self-hosted Next.js detect clients that still use assets or Server
  // Actions from the previous deployment and force a full navigation.
  deploymentId: process.env.DEPLOYMENT_VERSION,
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
