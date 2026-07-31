/**
 * A 5 by 7 bitmap font, written out as rows so a wrong glyph is visible in the
 * diff rather than hidden in a hex table.
 *
 * Why a bitmap font and not a real typeface: rendering a TTF means shipping a
 * font parser and a font file, and outlines with curves that small print as
 * mush anyway. A pixel grid maps one to one onto extruded rectangles, and at
 * the default pixel size of 0.45 mm every stroke is wider than the 0.42 mm
 * line a 0.4 mm nozzle lays down, so every stroke actually appears.
 *
 * The known limitation, stated rather than hidden: a 5 by 7 cell has no room
 * for a mark above the cap line, so diacritics are stripped. "Über" prints as
 * "Uber". The alternative was a taller cell, which would have cost the code
 * artwork height on the bar shape, and the code is the point of the object.
 */

export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;

/** Rows top to bottom, `#` is material. */
const GLYPHS: Record<string, string> = {
  " ": "...../...../...../...../...../...../.....",
  A: ".###./#...#/#...#/#####/#...#/#...#/#...#",
  B: "####./#...#/#...#/####./#...#/#...#/####.",
  C: ".###./#...#/#..../#..../#..../#...#/.###.",
  D: "####./#...#/#...#/#...#/#...#/#...#/####.",
  E: "#####/#..../#..../####./#..../#..../#####",
  F: "#####/#..../#..../####./#..../#..../#....",
  G: ".###./#...#/#..../#.###/#...#/#...#/.####",
  H: "#...#/#...#/#...#/#####/#...#/#...#/#...#",
  I: ".###./..#../..#../..#../..#../..#../.###.",
  J: "..###/...#./...#./...#./...#./#..#./.##..",
  K: "#...#/#..#./#.#../##.../#.#../#..#./#...#",
  L: "#..../#..../#..../#..../#..../#..../#####",
  M: "#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#",
  N: "#...#/##..#/#.#.#/#..##/#...#/#...#/#...#",
  O: ".###./#...#/#...#/#...#/#...#/#...#/.###.",
  P: "####./#...#/#...#/####./#..../#..../#....",
  Q: ".###./#...#/#...#/#...#/#.#.#/#..#./.##.#",
  R: "####./#...#/#...#/####./#.#../#..#./#...#",
  S: ".####/#..../#..../.###./....#/....#/####.",
  T: "#####/..#../..#../..#../..#../..#../..#..",
  U: "#...#/#...#/#...#/#...#/#...#/#...#/.###.",
  V: "#...#/#...#/#...#/#...#/#...#/.#.#./..#..",
  W: "#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#",
  X: "#...#/#...#/.#.#./..#../.#.#./#...#/#...#",
  Y: "#...#/#...#/.#.#./..#../..#../..#../..#..",
  Z: "#####/....#/...#./..#../.#.../#..../#####",
  a: "...../...../.###./....#/.####/#...#/.####",
  b: "#..../#..../####./#...#/#...#/#...#/####.",
  c: "...../...../.###./#..../#..../#...#/.###.",
  d: "....#/....#/.####/#...#/#...#/#...#/.####",
  e: "...../...../.###./#...#/#####/#..../.###.",
  f: "..##./.#..#/.#.../###../.#.../.#.../.#...",
  g: "...../.####/#...#/#...#/.####/....#/.###.",
  h: "#..../#..../####./#...#/#...#/#...#/#...#",
  i: "..#../...../.##../..#../..#../..#../.###.",
  j: "...#./...../..##./...#./...#./#..#./.##..",
  k: "#..../#..../#..#./#.#../##.../#.#../#..#.",
  l: ".##../..#../..#../..#../..#../..#../.###.",
  m: "...../...../##.#./#.#.#/#.#.#/#...#/#...#",
  n: "...../...../####./#...#/#...#/#...#/#...#",
  o: "...../...../.###./#...#/#...#/#...#/.###.",
  p: "...../####./#...#/#...#/####./#..../#....",
  q: "...../.####/#...#/#...#/.####/....#/....#",
  r: "...../...../#.##./##..#/#..../#..../#....",
  s: "...../...../.####/#..../.###./....#/####.",
  t: ".#.../.#.../###../.#.../.#.../.#..#/..##.",
  u: "...../...../#...#/#...#/#...#/#...#/.####",
  v: "...../...../#...#/#...#/#...#/.#.#./..#..",
  w: "...../...../#...#/#...#/#.#.#/#.#.#/.#.#.",
  x: "...../...../#...#/.#.#./..#../.#.#./#...#",
  y: "...../#...#/#...#/#...#/.####/....#/.###.",
  z: "...../...../#####/...#./..#../.#.../#####",
  "0": ".###./#...#/#..##/#.#.#/##..#/#...#/.###.",
  "1": "..#../.##../..#../..#../..#../..#../.###.",
  "2": ".###./#...#/....#/...#./..#../.#.../#####",
  "3": "#####/...#./..##./....#/....#/#...#/.###.",
  "4": "...#./..##./.#.#./#..#./#####/...#./...#.",
  "5": "#####/#..../####./....#/....#/#...#/.###.",
  "6": "..##./.#.../#..../####./#...#/#...#/.###.",
  "7": "#####/....#/...#./..#../.#.../.#.../.#...",
  "8": ".###./#...#/#...#/.###./#...#/#...#/.###.",
  "9": ".###./#...#/#...#/.####/....#/...#./.##..",
  ".": "...../...../...../...../...../...../..#..",
  ",": "...../...../...../...../...../..#../.#...",
  "!": "..#../..#../..#../..#../..#../...../..#..",
  "?": ".###./#...#/....#/...#./..#../...../..#..",
  "'": "..#../..#../...../...../...../...../.....",
  '"': ".#.#./.#.#./...../...../...../...../.....",
  "-": "...../...../...../#####/...../...../.....",
  _: "...../...../...../...../...../...../#####",
  "&": ".##../#..#./.##../.##.#/#..##/#...#/.####",
  "(": "...#./..#../.#.../.#.../.#.../..#../...#.",
  ")": ".#.../..#../...#./...#./...#./..#../.#...",
  "/": "....#/....#/...#./..#../.#.../#..../#....",
  ":": "...../..#../..#../...../..#../..#../.....",
  ";": "...../..#../..#../...../..#../..#../.#...",
  "+": "...../..#../..#../#####/..#../..#../.....",
  "=": "...../...../#####/...../#####/...../.....",
  "*": "...../..#../#.#.#/.###./#.#.#/..#../.....",
  "#": ".#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.",
  "%": "##..#/##..#/...#./..#../.#.../#..##/#..##",
  "@": ".###./#...#/#.###/#.#.#/#.###/#..../.###.",
  "$": "..#../.####/#.#../.###./..#.#/####./..#..",
};

