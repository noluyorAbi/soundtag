/**
 * The five shapes, drawn rather than described.
 *
 * Each one is composed from the same embedded code the hero uses, so what is
 * on this strip is what the exporter produces, at the proportions it produces
 * it. The sizes underneath are read off the geometry, which is why they cannot
 * drift away from the shapes above them.
 */

"use client";

import { motion, useReducedMotion } from "motion/react";

import { DEMO_SCANNABLE } from "@/lib/demo";
import { SHAPES, type ShapeName } from "@/lib/layouts";
import { composeTag } from "@/lib/tag";
import { TagDrawing } from "./TagDrawing";

const TITLES: Record<ShapeName, string> = {
  bar: "Sweater Weather",
  coin: "",
  card: "Sweater Weather",
  ornament: "Sweater Weather",
  magnet: "",
};

export function ShapeStrip() {
  const reduced = useReducedMotion();

  return (
    <div className="strip">
      {SHAPES.map((shape, i) => {
        const geometry = composeTag(DEMO_SCANNABLE, {
          shape,
          title: TITLES[shape] || undefined,
        });
        const { width, height } = geometry.layout.size;

        return (
          <motion.figure
            key={shape}
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.4, once: true }}
            transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <TagDrawing
              geometry={geometry}
              bodyColour="#16181d"
              codeColour="#eef1f4"
              showDimensions={false}
            />
            <figcaption>
              <span className="label">{shape}</span>
              <span className="num">
                {round(width)} by {round(height)} by {round(geometry.thickness)} mm
              </span>
              <span>{geometry.layout.about}</span>
            </figcaption>
          </motion.figure>
        );
      })}
    </div>
  );
}

function round(n: number): string {
  return Number(n.toFixed(1)).toString();
}
