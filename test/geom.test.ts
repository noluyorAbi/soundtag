import assert from "node:assert/strict";
import { test } from "vitest";

import { extrude } from "@/lib/geom/extrude";
import { bounds, isClosed, openEdges, surfaceArea, triangleCount, volume } from "@/lib/geom/mesh";
import {
  ARC_SEGMENTS,
  area,
  capsule,
  circle,
  dedupe,
  isCounterClockwise,
  polygon,
  polygonArea,
  polygonContains,
  roundedRect,
} from "@/lib/geom/polygon";
import { pathToRings } from "@/lib/geom/svgpath";
import { triangulate, triangulateToPoints } from "@/lib/geom/triangulate";

test("polygon() normalises winding so the rest of the pipeline can assume it", () => {
  const clockwise = [
    [0, 0],
    [0, 10],
    [10, 10],
    [10, 0],
  ] as [number, number][];
  const p = polygon(clockwise, [circle(5, 5, 2)]);
  assert.equal(isCounterClockwise(p.outer), true);
  assert.equal(isCounterClockwise(p.holes[0]), false);
});

test("a circle's area converges on pi r squared", () => {
  const r = 7.5;
  const approximated = area(circle(0, 0, r));
  const exact = Math.PI * r * r;
  // A 64-gon is inscribed, so it is smaller, by 0.16 percent at this count.
  assert.ok(approximated < exact);
  assert.ok((exact - approximated) / exact < 0.002);
});

test("roundedRect keeps its bounding box and clamps the radius to a stadium", () => {
  const ring = roundedRect(75.6, 16.2, 3.6);
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  assert.ok(Math.min(...xs) >= -1e-9 && Math.max(...xs) <= 75.6 + 1e-9);
  assert.ok(Math.min(...ys) >= -1e-9 && Math.max(...ys) <= 16.2 + 1e-9);

  // The radius clamps to half the short side, so this is a stadium: a 10 by 10
  // rectangle with a half disc on each end. The arcs are inscribed polygons,
  // so the area lands just under the exact figure.
  const stadium = roundedRect(20, 10, 999);
  const exact = 10 * 10 + Math.PI * 25;
  assert.ok(area(stadium) < exact);
  assert.ok((exact - area(stadium)) / exact < 0.003);
});

test("a capsule is a rectangle plus two half discs", () => {
  const w = 1.2;
  const h = 8;
  const ring = capsule(0, 0, w, h);
  const expected = (h - w) * w + Math.PI * (w / 2) ** 2;
  assert.ok(Math.abs(area(ring) - expected) / expected < 0.002);
});

test("dedupe removes repeated points including the wrap", () => {
  const ring = dedupe([
    [0, 0],
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 0],
  ]);
  assert.equal(ring.length, 3);
});

test("triangulation covers the polygon area exactly, holes included", () => {
  const p = polygon(roundedRect(75.6, 16.2, 3.6), [circle(5.2, 8.1, 1.8)]);
  const triangles = triangulateToPoints(p);
  const covered = triangles.reduce((sum, [a, b, c]) => {
    return sum + Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
  }, 0);
  const residual = Math.abs(covered - polygonArea(p)) / polygonArea(p);
  assert.ok(residual < 1e-9, `area residual ${residual}`);
});

test("triangulation handles several holes at once", () => {
  const p = polygon(roundedRect(60, 30, 4), [circle(12, 15, 3), circle(30, 15, 5), circle(48, 15, 3)]);
  const { triangles } = triangulate(p);
  assert.ok(triangles.length > 0);
  const covered = triangulateToPoints(p).reduce((sum, [a, b, c]) => {
    return sum + Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
  }, 0);
  assert.ok(Math.abs(covered - polygonArea(p)) / polygonArea(p) < 1e-9);
});

test("polygonContains respects holes", () => {
  const p = polygon(roundedRect(40, 20, 2), [circle(10, 10, 3)]);
  assert.equal(polygonContains(p, [20, 10]), true);
  assert.equal(polygonContains(p, [10, 10]), false);
  assert.equal(polygonContains(p, [-1, 10]), false);
});

