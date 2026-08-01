import { ImageResponse } from "next/og";

import { previewSvg } from "@/lib/export/svg";
import { DEMO_SCANNABLE } from "@/lib/demo";
import { PROJECT } from "@/lib/project";
import { composeTag } from "@/lib/tag";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${PROJECT.name}, a song as a printable object`;

/**
 * The card is the product's own renderer, not a screenshot.
 *
 * The tag is composed here from the embedded example code and handed to the
 * image as an inline SVG data URI, so the picture that gets shared is the same
 * geometry the exporter writes. A card drawn by hand would be free to flatter
 * the object; this one cannot.
 */
export default async function Image() {
  const geometry = composeTag(DEMO_SCANNABLE, { shape: "bar" });
  const svg = previewSvg(geometry, {
    bodyColour: "#16181d",
    codeColour: "#eef1f4",
    background: null,
    relief: false,
    pixelsPerMm: 12,
  });
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#07080a",
          color: "#eef1f4",
          padding: 72,
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 8, color: "#8f9bff" }}>
          SOUNDTAG
        </div>
        <img src={src} width={1056} height={226} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 46, letterSpacing: -1 }}>A song, as an object.</div>
          <div style={{ fontSize: 26, color: "#9aa3ad" }}>
            3MF with the filament change already assigned, STL, and an SVG for laser.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
