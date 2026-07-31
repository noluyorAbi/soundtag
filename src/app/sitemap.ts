import type { MetadataRoute } from "next";

import { origin } from "@/lib/site";

/** One page, and the two files an agent looks for next to it. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: origin(), changeFrequency: "monthly", priority: 1 },
  ];
}
