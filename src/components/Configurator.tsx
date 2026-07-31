/**
 * The whole product, on one screen.
 *
 * The code image is fetched once per link and composed in the browser after
 * that, so moving a slider costs no network and no server time. The download
 * buttons hand the same parameters to the route handler, which rebuilds the
 * tag from the same functions, so what was on screen is what lands in the
 * slicer.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { FILAMENTS, changePlan, pairing } from "@/lib/filament";
import { SHAPES, layout, type ShapeName } from "@/lib/layouts";
import { parseRef, type Scannable } from "@/lib/scannable";
import { composeTag, type TagOptions } from "@/lib/tag";
import { PixelText } from "./PixelText";
import { TagDrawing } from "./TagDrawing";

const SUGGESTION = "https://open.spotify.com/track/2QjOHCTQ1Jl3zawyYOpxh6";

type Settings = {
  shape: ShapeName;
  widthMm: number;
  thicknessMm: number;
  reliefMm: number;
  layerHeightMm: number;
  mark: boolean;
  title: string;
  artist: string;
  body: string;
  code: string;
};

const START: Settings = {
  shape: "bar",
  widthMm: 75.6,
  thicknessMm: 3,
  reliefMm: 0.6,
  layerHeightMm: 0.2,
  mark: false,
  title: "",
  artist: "",
  body: "#000000",
  code: "#ffffff",
};

export function Configurator() {
  const [link, setLink] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannable, setScannable] = useState<Scannable | null>(null);
  const [settings, setSettings] = useState<Settings>(START);

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  const load = useCallback(async (raw: string, shared?: URLSearchParams) => {
    setError(null);
    setPending(true);
    try {
      const ref = parseRef(raw);
      const response = await fetch(`/api/code?link=${encodeURIComponent(ref.uri)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "could not read that code");
      setScannable(payload.scannable as Scannable);
      if (shared) {
        setLink(raw);
        setSettings((current) => fromParams(shared, current));
      }
    } catch (cause) {
      setScannable(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  }, []);

  // A shared link carries the whole configuration in its query, and the page
  // itself is static, so the query is read here rather than on the server. The
  // settings are applied by `load` once the code comes back, which keeps this
  // effect free of synchronous state updates.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("link");
    if (shared) void load(shared, params);
  }, [load]);

  const options: TagOptions = useMemo(
    () => ({
      shape: settings.shape,
      widthMm: settings.widthMm,
      thicknessMm: settings.thicknessMm,
      reliefMm: settings.reliefMm,
      layerHeightMm: settings.layerHeightMm,
      mark: settings.mark,
      title: settings.title || undefined,
      artist: settings.artist || undefined,
    }),
    [settings],
  );

  const composed = useMemo(() => {
    if (!scannable) return null;
    try {
      return { geometry: composeTag(scannable, options), failure: null as string | null };
    } catch (cause) {
      return { geometry: null, failure: cause instanceof Error ? cause.message : String(cause) };
    }
  }, [scannable, options]);

  const shapeDefaults = layout(settings.shape);
  const pair = pairing(settings.body, settings.code);
  const geometry = composed?.geometry ?? null;
  const change = geometry ? changePlan(geometry.changeZ, settings.layerHeightMm) : null;
  const grams = geometry
    ? ((areaOf(geometry) / 1000) * 1.24).toFixed(1)
    : null;

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (link) params.set("link", link.trim());
    params.set("shape", settings.shape);
    params.set("width", String(settings.widthMm));
    params.set("thickness", String(settings.thicknessMm));
    params.set("relief", String(settings.reliefMm));
    params.set("layer", String(settings.layerHeightMm));
    if (settings.mark) params.set("mark", "1");
    if (settings.title) params.set("title", settings.title);
    if (settings.artist) params.set("artist", settings.artist);
    params.set("body", settings.body);
    params.set("code", settings.code);
    return params.toString();
  }, [link, settings]);

  return (
    <>
      <div className="hero">
        <div>
          <PixelText size={3} className="eyebrow">
            paste a song
          </PixelText>
          <h1>Your song, as a thing you can hold.</h1>
          <p className="lede">
            Paste a Spotify link. Get a 3MF with the filament change already assigned, an STL, and an
            SVG for a laser cutter. Nothing is uploaded, nothing is stored, and there is no account.
          </p>

          <form
            className="link-form"
            onSubmit={(event) => {
              event.preventDefault();
              void load(link);
            }}
          >
            <input
              type="text"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://open.spotify.com/track/..."
              aria-label="Spotify link"
              spellCheck={false}
            />
            <button type="submit" disabled={pending || link.trim().length === 0}>
              {pending ? "Reading" : "Read the code"}
            </button>
          </form>

          {!scannable && !error ? (
            <p style={{ fontSize: "0.9rem" }}>
              No link handy?{" "}
              <button
                type="button"
                className="quiet"
                style={{ padding: "0.15rem 0.4rem", fontSize: "0.85rem" }}
                onClick={() => {
                  setLink(SUGGESTION);
                  void load(SUGGESTION);
                }}
              >
                Use an example
              </button>
            </p>
          ) : null}

          {error ? <p className="error">{error}</p> : null}
          {composed?.failure ? <p className="error">{composed.failure}</p> : null}
        </div>

        <div className="sheet stage">
          {geometry ? (
            <TagDrawing
              geometry={geometry}
              bodyColour={settings.body}
              codeColour={settings.code}
              changeZ={geometry.changeZ}
              thickness={geometry.thickness}
            />
          ) : (
            <p style={{ color: "var(--ink-soft)", margin: 0 }}>
              The drawing appears here, at the size it will print.
            </p>
          )}

          {geometry ? (
            <div className="readout">
              <span>
                <b>{round(geometry.layout.size.width)}</b> by{" "}
                <b>{round(geometry.layout.size.height)}</b> by <b>{round(geometry.thickness)}</b> mm
              </span>
              <span>
                code <b>{round(geometry.code2d.width)}</b> mm wide
              </span>
              <span>
                change at layer <b>{change?.layer}</b>
              </span>
              <span>
                about <b>{grams}</b> g PLA
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="sheet">
        <div className="controls">
          <label className="field">
            <span>Shape</span>
            <div className="chips">
              {SHAPES.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="chip"
                  aria-pressed={settings.shape === name}
                  onClick={() => {
                    const next = layout(name);
                    setSettings((current) => ({
                      ...current,
                      shape: name,
                      widthMm: next.size.width,
                      thicknessMm: next.thickness,
                    }));
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <span style={{ textTransform: "none", letterSpacing: 0 }}>{shapeDefaults.about}</span>
          </label>

          <label className="field">
            <span>
              Size <span className="num">{round(settings.widthMm)} mm</span>
            </span>
            <input
              type="range"
              min={30}
              max={140}
              step={0.2}
              value={settings.widthMm}
              onChange={(event) => set("widthMm", Number(event.target.value))}
            />
            <span style={{ textTransform: "none", letterSpacing: 0 }}>
              Wider bars survive a 0.4 mm nozzle better. The drawing turns red when they will not.
            </span>
          </label>

          <label className="field">
            <span>
              Thickness <span className="num">{round(settings.thicknessMm)} mm</span>, relief{" "}
              <span className="num">{round(settings.reliefMm)} mm</span>
            </span>
            <input
              type="range"
              min={1.6}
              max={6}
              step={0.2}
              value={settings.thicknessMm}
              onChange={(event) => set("thicknessMm", Number(event.target.value))}
            />
            <input
              type="range"
              min={0.2}
              max={1.4}
              step={0.2}
              value={settings.reliefMm}
              onChange={(event) => set("reliefMm", Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span>Layer height</span>
            <select
              value={settings.layerHeightMm}
              onChange={(event) => set("layerHeightMm", Number(event.target.value))}
            >
              {[0.08, 0.12, 0.16, 0.2, 0.24, 0.28].map((h) => (
                <option key={h} value={h}>
                  {h.toFixed(2)} mm
                </option>
              ))}
            </select>
            <span style={{ textTransform: "none", letterSpacing: 0 }}>
              {change ? change.instruction : "Read a code first."}
            </span>
          </label>

          <div className="field">
            <span>Filament</span>
            <div className="swatches">
              {FILAMENTS.map((filament) => (
                <button
                  key={`body-${filament.hex}`}
                  type="button"
                  className="swatch"
                  style={{ background: filament.hex }}
                  aria-pressed={settings.body === filament.hex}
                  aria-label={`Body ${filament.name}`}
                  title={`Body: ${filament.name}`}
                  onClick={() => set("body", filament.hex)}
                />
              ))}
            </div>
            <div className="swatches">
              {FILAMENTS.map((filament) => (
                <button
                  key={`code-${filament.hex}`}
                  type="button"
                  className="swatch"
                  style={{ background: filament.hex }}
                  aria-pressed={settings.code === filament.hex}
                  aria-label={`Code ${filament.name}`}
                  title={`Code: ${filament.name}`}
                  onClick={() => set("code", filament.hex)}
                />
              ))}
            </div>
            <span className="verdict" data-verdict={pair.verdict}>
              contrast {pair.ratio.toFixed(1)} to 1, {pair.verdict}
              {pair.verdict === "poor" ? ". A camera will not separate the bars from the plate." : ""}
            </span>
          </div>

          <label className="field">
            <span>Text</span>
            <input
              type="text"
              value={settings.title}
              onChange={(event) => set("title", event.target.value)}
              placeholder="Song title"
              maxLength={48}
            />
            <input
              type="text"
              value={settings.artist}
              onChange={(event) => set("artist", event.target.value)}
              placeholder="Artist"
              maxLength={48}
            />
          </label>

          <label className="field">
            <span>Spotify mark</span>
            <div className="chips">
              <button
                type="button"
                className="chip"
                aria-pressed={!settings.mark}
                onClick={() => set("mark", false)}
              >
                bars only
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={settings.mark}
                onClick={() => set("mark", true)}
              >
                include the mark
              </button>
            </div>
            <span style={{ textTransform: "none", letterSpacing: 0 }}>
              Off by default. Spotify&apos;s guidelines forbid adding depth to the logo, and the bars
              are what a scanner reads.
            </span>
          </label>
        </div>

        <div className="downloads">
          <button type="button" disabled={!geometry} onClick={() => download("3mf", query)}>
            Download 3MF
          </button>
          <button type="button" className="quiet" disabled={!geometry} onClick={() => download("stl", query)}>
            STL
          </button>
          <button type="button" className="quiet" disabled={!geometry} onClick={() => download("svg", query)}>
            Laser SVG
          </button>
          <button
            type="button"
            className="quiet"
            disabled={!geometry}
            onClick={() => {
              void navigator.clipboard.writeText(`${window.location.origin}/?${query}`);
            }}
          >
            Copy a link to this tag
          </button>
        </div>

        {geometry && geometry.notes.length > 0 ? (
          <ul className="notes">
            {geometry.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
}

/** A shared link's query, applied on top of whatever is already set. */
function fromParams(params: URLSearchParams, current: Settings): Settings {
  const shape = (SHAPES as string[]).includes(params.get("shape") ?? "")
    ? (params.get("shape") as ShapeName)
    : current.shape;
  // A shared link that names a shape but no size means the shape's own size,
  // not whatever the previous shape happened to be.
  const preset = layout(shape);

  return {
    ...current,
    shape,
    widthMm: numberOr(params.get("width"), preset.size.width),
    thicknessMm: numberOr(params.get("thickness"), preset.thickness),
    reliefMm: numberOr(params.get("relief"), current.reliefMm),
    layerHeightMm: numberOr(params.get("layer"), current.layerHeightMm),
    mark: params.get("mark") === "1",
    title: params.get("title") ?? current.title,
    artist: params.get("artist") ?? current.artist,
    body: colourOr(params.get("body"), current.body),
    code: colourOr(params.get("code"), current.code),
  };
}

function numberOr(raw: string | null, fallback: number): number {
  const value = Number(raw);
  return raw !== null && Number.isFinite(value) ? value : fallback;
}

function colourOr(raw: string | null, fallback: string): string {
  return raw && /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
}

function download(format: string, query: string): void {
  window.location.href = `/api/tag?format=${format}&${query}`;
}

function areaOf(geometry: ReturnType<typeof composeTag>): number {
  // Volume without building the mesh: plate area times the body height, plus
  // the artwork area times the relief.
  const plate = ringArea(geometry.plate.outer) - geometry.plate.holes.reduce((s, h) => s + ringArea(h), 0);
  const art = [...geometry.code, ...geometry.frontText].reduce(
    (sum, poly) => sum + ringArea(poly.outer) - poly.holes.reduce((s, h) => s + ringArea(h), 0),
    0,
  );
  return plate * geometry.changeZ + art * geometry.relief;
}

function ringArea(ring: readonly (readonly [number, number])[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function round(n: number): string {
  return Number(n.toFixed(1)).toString();
}
