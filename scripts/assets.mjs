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

const shots = [
  ["hero", { shape: "bar" }, { bodyColour: "#12161b", codeColour: "#f4f7f9" }],
  ["bar-text", { shape: "bar", title: "Sweater Weather", artist: "The Neighbourhood" }, {}],
  ["mark", { shape: "bar", mark: true }, {}],
  ["coin", { shape: "coin" }, {}],
  ["card", { shape: "card", title: "Sweater Weather", artist: "The Neighbourhood" }, {}],
  ["ornament", { shape: "ornament", title: "Sweater Weather" }, {}],
  ["magnet", { shape: "magnet" }, {}],
];

for (const [name, options, style] of shots) {
  const geometry = composeTag(scannable, options);
  writeFileSync(
    new URL(`../assets/${name}.svg`, import.meta.url),
    previewSvg(geometry, { background: "#e9edf1", pixelsPerMm: 10, ...style }),
  );
  console.log(`assets/${name}.svg  ${geometry.layout.size.width} by ${geometry.layout.size.height.toFixed(1)} mm`);
}
