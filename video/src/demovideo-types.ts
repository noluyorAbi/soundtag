/**
 * Contract for the GENERATED demovideo.content.ts (written by
 * ~/.claude/skills/demo-video/assemble.js, never by hand).
 *
 * Installed into video/src/ next to launch's content-types.ts. Deliberately a
 * separate file: rewriting the generated content can never break the types it
 * is checked against, same principle launch uses.
 */

import type { TermLine } from "./content-types";

/** One narrated word, in frames absolute within its scene. */
export type CaptionWord = { w: string; startFrame: number; endFrame: number };

export type DemoScene = {
  id: string;
  kind: "title" | "browser" | "cli" | "still";
  /** Absolute frame the scene starts at within the Vertical composition. */
  startFrame: number;
  durationFrames: number;
  /** staticFile() path like "audio/intro.wav", or null for a silent scene. */
  audio: string | null;
  /** Word timestamps from mlx_whisper, aligned to exactly that WAV. */
  words: CaptionWord[];

  /* title */
  headline?: string;
  sub?: string;
  /* browser: staticFile() path like "footage/flow.webm" */
  footage?: string;
  /* still: staticFile() path like "footage/close.png" */
  image?: string;
  /* cli: the typed command, and its real output through fromAnsi() */
  cmd?: string;
  term?: TermLine[];
};

export type DemoVideoContent = {
  fps: number;
  width: number;
  height: number;
  title: string;
  totalFrames: number;
  scenes: DemoScene[];
};
