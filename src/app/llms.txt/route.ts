/**
 * llms.txt, generated from the same constants the product uses.
 *
 * Written by hand it would drift the first time a shape was added or a default
 * changed, and a stale index is worse than none: it teaches an assistant the
 * wrong numbers with full confidence. Everything below is read from the code.
 */

import { BEDS } from "@/lib/export/threemf";
import { FILAMENTS, GOOD_CONTRAST } from "@/lib/filament";
import { SHAPES, layout } from "@/lib/layouts";
import { PROJECT } from "@/lib/project";
import { DEFAULTS } from "@/lib/tag";

export const dynamic = "force-static";

export function GET(): Response {
  const shapes = SHAPES.map((name) => {
    const l = layout(name);
    return `- ${name}: ${l.size.width} by ${l.size.height} mm, ${l.thickness} mm thick. ${l.about}`;
  }).join("\n");

  const body = `# ${PROJECT.name}

> ${PROJECT.tagline}

${PROJECT.disclaimer}

## What it does

Reads the Spotify Code image for a track, album or playlist link, and builds a printable object from it. The plate and the code are separate parts at separate heights, so a print needs exactly one filament change: everything below ${DEFAULTS.reliefMm} mm of relief is filament 1, everything above it is filament 2. At a ${DEFAULTS.layerHeightMm} mm layer height on the default bar, that change lands on layer 13.

## Output formats

- 3MF: both parts named and assigned to filament 1 and 2, opens in Bambu Studio, OrcaSlicer and PrusaSlicer
- STL: binary, one merged mesh, colour change set by hand at the reported layer
- SVG: millimetre scale, separate cut and engrave layers for a laser cutter

## Shapes

${shapes}

## Printer beds it can place a tag on

${Object.entries(BEDS).map(([id, bed]) => `- ${id}: ${bed.name}, ${bed.width} by ${bed.depth} mm`).join("\n")}

## Filament

${FILAMENTS.length} Bambu PLA Basic colours are built in. Contrast is computed with the WCAG formula and a pair at or above ${GOOD_CONTRAST} to 1 is treated as good. Contrast is a property of two colours, not a promise about a camera: whether a printed tag scans has not been measured yet, and the project says so rather than claiming it.

## Command line

npx ${PROJECT.name} "https://open.spotify.com/track/..."

## Rights

${PROJECT.outputRights}

## Links

- Source: ${PROJECT.repo}
- Package: ${PROJECT.npm}
- Trademark notice: ${PROJECT.repo}/blob/main/TRADEMARKS.md
- Verification log: ${PROJECT.repo}/blob/main/VERIFY-LOG.md
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
