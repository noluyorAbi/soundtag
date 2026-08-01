/**
 * Wide / WideLong: the 1920x1080 demo compositions (/demo-video, stage 5).
 *
 * Same generated spine as Vertical, laid out for 16:9: Wide renders the short
 * cut (DEMO_VIDEO), WideLong the long cut (DEMO_VIDEO_LONG, every scene incl.
 * the ones tagged {"variants":["long"]}). Layout only; content comes from the
 * GENERATED demovideo.content.ts.
 *
 * Registration (Root.tsx, manual, snippet in SKILL.md):
 *   <Composition id="Wide" ... width={1920} height={1080} />
 *   <Composition id="WideLong" ... width={1920} height={1080} />
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

import { DEMO_VIDEO, DEMO_VIDEO_LONG } from "./demovideo.content";
import type {
  CaptionWord,
  DemoScene,
  DemoVideoContent,
} from "./demovideo-types";
import { accent, easing } from "./theme";
import "./font";

const BG = "#141413";
const FG = "#f5f4ef";
const DIM = "#8a877d";
const MONO = "'JetBrains Mono', 'SF Mono', Menlo, monospace";

/* ------------------------------------------------------------------ captions */

/**
 * Karaoke captions over static phrase chunks (same design as Vertical.tsx):
 * words are grouped once into phrases, the phrase text never moves while on
 * screen, only word color advances with the voice. The single motion is one
 * opacity/translateY enter per chunk, ~200ms, strong ease-out.
 */
type Chunk = { words: CaptionWord[]; from: number };

const CHUNK_MAX_WORDS = 8;
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
        left: 160,
        right: 160,
        bottom: 72,
        textAlign: "center",
        fontFamily: MONO,
        fontSize: 40,
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
      style={{ justifyContent: "center", alignItems: "center", padding: 120 }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 132,
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
            fontSize: 46,
            color: DIM,
            marginTop: 36,
            opacity: t,
            textAlign: "center",
            maxWidth: 1400,
          }}
        >
          {scene.sub}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const BrowserScene: FC<{ scene: DemoScene }> = ({ scene }) => (
  <AbsoluteFill
    style={{ justifyContent: "center", alignItems: "center", padding: 72 }}
  >
    <div
      style={{
        maxWidth: 1620,
        borderRadius: 24,
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

const CliScene: FC<{ scene: DemoScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const lines = scene.term ?? [];
  const shown = Math.min(lines.length, Math.floor(frame / 3) + 1);
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", padding: 72 }}
    >
      <div
        style={{
          width: 1500,
          background: "#0d0d0c",
          borderRadius: 20,
          border: `2px solid ${DIM}44`,
          padding: "40px 48px",
          fontFamily: MONO,
          fontSize: 26,
          lineHeight: 1.5,
          color: "#dadada",
          maxHeight: 820,
          overflow: "hidden",
        }}
      >
        <div style={{ color: DIM, marginBottom: 18 }}>
          <span style={{ color: accent }}>$ </span>
          <span style={{ color: FG }}>{scene.cmd}</span>
        </div>
        {lines.slice(0, shown).map((line, i) => (
          <div key={i} style={{ whiteSpace: "pre" }}>
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

const StillScene: FC<{ scene: DemoScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, scene.durationFrames], [1, 1.05]);
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", padding: 72 }}
    >
      <div style={{ maxWidth: 1620, borderRadius: 24, overflow: "hidden" }}>
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

/* ------------------------------------------------------------- compositions */

const WideLayout: FC<{ content: DemoVideoContent }> = ({ content }) => (
  <AbsoluteFill style={{ background: BG }}>
    {content.scenes.map((scene) => {
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

export const Wide: FC = () => <WideLayout content={DEMO_VIDEO} />;
export const WideLong: FC = () => <WideLayout content={DEMO_VIDEO_LONG} />;
