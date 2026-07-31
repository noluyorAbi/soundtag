/**
 * Reading a Spotify Code.
 *
 * Spotify serves the code as an SVG from a public endpoint that is not part of
 * the documented Web API. That has two consequences this module is built
 * around. First, the parser is strict: it asserts the 23 bars, the uniform
 * pitch and the vertical symmetry, so the day the endpoint changes shape a
 * test fails here rather than a user receiving a tag that does not scan.
 * Second, nothing else in the codebase talks to that endpoint, so an offline
 * caller can hand `parseScannable` an SVG it obtained some other way and the
 * whole product works with no network at all.
 *
 * The bar geometry is never redrawn from scratch and never rounded to a grid.
 * It is read out of Spotify's own artwork and scaled uniformly, because the
 * Spotify Codes terms allow displaying the code and forbid modifying it.
 */

import { PROJECT } from "./project";

/** A Spotify Code always has this many bars. The parser refuses anything else. */
export const BAR_COUNT = 23;

/** The endpoint's own canvas: 400 x 100 units, code centred on y = 50. */
export const SOURCE_HEIGHT = 100;

export type Bar = {
  /** Left edge, in source units. */
  x: number;
  /** Bottom edge, in source units, measured with y pointing up. */
  y: number;
  width: number;
  height: number;
};

export type Scannable = {
  bars: Bar[];
  /** Bounding box of the bars in source units. */
  barsBox: { x: number; y: number; width: number; height: number };
  /** The Spotify mark, as an SVG path in source units, or null if absent. */
  mark: { path: string; x: number; y: number; size: number } | null;
  /** Distance from the last bar's right edge to the mark, or null. */
  source: "svg";
};

export type SpotifyRef = {
  /** `spotify:track:...` style URI, which is what the scannable endpoint takes. */
  uri: string;
  kind: "track" | "album" | "playlist" | "artist" | "episode" | "show" | "user";
  id: string;
};

const KINDS = new Set(["track", "album", "playlist", "artist", "episode", "show", "user"]);

/**
 * Accepts what a person actually has in their clipboard: a share link with a
 * tracking query, an `intl-de` localised link, a bare `spotify:` URI, or the
 * 22 character id on its own.
 */
export function parseRef(input: string): SpotifyRef {
  const text = input.trim();
  if (!text) throw new Error("empty link");

  const uri = text.match(/^spotify:([a-z]+):([A-Za-z0-9]{22})$/);
  if (uri && KINDS.has(uri[1])) {
    return { uri: `spotify:${uri[1]}:${uri[2]}`, kind: uri[1] as SpotifyRef["kind"], id: uri[2] };
  }

  const url = text.match(
    /open\.spotify\.com\/(?:intl-[a-z-]+\/)?([a-z]+)\/([A-Za-z0-9]{22})/,
  );
  if (url && KINDS.has(url[1])) {
    return { uri: `spotify:${url[1]}:${url[2]}`, kind: url[1] as SpotifyRef["kind"], id: url[2] };
  }

  const bare = text.match(/^[A-Za-z0-9]{22}$/);
  if (bare) return { uri: `spotify:track:${text}`, kind: "track", id: text };

  throw new Error(
    "not a Spotify link. Paste a share link, a spotify: URI, or a 22 character id",
  );
}

export function scannableUrl(ref: SpotifyRef, size = 640): string {
  return `https://scannables.scdn.co/uri/plain/svg/000000/white/${size}/${ref.uri}`;
}

/**
 * Fetches the code artwork. The caller supplies `fetch` so the CLI, the route
 * handler and the tests all use the same code path with different transports,
 * and so no test ever reaches the network by accident.
 */
export async function fetchScannable(
  ref: SpotifyRef,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(scannableUrl(ref), {
    headers: { "user-agent": PROJECT.userAgent, accept: "image/svg+xml" },
  });
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "Spotify has no code for that link. Check that it points at a track, album or playlist that is publicly available."
        : `the Spotify code endpoint answered ${res.status}`,
    );
  }
  return await res.text();
}

