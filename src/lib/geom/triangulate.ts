/**
 * Ear clipping with hole bridging, written out rather than pulled in.
 *
 * Every polygon this project triangulates is small (a plate with one hole is
 * about 140 points, the opt-in Spotify mark about 900), so the quadratic ear
 * test is a few hundred microseconds and the z-order curve that a general
 * purpose library needs is not worth the code it costs.
 *
 * The output is a triangle index list into the flat coordinate array returned
 * alongside it, which is the shape both the 3MF writer and the STL writer
 * consume, so nothing has to be repacked later.
 *
 * Correctness is not asserted by reading this file: `test/triangulate.test.ts`
 * checks that the triangle areas sum back to the polygon area for every shape
 * the product can produce, which is the property that actually matters.
 */

import type { Polygon, Ring, Vec2 } from "./polygon";

type Node = {
  i: number;
  x: number;
  y: number;
  prev: Node;
  next: Node;
  steiner: boolean;
};

export type Triangulation = {
  /** Flat [x0, y0, x1, y1, ...] in polygon order: outer ring first, then holes. */
  coords: number[];
  /** Triangle corners as indices into `coords / 2`. */
  triangles: number[];
};

export function triangulate(poly: Polygon): Triangulation {
  const coords: number[] = [];
  const push = (ring: Ring) => {
    for (const [x, y] of ring) coords.push(x, y);
  };
  push(poly.outer);

  const holeIndices: number[] = [];
  for (const hole of poly.holes) {
    holeIndices.push(coords.length / 2);
    push(hole);
  }

  const triangles: number[] = [];
  const outerEnd = holeIndices.length > 0 ? holeIndices[0] * 2 : coords.length;

  let outerNode = linkedList(coords, 0, outerEnd, true);
  if (!outerNode || outerNode.next === outerNode.prev) return { coords, triangles };

  if (holeIndices.length > 0) outerNode = eliminateHoles(coords, holeIndices, outerNode);

  earcutLinked(outerNode, triangles);
  return { coords, triangles };
}

/** Convenience wrapper: triangles as point triples, for tests and SVG output. */
export function triangulateToPoints(poly: Polygon): Vec2[][] {
  const { coords, triangles } = triangulate(poly);
  const out: Vec2[][] = [];
  for (let i = 0; i < triangles.length; i += 3) {
    out.push(
      [0, 1, 2].map((k) => {
        const idx = triangles[i + k] * 2;
        return [coords[idx], coords[idx + 1]] as Vec2;
      }),
    );
  }
  return out;
}

function linkedList(data: number[], start: number, end: number, clockwise: boolean): Node | null {
  let last: Node | null = null;
  const ccw = signedArea(data, start, end) > 0;

  if (clockwise === ccw) {
    for (let i = start; i < end; i += 2) last = insertNode(i, data[i], data[i + 1], last);
  } else {
    for (let i = end - 2; i >= start; i -= 2) last = insertNode(i, data[i], data[i + 1], last);
  }

  if (last && equals(last, last.next)) {
    removeNode(last);
    last = last.next;
  }
  return last;
}

function filterPoints(start: Node | null, end?: Node): Node | null {
  if (!start) return start;
  let e = end ?? start;
  let p = start;
  let again = true;

  while (again || p !== e) {
    again = false;
    if (!p.steiner && (equals(p, p.next) || cornerArea(p.prev, p, p.next) === 0)) {
      removeNode(p);
      p = e = p.prev;
      if (p === p.next) break;
      again = true;
    } else {
      p = p.next;
    }
  }
  return e;
}

function earcutLinked(ear: Node | null, triangles: number[], pass = 0): void {
  if (!ear) return;
  let node: Node | null = ear;
  let stop: Node | null = node;

  while (node && node.prev !== node.next) {
    const prev: Node = node.prev;
    const next: Node = node.next;

    if (isEar(node)) {
      triangles.push(prev.i / 2, node.i / 2, next.i / 2);
      removeNode(node);
      node = next.next;
      stop = next.next;
      continue;
    }

    node = next;

    if (node === stop) {
      // No ear was found in a full lap. Try the repair passes in the order
      // that costs least: drop collinear points, then cut self intersections,
      // then split the polygon at a valid diagonal.
      if (pass === 0) {
        const filtered = filterPoints(node);
        earcutLinked(filtered, triangles, 1);
      } else if (pass === 1) {
        const cured = cureLocalIntersections(filterPoints(node) as Node, triangles);
        earcutLinked(cured, triangles, 2);
      } else if (pass === 2) {
        splitEarcut(node, triangles);
      }
      break;
    }
  }
}

