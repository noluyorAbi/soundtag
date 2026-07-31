import { Configurator } from "@/components/Configurator";
import { PixelText } from "@/components/PixelText";
import { PROJECT } from "@/lib/project";

export const dynamic = "force-static";

export default function Home() {
  return (
    <div className="shell">
      <header className="masthead">
        <div className="wordmark">
          <PixelText size={4}>soundtag</PixelText>
        </div>
        <nav>
          <a href={PROJECT.repo}>Source</a>
          <a href={`${PROJECT.repo}#printing`}>How to print it</a>
          <a href={`${PROJECT.repo}/blob/main/TRADEMARKS.md`}>Trademarks</a>
        </nav>
      </header>

      <main>
        <Configurator />

        <section className="columns">
          <div>
            <PixelText size={3} className="eyebrow">
              one change
            </PixelText>
            <h2>One filament change, not one per layer</h2>
            <p>
              The plate stops at a height, and the code starts there. Nothing of the body exists
              above that line and nothing of the code below it, so a single extruder printer needs
              one pause and an AMS needs one swap. The layer number is on the drawing.
            </p>
          </div>
          <div>
            <PixelText size={3} className="eyebrow">
              what you get
            </PixelText>
            <h2>Three files, all of them 1:1</h2>
            <ul>
              <li>3MF with both parts named and assigned to filament 1 and 2</li>
              <li>Binary STL, for slicers and hosts that want a plain mesh</li>
              <li>SVG with separate cut and engrave layers, in millimetres</li>
            </ul>
          </div>
          <div>
            <PixelText size={3} className="eyebrow">
              honestly
            </PixelText>
            <h2>What this cannot promise</h2>
            <p>
              Whether a printed tag scans depends on a camera, a light and two filaments. The
              contrast figure here is measured; the scanning is logged in the repository with the
              phone and the size it was tested at, and nothing is claimed beyond that.
            </p>
          </div>
        </section>
      </main>

      <footer className="shell" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <p>
          {PROJECT.outputRights} {PROJECT.disclaimer}
        </p>
        <p>
          <a href={PROJECT.repo}>Source on GitHub</a>, MIT. <a href={PROJECT.npm}>npm</a> for the
          command line version.
        </p>
      </footer>
    </div>
  );
}
