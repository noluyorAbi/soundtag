/**
 * Reads a Spotify Code and hands back the parsed bars.
 *
 * The browser composes every preview from this one response, so moving a
 * slider costs nothing. The upstream is undocumented and unowned, so the
 * response is cached hard at the edge and the failure text is written for a
 * person rather than for a log.
 */

import { NextResponse } from "next/server";

import { fetchScannable, parseRef, parseScannable } from "@/lib/scannable";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const link = new URL(request.url).searchParams.get("link");
  if (!link) {
    return NextResponse.json({ error: "no link. Paste a Spotify share link." }, { status: 400 });
  }

  try {
    const ref = parseRef(link);
    const svg = await fetchScannable(ref);
    const scannable = parseScannable(svg);
    return NextResponse.json(
      { uri: ref.uri, scannable },
      {
        headers: {
          // A code for a track does not change. A day at the edge and a week of
          // stale-while-revalidate keeps the load on Spotify's endpoint low.
          "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "could not read that code";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