test("an extruded plate with a hole is a closed surface", () => {
  const mesh = extrude(polygon(roundedRect(75.6, 16.2, 3.6), [circle(5.2, 8.1, 1.8)]), 0, 2.4);
  assert.deepEqual(openEdges(mesh), []);
  assert.equal(isClosed(mesh), true);
});

test("extrusion volume matches area times height, and normals point outwards", () => {
  const p = polygon(roundedRect(75.6, 16.2, 3.6), [circle(5.2, 8.1, 1.8)]);
  const mesh = extrude(p, 0, 2.4);
  const expected = polygonArea(p) * 2.4;
  assert.ok(Math.abs(volume(mesh) - expected) / expected < 1e-9);
  assert.ok(volume(mesh) > 0, "a positive volume means the winding is outward");
});

test("extrusion surface area is the caps plus the walls", () => {
  const p = polygon(circle(0, 0, 10, ARC_SEGMENTS));
  const mesh = extrude(p, 0, 3);
  const perimeter = p.outer.reduce((sum, point, i) => {
    const next = p.outer[(i + 1) % p.outer.length];
    return sum + Math.hypot(next[0] - point[0], next[1] - point[1]);
  }, 0);
  const expected = 2 * polygonArea(p) + perimeter * 3;
  assert.ok(Math.abs(surfaceArea(mesh) - expected) / expected < 1e-9);
});

test("extrude refuses a zero or negative height", () => {
  const p = polygon(circle(0, 0, 5));
  assert.throws(() => extrude(p, 1, 1), /z1 > z0/);
  assert.throws(() => extrude(p, 2, 1), /z1 > z0/);
});

test("a mesh with a face removed reports its open edges", () => {
  const mesh = extrude(polygon(roundedRect(10, 10, 1)), 0, 1);
  const torn = { positions: mesh.positions, triangles: mesh.triangles.slice(3) };
  assert.equal(isClosed(torn), false);
  assert.equal(openEdges(torn).length, 3);
});

test("bounds and triangle count report the mesh that was built", () => {
  const mesh = extrude(polygon(roundedRect(20, 10, 2)), 1, 4);
  const b = bounds(mesh);
  assert.deepEqual(b.min.map((n) => Number(n.toFixed(6))), [0, 0, 1]);
  assert.deepEqual(b.max.map((n) => Number(n.toFixed(6))), [20, 10, 4]);
  assert.ok(triangleCount(mesh) > 20);
});

test("the path reader flattens cubics into a closed ring", () => {
  const rings = pathToRings("M0 0 C 0 10, 10 10, 10 0 Z");
  assert.equal(rings.length, 1);
  assert.ok(rings[0].length > 4);
  const xs = rings[0].map(([x]) => x);
  assert.ok(Math.min(...xs) >= -1e-6 && Math.max(...xs) <= 10 + 1e-6);
});

test("the path reader handles relative commands and shorthand curves", () => {
  const absolute = pathToRings("M10 10 C 10 20, 20 20, 20 10 S 30 0, 30 10 Z");
  const relative = pathToRings("m10 10 c 0 10, 10 10, 10 0 s 10 -10, 10 0 z");
  assert.equal(absolute.length, 1);
  assert.equal(relative.length, 1);
  assert.equal(absolute[0].length, relative[0].length);
});

test("the path reader refuses an arc rather than dropping it", () => {
  assert.throws(() => pathToRings("M0 0 A 5 5 0 0 1 10 10 Z"), /unsupported path command/);
});

test("subpaths come back separately, which is how holes are found", () => {
  const rings = pathToRings("M0 0 L10 0 L10 10 L0 10 Z M3 3 L7 3 L7 7 L3 7 Z");
  assert.equal(rings.length, 2);
  assert.equal(rings[0].length, 4);
  assert.equal(rings[1].length, 4);
});