/** Anything that is not in the table lands here rather than vanishing. */
const FALLBACK = "#####/#...#/#...#/#...#/#...#/#...#/#####";

const REPLACEMENTS: Record<string, string> = {
  ß: "ss",
  ẞ: "SS",
  ı: "i",
  İ: "I",
  Æ: "AE",
  æ: "ae",
  Ø: "O",
  ø: "o",
  Å: "A",
  å: "a",
  Þ: "Th",
  þ: "th",
  Ð: "D",
  ð: "d",
  "’": "'",
  "‘": "'",
  "“": '"',
  "”": '"',
  "…": "...",
  "·": ".",
};

/**
 * Strips what the grid cannot show. Decomposition turns "ö" into "o" plus a
 * combining mark, and the mark is then dropped, which is the documented
 * behaviour rather than an accident of encoding.
 */
export function normaliseText(input: string): string {
  let text = input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [from, to] of Object.entries(REPLACEMENTS)) text = text.split(from).join(to);
  return text.replace(/\s+/g, " ").trim();
}

export type Pixel = { x: number; y: number };

/** Pixels of one glyph, origin bottom left, y up. */
export function glyphPixels(char: string): Pixel[] {
  const rows = (GLYPHS[char] ?? FALLBACK).split("/");
  const out: Pixel[] = [];
  rows.forEach((row, r) => {
    [...row].forEach((cell, c) => {
      if (cell === "#") out.push({ x: c, y: GLYPH_HEIGHT - 1 - r });
    });
  });
  return out;
}

export function isSupported(char: string): boolean {
  return char in GLYPHS;
}

export type TextLine = {
  /** `cells[y][x]`, y counted from the baseline up. */
  grid: { cells: boolean[][]; width: number; height: number };
  /** Width in pixels, including tracking between glyphs but not after the last. */
  widthPx: number;
  /** True when the string had to be cut to fit the box. */
  truncated: boolean;
};

export type TextOptions = {
  /** Blank columns between glyphs, in pixels. */
  tracking?: number;
  /** Hard limit in pixels. Longer text is cut and given a full stop. */
  maxPixels?: number;
};

/**
 * Rasterises one line into a pixel grid. The grid, rather than a rectangle
 * list, is what the tracer in `raster.ts` needs: touching pixels have to
 * become one region, not two rings that share an edge.
 */
export function textLine(text: string, options: TextOptions = {}): TextLine {
  const tracking = options.tracking ?? 1;
  const normalised = normaliseText(text);
  const advance = GLYPH_WIDTH + tracking;
  const widthOf = (count: number) => (count === 0 ? 0 : count * advance - tracking);

  let chars = [...normalised];
  let truncated = false;
  if (options.maxPixels !== undefined) {
    while (chars.length > 0 && widthOf(chars.length) > options.maxPixels) {
      chars.pop();
      truncated = true;
    }
    if (truncated && chars.length > 0) {
      chars = [...chars.join("").trimEnd()];
      if (chars.length > 0) chars[chars.length - 1] = ".";
    }
  }

  const widthPx = widthOf(chars.length);
  const cells: boolean[][] = Array.from({ length: GLYPH_HEIGHT }, () =>
    new Array<boolean>(Math.max(widthPx, 1)).fill(false),
  );

  chars.forEach((char, index) => {
    const penX = index * advance;
    for (const pixel of glyphPixels(char)) {
      const x = penX + pixel.x;
      if (x < widthPx) cells[pixel.y][x] = true;
    }
  });

  return {
    grid: { cells, width: Math.max(widthPx, 1), height: GLYPH_HEIGHT },
    widthPx,
    truncated,
  };
}
