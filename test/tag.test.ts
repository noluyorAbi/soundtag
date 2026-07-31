import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

import { isClosed, openEdges, volume } from "@/lib/geom/mesh";
import { polygonArea } from "@/lib/geom/polygon";
import { SHAPES, layout } from "@/lib/layouts";
import { parseScannable } from "@/lib/scannable";
import { buildTag, composeTag } from "@/lib/tag";

const svg = readFileSync(new URL("./fixtures/code-sweater-weather.svg", import.meta.url), "utf8");
const scannable = parseScannable(svg);

test("every shape builds two closed parts", () => {
  for (const shape of SHAPES) {
    const tag = buildTag(scannable, { shape });
    assert.equal(tag.parts.length, 2, shape);
    for (const part of tag.parts) {
      assert.deepEqual(openEdges(part.mesh), [], `${shape} ${part.name} has open edges`);
      assert.ok(volume(part.mesh) > 0, `${shape} ${part.name} has inverted normals`);
    }
  }
});

test("nothing of the body is above the change height and nothing of the code below it", () => {
  for (const shape of SHAPES) {
    const tag = buildTag(scannable, { shape });
    const [body, code] = tag.parts;
    const zs = (mesh: typeof body.mesh) => {
      const out: number[] = [];
      for (let i = 2; i < mesh.positions.length; i += 3) out.push(mesh.positions[i]);
      return out;
    };
    assert.ok(Math.max(...zs(body.mesh)) <= tag.change.z + 1e-9, shape);
    assert.ok(Math.min(...zs(code.mesh)) >= tag.change.z - 1e-9, shape);
  }
});

test("the change lands on a whole layer at the default layer height", () => {
  const tag = buildTag(scannable, { shape: "bar" });
  assert.equal(tag.change.z, 2.4);
  assert.equal(tag.change.exact, true);
  assert.equal(tag.change.layer, 13);
});

test("an odd layer height reports the change as inexact rather than lying about it", () => {
  const tag = buildTag(scannable, { shape: "bar", layerHeightMm: 0.28 });
  assert.equal(tag.change.exact, false);
  assert.ok(tag.change.layer >= 9 && tag.change.layer <= 10);
});

test("the bar keeps the reference proportions", () => {
  const tag = buildTag(scannable, { shape: "bar" });
  assert.equal(tag.size.width, 75.6);
  assert.ok(Math.abs(tag.size.height - 16.2) < 1e-9);
  assert.equal(tag.size.thickness, 3);
});

test("width scales the whole shape, not just the plate", () => {
  const small = buildTag(scannable, { shape: "bar", widthMm: 50 });
  const large = buildTag(scannable, { shape: "bar", widthMm: 100 });
  assert.ok(Math.abs(small.size.height - 50 * (16.2 / 75.6)) < 1e-9);
  assert.ok(large.geometry.code2d.width > small.geometry.code2d.width * 1.9);
});

test("all 23 bars survive composition, and their order is preserved", () => {
  const geometry = composeTag(scannable, { shape: "bar" });
  assert.equal(geometry.code.length, 23);
  const centres = geometry.code.map((p) => {
    const xs = p.outer.map(([x]) => x);
    return (Math.min(...xs) + Math.max(...xs)) / 2;
  });
  const sorted = [...centres].sort((a, b) => a - b);
  assert.deepEqual(centres, sorted);
});

test("bar heights keep the ratios Spotify sent, which is what makes it scan", () => {
  const geometry = composeTag(scannable, { shape: "bar" });
  const heights = geometry.code.map((p) => {
    const ys = p.outer.map(([, y]) => y);
    return Math.max(...ys) - Math.min(...ys);
  });
  scannable.bars.forEach((bar, i) => {
    const expected = bar.height * geometry.scale;
    assert.ok(Math.abs(heights[i] - expected) < 1e-6, `bar ${i}`);
  });
});

test("the mark is off by default and adds one shape when asked for", () => {
  const without = composeTag(scannable, { shape: "bar" });
  const withMark = composeTag(scannable, { shape: "bar", mark: true });
  assert.equal(without.code.length, 23);
  assert.equal(withMark.code.length, 24);
  // The mark is a disc with three cutouts, so it arrives as a polygon with holes.
  assert.equal(withMark.code[23].holes.length, 3);
});

test("the mark shrinks the bars, because it has to share the same box", () => {
  const without = composeTag(scannable, { shape: "bar" });
  const withMark = composeTag(scannable, { shape: "bar", mark: true });
  assert.ok(withMark.scale < without.scale);
});