function isEar(ear: Node): boolean {
  const a = ear.prev;
  const b = ear;
  const c = ear.next;

  // Reflex corners are never ears.
  if (cornerArea(a, b, c) >= 0) return false;

  const ax = a.x;
  const ay = a.y;
  const bx = b.x;
  const by = b.y;
  const cx = c.x;
  const cy = c.y;

  const x0 = Math.min(ax, bx, cx);
  const y0 = Math.min(ay, by, cy);
  const x1 = Math.max(ax, bx, cx);
  const y1 = Math.max(ay, by, cy);

  let p = c.next;
  while (p !== a) {
    if (
      p.x >= x0 &&
      p.x <= x1 &&
      p.y >= y0 &&
      p.y <= y1 &&
      pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) &&
      cornerArea(p.prev, p, p.next) >= 0
    ) {
      return false;
    }
    p = p.next;
  }
  return true;
}

function cureLocalIntersections(start: Node, triangles: number[]): Node | null {
  let p = start;
  do {
    const a = p.prev;
    const b = p.next.next;
    if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {
      triangles.push(a.i / 2, p.i / 2, b.i / 2);
      removeNode(p);
      removeNode(p.next);
      p = start = b;
    }
    p = p.next;
  } while (p !== start);

  return filterPoints(p);
}

function splitEarcut(start: Node, triangles: number[]): void {
  let a = start;
  do {
    let b = a.next.next;
    while (b !== a.prev) {
      if (a.i !== b.i && isValidDiagonal(a, b)) {
        let c: Node | null = splitPolygon(a, b);
        a = filterPoints(a, a.next) as Node;
        c = filterPoints(c, c.next);
        earcutLinked(a, triangles);
        earcutLinked(c, triangles);
        return;
      }
      b = b.next;
    }
    a = a.next;
  } while (a !== start);
}

function eliminateHoles(data: number[], holeIndices: number[], outerNode: Node): Node {
  const queue: Node[] = [];

  for (let i = 0; i < holeIndices.length; i++) {
    const start = holeIndices[i] * 2;
    const end = i < holeIndices.length - 1 ? holeIndices[i + 1] * 2 : data.length;
    const list = linkedList(data, start, end, false);
    if (list) {
      if (list === list.next) list.steiner = true;
      queue.push(getLeftmost(list));
    }
  }

  queue.sort((a, b) => a.x - b.x);

  let node = outerNode;
  for (const hole of queue) {
    node = eliminateHole(hole, node);
  }
  return node;
}

function eliminateHole(hole: Node, outerNode: Node): Node {
  const bridge = findHoleBridge(hole, outerNode);
  if (!bridge) return outerNode;

  const bridgeReverse = splitPolygon(bridge, hole);
  filterPoints(bridgeReverse, bridgeReverse.next);
  return filterPoints(bridge, bridge.next) as Node;
}

/**
 * Finds the outer vertex a hole can be joined to: cast a ray to +x from the
 * hole's leftmost point, take the edge it hits, then walk the outer ring for a
 * better (more sharply angled) candidate that keeps the bridge inside.
 */
function findHoleBridge(hole: Node, outerNode: Node): Node | null {
  let p = outerNode;
  const hx = hole.x;
  const hy = hole.y;
  let qx = -Infinity;
  let m: Node | null = null;

  do {
    if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
      const x = p.x + ((hy - p.y) * (p.next.x - p.x)) / (p.next.y - p.y);
      if (x <= hx && x > qx) {
        qx = x;
        m = p.x < p.next.x ? p : p.next;
        if (x === hx) return m;
      }
    }
    p = p.next;
  } while (p !== outerNode);

  if (!m) return null;

  const stop = m;
  const mx = m.x;
  const my = m.y;
  let tanMin = Infinity;

  p = m;
  do {
    if (
      hx >= p.x &&
      p.x >= mx &&
      hx !== p.x &&
      pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)
    ) {
      const tan = Math.abs(hy - p.y) / (hx - p.x);
      if (
        locallyInside(p, hole) &&
        (tan < tanMin ||
          (tan === tanMin && (p.x > m!.x || (p.x === m!.x && sectorContainsSector(m!, p)))))
      ) {
        m = p;
        tanMin = tan;
      }
    }
    p = p.next;
  } while (p !== stop);

  return m;
}

