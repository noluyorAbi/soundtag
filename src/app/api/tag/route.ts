/**
 * Builds the file.
 *
 * The same request contract the CLI and the share link use, so a link that
 * produced a drawing on screen produces the identical bytes here. Nothing is
 * written down: the request goes in, a file comes out.
 */

import { binaryStl } from "@/lib/export/stl";
import { laserSvg } from "@/lib/export/svg";
import { BEDS, singleTagPlacement, threeMf } from "@/lib/export/threemf";
import { parseRequest } from "@/lib/request";
import { fetchScannable, parseScannable } from "@/lib/scannable";
import { buildTag } from "@/lib/tag";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  "3mf": "model/3mf",
  stl: "model/stl",
  svg: "image/svg+xml",
};

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const format = (params.get("format") ?? "3mf").toLowerCase();
  if (!(format in TYPES)) {
    return new Response(`unknown format "${format}". Try 3mf, stl or svg.`, { status: 400 });
  }

  try {
    const parsed = parseRequest(params);
    const scannable = parseScannable(await fetchScannable(parsed.ref));
    const tag = buildTag(scannable, parsed.options);
    const name = `${(parsed.options.title || parsed.ref.id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.${format}`;

    const bed = BEDS[params.get("bed") ?? "bambu-a1"] ?? BEDS["bambu-a1"];
    const body =
      format === "3mf"
        ? threeMf([singleTagPlacement(tag, bed, parsed.options.title || parsed.ref.id)], { bed })
        : format === "stl"
          ? binaryStl(tag.parts.map((p) => p.mesh))
          : laserSvg(tag.geometry);

    return new Response(body as BodyInit, {
      headers: {
        "content-type": TYPES[format],
        "content-disposition": `attachment; filename="${name}"`,
        "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (cause) {
    return new Response(cause instanceof Error ? cause.message : "could not build that tag", {
      status: 400,
    });
  }
}
