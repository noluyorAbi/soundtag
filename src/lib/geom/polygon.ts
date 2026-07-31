/**
 * Polygons, in millimetres, with the y axis pointing up.
 *
 * A ring is a closed loop of points with no repeated last point. A polygon is
 * one outer ring plus zero or more hole rings. Every shape this project prints
 * is expressible that way, which is why there is no general boolean geometry
 * here and no library to provide one.
 *
 * Winding is normalised on construction: outer rings counter-clockwise, holes
 * clockwise. Downstream code (triangulation, wall generation, SVG output) is
 * allowed to depend on that, so nothing has to guess an orientation twice.
 */

export type Vec2 = readonly [number, number];
export type Ring = Vec2[];

export type Polygon = {
  readonly outer: Ring;
  readonly holes: readonly Ring[];
};

/**
 * Twice the signed area, by the cross product form. Positive is
 * counter-clockwise with y pointing up. The trapezoid form is one character
 * shorter and its sign depends on which neighbour you call `j`, which is
 * exactly the kind of ambiguity that silently inverts every wall in a mesh.
 */
export function signedArea2(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum;
}

export function area(ring: Ring): number {
  return Math.abs(signedArea2(ring)) / 2;
}

export function isCounterClockwise(ring: Ring): boolean {
  return signedArea2(ring) > 0;
}

function oriented(ring: Ring, counterClockwise: boolean): Ring {
  return isCounterClockwise(ring) === counterClockwise ? ring : [...ring].reverse();
}

/**
 * Normalises winding, and drops duplicate and collinear points.
 *
 * The cleaning is not cosmetic. An ear clipper is entitled to remove a
 * collinear vertex while triangulating, and if it does, the cap it produces
 * has a boundary the input rings no longer describe, so walls built from those
 * rings leave a seam open. Removing them up front means the cap boundary and
 * the ring are the same list, by construction.
 */
export function polygon(outer: Ring, holes: readonly Ring[] = []): Polygon {
  return {
    outer: oriented(clean(outer), true),
    holes: holes.map((h) => oriented(clean(h), false)),
  };
}

/** Removes repeated points and points that lie on the line between neighbours. */
export function clean(ring: Ring, epsilon = 1e-9): Ring {
  const deduped = dedupe(ring, epsilon);
  if (deduped.length < 4) return deduped;

  const out: Vec2[] = [];
  for (let i = 0; i < deduped.length; i++) {
    const prev = deduped[(i - 1 + deduped.length) % deduped.length];
    const point = deduped[i];
    const next = deduped[(i + 1) % deduped.length];
    const cross =
      (point[0] - prev[0]) * (next[1] - point[1]) - (point[1] - prev[1]) * (next[0] - point[0]);
    if (Math.abs(cross) > epsilon) out.push(point);
  }
  return out.length >= 3 ? out : deduped;
}

export function polygonArea(poly: Polygon): number {
  return poly.holes.reduce((acc, h) => acc - area(h), area(poly.outer));
}

export function boundsOf(poly: Polygon): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of poly.outer) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function translate(poly: Polygon, dx: number, dy: number): Polygon {
  const move = (r: Ring): Ring => r.map(([x, y]) => [x + dx, y + dy] as Vec2);
  return { outer: move(poly.outer), holes: poly.holes.map(move) };
}

/**
 * Point in polygon, counting crossings of a ray to +x. Used to place hole
 * bridges and to assert in tests that the code artwork sits inside the plate.
 */
export function ringContains(ring: Ring, p: Vec2): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const straddles = yi > p[1] !== yj > p[1];
    if (straddles && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function polygonContains(poly: Polygon, p: Vec2): boolean {
  if (!ringContains(poly.outer, p)) return false;
  return !poly.holes.some((h) => ringContains(h, p));
}

/**
 * Arc segment count for a full circle. Curves are the only place where the
 * output is an approximation, so the resolution is one named constant rather
 * than a number typed in five places. 64 puts the chord error of a 1.8 mm hole
 * at about 0.002 mm, two orders of magnitude below what a 0.4 mm nozzle can
 * express.
 */
export const ARC_SEGMENTS = 64;

export function circle(cx: number, cy: number, r: number, segments = ARC_SEGMENTS): Ring {
  const ring: Vec2[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (2 * Math.PI * i) / segments;
    ring.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return ring;
}

/**
 * Rectangle with four equal round corners, built from arc quadrants so the
 * corner is a real arc rather than a chamfer. `r` is clamped to half the
 * shorter side, which is what makes a fully rounded end (a stadium) fall out
 * of the same function instead of needing its own.
 */
export function roundedRect(
  width: number,
  height: number,
  radius: number,
  segments = ARC_SEGMENTS,
): Ring {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  if (r === 0) {
    return [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ];
  }
  const per = Math.max(1, Math.round(segments / 4));
  const ring: Vec2[] = [];
  const corners: { cx: number; cy: number; from: number }[] = [
    { cx: width - r, cy: r, from: -Math.PI / 2 },
    { cx: width - r, cy: height - r, from: 0 },
    { cx: r, cy: height - r, from: Math.PI / 2 },
    { cx: r, cy: r, from: Math.PI },
  ];
  for (const c of corners) {
    for (let i = 0; i <= per; i++) {
      const a = c.from + (Math.PI / 2) * (i / per);
      ring.push([c.cx + r * Math.cos(a), c.cy + r * Math.sin(a)]);
    }
  }
  return dedupe(ring);
}

/**
 * A capsule: a rectangle of width `w` with semicircular caps top and bottom.
 * This is exactly the shape of one bar in a Spotify Code, and reproducing it
 * as an arc rather than as a rounded rectangle approximation is what keeps the
 * printed bar the same shape as the one Spotify serves.
 */
export function capsule(
  x: number,
  y: number,
  w: number,
  h: number,
  segments = ARC_SEGMENTS,
): Ring {
  const r = w / 2;
  const cx = x + r;
  const top = y + h - r;
  const bottom = y + r;
  const per = Math.max(2, Math.round(segments / 2));
  const ring: Vec2[] = [];
  // Counter-clockwise: left side, round the bottom cap to the right, up the
  // right side, round the top cap back to the left.
  for (let i = 0; i <= per; i++) {
    const a = Math.PI + Math.PI * (i / per);
    ring.push([cx + r * Math.cos(a), bottom + r * Math.sin(a)]);
  }
  for (let i = 0; i <= per; i++) {
    const a = Math.PI * (i / per);
    ring.push([cx + r * Math.cos(a), top + r * Math.sin(a)]);
  }
  return dedupe(ring);
}

/** Drops consecutive duplicate points, including the wrap from last to first. */
export function dedupe(ring: Ring, epsilon = 1e-9): Ring {
  const out: Vec2[] = [];
  for (const p of ring) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev[0] - p[0]) < epsilon && Math.abs(prev[1] - p[1]) < epsilon) continue;
    out.push(p);
  }
  while (out.length > 1) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.abs(first[0] - last[0]) < epsilon && Math.abs(first[1] - last[1]) < epsilon) {
      out.pop();
      continue;
    }
    break;
  }
  return out;
}
