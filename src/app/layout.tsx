import type { Metadata } from "next";

import { PROJECT } from "@/lib/project";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: `${PROJECT.name}, a song as a printable object`,
  description: PROJECT.tagline,
  openGraph: {
    title: `${PROJECT.name}, a song as a printable object`,
    description: PROJECT.tagline,
    type: "website",
  },
  other: { "trademark-notice": PROJECT.disclaimer },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
