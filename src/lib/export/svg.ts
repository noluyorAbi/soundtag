/**
 * SVG, in two dialects from one composition.
 *
 * `previewSvg` is what the site, the OG card and the README show. It is the
 * same geometry the mesh is built from, so a preview cannot flatter the object
 * it claims to represent.
 *
 * `laserSvg` is a cutting file: a `cut` layer of hairline outlines and an
 * `engrave` layer of filled artwork, in millimetres at 1:1, which is what
 * LightBurn, xTool and Glowforge expect. Doubling the addressable audience
 * cost about forty lines, which is the argument for it.
 *
 * SVG has y pointing down and the composition has it pointing up. The flip is
 * applied per point rather than with a transform attribute, so a cutter that
 * ignores transforms still receives the right shape.
 */

import type { Polygon, Ring } from "../geom/polygon";
import { PROJECT } from "../project";
import type { TagGeometry } from "../tag";

export type PreviewOptions = {
  bodyColour?: string;
  codeColour?: string;
  /** Adds a soft shadow under the relief so the raised code reads as raised. */
  relief?: boolean;
  background?: string | null;
  /** Rendered pixels per mm. Only affects the width and height attributes. */
  pixelsPerMm?: number;
};

export function previewSvg(geometry: TagGeometry, options: PreviewOptions = {}): string {
  const body = options.bodyColour ?? "#101012";
  const code = options.codeColour ?? "#f6f6f4";
  const scale = options.pixelsPerMm ?? 8;
  const { width, height } = geometry.layout.size;
  const paths = artwork(geometry, height);

  const shadow =
    (options.relief ?? true)
      ? [
          `  <g fill="#000000" opacity="0.3" transform="translate(0 0.18)">`,
          ...paths.map((d) => `    <path d="${d}"/>`),
          `  </g>`,
        ]
      : [];

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${(width * scale).toFixed(0)}" height="${(height * scale).toFixed(0)}" viewBox="0 0 ${num(width)} ${num(height)}">`,
    `  <title>${PROJECT.name} tag preview</title>`,
    ...(options.background
      ? [`  <rect width="${num(width)}" height="${num(height)}" fill="${options.background}"/>`]
      : []),
    `  <path d="${polygonPath(geometry.plate, height)}" fill="${body}" fill-rule="evenodd"/>`,
    ...shadow,
    `  <g fill="${code}">`,
    ...paths.map((d) => `    <path d="${d}"/>`),
    `  </g>`,
    `</svg>`,
  ].join("\n");
}

export function laserSvg(geometry: TagGeometry): string {
  const { width, height } = geometry.layout.size;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}mm" height="${num(height)}mm" viewBox="0 0 ${num(width)} ${num(height)}">`,
    `  <title>${PROJECT.name} laser file</title>`,
    `  <desc>${PROJECT.disclaimer}</desc>`,
    `  <g id="cut" fill="none" stroke="#ff0000" stroke-width="0.05">`,
    `    <path d="${polygonPath(geometry.plate, height)}"/>`,
    `  </g>`,
    `  <g id="engrave" fill="#000000">`,
    ...artwork(geometry, height).map((d) => `    <path d="${d}"/>`),
    `  </g>`,
    `</svg>`,
  ].join("\n");
}

function artwork(geometry: TagGeometry, height: number): string[] {
  return [...geometry.code, ...geometry.frontText].map((p) => polygonPath(p, height));
}

function polygonPath(poly: Polygon, height: number): string {
  return [poly.outer, ...poly.holes].map((ring) => ringPath(ring, height)).join(" ");
}

function ringPath(ring: Ring, height: number): string {
  return (
    ring.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${num(x)} ${num(height - y)}`).join(" ") + " Z"
  );
}

function num(n: number): string {
  const rounded = Number(n.toFixed(3));
  return (rounded === 0 ? 0 : rounded).toString();
}
