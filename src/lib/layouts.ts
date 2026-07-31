/**
 * Shape presets.
 *
 * A layout answers four questions and nothing else: what the plate outline is,
 * where the holes are, which rectangle the code artwork may occupy, and which
 * rectangle text may occupy. Everything downstream (meshes, laser paths, the
 * preview, the scan size warning) is derived from those answers, so adding a
 * shape is adding one entry here rather than touching five files.
 *
 * All coordinates are millimetres with the origin at the plate's bottom left
 * corner and y pointing up.
 */

import { capsule, circle, roundedRect, type Ring } from "./geom/polygon";

export type ShapeName = "bar" | "coin" | "card" | "ornament" | "magnet";

export type Box = { x: number; y: number; width: number; height: number };

export type Layout = {
  name: ShapeName;
  outline: Ring;
  /** Cut all the way through: keyring hole, hanging hole. */
  holes: Ring[];
  /** Recessed from the back, not through: magnet seats. */
  pockets: { ring: Ring; depth: number }[];
  /** Where the Spotify Code may go. */
  codeBox: Box;
  /** Where song text may go, when the shape has room for it. */
  textBox: Box | null;
  size: { width: number; height: number };
  /** Default total thickness for this shape, in mm. */
  thickness: number;
  /** Human sentence for the docs and the CLI listing. */
  about: string;
};

export type LayoutOptions = {
  /** Overrides the preset's long side. The rest of the shape scales with it. */
  widthMm?: number;
  holeDiameterMm?: number;
  thicknessMm?: number;
  /** Reserve room for text. Ignored by shapes that have none. */
  text?: boolean;
};

const KEYRING_HOLE = 3.6;

export const SHAPES: ShapeName[] = ["bar", "coin", "card", "ornament", "magnet"];

export function layout(name: ShapeName, options: LayoutOptions = {}): Layout {
  switch (name) {
    case "bar":
      return bar(options);
    case "coin":
      return coin(options);
    case "card":
      return card(options);
    case "ornament":
      return ornament(options);
    case "magnet":
      return magnet(options);
  }
}

/**
 * The keychain bar. The proportions come from the printed reference this
 * project started as: 75.6 by 16.2, corner radius 3.6, hole 5.2 from the left
 * edge, which leaves 3.4 mm of material around a 3.6 mm hole.
 */
function bar(o: LayoutOptions): Layout {
  const width = o.widthMm ?? 75.6;
  const height = width * (16.2 / 75.6);
  const radius = height * (3.6 / 16.2);
  const holeR = (o.holeDiameterMm ?? KEYRING_HOLE) / 2;
  const holeCx = width * (5.2 / 75.6);
  const codeLeft = holeCx + holeR + 1.6;
  const codeRight = width - 2.4;

  // With text, the code gives up its lower third and the line sits under it.
  // Engraving the back was tried first and refused: a letter's counter has to
  // stay standing inside the recess, and the bridges that a triangulator adds
  // to reach it land on the outline, which is how a manifold solid stops being
  // one. Raised text in the code's own filament costs nothing extra to print.
  const textHeight = o.text ? height * 0.2 : 0;
  const codeHeight = height * 0.64 - textHeight;

  return {
    name: "bar",
    outline: roundedRect(width, height, radius),
    holes: [circle(holeCx, height / 2, holeR)],
    pockets: [],
    codeBox: {
      x: codeLeft,
      y: height * 0.18 + textHeight,
      width: codeRight - codeLeft,
      height: codeHeight,
    },
    textBox: o.text
      ? { x: codeLeft, y: height * 0.11, width: codeRight - codeLeft, height: textHeight }
      : null,
    size: { width, height },
    thickness: o.thicknessMm ?? 3,
    about: "The keyring bar. The original shape, sized to sit flat against a key.",
  };
}