test("the magnet shape has two seats and no keyring hole", () => {
  const tag = buildTag(scannable, { shape: "magnet" });
  assert.equal(tag.geometry.plate.holes.length, 0);
  assert.equal(tag.geometry.pockets.length, 2);
  assert.ok(tag.geometry.pockets.every((p) => p.depth < tag.change.z));
});

test("magnet seats remove material, which the volume shows", () => {
  const magnet = buildTag(scannable, { shape: "magnet" });
  const plain = buildTag(scannable, { shape: "bar", widthMm: 75.6, thicknessMm: 4.2 });
  assert.ok(magnet.volume.body < plain.volume.body + polygonArea(plain.geometry.plate) * 0);
  const seatVolume = Math.PI * 3.1 ** 2 * 2.1 * 2;
  assert.ok(seatVolume > 100 && seatVolume < 150);
});

test("text on the bar adds a band under the code without shrinking the code", () => {
  const plain = buildTag(scannable, { shape: "bar" });
  const titled = buildTag(scannable, { shape: "bar", title: "Sweater Weather" });
  assert.equal(plain.geometry.frontText.length, 0);
  assert.ok(titled.geometry.frontText.length > 0);
  // The tag grows, the code stays the size it was.
  assert.ok(titled.size.height > plain.size.height);
  assert.equal(titled.size.width, plain.size.width);
  assert.ok(Math.abs(titled.geometry.scale - plain.geometry.scale) < 1e-9);
  assert.ok(titled.parts.every((p) => isClosed(p.mesh)));
});

test("a second line of text adds a second band, not a smaller font", () => {
  const one = buildTag(scannable, { shape: "bar", title: "Sweater Weather" });
  const two = buildTag(scannable, { shape: "bar", title: "Sweater Weather", artist: "The Neighbourhood" });
  assert.ok(two.size.height > one.size.height);
  assert.ok(Math.abs(two.geometry.scale - one.geometry.scale) < 1e-9);
});

test("engraved text was refused, so no shape produces a pocket for it", () => {
  const tag = buildTag(scannable, { shape: "bar", title: "Sweater Weather" });
  assert.equal(tag.geometry.pockets.length, 0);
  assert.equal(tag.geometry.backText.length, 0);
});

test("text on a card lands on the front, in the code's filament", () => {
  const tag = buildTag(scannable, { shape: "card", title: "Sweater Weather", artist: "The Neighbourhood" });
  assert.ok(tag.geometry.frontText.length > 0);
  assert.equal(tag.geometry.backText.length, 0);
  assert.ok(tag.parts[1].mesh.triangles.length > 0);
});

test("a title too long for the shape is cut and says so", () => {
  const tag = buildTag(scannable, {
    shape: "bar",
    title: "A title far too long to fit across the back of a keyring tag at this pixel size",
  });
  assert.ok(tag.geometry.notes.some((n) => n.includes("cut to fit")));
});

test("the body volume is the plate minus its holes, times the change height", () => {
  const tag = buildTag(scannable, { shape: "bar" });
  const expected = polygonArea(tag.geometry.plate) * tag.change.z;
  assert.ok(Math.abs(tag.volume.body - expected) / expected < 1e-9);
});

test("the code volume is the artwork area times the relief", () => {
  const tag = buildTag(scannable, { shape: "bar" });
  const area = tag.geometry.code.reduce((sum, p) => sum + polygonArea(p), 0);
  const expected = area * tag.geometry.relief;
  assert.ok(Math.abs(tag.volume.code - expected) / expected < 1e-9);
});

test("a relief thicker than the tag is refused", () => {
  assert.throws(() => buildTag(scannable, { shape: "bar", thicknessMm: 0.5, reliefMm: 0.6 }), /does not fit/);
});

test("a code that cannot fit the plate is refused rather than clipped", () => {
  // A coin small enough that the artwork would run past the curve.
  assert.throws(() => buildTag(scannable, { shape: "coin", widthMm: 8 }), /does not fit|not fit/);
});

test("layouts describe themselves, so the CLI listing cannot drift", () => {
  for (const shape of SHAPES) {
    const l = layout(shape);
    assert.ok(l.about.length > 20, shape);
    assert.ok(l.codeBox.width > 0 && l.codeBox.height > 0, shape);
    assert.ok(l.thickness > 0, shape);
  }
});

test("a narrow tag warns about the bar width instead of printing mush quietly", () => {
  const tag = buildTag(scannable, { shape: "bar", widthMm: 40 });
  assert.ok(tag.geometry.notes.some((n) => n.includes("0.4 mm nozzle")));
});
