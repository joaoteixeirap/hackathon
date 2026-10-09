import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets tests/benchmarks build into their own folder without clobbering `pnpm dev`'s `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
