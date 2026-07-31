import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

import { PROJECT } from "@/lib/project";
import {
  BAR_COUNT,
  fetchScannable,
  heightLevels,
  parseRef,
  parseScannable,
  scannableUrl,
} from "@/lib/scannable";

const sweater = readFileSync(new URL("./fixtures/code-sweater-weather.svg", import.meta.url), "utf8");
const second = readFileSync(new URL("./fixtures/code-bu-havada.svg", import.meta.url), "utf8");

test("a share link, a URI and a bare id all resolve to the same reference", () => {
  const expected = "spotify:track:2QjOHCTQ1Jl3zawyYOpxh6";
  for (const input of [
    "https://open.spotify.com/track/2QjOHCTQ1Jl3zawyYOpxh6?si=f92119e9421447ee",
    "https://open.spotify.com/intl-de/track/2QjOHCTQ1Jl3zawyYOpxh6",
    "spotify:track:2QjOHCTQ1Jl3zawyYOpxh6",
    "2QjOHCTQ1Jl3zawyYOpxh6",
    "  https://open.spotify.com/track/2QjOHCTQ1Jl3zawyYOpxh6  ",
  ]) {
    assert.equal(parseRef(input).uri, expected, input);
  }
});

test("albums, playlists and episodes are references too", () => {
  assert.equal(parseRef("https://open.spotify.com/album/1ATL5GLyefJaxhQzSPVrLX").kind, "album");
  assert.equal(parseRef("spotify:playlist:37i9dQZF1DXcBWIGoYBM5M").kind, "playlist");
  assert.equal(parseRef("https://open.spotify.com/episode/512ojhOuo1ktJprKbVcKyQ").kind, "episode");
});

test("something that is not a Spotify link says so", () => {
  assert.throws(() => parseRef(""), /empty link/);
  assert.throws(() => parseRef("https://music.apple.com/album/123"), /not a Spotify link/);
  assert.throws(() => parseRef("spotify:track:tooshort"), /not a Spotify link/);
});

test("the scannable url carries the uri and the requested size", () => {
  const url = scannableUrl(parseRef("2QjOHCTQ1Jl3zawyYOpxh6"), 640);
  assert.ok(url.startsWith("https://scannables.scdn.co/uri/plain/svg/000000/white/640/"));
  assert.ok(url.endsWith("spotify:track:2QjOHCTQ1Jl3zawyYOpxh6"));
});

test("a code has 23 bars, evenly spaced, centred on the midline", () => {
  for (const svg of [sweater, second]) {
    const code = parseScannable(svg);
    assert.equal(code.bars.length, BAR_COUNT);
    const pitches = code.bars.slice(1).map((b, i) => b.x - code.bars[i].x);
    assert.ok(Math.max(...pitches) - Math.min(...pitches) < 0.05);
    for (const bar of code.bars) {
      assert.ok(Math.abs(bar.y + bar.height / 2 - 50) < 0.05);
    }
  }
});

test("bar heights land on the eight levels a Spotify Code encodes", () => {
  const levels = heightLevels(parseScannable(sweater));
  assert.equal(levels.length, BAR_COUNT);
  assert.ok(Math.min(...levels) >= 1);
  assert.ok(Math.max(...levels) <= 8);
});

test("two different songs give two different codes", () => {
  const a = heightLevels(parseScannable(sweater)).join("");
  const b = heightLevels(parseScannable(second)).join("");
  assert.notEqual(a, b);
});

test("the mark is found, with its position and size", () => {
  const code = parseScannable(sweater);
  assert.ok(code.mark);
  assert.equal(code.mark?.x, 20);
  assert.equal(code.mark?.y, 20);
  assert.equal(code.mark?.size, 62.4);
  assert.ok(code.mark!.path.startsWith("M"));
});

test("y is flipped once, at the parser, so nothing downstream has to", () => {
  const code = parseScannable(sweater);
  // The tallest bar is 60 units on a 100 unit canvas, so with y up it runs
  // from 20 to 80 whatever the source said.
  const tallest = code.bars.reduce((a, b) => (b.height > a.height ? b : a));
  assert.ok(Math.abs(tallest.y - (50 - tallest.height / 2)) < 1e-9);
});

test("a code with the wrong number of bars is refused, not guessed at", () => {
  const broken = sweater.replace(/<rect x="100\.00"[^>]*\/>/, "");
  assert.throws(() => parseScannable(broken), /found 22|format has changed/);
});

test("bars that are no longer evenly spaced are refused", () => {
  const shifted = sweater.replace('<rect x="112.42"', '<rect x="118.42"');
  assert.throws(() => parseScannable(shifted), /evenly spaced/);
});

test("bars that stop being centred are refused", () => {
  const moved = sweater.replace('<rect x="100.00" y="44.50"', '<rect x="100.00" y="40.50"');
  assert.throws(() => parseScannable(moved), /midline/);
});

test("the fetch names the project and asks for an SVG", async () => {
  const seen: { url: string; headers: Record<string, string> }[] = [];
  const fake: typeof fetch = async (input, init) => {
    seen.push({
      url: String(input),
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    return new Response(sweater, { status: 200 });
  };

  const svg = await fetchScannable(parseRef("2QjOHCTQ1Jl3zawyYOpxh6"), fake);
  assert.equal(svg, sweater);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].headers["user-agent"], PROJECT.userAgent);
  assert.ok(seen[0].url.includes("scannables.scdn.co"));
});

test("a 404 from the endpoint becomes a sentence a person can act on", async () => {
  const fake: typeof fetch = async () => new Response("", { status: 404 });
  await assert.rejects(
    fetchScannable(parseRef("2QjOHCTQ1Jl3zawyYOpxh6"), fake),
    /publicly available/,
  );
});

test("any other failure reports the status rather than pretending", async () => {
  const fake: typeof fetch = async () => new Response("", { status: 503 });
  await assert.rejects(fetchScannable(parseRef("2QjOHCTQ1Jl3zawyYOpxh6"), fake), /503/);
});
