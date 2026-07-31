/**
 * The preview, drawn as a working drawing rather than a product shot.
 *
 * The tag is rendered from the same geometry the mesh is built from, and the
 * dimension lines around it are the ones a person needs before they print: the
 * two outside measurements, the code's own width, and the height the filament
 * changes at. A render that looked better than the object would be lying, and
 * a render with no numbers on it would be decoration.
 *
 * The two layers can be driven by scroll: the parent hands in motion values,
 * and the code and the dimensions come in separately, which is the whole point
 * of the section that does it.
 */

"use client";

import { motion, type MotionValue } from "motion/react";

import type { Polygon } from "@/lib/geom/polygon";
import type { TagGeometry } from "@/lib/tag";

const PAD_X = 15;
const PAD_TOP = 12;
const PAD_BOTTOM = 15;

export function TagDrawing({
  geometry,
  bodyColour,
  codeColour,
  codeOpacity,
  dimsOpacity,
  showDimensions = true,
}: {
  geometry: TagGeometry;
  bodyColour: string;
  codeColour: string;
  codeOpacity?: MotionValue<number>;
  dimsOpacity?: MotionValue<number>;
  showDimensions?: boolean;
}) {
  const { width, height } = geometry.layout.size;
  const view = { w: width + PAD_X * 2, h: height + PAD_TOP + PAD_BOTTOM };
  const flip = (p: Polygon) => path(p, height);
  const artwork = [...geometry.code, ...geometry.frontText];

  return (
    <svg
      className="drawing"
      viewBox={`0 0 ${round(view.w)} ${round(view.h)}`}
      role="img"
      aria-label={`${round(width)} by ${round(height)} millimetre tag, code raised ${round(geometry.relief)} millimetres above the plate`}
    >
      <g transform={`translate(${PAD_X} ${PAD_TOP})`}>
        {/* A hairline around the plate, so a black filament on a dark panel is
            still an object with an edge rather than a hole in the page. */}
        <path
          d={flip(geometry.plate)}
          fill={bodyColour}
          fillRule="evenodd"
          stroke="var(--edge)"
          strokeWidth="0.25"
        />
        <motion.g fill={codeColour} style={codeOpacity ? { opacity: codeOpacity } : undefined}>
          {artwork.map((poly, i) => (
            <path key={i} d={flip(poly)} />
          ))}
        </motion.g>
      </g>

      {showDimensions ? (
        <motion.g
          strokeWidth="0.3"
          fill="none"
          strokeLinecap="square"
          style={dimsOpacity ? { opacity: dimsOpacity } : undefined}
        >
          <Dimension
            from={[PAD_X, PAD_TOP + height + 7]}
            to={[PAD_X + width, PAD_TOP + height + 7]}
            label={`${round(width)} mm`}
          />
          <Dimension
            from={[PAD_X - 7.5, PAD_TOP + height]}
            to={[PAD_X - 7.5, PAD_TOP]}
            vertical
            label={`${round(height)} mm`}
          />
          <Dimension
            from={[PAD_X + geometry.code2d.x, PAD_TOP - 5.5]}
            to={[PAD_X + geometry.code2d.x + geometry.code2d.width, PAD_TOP - 5.5]}
            label={`code ${round(geometry.code2d.width)} mm`}
            accent
          />
          <text
            x={PAD_X + width}
            y={PAD_TOP + height + 13}
            textAnchor="end"
            fontSize="3.2"
            fill="var(--dim)"
            stroke="none"
          >
            {`${round(geometry.thickness)} mm thick, one filament change at z ${round(geometry.changeZ)}`}
          </text>
        </motion.g>
      ) : null}
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
  const stroke = accent ? "var(--accent)" : "var(--edge)";
  const tick = 1.5;
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
        x={vertical ? mid[0] - 2.2 : mid[0]}
        y={vertical ? mid[1] : mid[1] - 1.8}
        textAnchor="middle"
        fontSize="3.2"
        fill={accent ? "var(--accent)" : "var(--dim)"}
        stroke="none"
        transform={vertical ? `rotate(-90 ${mid[0] - 2.2} ${mid[1]})` : undefined}
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
