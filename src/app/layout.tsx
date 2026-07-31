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

/**
 * Structured data, so an assistant answering "how do I print a Spotify code"
 * has something to quote that is not a guess about the page.
 */
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: PROJECT.name,
  description: PROJECT.tagline,
  applicationCategory: "DesignApplication",
  operatingSystem: "Any",
  url: PROJECT.repo,
  license: "https://opensource.org/licenses/MIT",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  author: { "@type": "Person", name: "noluyorAbi", url: "https://github.com/noluyorAbi" },
  disambiguatingDescription: PROJECT.disclaimer,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${display.variable}`}>
      <body>
        {children}
        <script
          type="application/ld+json"
          // Serialised from a constant in this file, never from user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </body>
    </html>
  );
}
