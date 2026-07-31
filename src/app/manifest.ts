import type { MetadataRoute } from "next";

import { PROJECT } from "@/lib/project";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${PROJECT.name}, a song as a printable object`,
    short_name: PROJECT.name,
    description: PROJECT.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#07080a",
    theme_color: "#07080a",
  };
}
