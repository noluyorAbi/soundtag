import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

import { binaryStl } from "@/lib/export/stl";
import { laserSvg, previewSvg } from "@/lib/export/svg";
import { BEDS, singleTagPlacement, threeMf } from "@/lib/export/threemf";
import { crc32, zip } from "@/lib/export/zip";
import { triangleCount } from "@/lib/geom/mesh";
import { packPlate, capacity } from "@/lib/plate";
import { parseScannable } from "@/lib/scannable";
import { buildTag, composeTag } from "@/lib/tag";
import { readZip } from "./helpers/zip";

const svg = readFileSync(new URL("./fixtures/code-sweater-weather.svg", import.meta.url), "utf8");
const scannable = parseScannable(svg);
const tag = buildTag(scannable, { shape: "bar" });

test("crc32 matches the known value for the standard check string", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("the archive reads back with its entries intact", () => {
  const bytes = zip([
    { path: "a.txt", data: "hello" },
    { path: "nested/b.txt", data: "world" },
  ]);
  const entries = readZip(bytes);
  assert.deepEqual(
    entries.map((e) => e.path),
    ["a.txt", "nested/b.txt"],
  );
  assert.equal(new TextDecoder().decode(entries[0].data), "hello");
  assert.equal(new TextDecoder().decode(entries[1].data), "world");
});

test("every entry's stored checksum is the checksum of its bytes", () => {
  // Checked by a reader that did not write the file, so a wrong CRC cannot be
  // validated by the same code that produced it.
  const bytes = threeMf([singleTagPlacement(tag)]);
  for (const entry of readZip(bytes)) {
    assert.equal(entry.crc, crc32(entry.data), entry.path);
  }
});

test("two builds of the same tag are byte identical", () => {
  const a = threeMf([singleTagPlacement(buildTag(scannable, { shape: "bar" }))]);
  const b = threeMf([singleTagPlacement(buildTag(scannable, { shape: "bar" }))]);
  assert.deepEqual([...a], [...b]);
});

test("the 3MF holds the four parts a slicer looks for", () => {
  const entries = readZip(threeMf([singleTagPlacement(tag)]));
  assert.deepEqual(entries.map((e) => e.path).sort(), [
    "3D/3dmodel.model",
    "Metadata/model_settings.config",
    "[Content_Types].xml",
    "_rels/.rels",
  ]);
});

test("the model declares millimetres, both meshes and one build item", () => {
  const model = entryText(threeMf([singleTagPlacement(tag)]), "3D/3dmodel.model");
  assert.ok(model.includes('unit="millimeter"'));
  assert.equal((model.match(/<mesh>/g) ?? []).length, 2);
  assert.equal((model.match(/<item /g) ?? []).length, 1);
  assert.equal((model.match(/<vertex /g) ?? []).length, vertexCount(tag));
});

test("the body is on filament 1 and the code on filament 2", () => {
  const config = entryText(threeMf([singleTagPlacement(tag)]), "Metadata/model_settings.config");
  assert.ok(config.includes('<metadata key="name" value="Body"/>'));
  assert.ok(config.includes('<metadata key="name" value="Code"/>'));
  const extruders = [...config.matchAll(/key="extruder" value="(\d)"/g)].map((m) => m[1]);
  assert.deepEqual(extruders, ["1", "1", "2"]);
});

test("the disclaimer travels inside the file, not only in the README", () => {
  const model = entryText(threeMf([singleTagPlacement(tag)]), "3D/3dmodel.model");
  assert.ok(model.includes("Not affiliated with"));
  assert.ok(model.includes("does not and cannot grant you rights"));
});

test("the build item centres the tag on the plate it was told about", () => {
  const bed = BEDS["bambu-a1-mini"];
  const model = entryText(threeMf([singleTagPlacement(tag, bed)], { bed }), "3D/3dmodel.model");
  const transform = model.match(/<item objectid="\d+" transform="([^"]+)"/)![1].split(" ");
  assert.equal(Number(transform[9]), bed.width / 2 - tag.size.width / 2);
  assert.equal(Number(transform[10]), bed.depth / 2 - tag.size.height / 2);
});

