import type { MetadataRoute } from "next";

import { origin } from "@/lib/site";

/**
 * Search is welcome, answering engines are welcome, training crawlers are not.
 *
 * A wildcard cannot express that difference, so the crawlers are named. The
 * split is deliberate: an assistant that reads this page to answer "how do I
 * print a Spotify code" is doing exactly what the project wants, and a crawler
 * collecting a training corpus is not the same act.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      // Answering and search agents.
      { userAgent: ["Googlebot", "Bingbot", "DuckDuckBot"], allow: "/" },
      { userAgent: ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot"], allow: "/" },
      // Training corpora.
      { userAgent: ["GPTBot", "CCBot", "Google-Extended", "Applebot-Extended"], disallow: "/" },
    ],
    sitemap: `${origin()}/sitemap.xml`,
    host: origin(),
  };
}