function sectorContainsSector(m: Node, p: Node): boolean {
  return cornerArea(m.prev, m, p.prev) < 0 && cornerArea(p.next, m, m.next) < 0;
}

function getLeftmost(start: Node): Node {
  let p = start;
  let leftmost = start;
  do {
    if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) leftmost = p;
    p = p.next;
  } while (p !== start);
  return leftmost;
}

function pointInTriangle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  px: number,
  py: number,
): boolean {
  return (
    (cx - px) * (ay - py) >= (ax - px) * (cy - py) &&
    (ax - px) * (by - py) >= (bx - px) * (ay - py) &&
    (bx - px) * (cy - py) >= (cx - px) * (by - py)
  );
}

function isValidDiagonal(a: Node, b: Node): boolean {
  return (
    a.next.i !== b.i &&
    a.prev.i !== b.i &&
    !intersectsPolygon(a, b) &&
    ((locallyInside(a, b) &&
      locallyInside(b, a) &&
      middleInside(a, b) &&
      (cornerArea(a.prev, a, b.prev) !== 0 || cornerArea(a, b.prev, b) !== 0)) ||
      (equals(a, b) && cornerArea(a.prev, a, a.next) > 0 && cornerArea(b.prev, b, b.next) > 0))
  );
}

/** Twice the signed area of the corner. Negative means a convex left turn. */
function cornerArea(p: Node, q: Node, r: Node): number {
  return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

function equals(a: Node, b: Node): boolean {
  return a.x === b.x && a.y === b.y;
}

function intersects(p1: Node, q1: Node, p2: Node, q2: Node): boolean {
  const o1 = sign(cornerArea(p1, q1, p2));
  const o2 = sign(cornerArea(p1, q1, q2));
  const o3 = sign(cornerArea(p2, q2, p1));
  const o4 = sign(cornerArea(p2, q2, q1));

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}

function onSegment(p: Node, q: Node, r: Node): boolean {
  return (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  );
}

function sign(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

function intersectsPolygon(a: Node, b: Node): boolean {
  let p = a;
  do {
    if (
      p.i !== a.i &&
      p.next.i !== a.i &&
      p.i !== b.i &&
      p.next.i !== b.i &&
      intersects(p, p.next, a, b)
    ) {
      return true;
    }
    p = p.next;
  } while (p !== a);
  return false;
}

function locallyInside(a: Node, b: Node): boolean {
  return cornerArea(a.prev, a, a.next) < 0
    ? cornerArea(a, b, a.next) >= 0 && cornerArea(a, a.prev, b) >= 0
    : cornerArea(a, b, a.prev) < 0 || cornerArea(a, a.next, b) < 0;
}

function middleInside(a: Node, b: Node): boolean {
  let p = a;
  let inside = false;
  const px = (a.x + b.x) / 2;
  const py = (a.y + b.y) / 2;
  do {
    if (
      p.y > py !== p.next.y > py &&
      p.next.y !== p.y &&
      px < ((p.next.x - p.x) * (py - p.y)) / (p.next.y - p.y) + p.x
    ) {
      inside = !inside;
    }
    p = p.next;
  } while (p !== a);
  return inside;
}

/** Joins two rings, or splits one, and returns the node on the new loop. */
function splitPolygon(a: Node, b: Node): Node {
  const a2: Node = { i: a.i, x: a.x, y: a.y, prev: a, next: a.next, steiner: false };
  const b2: Node = { i: b.i, x: b.x, y: b.y, prev: b, next: b.next, steiner: false };
  const an = a.next;
  const bp = b.prev;

  a.next = b;
  b.prev = a;

  a2.next = an;
  an.prev = a2;

  b2.next = a2;
  a2.prev = b2;

  bp.next = b2;
  b2.prev = bp;

  return b2;
}

function insertNode(i: number, x: number, y: number, last: Node | null): Node {
  const node = { i, x, y, steiner: false } as Node;
  if (!last) {
    node.prev = node;
    node.next = node;
  } else {
    node.next = last.next;
    node.prev = last;
    last.next.prev = node;
    last.next = node;
  }
  return node;
}

function removeNode(node: Node): void {
  node.next.prev = node.prev;
  node.prev.next = node.next;
}

function signedArea(data: number[], start: number, end: number): number {
  let sum = 0;
  for (let i = start, j = end - 2; i < end; i += 2) {
    sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
    j = i;
  }
  return sum;
}
