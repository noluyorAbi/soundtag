/**
 * Turns a pixel grid into polygons by tracing its boundary.
 *
 * The naive version of this emits one rectangle per pixel run. It looks right
 * and it is wrong: two rectangles that touch along an edge are two rings that
 * share that edge, and a polygon whose holes touch does not triangulate into a
 * closed surface. The mesh then fails the closure test, which is exactly what
 * happened the first time text was engraved into the back of a bar.
 *
 * Tracing the boundary instead gives one ring per connected region, with the
 * counters of letters like "o" and "e" coming out as holes, and collinear runs
 * collapsed so a straight stroke is four points rather than forty.
 */

import { polygon, type Polygon, type Ring, type Vec2 } from "../geom/polygon";

export type Grid = {
  /** `cells[y][x]`, y counted from the bottom. */
  cells: boolean[][];
  width: number;
  height: number;
};

type Key = string;
const key = (x: number, y: number): Key => `${x},${y}`;

/**
 * Boundary edges are emitted so that material lies to the left of the
 * direction of travel, which makes outer rings counter-clockwise and counters
 * clockwise without a second pass to work out which is which.
 */
export function gridToPolygons(grid: Grid, pixel: number, originX = 0, originY = 0): Polygon[] {
  const solid = weldDiagonals(grid);
  const filled = (x: number, y: number): boolean =>
    y >= 0 && y < solid.height && x >= 0 && x < solid.width && solid.cells[y][x];

  const edges = new Map<Key, Vec2[]>();
  const addEdge = (from: Vec2, to: Vec2) => {
    const k = key(from[0], from[1]);
    const list = edges.get(k);
    if (list) list.push(to);
    else edges.set(k, [to]);
  };

  for (let y = 0; y < solid.height; y++) {
    for (let x = 0; x < solid.width; x++) {
      if (!filled(x, y)) continue;
      if (!filled(x, y - 1)) addEdge([x, y], [x + 1, y]);
      if (!filled(x + 1, y)) addEdge([x + 1, y], [x + 1, y + 1]);
      if (!filled(x, y + 1)) addEdge([x + 1, y + 1], [x, y + 1]);
      if (!filled(x - 1, y)) addEdge([x, y + 1], [x, y]);
    }
  }

  const rings: Ring[] = [];
  while (edges.size > 0) {
    const startKey = edges.keys().next().value as Key;
    const start = startKey.split(",").map(Number) as [number, number];
    const ring: Vec2[] = [];
    let current: Vec2 = start;
    let direction: Vec2 = [0, 0];

    for (;;) {
      const options = edges.get(key(current[0], current[1]));
      if (!options || options.length === 0) break;

      // At a point where two regions touch corner to corner there are two ways
      // out. Taking the sharpest right turn keeps the loop from crossing
      // itself, which is the standard rule for this kind of trace.
      let chosen = 0;
      if (options.length > 1) {
        chosen = options
          .map((to, i) => ({ i, turn: turnScore(direction, [to[0] - current[0], to[1] - current[1]]) }))
          .sort((a, b) => a.turn - b.turn)[0].i;
      }
      const next = options[chosen];
      options.splice(chosen, 1);
      if (options.length === 0) edges.delete(key(current[0], current[1]));

      ring.push(current);
      direction = [next[0] - current[0], next[1] - current[1]];
      current = next;
      if (current[0] === start[0] && current[1] === start[1]) break;
    }

    for (const loop of splitPinches(ring)) {
      if (loop.length < 4) continue;
      rings.push(collapse(loop).map(([x, y]) => [originX + x * pixel, originY + y * pixel] as Vec2));
    }
  }

  return assemble(rings);
}

/**
 * A stroke one pixel wide meets its neighbour at a single point, and the trace
 * walks through that point twice. The result is one ring that touches itself,
 * which triangulates into caps whose boundary no longer matches the walls
 * built from the same ring, and the mesh opens. Splitting the walk at every
 * repeated vertex turns it back into simple rings.
 *
 * The letter "w" in the bundled font is the case that found this.
 */
function splitPinches(ring: Ring): Ring[] {
  const loops: Ring[] = [];
  const stack: Vec2[] = [];
  const seen = new Map<Key, number>();

  for (const point of ring) {
    const k = key(point[0], point[1]);
    const at = seen.get(k);
    if (at === undefined) {
      seen.set(k, stack.length);
      stack.push(point);
      continue;
    }
    const loop = stack.slice(at);
    if (loop.length >= 4) loops.push(loop);
    for (const q of loop.slice(1)) seen.delete(key(q[0], q[1]));
    stack.length = at + 1;
  }

  if (stack.length >= 4) loops.push(stack);
  return loops;
}

/**
 * Two pixels that meet only at a corner are a problem twice over: the trace
 * has a junction to resolve, and whichever way it resolves it, the result is
 * two rings that touch at a point, which does not triangulate into a closed
 * surface. Filling one of the two empty cells in that 2 by 2 window removes
 * the junction entirely.
 *
 * It also removes a real defect in the object. A diagonal joint one pixel wide
 * is a joint of zero width in the printed part, so the two strokes of a "w"
 * would meet at a point that no extrusion can bridge. This makes them meet
 * along an edge, which is what the letter looked like on paper anyway.
 */
function weldDiagonals(grid: Grid): Grid {
  const cells = grid.cells.map((row) => [...row]);
  const at = (x: number, y: number) =>
    y >= 0 && y < grid.height && x >= 0 && x < grid.width && cells[y][x];

  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (let y = 0; y + 1 < grid.height; y++) {
      for (let x = 0; x + 1 < grid.width; x++) {
        const bl = at(x, y);
        const br = at(x + 1, y);
        const tl = at(x, y + 1);
        const tr = at(x + 1, y + 1);
        if (bl && tr && !br && !tl) {
          cells[y][x + 1] = true;
          changed = true;
        } else if (br && tl && !bl && !tr) {
          cells[y][x] = true;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  return { cells, width: grid.width, height: grid.height };
}

/** Lower is a harder right turn. Used only to disambiguate corner touches. */
function turnScore(from: Vec2, to: Vec2): number {
  const angle = Math.atan2(to[1], to[0]) - Math.atan2(from[1], from[0]);
  const normalised = ((angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return normalised;
}

function collapse(ring: Ring): Ring {
  const out: Vec2[] = [];
  for (let i = 0; i < ring.length; i++) {
    const prev = ring[(i - 1 + ring.length) % ring.length];
    const point = ring[i];
    const next = ring[(i + 1) % ring.length];
    const cross =
      (point[0] - prev[0]) * (next[1] - point[1]) - (point[1] - prev[1]) * (next[0] - point[0]);
    if (cross !== 0) out.push(point);
  }
  return out.length >= 3 ? out : ring;
}

/** Positive area is an outer ring, negative is a counter inside one of them. */
function assemble(rings: readonly Ring[]): Polygon[] {
  const signed = rings.map((ring) => ({ ring, area: shoelace(ring) }));
  const outers = signed.filter((r) => r.area > 0);
  const holes = signed.filter((r) => r.area < 0);

  return outers.map((outer) => {
    const mine = holes.filter((hole) => inside(hole.ring[0], outer.ring));
    return polygon(
      outer.ring,
      mine.map((h) => h.ring),
    );
  });
}

function shoelace(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

function inside(point: Vec2, ring: Ring): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) {
      hit = !hit;
    }
  }
  return hit;
}
