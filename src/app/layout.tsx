import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { PROJECT } from "@/lib/project";
import "./globals.css";

/**
 * A mono face for the body, because everything on this page is a measurement,
 * and a grotesk for the headlines so the page has one voice that is not a
 * readout. The pixel font in the labels is the product's own, and it is drawn
 * rather than set, so it needs no loading.
 */
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });

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
    <html lang="en" className={`${mono.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
