import assert from "node:assert/strict";
import { test } from "vitest";

import {
  bestPairs,
  changePlan,
  contrastRatio,
  FILAMENTS,
  GOOD_CONTRAST,
  pairing,
  parseHex,
  relativeLuminance,
  verdictFor,
} from "@/lib/filament";
import { LIMITS, parseRequest, toSearchParams } from "@/lib/request";

test("contrast between black and white is the maximum the formula allows", () => {
  assert.ok(Math.abs(contrastRatio("#000000", "#ffffff") - 21) < 1e-9);
});

test("contrast does not care which colour is named first", () => {
  assert.equal(contrastRatio("#1db954", "#101012"), contrastRatio("#101012", "#1db954"));
});

test("luminance follows the sRGB curve, not the raw channel value", () => {
  // Mid grey is 0.5 in channel terms and about 0.21 in luminance terms.
  const mid = relativeLuminance("#808080");
  assert.ok(mid > 0.2 && mid < 0.22);
});

test("colours are read in both short and long form", () => {
  assert.deepEqual(parseHex("#fff"), [255, 255, 255]);
  assert.deepEqual(parseHex("102030"), [16, 32, 48]);
  assert.throws(() => parseHex("#12345"), /not a colour/);
});

test("the verdict boundaries are where the constants say they are", () => {
  assert.equal(verdictFor(GOOD_CONTRAST), "good");
  assert.equal(verdictFor(GOOD_CONTRAST - 0.01), "usable");
  assert.equal(verdictFor(2.9), "poor");
});

test("black on charcoal is refused, black on white is not", () => {
  assert.equal(pairing("#000000", "#262626").verdict, "poor");
  assert.equal(pairing("#000000", "#ffffff").verdict, "good");
});

test("the recommended pairs are sorted, distinct and all good", () => {
  const pairs = bestPairs(10);
  assert.equal(pairs.length, 10);
  for (const pair of pairs) {
    assert.equal(pair.verdict, "good");
    assert.notEqual(pair.body.hex, pair.code.hex);
  }
  const ratios = pairs.map((p) => p.ratio);
  assert.deepEqual(ratios, [...ratios].sort((a, b) => b - a));
});

test("every filament in the table is a real colour with a name", () => {
  for (const filament of FILAMENTS) {
    assert.ok(filament.name.length > 0);
    assert.doesNotThrow(() => parseHex(filament.hex));
  }
});

test("the change lands on the first layer printed in the second filament", () => {
  const plan = changePlan(2.4, 0.2);
  assert.equal(plan.exact, true);
  assert.equal(plan.layer, 13);
  assert.ok(plan.instruction.includes("layer 13"));
});

test("a first layer of its own thickness is accounted for", () => {
  const plan = changePlan(2.4, 0.2, 0.25);
  assert.equal(plan.exact, false);
  assert.ok(plan.instruction.includes("does not land"));
});

test("a layer height that does not divide the relief says so instead of rounding quietly", () => {
  const plan = changePlan(2.4, 0.28);
  assert.equal(plan.exact, false);
  assert.ok(plan.instruction.includes("multiple of the layer height"));
});

test("a request round trips through its own search params", () => {
  const params = new URLSearchParams({
    link: "https://open.spotify.com/track/2QjOHCTQ1Jl3zawyYOpxh6",
    shape: "coin",
    width: "60",
    thickness: "3",
    relief: "0.8",
    title: "Sweater Weather",
    body: "#101012",
    code: "#f6f6f4",
  });
  const request = parseRequest(params);
  const again = parseRequest(toSearchParams(request));
  assert.deepEqual(again.options, request.options);
  assert.deepEqual(again.colours, request.colours);
  assert.equal(again.ref.uri, request.ref.uri);
});

test("out of range numbers are clamped rather than rejected", () => {
  const request = parseRequest(
    new URLSearchParams({ link: "2QjOHCTQ1Jl3zawyYOpxh6", width: "9999", thickness: "0.01" }),
  );
  assert.equal(request.options.widthMm, LIMITS.widthMm.max);
  assert.equal(request.options.thicknessMm, LIMITS.thicknessMm.min);
});

test("nonsense values fall back to the default instead of erroring", () => {
  const request = parseRequest(
    new URLSearchParams({ link: "2QjOHCTQ1Jl3zawyYOpxh6", shape: "banana", width: "wide", body: "nope" }),
  );
  assert.equal(request.options.shape, undefined);
  assert.equal(request.options.widthMm, undefined);
  assert.equal(request.colours.body, "#101012");
});

test("text is cut to a length that cannot fill a URL", () => {
  const long = "x".repeat(500);
  const request = parseRequest(new URLSearchParams({ link: "2QjOHCTQ1Jl3zawyYOpxh6", title: long }));
  assert.equal(request.options.title?.length, LIMITS.textLength);
});

test("a request without a link is the one thing that is an error", () => {
  assert.throws(() => parseRequest(new URLSearchParams({ shape: "bar" })), /no link/);
});
