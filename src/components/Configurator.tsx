/**
 * The whole product, on one screen.
 *
 * It opens on a real tag rather than an empty box: the example code is
 * embedded, so the first paint is the object itself and nothing has been
 * fetched yet. Pasting a link replaces it. After that the code image is
 * fetched once and every preview is composed in the browser, so moving a
 * slider costs no network and no server time.
 *
 * The download buttons hand the same parameters to the route handler, which
 * rebuilds the tag from the same functions, so what was on screen is what
 * lands in the slicer.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { DEMO_SCANNABLE, DEMO_TRACK } from "@/lib/demo";
import { FILAMENTS, changePlan, pairing } from "@/lib/filament";
import { BEDS } from "@/lib/export/threemf";
import { SHAPES, layout, type ShapeName } from "@/lib/layouts";
import { parseRef, parseScannable, type Scannable } from "@/lib/scannable";
import { buildTag, composeTag, type TagOptions } from "@/lib/tag";
import { LiveTag } from "./LiveTag";
import { TagDrawing } from "./TagDrawing";

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

export function Configurator({ intro }: { intro?: React.ReactNode }) {
  const reduced = useReducedMotion();
  const [link, setLink] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannable, setScannable] = useState<Scannable>(DEMO_SCANNABLE);
  const [isDemo, setIsDemo] = useState(true);
  const [settings, setSettings] = useState<Settings>(START);
  const [view, setView] = useState<"live" | "drawing">("live");
  const [bed, setBed] = useState("bambu-a1");
  const [pasted, setPasted] = useState("");

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
      setIsDemo(false);
      if (shared) {
        setLink(raw);
        setSettings((current) => fromParams(shared, current));
      }
    } catch (cause) {
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
    try {
      return { geometry: composeTag(scannable, options), failure: null as string | null };
    } catch (cause) {
      return { geometry: null, failure: cause instanceof Error ? cause.message : String(cause) };
    }
  }, [scannable, options]);

  const geometry = composed.geometry;

  // The mesh is only built for the live view, and only when the settings that
  // change it change. A slider drag would otherwise rebuild a few thousand
  // triangles on every frame.
  const tag = useMemo(() => {
    if (view !== "live") return null;
    try {
      return buildTag(scannable, options);
    } catch {
      return null;
    }
  }, [view, scannable, options]);
  const preset = layout(settings.shape);
  const pair = pairing(settings.body, settings.code);
  const change = geometry ? changePlan(geometry.changeZ, settings.layerHeightMm) : null;
  const grams = geometry ? ((volumeOf(geometry) / 1000) * 1.24).toFixed(1) : null;

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("link", (link || DEMO_TRACK.link).trim());
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
    params.set("bed", bed);
    return params.toString();
  }, [link, settings, bed]);

  return (
    <>
      <div className="hero-grid">
        <div className="hero-copy">
          {intro}
          <form
            className="form-row"
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

          <p className="hint" style={{ marginTop: "0.9rem" }}>
            {isDemo
              ? `Showing ${DEMO_TRACK.title} by ${DEMO_TRACK.artist}. Paste a link to replace it.`
              : "Your code is loaded. Everything below updates in the browser."}
          </p>

          {error ? <p className="error">{error}</p> : null}
          {composed.failure ? <p className="error">{composed.failure}</p> : null}

          <details className="offline">
            <summary>No connection, or Spotify said no</summary>
            <p className="hint">
              Paste the SVG of a Spotify Code and it is read here, in the browser. Nothing is
              requested and nothing leaves the machine. The same file works with{" "}
              <code>soundtag --from-svg</code>.
            </p>
            <textarea
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              placeholder="<svg ...> ... </svg>"
              spellCheck={false}
              rows={3}
            />
            <button
              type="button"
              className="ghost"
              disabled={pasted.trim().length === 0}
              onClick={() => {
                try {
                  setScannable(parseScannable(pasted));
                  setIsDemo(false);
                  setError(null);
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : String(cause));
                }
              }}
            >
              Read the pasted code
            </button>
          </details>
        </div>

        <motion.div
          className="panel stage field"
          initial={reduced ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
        >
          <div className="view-switch">
            <button
              type="button"
              className="chip"
              aria-pressed={view === "live"}
              onClick={() => setView("live")}
            >
              3D
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={view === "drawing"}
              onClick={() => setView("drawing")}
            >
              drawing
            </button>
          </div>

          <div className="panel-pad">
            {view === "live" && tag ? (
              <LiveTag
                tag={tag}
                bodyColour={settings.body}
                codeColour={settings.code}
                spin={!reduced}
              />
            ) : geometry ? (
              <TagDrawing
                geometry={geometry}
                bodyColour={settings.body}
                codeColour={settings.code}
              />
            ) : null}
          </div>
          {view === "live" ? <span className="stage-hint">drag to turn it</span> : null}
          {geometry ? (
            <div className="readout">
              <span>
                <span className="num">{round(geometry.layout.size.width)}</span> by{" "}
                <span className="num">{round(geometry.layout.size.height)}</span> by{" "}
                <span className="num">{round(geometry.thickness)}</span> mm
              </span>
              <span>
                code <span className="num">{round(geometry.code2d.width)}</span> mm
              </span>
              <span>
                change at layer <span className="num">{change?.layer}</span>
              </span>
              <span>
                <span className="num">{grams}</span> g PLA
              </span>
            </div>
          ) : null}
        </motion.div>
      </div>

      <div className="panel" style={{ marginTop: "clamp(1.5rem, 4vw, 2.5rem)" }}>
        <div className="controls panel-pad">
          <div className="field-group">
            <span className="label">Shape</span>
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
            <span className="hint">{preset.about}</span>
          </div>

          <label className="field-group">
            <span className="label">
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
            <span className="hint">
              Wider bars survive a 0.4 mm nozzle better. Below about 0.85 mm the drawing says so.
            </span>
          </label>

          <label className="field-group">
            <span className="label">
              Thickness <span className="num">{round(settings.thicknessMm)}</span> mm, relief{" "}
              <span className="num">{round(settings.reliefMm)}</span> mm
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

          <label className="field-group">
            <span className="label">Printer bed</span>
            <select value={bed} onChange={(event) => setBed(event.target.value)}>
              {Object.entries(BEDS).map(([id, plate]) => (
                <option key={id} value={id}>
                  {plate.name}, {plate.width} by {plate.depth} mm
                </option>
              ))}
            </select>
            <span className="hint">
              Decides where the tag is placed on the plate, so it opens centred rather than in a
              corner.
            </span>
          </label>

          <label className="field-group">
            <span className="label">Layer height</span>
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
            <span className="hint">{change?.instruction}</span>
          </label>

          <div className="field-group">
            <span className="label">Filament, body then code</span>
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
              contrast <span className="num">{pair.ratio.toFixed(1)}</span> to 1, {pair.verdict}
              {pair.verdict === "poor"
                ? ". A camera will not separate the bars from the plate."
                : ""}
            </span>
          </div>

          <div className="field-group">
            <span className="label">Text</span>
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
            <span className="hint">
              Raised, in the code&apos;s filament. The tag grows to fit it.
            </span>
          </div>

          <div className="field-group">
            <span className="label">Spotify mark</span>
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
            <span className="hint">
              Off by default. Spotify&apos;s guidelines forbid adding depth to the logo, and the
              bars are what a scanner reads.
            </span>
          </div>
        </div>

        <div className="downloads">
          <button type="button" disabled={!geometry} onClick={() => download("3mf", query)}>
            Download 3MF
          </button>
          <button
            type="button"
            className="ghost"
            disabled={!geometry}
            onClick={() => download("stl", query)}
          >
            STL
          </button>
          <button
            type="button"
            className="ghost"
            disabled={!geometry}
            onClick={() => download("svg", query)}
          >
            Laser SVG
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/?${query}`)}
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

/** Volume without building the mesh, so a slider stays instant. */
function volumeOf(geometry: ReturnType<typeof composeTag>): number {
  const plate =
    ringArea(geometry.plate.outer) - geometry.plate.holes.reduce((s, h) => s + ringArea(h), 0);
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
