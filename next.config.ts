import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        // The deployment URL keeps answering after a domain is attached, and
        // two origins serving the same pages is a duplicate whose canonical is
        // whichever one a crawler happened to see first.
        source: "/:path*",
        has: [{ type: "host", value: "soundtag-psi.vercel.app" }],
        destination: "https://soundtag.adatepe.dev/:path*",
        permanent: true,
      },
    ];
  },
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
