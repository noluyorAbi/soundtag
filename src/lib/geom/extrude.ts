/**
 * Turns a 2D polygon into a closed prism between two z heights.
 *
 * The walls are built from the boundary edges of the triangulated cap, not
 * from the input rings. Those two are usually the same list, and when they are
 * not, the difference is silent and fatal: an ear clipper is free to drop a
 * collinear vertex or to bridge two holes along a line that already carries an
 * edge, and the cap then has a boundary the rings do not describe. Walls built
 * from the rings leave that boundary open, and a slicer quietly "repairs" the
 * hole into whatever it feels like.
 *
 * Deriving the walls from the cap makes the two agree by construction. Every
 * edge that belongs to exactly one triangle gets a wall, whatever the
 * triangulator decided, and `isClosed` holds for every shape the product can
 * produce.
 */

import { MeshBuilder, type Mesh } from "./mesh";
import { polygon, type Polygon } from "./polygon";
import { triangulate } from "./triangulate";

/** Below this, a triangle has no area worth keeping, in mm squared. */
const DEGENERATE = 1e-12;

export function extrude(poly: Polygon, z0: number, z1: number): Mesh {
  if (z1 <= z0) throw new Error(`extrude needs z1 > z0, got ${z0} and ${z1}`);

  const { coords, triangles } = triangulate(poly);
  const point = (i: number): [number, number] => [coords[i * 2], coords[i * 2 + 1]];

  const faces: [number, number, number][] = [];
  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i];
    const b = triangles[i + 1];
    const c = triangles[i + 2];
    const [ax, ay] = point(a);
    const [bx, by] = point(b);
    const [cx, cy] = point(c);
    const twiceArea = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
    // A sliver with no area still carries edges, and dropping it here would
    // turn two interior edges into boundary edges, which then grow walls in
    // the middle of the cap. It is kept, wound the same way as its neighbour.
    faces.push(twiceArea >= 0 ? [a, b, c] : [a, c, b]);
  }

  const b = new MeshBuilder();
  // Keyed by the triangulation's index and the height, never by position, so a
  // bridge's two sides stay two vertices.
  const top = (i: number) => b.keyed(`t${i}`, point(i)[0], point(i)[1], z1);
  const bottom = (i: number) => b.keyed(`b${i}`, point(i)[0], point(i)[1], z0);

  for (const [a, m, c] of faces) {
    b.triangleOf(top(a), top(m), top(c));
    b.triangleOf(bottom(a), bottom(c), bottom(m));
  }

  for (const [from, to] of boundaryEdges(faces)) {
    // The cap's boundary runs a to b, so the wall's top edge has to run b to a.
    b.quadOf(bottom(from), bottom(to), top(to), top(from));
  }

  return b.build();
}

export type Pocket = { poly: Polygon; depth: number };

/**
 * A prism with recesses cut into its underside, built as one solid.
 *
 * The obvious construction is a stack of slabs: one slab from 0 to the pocket
 * depth with the pockets as holes, another on top of it. It is closed, it
 * slices, and Bambu Studio's own check calls it `manifold = no` with 234
 * non manifold edges, because the two slabs share a face and every edge on
 * that face then belongs to four triangles rather than two.
 *
 * This builds the real surface instead: one underside with the pockets missing
 * from it, one wall per pocket, one ceiling per pocket, and the outer walls
 * running the full height. Same object, half the triangles, and a slicer's
 * repair pass has nothing to do.
 */
export function extrudeWithPockets(
  plate: Polygon,
  z0: number,
  z1: number,
  pockets: readonly Pocket[],
): Mesh {
  if (pockets.length === 0) return extrude(plate, z0, z1);
  for (const pocket of pockets) {
    if (pocket.depth <= 0 || pocket.depth >= z1 - z0) {
      throw new Error(`a pocket ${pocket.depth} mm deep does not fit between ${z0} and ${z1}`);
    }
  }

  const b = new MeshBuilder();
  const underside = polygon(plate.outer, [...plate.holes, ...pockets.map((p) => p.poly.outer)]);

  cap(b, underside, z0, false);
  cap(b, plate, z1, true);

  for (const ring of [plate.outer, ...plate.holes]) wall(b, ring, z0, z1);

  for (const pocket of pockets) {
    const top = z0 + pocket.depth;

    // The outline is a hole in the underside, so it is stored clockwise there,
    // and its wall has to be wound the same way to face into the pocket.
    wall(b, reversed(pocket.poly.outer), z0, top);
    cap(b, pocket.poly, top, false);

    // A counter, the enclosed part of a letter like "e", is material that the
    // pocket leaves standing. It keeps its own underside and its own sides,
    // and it appears in the ceiling above as a hole.
    for (const counter of pocket.poly.holes) {
      const pillar = polygon(counter);
      cap(b, pillar, z0, false);
      wall(b, pillar.outer, z0, top);
    }
  }

  return b.build();
}

/** Emits a triangulated face at height z, pointing up or down. */
function cap(b: MeshBuilder, poly: Polygon, z: number, up: boolean): void {
  const { coords, triangles } = triangulate(poly);
  for (let i = 0; i < triangles.length; i += 3) {
    const p = [0, 1, 2].map((k) => {
      const idx = triangles[i + k] * 2;
      return [coords[idx], coords[idx + 1]] as const;
    });
    const twiceArea =
      (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[2][0] - p[0][0]) * (p[1][1] - p[0][1]);
    if (Math.abs(twiceArea) < DEGENERATE) continue;
    const ccw = twiceArea > 0 ? p : [p[0], p[2], p[1]];
    const [a, m, c] = up ? ccw : [ccw[0], ccw[2], ccw[1]];
    b.triangle([a[0], a[1], z], [m[0], m[1], z], [c[0], c[1], z]);
  }
}

/**
 * One quad per ring edge. For a counter-clockwise ring this faces outwards,
 * and for a clockwise one it faces into the void, which is the same rule said
 * from both sides. Rings arrive free of collinear points from `polygon()`, so
 * these edges are exactly the edges the cap's boundary has.
 */
function wall(b: MeshBuilder, ring: Polygon["outer"], z0: number, z1: number): void {
  for (let i = 0; i < ring.length; i++) {
    const [px, py] = ring[i];
    const [qx, qy] = ring[(i + 1) % ring.length];
    b.quad([px, py, z0], [qx, qy, z0], [qx, qy, z1], [px, py, z1]);
  }
}

/** A ring walked the other way round, which flips which side it faces. */
function reversed(ring: Polygon["outer"]): Polygon["outer"] {
  return [...ring].reverse();
}

/** Directed edges that no neighbouring triangle answered with its opposite. */
function boundaryEdges(faces: readonly [number, number, number][]): [number, number][] {
  const open = new Map<string, [number, number]>();
  for (const face of faces) {
    for (let k = 0; k < 3; k++) {
      const from = face[k];
      const to = face[(k + 1) % 3];
      const twin = `${to}:${from}`;
      if (open.has(twin)) open.delete(twin);
      else open.set(`${from}:${to}`, [from, to]);
    }
  }
  return [...open.values()];
}
