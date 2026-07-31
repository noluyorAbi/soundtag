import { BuildScroller } from "@/components/BuildScroller";
import { Configurator } from "@/components/Configurator";
import { PixelText } from "@/components/PixelText";
import { Reveal } from "@/components/Reveal";
import { ShapeStrip } from "@/components/ShapeStrip";
import { PROJECT } from "@/lib/project";

export const dynamic = "force-static";

const FACTS = [
  {
    number: "1",
    label: "filament change",
    body: "Not one per layer. The plate stops at a height and the code starts there, and the build asserts it rather than the documentation claiming it.",
  },
  {
    number: "4",
    label: "runtime dependencies",
    body: "React, React DOM, Next and a motion library. The triangulator, the ZIP writer, the 3MF writer and the font are in this repository, each with the reason it is there written at the top.",
  },
  {
    number: "92",
    label: "tests, 0.8 seconds",
    body: "Closed surfaces, outward normals, deterministic bytes, and a manifold check that measures the mesh the way a slicer does rather than the way the builder does.",
  },
];

export default function Home() {
  return (
    <>
      <header className="masthead">
        <div className="shell">
          <PixelText size={3}>soundtag</PixelText>
          <nav>
            <a href="#how">How it prints</a>
            <a href="#shapes">Shapes</a>
            <a href="#make">Make one</a>
            <a href={PROJECT.repo}>Source</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="shell hero" style={{ borderTop: 0 }} id="make">
          <Configurator
            intro={
              <>
                <PixelText size={3} colour="var(--accent)">
                  paste a song
                </PixelText>
                <h1>
                  <span>A song,</span>
                  <span>as an object.</span>
                </h1>
                <p className="hero-lede">
                  Paste a Spotify link and get a 3MF with the filament change already assigned, a
                  binary STL, and an SVG with separate cut and engrave layers. No upload, no
                  account, no environment variables.
                </p>
              </>
            }
          />
        </section>

        <BuildScroller />

        <section id="shapes">
          <div className="shell">
            <Reveal className="section-head">
              <span className="label">five shapes</span>
              <h2>Same code, different object.</h2>
              <p>
                Each shape answers four questions: the outline, the holes, where the code may go and
                where text may go. Everything else, including the laser file, follows from that.
              </p>
            </Reveal>
            <ShapeStrip />
          </div>
        </section>

        <section>
          <div className="shell">
            <Reveal className="section-head">
              <span className="label">what is actually true</span>
              <h2>Numbers that were measured.</h2>
            </Reveal>
            <div className="facts">
              {FACTS.map((fact, i) => (
                <Reveal key={fact.label} delay={i * 0.08}>
                  <div className="fact-number">{fact.number}</div>
                  <div className="label" style={{ marginBottom: "0.7rem" }}>
                    {fact.label}
                  </div>
                  <p>{fact.body}</p>
                </Reveal>
              ))}
            </div>
            <Reveal>
              <p style={{ marginTop: "2.5rem" }}>
                One thing is not measured yet: whether a printed tag scans, at what size and with
                which filament pair. That depends on a camera, a light and two plastics, so it is
                not claimed anywhere.{" "}
                <a href={`${PROJECT.repo}/blob/main/VERIFY-LOG.md`}>The log is here</a>, and it says
                so.
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <footer>
        <div className="shell">
          <p>{PROJECT.outputRights}</p>
          <p>{PROJECT.disclaimer}</p>
          <p style={{ marginTop: "1.2rem" }}>
            <a href={PROJECT.repo}>Source</a>, MIT. <a href={PROJECT.npm}>npm</a> for the command
            line. <a href={`${PROJECT.repo}/blob/main/TRADEMARKS.md`}>Trademarks</a>.
          </p>
        </div>
      </footer>
    </>
  );
}