const RECT =
  /<rect\s+x="([-\d.]+)"\s+y="([-\d.]+)"\s+width="([-\d.]+)"\s+height="([-\d.]+)"(?:\s+rx="([-\d.]+)")?/g;

/**
 * Parses the endpoint's SVG. The background is a rect with no `rx`, the bars
 * are rects with one, and the mark is a path inside a translated group.
 */
export function parseScannable(svg: string): Scannable {
  const bars: Bar[] = [];
  for (const m of svg.matchAll(RECT)) {
    const [, xs, ys, ws, hs, rs] = m;
    if (rs === undefined) continue; // the black background rect
    const width = Number(ws);
    const height = Number(hs);
    // y in the source points down. Flip it once, here, so that every other
    // module in the project can assume y up.
    bars.push({ x: Number(xs), y: SOURCE_HEIGHT - Number(ys) - height, width, height });
  }

  if (bars.length !== BAR_COUNT) {
    throw new Error(
      `expected ${BAR_COUNT} bars in the Spotify code, found ${bars.length}. The endpoint's format has changed.`,
    );
  }

  bars.sort((a, b) => a.x - b.x);
  assertUniformPitch(bars);
  assertSymmetric(bars);

  const markMatch = svg.match(
    /<g\s+transform="translate\(([-\d.]+),\s*([-\d.]+)\)"\s*>\s*<path[^>]*\sd="([^"]+)"/,
  );

  const minX = bars[0].x;
  const maxX = bars[bars.length - 1].x + bars[bars.length - 1].width;
  const minY = Math.min(...bars.map((b) => b.y));
  const maxY = Math.max(...bars.map((b) => b.y + b.height));

  return {
    bars,
    barsBox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    mark: markMatch
      ? {
          path: markMatch[3],
          x: Number(markMatch[1]),
          y: Number(markMatch[2]),
          // The mark is a circle of this diameter in source units in every
          // response the endpoint has produced. It is asserted rather than
          // measured from the path, because the path is a filled glyph whose
          // bounding box is the circle only by construction.
          size: 62.4,
        }
      : null,
    source: "svg",
  };
}

function assertUniformPitch(bars: Bar[]): void {
  const pitches: number[] = [];
  for (let i = 1; i < bars.length; i++) pitches.push(bars[i].x - bars[i - 1].x);
  const first = pitches[0];
  const drift = Math.max(...pitches.map((p) => Math.abs(p - first)));
  // The endpoint emits the pitch to two decimals, so neighbouring gaps differ
  // by at most a rounding step. Anything larger means the layout changed.
  if (drift > 0.05) {
    throw new Error(
      `the bars are no longer evenly spaced (pitch drifts by ${drift.toFixed(3)} units). The endpoint's format has changed.`,
    );
  }
}

function assertSymmetric(bars: Bar[]): void {
  const worst = Math.max(
    ...bars.map((b) => Math.abs(b.y + b.height / 2 - SOURCE_HEIGHT / 2)),
  );
  if (worst > 0.05) {
    throw new Error(
      `the bars are no longer centred on the code's midline (off by ${worst.toFixed(3)} units). The endpoint's format has changed.`,
    );
  }
}

/**
 * A Spotify Code encodes each bar as one of eight discrete heights, evenly
 * stepped. This returns them as levels 1 to 8, which is the cheapest integrity
 * check a caller can run on a parse: a code whose levels fall outside that
 * range was not read correctly. The step is derived from the data rather than
 * hard coded, so a future canvas size does not silently break the check.
 */
export function heightLevels(scannable: Scannable): number[] {
  const heights = scannable.bars.map((b) => b.height);
  const min = Math.min(...heights);
  const distinct = [...new Set(heights.map((h) => Number((h - min).toFixed(4))))].sort(
    (a, b) => a - b,
  );
  const step = distinct.find((d) => d > 0);
  if (step === undefined) return heights.map(() => 1);
  return heights.map((h) => Math.round((h - min) / step) + 1);
}
