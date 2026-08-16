import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return [
      {
        source: "/og/community/:id.jpg",
        destination: "/og/community/:id",
      },
    ];
  },
};

export default nextConfig;
