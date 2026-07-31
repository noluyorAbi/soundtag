import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            // Points an agent at the plain text description of this site
            // without it having to guess that /llms.txt exists.
            key: "Link",
            value: '</llms.txt>; rel="alternate"; type="text/plain"; title="llms.txt"',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
