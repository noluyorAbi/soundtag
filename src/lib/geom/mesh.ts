/**
 * Triangle meshes, in millimetres, z up.
 *
 * Vertices are welded as they are added, keyed on their coordinates quantised
 * to a nanometre. That is not a cosmetic size optimisation: a mesh whose walls
 * and caps do not share vertices is a mesh whose edges appear once instead of
 * twice, and `isClosed` is the test that every exported part has to pass. If
 * welding were a later step it could be skipped; here it cannot be.
 */

export type Vec3 = readonly [number, number, number];

export type Mesh = {
  /** Flat [x0, y0, z0, x1, y1, z1, ...]. */
  positions: number[];
  /** Triangle corners as indices into `positions / 3`, counter-clockwise seen from outside. */
  triangles: number[];
};

/** Weld tolerance in mm. A nanometre is far below anything a printer resolves. */
const WELD = 1e-6;

export class MeshBuilder {
  readonly positions: number[] = [];
  readonly triangles: number[] = [];
  private readonly index = new Map<string, number>();

  /**
   * A vertex keyed by something other than its position.
   *
   * An ear clipper reaches a hole by bridging to it, and it duplicates the two
   * vertices at each end of that bridge so the seam has two sides. Welding by
   * position merges them again, and the seam's edge then belongs to four
   * triangles instead of two: closed, but not manifold, and Bambu Studio says
   * so. Keying by the triangulation's own index keeps the two sides apart.
   */
  keyed(key: string, x: number, y: number, z: number): number {
    const hit = this.index.get(key);
    if (hit !== undefined) return hit;
    const id = this.positions.length / 3;
    this.positions.push(x, y, z);
    this.index.set(key, id);
    return id;
  }

  triangleOf(a: number, b: number, c: number): void {
    if (a === b || b === c || a === c) return;
    this.triangles.push(a, b, c);
  }

  quadOf(a: number, b: number, c: number, d: number): void {
    this.triangleOf(a, b, c);
    this.triangleOf(a, c, d);
  }

  vertex(x: number, y: number, z: number): number {
    const key = `${quant(x)},${quant(y)},${quant(z)}`;
    const hit = this.index.get(key);
    if (hit !== undefined) return hit;
    const id = this.positions.length / 3;
    this.positions.push(x, y, z);
    this.index.set(key, id);
    return id;
  }

  triangle(a: Vec3, b: Vec3, c: Vec3): void {
    const ia = this.vertex(a[0], a[1], a[2]);
    const ib = this.vertex(b[0], b[1], b[2]);
    const ic = this.vertex(c[0], c[1], c[2]);
    // A triangle with two identical corners has no area and no normal. It is
    // not an error in the caller, it is what a degenerate segment produces, so
    // it is dropped here rather than asserted against.
    if (ia === ib || ib === ic || ia === ic) return;
    this.triangles.push(ia, ib, ic);
  }

  /** Two triangles, wound so the quad's outward face is the one given. */
  quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3): void {
    this.triangle(a, b, c);
    this.triangle(a, c, d);
  }

  build(): Mesh {
    return { positions: this.positions.slice(), triangles: this.triangles.slice() };
  }
}

function quant(n: number): number {
  return Math.round(n / WELD);
}

/**
 * Appends meshes without welding them.
 *
 * Welding is right when two surfaces meet and wrong when they do not. The
 * twenty three bars of a code never touch, and welding them would merge the
 * duplicate vertices a triangulator leaves on either side of a bridge, which
 * turns a manifold letter into a seam belonging to four triangles.
 */
export function concatMeshes(meshes: readonly Mesh[]): Mesh {
  const positions: number[] = [];
  const triangles: number[] = [];
  for (const mesh of meshes) {
    const offset = positions.length / 3;
    positions.push(...mesh.positions);
    for (const index of mesh.triangles) triangles.push(index + offset);
  }
  return { positions, triangles };
}

/** Merges meshes and welds coincident vertices. For surfaces that do meet. */
export function meshFrom(meshes: readonly Mesh[]): Mesh {
  const b = new MeshBuilder();
  for (const m of meshes) {
    for (let i = 0; i < m.triangles.length; i += 3) {
      b.triangle(vertexOf(m, m.triangles[i]), vertexOf(m, m.triangles[i + 1]), vertexOf(m, m.triangles[i + 2]));
    }
  }
  return b.build();
}

