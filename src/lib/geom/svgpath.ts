/**
 * The smallest SVG path reader that can handle the one path this project ever
 * reads: the Spotify mark inside the code artwork.
 *
 * It covers M, L, H, V, C, S, Q, T and Z in both cases, which is everything
 * the endpoint emits plus the two shorthand curve commands, and it refuses
 * anything else loudly rather than dropping a segment quietly. Arcs are not
 * implemented because the source does not contain any; if that changes, this
 * throws and a test fails, which is the intended outcome.
 *
 * Curves are flattened adaptively: a segment is split until the control
 * polygon is flat to `tolerance` mm, so the point count follows the curvature
 * instead of a fixed guess.
 */

import type { Ring, Vec2 } from "./polygon";

type Point = { x: number; y: number };

const COMMANDS = /([MmLlHhVvCcSsQqTtZz])([^MmLlHhVvCcSsQqTtZz]*)/g;

export type FlattenOptions = {
  /** Maximum deviation from the true curve, in the path's own units. */
  tolerance?: number;
};

/** Returns one ring per subpath, in the order they appear. */
export function pathToRings(d: string, options: FlattenOptions = {}): Ring[] {
  const tolerance = options.tolerance ?? 0.08;
  const unsupported = d.replace(/[MmLlHhVvCcSsQqTtZz\d\s,.eE+-]/g, "");
  if (unsupported.length > 0) {
    throw new Error(`unsupported path command "${unsupported[0]}"`);
  }

  const rings: Vec2[][] = [];
  let ring: Vec2[] = [];
  let cursor: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };
  let lastCubic: Point | null = null;
  let lastQuad: Point | null = null;

  const emit = (p: Point) => ring.push([p.x, p.y]);
  const closeRing = () => {
    if (ring.length > 2) rings.push(ring);
    ring = [];
  };

  for (const match of d.matchAll(COMMANDS)) {
    const command = match[1];
    const numbers = (match[2].match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
    const relative = command === command.toLowerCase();
    const upper = command.toUpperCase();

    if (upper === "Z") {
      closeRing();
      cursor = { ...start };
      lastCubic = null;
      lastQuad = null;
      continue;
    }

    const stride = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2 }[upper];
    if (stride === undefined) throw new Error(`unsupported path command "${command}"`);
    if (numbers.length === 0 || numbers.length % stride !== 0) {
      throw new Error(`command "${command}" got ${numbers.length} numbers, expected a multiple of ${stride}`);
    }

    for (let i = 0; i < numbers.length; i += stride) {
      const args = numbers.slice(i, i + stride);
      const abs = (x: number, y: number): Point =>
        relative ? { x: cursor.x + x, y: cursor.y + y } : { x, y };

      if (upper === "M") {
        // A second coordinate pair after M continues as an implicit L, which is
        // why this is inside the loop rather than before it.
        if (i === 0) {
          closeRing();
          cursor = abs(args[0], args[1]);
          start = { ...cursor };
          emit(cursor);
        } else {
          cursor = abs(args[0], args[1]);
          emit(cursor);
        }
        lastCubic = null;
        lastQuad = null;
      } else if (upper === "L") {
        cursor = abs(args[0], args[1]);
        emit(cursor);
        lastCubic = null;
        lastQuad = null;
      } else if (upper === "H") {
        cursor = { x: relative ? cursor.x + args[0] : args[0], y: cursor.y };
        emit(cursor);
        lastCubic = null;
        lastQuad = null;
      } else if (upper === "V") {
        cursor = { x: cursor.x, y: relative ? cursor.y + args[0] : args[0] };
        emit(cursor);
        lastCubic = null;
        lastQuad = null;
      } else if (upper === "C" || upper === "S") {
        const c1 =
          upper === "C"
            ? abs(args[0], args[1])
            : lastCubic
              ? { x: 2 * cursor.x - lastCubic.x, y: 2 * cursor.y - lastCubic.y }
              : { ...cursor };
        const c2 = upper === "C" ? abs(args[2], args[3]) : abs(args[0], args[1]);
        const end = upper === "C" ? abs(args[4], args[5]) : abs(args[2], args[3]);
        flattenCubic(cursor, c1, c2, end, tolerance, emit);
        lastCubic = c2;
        lastQuad = null;
        cursor = end;
      } else if (upper === "Q" || upper === "T") {
        const c: Point =
          upper === "Q"
            ? abs(args[0], args[1])
            : lastQuad
              ? { x: 2 * cursor.x - lastQuad.x, y: 2 * cursor.y - lastQuad.y }
              : { ...cursor };
        const end = upper === "Q" ? abs(args[2], args[3]) : abs(args[0], args[1]);
        // A quadratic is a cubic whose control points sit two thirds of the way
        // to the single control point.
        const c1 = { x: cursor.x + (2 / 3) * (c.x - cursor.x), y: cursor.y + (2 / 3) * (c.y - cursor.y) };
        const c2 = { x: end.x + (2 / 3) * (c.x - end.x), y: end.y + (2 / 3) * (c.y - end.y) };
        flattenCubic(cursor, c1, c2, end, tolerance, emit);
        lastQuad = c;
        lastCubic = null;
        cursor = end;
      }
    }
  }

  closeRing();
  return rings;
}

function flattenCubic(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  tolerance: number,
  emit: (p: Point) => void,
  depth = 0,
): void {
  // Flatness measured as the control points' distance from the chord. The
  // depth cap only exists so a pathological input cannot recurse forever.
  const d1 = distanceToLine(p1, p0, p3);
  const d2 = distanceToLine(p2, p0, p3);
  if (depth > 16 || Math.max(d1, d2) <= tolerance) {
    emit(p3);
    return;
  }

  const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const p01 = mid(p0, p1);
  const p12 = mid(p1, p2);
  const p23 = mid(p2, p3);
  const p012 = mid(p01, p12);
  const p123 = mid(p12, p23);
  const centre = mid(p012, p123);

  flattenCubic(p0, p01, p012, centre, tolerance, emit, depth + 1);
  flattenCubic(centre, p123, p23, p3, tolerance, emit, depth + 1);
}

function distanceToLine(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / length;
}