/** A round tag. The code runs across the middle, the hole sits at the top. */
function coin(o: LayoutOptions): Layout {
  const d = o.widthMm ?? 50;
  const r = d / 2;
  const holeR = (o.holeDiameterMm ?? KEYRING_HOLE) / 2;
  const holeCy = d - 3.6;
  // A chord at the code's height decides how wide the code may be, so the
  // artwork never runs past the curve.
  const codeHeight = d * 0.2;
  const halfChord = Math.sqrt(Math.max(0, r * r - (codeHeight / 2) ** 2)) - 2.5;

  return {
    name: "coin",
    outline: circle(r, r, r),
    holes: [circle(r, holeCy, holeR)],
    pockets: [],
    codeBox: { x: r - halfChord, y: r - codeHeight / 2, width: halfChord * 2, height: codeHeight },
    textBox: o.text ? { x: r - halfChord * 0.8, y: r * 0.42, width: halfChord * 1.6, height: 4 } : null,
    size: { width: d, height: d },
    thickness: o.thicknessMm ?? 3,
    about: "A round tag, code across the middle, hole at twelve o'clock.",
  };
}

/** Credit card proportions, so it fits a wallet, with room for two text lines. */
function card(o: LayoutOptions): Layout {
  const width = o.widthMm ?? 85.6;
  const height = width * (54 / 85.6);
  const radius = 3.2;
  const margin = 6;

  return {
    name: "card",
    outline: roundedRect(width, height, radius),
    holes: [],
    pockets: [],
    codeBox: {
      x: margin,
      y: height * 0.46,
      width: width - margin * 2,
      height: height * 0.34,
    },
    textBox: { x: margin, y: height * 0.14, width: width - margin * 2, height: height * 0.22 },
    size: { width, height },
    thickness: o.thicknessMm ?? 2.4,
    about: "Wallet sized, with two lines of text under the code.",
  };
}

/** A hanging disc, for a tree or a rear view mirror. */
function ornament(o: LayoutOptions): Layout {
  const d = o.widthMm ?? 70;
  const r = d / 2;
  const holeR = (o.holeDiameterMm ?? 4) / 2;
  const codeHeight = d * 0.17;
  const halfChord = Math.sqrt(Math.max(0, r * r - (codeHeight / 2) ** 2)) - 3.5;

  return {
    name: "ornament",
    outline: circle(r, r, r),
    holes: [circle(r, d - 4.5, holeR)],
    pockets: [],
    codeBox: {
      x: r - halfChord,
      y: r - codeHeight / 2 - d * 0.04,
      width: halfChord * 2,
      height: codeHeight,
    },
    textBox: { x: r - halfChord * 0.85, y: r * 0.36, width: halfChord * 1.7, height: 5 },
    size: { width: d, height: d },
    thickness: o.thicknessMm ?? 3,
    about: "A hanging disc with room for a title under the code.",
  };
}

/**
 * The fridge magnet. No keyring hole, two seats for 6 by 2 mm discs on the
 * back, and a thicker plate so a 2 mm pocket still leaves 2 mm of material.
 */
function magnet(o: LayoutOptions): Layout {
  const base = bar({ ...o, widthMm: o.widthMm ?? 75.6 });
  const { width, height } = base.size;
  const magnetR = 3.1;
  const depth = 2.1;
  const inset = width * 0.22;

  return {
    ...base,
    name: "magnet",
    holes: [],
    pockets: [
      { ring: circle(inset, height / 2, magnetR), depth },
      { ring: circle(width - inset, height / 2, magnetR), depth },
    ],
    codeBox: { ...base.codeBox, x: 3.4, width: width - 6.8 },
    textBox: base.textBox ? { ...base.textBox, x: 3.4, width: width - 6.8 } : null,
    thickness: o.thicknessMm ?? 4.2,
    about: "Bar without the keyring hole, two 6 by 2 mm magnet seats in the back.",
  };
}

/** Used by the batch packer and the previews. */
export function outlineBox(l: Layout): Box {
  return { x: 0, y: 0, width: l.size.width, height: l.size.height };
}

/** Re-exported so callers building custom shapes do not import two modules. */
export { capsule, circle, roundedRect };
