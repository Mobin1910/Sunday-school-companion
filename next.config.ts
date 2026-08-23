import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export. There is no server, and the constitution says there never will be.
  output: "export",

  // Static export cannot use the Image Optimization API. We art-direct and
  // pre-size illustrations ourselves instead.
  images: { unoptimized: true },
};

export default nextConfig;
