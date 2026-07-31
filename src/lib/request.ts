/**
 * One request contract, shared by the route handlers, the CLI, the share link
 * and the preview.
 *
 * Every value is clamped rather than rejected. A share link that someone
 * hand edited into `width=9999` should produce the widest tag the shape allows
 * and say so, not a 400 page. The one exception is the link itself: without a
 * usable Spotify reference there is nothing to build, and guessing would be
 * worse than an error.
 */

import { SHAPES, type ShapeName } from "./layouts";
import { parseRef, type SpotifyRef } from "./scannable";
import type { TagOptions } from "./tag";

export type TagRequest = {
  ref: SpotifyRef;
  options: TagOptions;
  /** Filament colours, only used for previews and the contrast check. */
  colours: { body: string; code: string };
};

export const LIMITS = {
  widthMm: { min: 30, max: 200 },
  thicknessMm: { min: 1.2, max: 8 },
  reliefMm: { min: 0.2, max: 2 },
  holeDiameterMm: { min: 2, max: 8 },
  layerHeightMm: { min: 0.06, max: 0.32 },
  textLength: 48,
} as const;

export function clamp(value: number, range: { min: number; max: number }): number {
  return Math.min(range.max, Math.max(range.min, value));
}

function number(params: URLSearchParams, key: string, range: { min: number; max: number }): number | undefined {
  const raw = params.get(key);
  if (raw === null) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return clamp(parsed, range);
}

function text(params: URLSearchParams, key: string): string | undefined {
  const raw = params.get(key);
  if (raw === null) return undefined;
  return raw.slice(0, LIMITS.textLength);
}

export function parseRequest(params: URLSearchParams): TagRequest {
  const link = params.get("link") ?? params.get("uri") ?? params.get("track");
  if (!link) throw new Error("no link. Paste a Spotify share link.");

  const shapeRaw = params.get("shape");
  const shape: ShapeName | undefined =
    shapeRaw && (SHAPES as string[]).includes(shapeRaw) ? (shapeRaw as ShapeName) : undefined;

  return {
    ref: parseRef(link),
    options: {
      shape,
      widthMm: number(params, "width", LIMITS.widthMm),
      thicknessMm: number(params, "thickness", LIMITS.thicknessMm),
      reliefMm: number(params, "relief", LIMITS.reliefMm),
      holeDiameterMm: number(params, "hole", LIMITS.holeDiameterMm),
      layerHeightMm: number(params, "layer", LIMITS.layerHeightMm),
      mark: params.get("mark") === "1" || params.get("mark") === "true",
      title: text(params, "title"),
      artist: text(params, "artist"),
    },
    colours: {
      body: colour(params.get("body"), "#101012"),
      code: colour(params.get("code"), "#f6f6f4"),
    },
  };
}

/** The inverse, so a configured tag can be shared as a link. */
export function toSearchParams(request: TagRequest): URLSearchParams {
  const params = new URLSearchParams();
  params.set("link", request.ref.uri);
  const o = request.options;
  if (o.shape) params.set("shape", o.shape);
  if (o.widthMm !== undefined) params.set("width", trim(o.widthMm));
  if (o.thicknessMm !== undefined) params.set("thickness", trim(o.thicknessMm));
  if (o.reliefMm !== undefined) params.set("relief", trim(o.reliefMm));
  if (o.holeDiameterMm !== undefined) params.set("hole", trim(o.holeDiameterMm));
  if (o.layerHeightMm !== undefined) params.set("layer", trim(o.layerHeightMm));
  if (o.mark) params.set("mark", "1");
  if (o.title) params.set("title", o.title);
  if (o.artist) params.set("artist", o.artist);
  params.set("body", request.colours.body);
  params.set("code", request.colours.code);
  return params;
}

function colour(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  const value = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback;
}

function trim(n: number): string {
  return Number(n.toFixed(3)).toString();
}