test("a batch becomes one file with one object per tag", () => {
  const tags = [tag, buildTag(scannable, { shape: "coin" }), buildTag(scannable, { shape: "card" })];
  const packed = packPlate(tags.map((t, i) => ({ tag: t, label: `tag ${i}` })), BEDS["bambu-a1"]);
  const model = entryText(threeMf(packed.placements), "3D/3dmodel.model");
  assert.equal(packed.placements.length, 3);
  assert.equal((model.match(/<item /g) ?? []).length, 3);
  assert.equal((model.match(/<components>/g) ?? []).length, 3);
});

test("the packer keeps tags inside the plate and reports what it dropped", () => {
  const bed = BEDS["bambu-a1-mini"];
  const many = Array.from({ length: 40 }, () => ({ tag }));
  const packed = packPlate(many, bed);
  assert.ok(packed.placements.length > 0);
  assert.equal(packed.placements.length + packed.dropped.length, many.length);
  for (const placement of packed.placements) {
    assert.ok(placement.x - tag.size.width / 2 >= 0);
    assert.ok(placement.x + tag.size.width / 2 <= bed.width);
    assert.ok(placement.y + tag.size.height / 2 <= bed.depth);
  }
});

test("capacity agrees with what the packer actually fits", () => {
  const bed = BEDS["bambu-a1"];
  const predicted = capacity(tag, bed);
  const packed = packPlate(Array.from({ length: predicted + 5 }, () => ({ tag })), bed);
  assert.equal(packed.placements.length, predicted);
});

test("nothing is exported when there is nothing to export", () => {
  assert.throws(() => threeMf([]), /nothing to export/);
});

test("the STL header does not start with the word that means ASCII", () => {
  const stl = binaryStl(tag.parts.map((p) => p.mesh));
  const header = new TextDecoder().decode(stl.slice(0, 5));
  assert.notEqual(header, "solid");
});

test("the STL triangle count matches the meshes it was given", () => {
  const stl = binaryStl(tag.parts.map((p) => p.mesh));
  const view = new DataView(stl.buffer, stl.byteOffset, stl.byteLength);
  const declared = view.getUint32(80, true);
  const actual = tag.parts.reduce((sum, p) => sum + triangleCount(p.mesh), 0);
  assert.equal(declared, actual);
  assert.equal(stl.length, 84 + actual * 50);
});

test("the laser file separates cutting from engraving", () => {
  const laser = laserSvg(tag.geometry);
  assert.ok(laser.includes('width="75.6mm"'));
  assert.ok(laser.includes('<g id="cut" fill="none" stroke="#ff0000" stroke-width="0.05">'));
  assert.ok(laser.includes('<g id="engrave" fill="#000000">'));
  // The cut layer is the outline and the hole, and nothing else.
  const cut = laser.split('id="cut"')[1].split("</g>")[0];
  assert.equal((cut.match(/<path/g) ?? []).length, 1);
});

test("the engrave layer holds every bar", () => {
  const laser = laserSvg(tag.geometry);
  const engrave = laser.split('id="engrave"')[1];
  assert.equal((engrave.match(/<path/g) ?? []).length, 23);
});

test("the preview draws the same geometry the mesh was built from", () => {
  const geometry = composeTag(scannable, { shape: "bar" });
  const preview = previewSvg(geometry, { relief: false });
  assert.ok(preview.includes('viewBox="0 0 75.6 16.2"'));
  assert.equal((preview.match(/<path/g) ?? []).length, 1 + geometry.code.length);
});

test("preview colours are the ones asked for", () => {
  const preview = previewSvg(tag.geometry, { bodyColour: "#123456", codeColour: "#abcdef" });
  assert.ok(preview.includes('fill="#123456"'));
  assert.ok(preview.includes('fill="#abcdef"'));
});

function entryText(bytes: Uint8Array, path: string): string {
  const entry = readZip(bytes).find((e) => e.path === path);
  assert.ok(entry, `no entry ${path}`);
  return new TextDecoder().decode(entry!.data);
}

function vertexCount(t: typeof tag): number {
  return t.parts.reduce((sum, p) => sum + p.mesh.positions.length / 3, 0);
}
