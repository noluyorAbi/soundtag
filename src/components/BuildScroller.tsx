/**
 * The object assembling itself as you scroll.
 *
 * This is the one animated moment on the page, and it earns its place by
 * carrying the argument the product is built on: the plate is printed first,
 * the code arrives at one height, and the measurements follow. Scroll position
 * drives it directly, so it moves at the reader's pace and stops where they
 * stop.
 *
 * With reduced motion, every layer is simply present. There is nothing to
 * discover by scrolling that the text does not also say.
 */

"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";

import { DEMO_SCANNABLE, DEMO_TRACK } from "@/lib/demo";
import { composeTag } from "@/lib/tag";
import { TagDrawing } from "./TagDrawing";

const STEPS = [
  {
    title: "The plate prints first",
    body: "Everything below the change height is one solid: the outline, the keyring hole, the magnet seats when the shape has them. Nothing of the code exists down here.",
    meta: "z 0.00 to 2.40 mm, filament 1",
  },
  {
    title: "The code starts exactly at the change",
    body: "The bars are Spotify's own geometry, scaled uniformly and never redrawn. They begin at the height the plate stops at, so the printer swaps filament once and never again.",
    meta: "z 2.40 to 3.00 mm, filament 2",
  },
  {
    title: "Then the numbers you need",
    body: "Outside size, code width, thickness and the layer the change lands on. Every one of them comes from the geometry that was just built, not from a table someone typed.",
    meta: "layer 13 at a 0.2 mm layer height",
  },
];

export function BuildScroller() {
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const geometry = composeTag(DEMO_SCANNABLE, { shape: "bar" });

  const { scrollYProgress } = useScroll({
    target: track,
    offset: ["start 0.8", "end 0.6"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  const codeOpacity = useTransform(progress, [0.16, 0.42], [0, 1]);
  const dimsOpacity = useTransform(progress, [0.55, 0.78], [0, 1]);
  const plateShift = useTransform(progress, [0, 0.42], [10, 0]);

  return (
    <section className="build" id="how">
      <div className="shell">
        <div className="section-head">
          <span className="label">how it prints</span>
          <h2>One change, and the object is done.</h2>
          <p>
            Scroll, and the tag arrives the way the printer builds it. The example is{" "}
            {DEMO_TRACK.title} by {DEMO_TRACK.artist}, read from Spotify&apos;s own code image.
          </p>
        </div>

        <div className="build-track" ref={track}>
          <div className="build-steps">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                className="build-step"
                initial={reduced ? false : { opacity: 0.25, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.7, once: false }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="step-index">{String(i + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <span className="label">{step.meta}</span>
              </motion.div>
            ))}
          </div>

          <div className="build-sticky">
            <motion.div
              className="panel stage panel-pad field"
              style={reduced ? undefined : { y: plateShift }}
            >
              <TagDrawing
                geometry={geometry}
                bodyColour="#16181d"
                codeColour="#eef1f4"
                codeOpacity={reduced ? undefined : codeOpacity}
                dimsOpacity={reduced ? undefined : dimsOpacity}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
