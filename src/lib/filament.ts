/**
 * Filament pairs, contrast, and the layer the change lands on.
 *
 * A Spotify Code is read by a camera, and a camera reads contrast, not colour.
 * Every pair in this table therefore carries its measured contrast ratio,
 * computed the same way WCAG computes it, so the UI can rank pairs instead of
 * leaving a person to find out after a two hour print that dark grey on black
 * does not scan.
 *
 * The threshold below is not a claim about scanning. It is the point where a
 * pair stops being legible to a phone camera in ordinary indoor light by the
 * same standard used for body text on a screen, and the honest sentence is in
 * VERIFY-LOG.md: what has actually been printed and scanned, and what has not.
 */

export type Filament = { name: string; hex: string };

/** Bambu Lab PLA Basic, the colours most people already have on a spool. */
export const FILAMENTS: Filament[] = [
  { name: "Black", hex: "#000000" },
  { name: "Charcoal", hex: "#262626" },
  { name: "Silver", hex: "#a6a9aa" },
  { name: "White", hex: "#ffffff" },
  { name: "Beige", hex: "#f7e6de" },
  { name: "Gold", hex: "#e4bd68" },
  { name: "Yellow", hex: "#f4ee2a" },
  { name: "Orange", hex: "#ff6a13" },
  { name: "Red", hex: "#c12e1f" },
  { name: "Magenta", hex: "#ec008c" },
  { name: "Pink", hex: "#f55a74" },
  { name: "Purple", hex: "#5e43b7" },
  { name: "Blue", hex: "#0a2989" },
  { name: "Cyan", hex: "#0086d6" },
  { name: "Mint", hex: "#87e0cf" },
  { name: "Bambu Green", hex: "#00ae42" },
  { name: "Brown", hex: "#9d432c" },
];

/** Contrast at or above this reads reliably at arm's length. */
export const GOOD_CONTRAST = 7;
/** Below this, do not print it: the bars stop separating from the plate. */
export const POOR_CONTRAST = 3;

export function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`not a colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

export type PairVerdict = "good" | "usable" | "poor";

export function verdictFor(ratio: number): PairVerdict {
  if (ratio >= GOOD_CONTRAST) return "good";
  if (ratio >= POOR_CONTRAST) return "usable";
  return "poor";
}

export type Pairing = {
  body: Filament;
  code: Filament;
  ratio: number;
  verdict: PairVerdict;
};

export function pairing(bodyHex: string, codeHex: string): Pairing {
  const body = FILAMENTS.find((f) => f.hex === bodyHex) ?? { name: "Custom", hex: bodyHex };
  const code = FILAMENTS.find((f) => f.hex === codeHex) ?? { name: "Custom", hex: codeHex };
  const ratio = contrastRatio(bodyHex, codeHex);
  return { body, code, ratio, verdict: verdictFor(ratio) };
}

/** Every pair worth printing, best contrast first. */
export function bestPairs(limit = 12): Pairing[] {
  const pairs: Pairing[] = [];
  for (const body of FILAMENTS) {
    for (const code of FILAMENTS) {
      if (body.hex === code.hex) continue;
      pairs.push(pairing(body.hex, code.hex));
    }
  }
  return pairs
    .filter((p) => p.verdict === "good")
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, limit);
}

export type ChangePlan = {
  /** The first layer printed in the second filament, counting the first layer as 1. */
  layer: number;
  /** Height the change happens at, in mm. */
  z: number;
  /** False when the change height is not a whole number of layers. */
  exact: boolean;
  /** What to type into the slicer, in one sentence. */
  instruction: string;
};

/**
 * Slicers count the first layer as layer 1, and a colour change inserted at
 * layer N takes effect at the start of N. A first layer thicker than the rest
 * is the usual case on Bambu machines, so it is a separate argument rather
 * than an assumption.
 */
export function changePlan(
  changeZ: number,
  layerHeight: number,
  firstLayerHeight = layerHeight,
): ChangePlan {
  const above = (changeZ - firstLayerHeight) / layerHeight;
  const layers = 1 + above;
  const exact = Math.abs(layers - Math.round(layers)) < 1e-6;
  const layer = Math.round(layers) + 1;
  return {
    layer,
    z: changeZ,
    exact,
    instruction: exact
      ? `Insert the filament change at layer ${layer}, which starts at z ${round(changeZ)} mm.`
      : `A ${layerHeight} mm layer does not land on z ${round(changeZ)} mm. Layer ${layer} starts at z ${round(firstLayerHeight + (layer - 2) * layerHeight)} mm, so either accept that or set the relief to a multiple of the layer height.`,
  };
}

function round(n: number): string {
  return Number(n.toFixed(3)).toString();
}