export function vertexOf(mesh: Mesh, index: number): Vec3 {
  const i = index * 3;
  return [mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]];
}

export function triangleCount(mesh: Mesh): number {
  return mesh.triangles.length / 3;
}

export function translated(mesh: Mesh, dx: number, dy: number, dz: number): Mesh {
  const positions = mesh.positions.slice();
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += dx;
    positions[i + 1] += dy;
    positions[i + 2] += dz;
  }
  return { positions, triangles: mesh.triangles.slice() };
}

export function bounds(mesh: Mesh): { min: Vec3; max: Vec3 } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = mesh.positions[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }
  return { min, max };
}

/**
 * A closed surface has every directed edge exactly once and every undirected
 * edge exactly twice. Anything else is a hole, a duplicated face or a flipped
 * winding, and a slicer will either repair it silently or print the repair.
 */
export function isClosed(mesh: Mesh): boolean {
  return openEdges(mesh).length === 0;
}

export function openEdges(mesh: Mesh): { from: number; to: number }[] {
  const seen = new Map<string, number>();
  for (let i = 0; i < mesh.triangles.length; i += 3) {
    const t = [mesh.triangles[i], mesh.triangles[i + 1], mesh.triangles[i + 2]];
    for (let k = 0; k < 3; k++) {
      const a = t[k];
      const b = t[(k + 1) % 3];
      const forward = `${a}:${b}`;
      const back = `${b}:${a}`;
      const open = seen.get(back);
      if (open) {
        if (open === 1) seen.delete(back);
        else seen.set(back, open - 1);
      } else {
        seen.set(forward, (seen.get(forward) ?? 0) + 1);
      }
    }
  }
  return [...seen.keys()].map((k) => {
    const [from, to] = k.split(":").map(Number);
    return { from, to };
  });
}

/**
 * Edges that do not belong to exactly two triangles once coincident vertices
 * are merged by position.
 *
 * `isClosed` compares vertex indices, which is what the builder controls.
 * A slicer merges by position instead, and by that measure a surface can be
 * closed and still be wrong: two walls standing on the same line, or four
 * triangles meeting along one edge. Bambu Studio calls that `manifold = no`.
 * This is the same check, so the answer arrives from `npm test` rather than
 * from a slicer on one person's laptop.
 */
export function nonManifoldEdges(mesh: Mesh): string[] {
  const at = (index: number): string => {
    const i = index * 3;
    return `${round(mesh.positions[i])},${round(mesh.positions[i + 1])},${round(mesh.positions[i + 2])}`;
  };

  const counts = new Map<string, number>();
  for (let i = 0; i < mesh.triangles.length; i += 3) {
    const corners = [at(mesh.triangles[i]), at(mesh.triangles[i + 1]), at(mesh.triangles[i + 2])];
    for (let k = 0; k < 3; k++) {
      const edge = [corners[k], corners[(k + 1) % 3]].sort().join("|");
      counts.set(edge, (counts.get(edge) ?? 0) + 1);
    }
  }
  return [...counts.entries()].filter(([, n]) => n !== 2).map(([edge]) => edge);
}

function round(n: number): string {
  return n.toFixed(4);
}

/** Signed volume via the divergence theorem. Negative means inverted normals. */
export function volume(mesh: Mesh): number {
  let sum = 0;
  for (let i = 0; i < mesh.triangles.length; i += 3) {
    const a = vertexOf(mesh, mesh.triangles[i]);
    const b = vertexOf(mesh, mesh.triangles[i + 1]);
    const c = vertexOf(mesh, mesh.triangles[i + 2]);
    sum +=
      a[0] * (b[1] * c[2] - c[1] * b[2]) -
      a[1] * (b[0] * c[2] - c[0] * b[2]) +
      a[2] * (b[0] * c[1] - c[0] * b[1]);
  }
  return sum / 6;
}

export function surfaceArea(mesh: Mesh): number {
  let sum = 0;
  for (let i = 0; i < mesh.triangles.length; i += 3) {
    const a = vertexOf(mesh, mesh.triangles[i]);
    const b = vertexOf(mesh, mesh.triangles[i + 1]);
    const c = vertexOf(mesh, mesh.triangles[i + 2]);
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    const cx = uy * vz - uz * vy;
    const cy = uz * vx - ux * vz;
    const cz = ux * vy - uy * vx;
    sum += Math.hypot(cx, cy, cz) / 2;
  }
  return sum;
}
