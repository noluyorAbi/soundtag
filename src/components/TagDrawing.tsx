/**
 * The preview, drawn as a working drawing rather than a product shot.
 *
 * The tag is rendered from the same geometry the mesh is built from, and the
 * dimension lines around it are the ones a person actually needs before they
 * print: the two outside measurements, the code width, and the height at which
 * the filament changes. A render that looked nicer than the object would be
 * lying, and a render with no numbers on it would be decoration.
 */

"use client";

import type { TagGeometry } from "@/lib/tag";
import type { Polygon } from "@/lib/geom/polygon";

const PAD_X = 16;
const PAD_TOP = 13;
const PAD_BOTTOM = 15;

export function TagDrawing({
  geometry,
  bodyColour,
  codeColour,
  changeZ,
  thickness,
}: {
  geometry: TagGeometry;
  bodyColour: string;
  codeColour: string;
  changeZ: number;
  thickness: number;
}) {
  const { width, height } = geometry.layout.size;
  const view = {
    w: width + PAD_X * 2,
    h: height + PAD_TOP + PAD_BOTTOM,
  };
  const flip = (p: Polygon) => path(p, height);

  return (
    <svg
      className="drawing"
      viewBox={`0 0 ${round(view.w)} ${round(view.h)}`}
      role="img"
      aria-label={`${round(width)} by ${round(height)} millimetre tag with the Spotify code raised ${round(thickness - changeZ)} millimetres`}
    >
      <g transform={`translate(${PAD_X} ${PAD_TOP})`}>
        <path d={flip(geometry.plate)} fill={bodyColour} fillRule="evenodd" />
        <g fill={codeColour}>
          {[...geometry.code, ...geometry.frontText].map((poly, i) => (
            <path key={i} d={flip(poly)} />
          ))}
        </g>
      </g>

      <g
        stroke="var(--rule)"
        strokeWidth="0.35"
        fill="none"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="square"
      >
        {/* Width, measured under the object. */}
        <Dimension
          from={[PAD_X, PAD_TOP + height + 7]}
          to={[PAD_X + width, PAD_TOP + height + 7]}
          label={`${round(width)} mm`}
        />
        {/* Height, measured up the left edge. */}
        <Dimension
          from={[PAD_X - 8, PAD_TOP + height]}
          to={[PAD_X - 8, PAD_TOP]}
          vertical
          label={`${round(height)} mm`}
        />
        {/* The code's own width, which is what a scanner has to resolve. */}
        <Dimension
          from={[PAD_X + geometry.code2d.x, PAD_TOP - 6]}
          to={[PAD_X + geometry.code2d.x + geometry.code2d.width, PAD_TOP - 6]}
          label={`code ${round(geometry.code2d.width)} mm`}
          accent
        />
      </g>

      <text
        x={PAD_X + width}
        y={PAD_TOP + height + 13.5}
        textAnchor="end"
        fontSize="3.4"
        fill="var(--ink-soft)"
        fontFamily="var(--mono)"
      >
        {`${round(thickness)} mm thick, filament change at z ${round(changeZ)}`}
      </text>
    </svg>
  );
}

function Dimension({
  from,
  to,
  label,
  vertical = false,
  accent = false,
}: {
  from: [number, number];
  to: [number, number];
  label: string;
  vertical?: boolean;
  accent?: boolean;
}) {
  const stroke = accent ? "var(--accent)" : "var(--rule)";
  const tick = 1.6;
  const mid: [number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];

  return (
    <g stroke={stroke}>
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} />
      {vertical ? (
        <>
          <line x1={from[0] - tick} y1={from[1]} x2={from[0] + tick} y2={from[1]} />
          <line x1={to[0] - tick} y1={to[1]} x2={to[0] + tick} y2={to[1]} />
        </>
      ) : (
        <>
          <line x1={from[0]} y1={from[1] - tick} x2={from[0]} y2={from[1] + tick} />
          <line x1={to[0]} y1={to[1] - tick} x2={to[0]} y2={to[1] + tick} />
        </>
      )}
      <text
        x={vertical ? mid[0] - 2.5 : mid[0]}
        y={vertical ? mid[1] : mid[1] - 2}
        textAnchor="middle"
        fontSize="3.4"
        fill={accent ? "var(--accent)" : "var(--ink-soft)"}
        fontFamily="var(--mono)"
        stroke="none"
        transform={vertical ? `rotate(-90 ${mid[0] - 2.5} ${mid[1]})` : undefined}
      >
        {label}
      </text>
    </g>
  );
}

function path(poly: Polygon, height: number): string {
  return [poly.outer, ...poly.holes]
    .map(
      (ring) =>
        ring.map(([x, y], i) => `${i === 0 ? "M" : "L"}${round(x)} ${round(height - y)}`).join("") +
        "Z",
    )
    .join("");
}

function round(n: number): string {
  return Number(n.toFixed(2)).toString();
}
