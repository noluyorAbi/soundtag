/**
 * Generates the README artwork from the product's own renderer, so a picture
 * in the documentation cannot show something the exporter would not produce.
 *
 * Run: ./scripts/build-assets.sh
 */
import { readFileSync, writeFileSync } from "node:fs";

const lib = await import("../.assets-lib.mjs");
const { parseScannable, composeTag, previewSvg } = lib;

const svg = readFileSync(new URL("../test/fixtures/code-sweater-weather.svg", import.meta.url), "utf8");
const scannable = parseScannable(svg);

// Dark, to match the site and to sit well in a README on either GitHub theme.
const STYLE = { bodyColour: "#16181d", codeColour: "#eef1f4" };

const shots = [
  ["hero", { shape: "bar" }, STYLE],
  ["bar-text", { shape: "bar", title: "Sweater Weather", artist: "The Neighbourhood" }, STYLE],
  ["mark", { shape: "bar", mark: true }, STYLE],
  ["coin", { shape: "coin" }, STYLE],
  ["card", { shape: "card", title: "Sweater Weather", artist: "The Neighbourhood" }, STYLE],
  ["ornament", { shape: "ornament", title: "Sweater Weather" }, STYLE],
  ["magnet", { shape: "magnet" }, STYLE],
];

for (const [name, options, style] of shots) {
  const geometry = composeTag(scannable, options);
  writeFileSync(
    new URL(`../assets/${name}.svg`, import.meta.url),
    previewSvg(geometry, { background: "#0d0f13", pixelsPerMm: 10, ...style }),
  );
  console.log(`assets/${name}.svg  ${geometry.layout.size.width} by ${geometry.layout.size.height.toFixed(1)} mm`);
}
