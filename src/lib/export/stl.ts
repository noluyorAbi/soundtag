/**
 * Binary STL, for the slicers and model hosts that still want one.
 *
 * STL has no notion of parts, so the two filaments collapse into one solid and
 * the colour change has to be set by hand at the layer the tag reports. The
 * 3MF is the better file and the docs say so; this exists because a plain
 * mesh is the lowest common denominator and refusing to emit one would be
 * posturing.
 */

import { type Mesh } from "../geom/mesh";
import { PROJECT } from "../project";

export function binaryStl(meshes: readonly Mesh[], header = `${PROJECT.name} tag`): Uint8Array {
  const triangleCount = meshes.reduce((sum, m) => sum + m.triangles.length / 3, 0);
  const buffer = new ArrayBuffer(84 + triangleCount * 50);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // The 80 byte header is free text. Some readers treat a leading "solid" as
  // the ASCII format marker, so it must not start with that word.
  bytes.set(new TextEncoder().encode(header.slice(0, 79)), 0);
  view.setUint32(80, triangleCount, true);

  let at = 84;
  for (const mesh of meshes) {
    for (let i = 0; i < mesh.triangles.length; i += 3) {
      const a = mesh.triangles[i] * 3;
      const b = mesh.triangles[i + 1] * 3;
      const c = mesh.triangles[i + 2] * 3;
      const p = mesh.positions;

      const ux = p[b] - p[a];
      const uy = p[b + 1] - p[a + 1];
      const uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a];
      const vy = p[c + 1] - p[a + 1];
      const vz = p[c + 2] - p[a + 2];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const length = Math.hypot(nx, ny, nz);
      if (length > 0) {
        nx /= length;
        ny /= length;
        nz /= length;
      }

      view.setFloat32(at, nx, true);
      view.setFloat32(at + 4, ny, true);
      view.setFloat32(at + 8, nz, true);
      for (let k = 0; k < 3; k++) {
        const base = [a, b, c][k];
        view.setFloat32(at + 12 + k * 12, p[base], true);
        view.setFloat32(at + 16 + k * 12, p[base + 1], true);
        view.setFloat32(at + 20 + k * 12, p[base + 2], true);
      }
      view.setUint16(at + 48, 0, true);
      at += 50;
    }
  }

  return bytes;
}
