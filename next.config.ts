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
      // Extra aliases so older / mistyped mobile builds still hit the status API
      {
        source: "/api/member_status",
        destination: "/api/member-status",
      },
      {
        source: "/api/statuses",
        destination: "/api/member-status",
      },
    ];
  },
};

export default nextConfig;
