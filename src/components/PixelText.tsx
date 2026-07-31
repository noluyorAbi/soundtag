/**
 * Page labels set in the font that gets printed on the object.
 *
 * The same 5 by 7 grid, the same tracing, the same rules about which
 * characters exist. It is the one typographic decision on this page that could
 * not be reused on any other project, and it costs nothing: the module is
 * already in the bundle because the tag needs it.
 */

import { GLYPH_HEIGHT, textLine } from "@/lib/text/font";
import { gridToPolygons } from "@/lib/text/raster";

export function PixelText({
  children,
  size = 3,
  colour = "currentColor",
  className,
}: {
  children: string;
  /** Pixel edge length in CSS pixels. */
  size?: number;
  colour?: string;
  className?: string;
}) {
  const line = textLine(children);
  const polygons = gridToPolygons(line.grid, 1, 0, 0);
  const width = Math.max(line.widthPx, 1);

  const d = polygons
    .map((poly) =>
      [poly.outer, ...poly.holes]
        .map(
          (ring) =>
            ring
              .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${GLYPH_HEIGHT - y}`)
              .join("") + "Z",
        )
        .join(""),
    )
    .join("");

  return (
    <svg
      className={className}
      width={width * size}
      height={GLYPH_HEIGHT * size}
      viewBox={`0 0 ${width} ${GLYPH_HEIGHT}`}
      role="img"
      aria-label={children}
      shapeRendering="crispEdges"
    >
      <path d={d} fill={colour} fillRule="evenodd" />
    </svg>
  );
}
