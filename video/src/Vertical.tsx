/**
 * Vertical: the 1080x1920 narrated demo composition (/demo-video, stage 5).
 *
 * Everything it shows comes from the GENERATED demovideo.content.ts; this file
 * is layout only and is the same for every project, like launch's Demo.tsx.
 * It reuses the workspace's theme (accent, fonts) so the vertical video looks
 * like it came from the same shelf as the README assets.
 *
 * Not registered automatically: add the <Composition id="Vertical"> block to
 * Root.tsx (snippet in the demo-video SKILL.md).
 */

import type { FC } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

import { DEMO_VIDEO } from "./demovideo.content";
import type { CaptionWord, DemoScene } from "./demovideo-types";
import { accent, easing } from "./theme";
import "./font";

const BG = "#141413";
const FG = "#f5f4ef";
const DIM = "#8a877d";
const MONO = "'JetBrains Mono', 'SF Mono', Menlo, monospace";

/* ------------------------------------------------------------------ captions */

/**
 * Karaoke captions over static phrase chunks.
 *
 * The words are grouped ONCE into phrase chunks (split at speech pauses,
 * sentence punctuation, or a max length). While a chunk is on screen its text
 * never moves: every word is laid out from the start and only COLOR advances
 * with the voice (spoken = bright, active = accent, upcoming = dim). The only
 * motion is one opacity/translateY enter per chunk, ~200ms, strong ease-out.
 * A per-word sliding window reflows the whole centered line on every word,
 * which reads as jitter; that is exactly what this design avoids.
 */
type Chunk = { words: CaptionWord[]; from: number };

const CHUNK_MAX_WORDS = 6;
const CHUNK_GAP_FRAMES = 12; // a >0.4s pause starts a new phrase

const toChunks = (words: CaptionWord[]): Chunk[] => {
  const chunks: Chunk[] = [];
  let cur: CaptionWord[] = [];
  for (const w of words) {
    const prev = cur[cur.length - 1];
    const pause = prev && w.startFrame - prev.endFrame > CHUNK_GAP_FRAMES;
    const sentence = prev && /[.!?]$/.test(prev.w) && cur.length >= 2;
    if (cur.length && (cur.length >= CHUNK_MAX_WORDS || pause || sentence)) {
      chunks.push({ words: cur, from: cur[0].startFrame });
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) chunks.push({ words: cur, from: cur[0].startFrame });
  // The first chunk is visible from frame 0 so the scene never starts bare.
  if (chunks.length) chunks[0].from = 0;
  return chunks;
};

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const ENTER_FRAMES = 6; // 200ms at 30fps, transform + opacity only

const Captions: FC<{ words: CaptionWord[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  if (!words.length) return null;
  const chunks = toChunks(words);
  let idx = 0;
  for (let i = 0; i < chunks.length; i++) if (frame >= chunks[i].from) idx = i;
  const chunk = chunks[idx];
  const t = interpolate(frame - chunk.from, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        bottom: 260,
        textAlign: "center",
        fontFamily: MONO,
        fontSize: 54,
        lineHeight: 1.4,
        fontWeight: 700,
        color: DIM,
        textShadow: "0 2px 24px rgba(0,0,0,0.8)",
        opacity: t,
        transform: `translateY(${(1 - t) * 10}px)`,
      }}
    >
      {chunk.words.map((w, i) => (
        <span
          key={i}
          style={{
            color:
              frame >= w.startFrame ? (frame < w.endFrame ? accent : FG) : DIM,
            transition: "none",
          }}
        >
          {w.w}{" "}
        </span>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------- scenes */

const TitleScene: FC<{ scene: DemoScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(...easing.out),
  });
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", padding: 80 }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 120,
          fontWeight: 700,
          color: FG,
          opacity: t,
          transform: `translateY(${(1 - t) * 40}px)`,
          textAlign: "center",
        }}
      >
        {scene.headline}
        <span style={{ color: accent }}>_</span>
      </div>
      {scene.sub ? (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 44,
            color: DIM,
            marginTop: 40,
            opacity: t,
            textAlign: "center",
            maxWidth: 860,
          }}
        >
          {scene.sub}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Captured browser footage in a rounded device-like frame. */
const BrowserScene: FC<{ scene: DemoScene }> = ({ scene }) => (
  <AbsoluteFill
    style={{ justifyContent: "center", alignItems: "center", padding: 48 }}
  >
    <div
      style={{
        width: "100%",
        borderRadius: 28,
        overflow: "hidden",
        border: `2px solid ${DIM}44`,
        boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
      }}
    >
      <OffthreadVideo
        muted
        src={staticFile(scene.footage!)}
        style={{ width: "100%", display: "block" }}
      />
    </div>
  </AbsoluteFill>
);

/** Real terminal output, spans from fromAnsi(), revealed line by line. */
const CliScene: FC<{ scene: DemoScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const lines = scene.term ?? [];
  const shown = Math.min(lines.length, Math.floor(frame / 3) + 1);
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: 64 }}>
      <div
        style={{
          background: "#0d0d0c",
          borderRadius: 24,
          border: `2px solid ${DIM}44`,
          padding: "48px 44px",
          fontFamily: MONO,
          fontSize: 30,
          lineHeight: 1.5,
          color: "#dadada",
          maxHeight: 1200,
          overflow: "hidden",
        }}
      >
        <div style={{ color: DIM, marginBottom: 20 }}>
          <span style={{ color: accent }}>$ </span>
          <span style={{ color: FG }}>{scene.cmd}</span>
        </div>
        {lines.slice(0, shown).map((line, i) => (
          <div key={i} style={{ whiteSpace: "pre-wrap" }}>
            {line.spans.map((sp, j) => (
              <span
                key={j}
                style={{ color: sp.color, fontWeight: sp.bold ? 700 : 400 }}
              >
                {sp.text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Still with a slow push-in so it never reads as a frozen frame. */
const StillScene: FC<{ scene: DemoScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, scene.durationFrames], [1, 1.06]);
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", padding: 48 }}
    >
      <div style={{ width: "100%", borderRadius: 28, overflow: "hidden" }}>
        <Img
          src={staticFile(scene.image!)}
          style={{
            width: "100%",
            display: "block",
            transform: `scale(${scale})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const SCENE: Record<DemoScene["kind"], FC<{ scene: DemoScene }>> = {
  title: TitleScene,
  browser: BrowserScene,
  cli: CliScene,
  still: StillScene,
};

/* --------------------------------------------------------------- composition */

export const Vertical: FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    {DEMO_VIDEO.scenes.map((scene) => {
      const Body = SCENE[scene.kind];
      return (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={scene.durationFrames}
          name={scene.id}
        >
          {scene.audio ? <Audio src={staticFile(scene.audio)} /> : null}
          <Body scene={scene} />
          <Captions words={scene.words} />
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
