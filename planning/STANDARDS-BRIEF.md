# STANDARDS BRIEF: the Spotify-tag sibling of MONOLITH

Reference repo: `/Users/alperen/repos/monolith` (npm `monolith-3d@0.1.0`, MIT, Next 16 + React 19 + Vitest 4).
Target repo: currently `/Users/alperen/Desktop/SPOTIFY-TAG`. **The directory name, the eventual repo name, the npm name and the domain must all be changed before anything is published.** See §7.1.

---

## 1. THE BAR

What monolith does well, itemised, with the number the sibling has to match or beat at v0.1.0.

### 1.1 Engineering gates

| # | Monolith's standard | Number | Sibling target at v0.1.0 |
|---|---|---|---|
| 1 | Test suite, Vitest 4, node env, `node:assert/strict`, flat `test(...)` calls, no `describe` | **8 files, 133 tests, ~1.5 s, all green** | ≥ 70 tests, ≥ 6 files, under 3 s |
| 2 | Geometry closure test: every variant welds to a closed surface, area residual `< 1e-4` | 1 test per variant, plus a deliberately torn mesh proving the fallback branch runs | Same test, per tag layout, plus the torn-mesh branch test |
| 3 | Calibration test fitted against real slices, fails on **> 0.3 %** drift | `test/calib.test.ts`, 5 tests, 3 real Bambu slices | Same, fitted against ≥ 3 real slices of the tag |
| 4 | Deterministic output bytes (frozen ZIP timestamps 2020-01-01) so identical requests are byte-identical | asserted in test | Same, plus assert the SVG export is byte-identical |
| 5 | Independent verifier in tests: a second ZIP reader (`test/helpers/zip.ts`, 38 lines) that checks CRC, so containers are never validated by the code that wrote them | 1 helper | Same helper, plus an independent SVG-rect reader for the laser export |
| 6 | Ambient env neutralised in tests (`GITHUB_TOKEN`/`GH_TOKEN` forced to `""` in `vitest.config.ts:20`) so which code path runs never depends on the developer's shell | 2 vars | Same, for the Spotify credentials |
| 7 | Route handlers imported and called directly in tests, no server boot | `test/routes.test.ts`, 31 tests | Same pattern |
| 8 | Physical verification harness outside CI: slices a real kit through Bambu Studio CLI and greps the G-code for **12** baked-in settings, exits 0 with a skip message when the slicer is absent | 83-line `scripts/verify-print-kit.sh` | Same script, plus a **scan** harness (§3.6). Beat monolith by putting the automatable half in CI |
| 9 | CI: 1 job, 4 gates, actions SHA-pinned with a trailing `# v7` comment, `persist-credentials: false`, `permissions: contents: read` | `ci.yml`, 41 lines | Identical file, plus a 5th gate: the em-dash grep (§6.9) |
| 10 | Publish: OIDC trusted publishing, `--provenance`, **no npm token anywhere**, npm-version floor assertion, tag/`package.json` agreement read through `$GITHUB_REF_NAME` never `${{ }}`, `package-manager-cache: false` | `publish.yml`, 79 lines | Identical file. Beat monolith by actually cutting `v0.1.0` and proving the path works before launch week |
| 11 | Dependabot on npm + github-actions, monthly, `cooldown.default-days: 7` | 18 lines | Identical |
| 12 | Lint: ESLint 9 flat config, `no-explicit-any: "error"`, purity rules disabled for **exactly one** file with the reason in a comment | 53 lines | Same discipline. Aim for zero file-scoped escape hatches |
| 13 | Zero geometry, ZIP, 3MF, STL or GLB libraries. 9 runtime deps, 14 dev deps, 790 lock entries | 9 / 14 | ≤ 9 / ≤ 14. Add nothing for SVG either |
| 14 | Published tarball is small and built by `prepack`, `dist` gitignored so the bundle can only come from a clean build | 4 files, 39.4 kB packed | ≤ 5 files, ≤ 60 kB |
| 15 | One request contract shared by HTTP routes, the CLI, the share page, the OG image and the UI. Every malformed parameter degrades to a valid default instead of erroring | `src/lib/request.ts` | Same, with one deliberate inversion (§3.7) |

### 1.2 Documentation gates

| # | Standard | Number |
|---|---|---|
| 16 | README | **215 lines, ~2,700 words, 14 sections, no H1, 3 badges, 1 H3** |
| 17 | Every table carries a **why** column. Never a bare `Description`. Column names used: `What it is`, `Why`, `What it does`, `Without it`, `What lives there` | 6 distinct why-columns |
| 18 | A public, unflinching defects section ordered by user cost, each item `bold problem. → evidence → Next: fix` | **8 items**, one of which undercuts a headline feature |
| 19 | Failed experiments documented as first-class content, with version numbers | Bambu Studio `02.00.03.54` segfault, `basematerials` inert in 4 importers, the arachne claim disproved |
| 20 | Nothing claimed that was not measured | contrast 6.3:1 / 8.3:1 / 3.4:1 / 7.2:1, 0.376 mm font pixel vs the 0.42 mm nozzle line, fit within 0.3 % |
| 21 | Docs generated from code where drift is possible | `/llms.txt` generated from the same constants the kit ships |
| 22 | Marketing assets generated from the product's own geometry | 3 Remotion compositions, 1 frozen dataset shared by banner, OG card, demo and calibration slices |
| 23 | Doc set on disk | README.md, CONTRIBUTING.md (47 lines), SECURITY.md (16 lines), LICENSE, PR.md, 2 issue templates, dependabot.yml, 2 workflows, .env.example, private HANDOFF.md excluded via `.git/info/exclude` |
| 24 | Zero required environment variables. Every entry point degrades or 404s rather than shipping an unlocked door | 5 vars, all optional |

**Definition of done for the sibling:** all 24 rows satisfied, `npm run typecheck && npm run lint && npm test && npm run build` green in CI, `v0.1.0` published to npm with a provenance badge, and one physical printed tag photographed and confirmed to scan.

---

## 2. STACK DECISION

### 2.1 Versions, copied exactly

```
node        >=20   (engines), CI on 24
next        ^16.2.11        react/react-dom  ^19.2.8
typescript  ^5.9.3          vitest           ^4.1.10
eslint      ^9.39.5         eslint-config-next ^16.2.11
tailwindcss 4.3.3 (exact)   @tailwindcss/postcss 4.3.3 (exact)
esbuild     ^0.28.1         remotion / @remotion/cli / @remotion/renderer ^4.0.496
motion      12.42.2 (exact)
@types/node ^26.1.1  @types/react ^19.2.17  @types/react-dom ^19.2.3
server-only ^0.0.1
```

Pinning convention to keep: **the rendering stack is exact, everything else is caret.**

**Three.js decision.** Monolith ships `three@0.185.1` + `@react-three/fiber@9.6.1` + `@react-three/drei@10.7.7` (all exact) and pays for it with `transpilePackages: ["three"]`, a `next/dynamic` `ssr:false` split, and one ESLint escape hatch for `SceneObject.tsx`. A keychain tag is a flat plate with 23 prisms on it. **Recommendation: ship v0.1.0 with no three.js at all.** Reuse the isometric projector already written in `remotion/Monolith.tsx` (`project()` at π/6, no perspective, flat per-wall lighting at 1 / 0.74 / 0.52) to render the preview into a `<canvas>` or inline SVG. That deletes three dependencies, the transpile hack, the dynamic import, the ESLint exception and roughly 700 kB from the mobile bundle, and it makes the README image, the OG card and the on-screen preview literally the same renderer. Add `three` in v0.2 only if the tilt preview measurably fails to sell the object. Drop `@vercel/blob` unless the private launch board ships on day one.

Runtime deps target: `next`, `react`, `react-dom`, `server-only`, `motion`. Five. That is a headline number worth putting in the README.

### 2.2 File-by-file skeleton

`C` = copy verbatim, `A` = copy and adapt, `N` = new.

```
.github/workflows/ci.yml                 C   (add the prose gate step)
.github/workflows/publish.yml            C   (change nothing but the package name)
.github/dependabot.yml                   C
.github/ISSUE_TEMPLATE/bug.md            A
.github/ISSUE_TEMPLATE/print-problem.md  A
.github/ISSUE_TEMPLATE/scan-problem.md   N   (the physical failure mode that is unique here)
.github/PULL_REQUEST_TEMPLATE.md         N   (monolith lacks one, see §6.4)

tsconfig.json         C   ES2022 / esnext / bundler / strict / noEmit / isolatedModules / @/* -> ./src/*
eslint.config.mjs     A   drop the SceneObject block if three.js is not used
vitest.config.ts      A   alias @ -> src, server-only -> test/stubs/server-only.ts,
                          env: { SPOTIFY_CLIENT_ID: "", SPOTIFY_CLIENT_SECRET: "" }
next.config.ts        A   reactStrictMode only; transpilePackages only if three.js returns
postcss.config.mjs    C
remotion.config.ts    C
vercel.json           C
.gitignore            C   plus dist, .data, *.stl, *.3mf, *.svg outputs, .env* with !.env.example
.env.example          A   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, NEXT_PUBLIC_SITE_URL,
                          NEXT_PUBLIC_PROJECT_URL, ADMIN_PASSWORD  (all optional, comment the
                          degraded behaviour above each key, not the purpose)

src/lib/mesh.ts        C   MeshBuilder, triangle soup, tri/quad/box/wedge/cylinder, finish()
src/lib/parts.ts       C   weld() to the micron, signedVolume(), areaResidual(), splitByLevel(),
                           printableParts() with the wholeObject() safety valve
src/lib/zip.ts         C   deflateRawSync only, own CRC-32, store-if-deflate-grows, frozen DOS date
src/lib/threemf.ts     A   core spec only, keep Metadata/model_settings.config extruder writer
src/lib/stl.ts         C   80-byte header, Y-up to Z-up inline
src/lib/glb.ts         C   optional; keep for the web preview download
src/lib/slots.ts       A   two slots only: base and bars
src/lib/print.ts       A   overrides(material, quality) -> {key,label,value,raw,why}. New values
src/lib/kit.ts         A   bambuPreset() inherits + printCard() + kitStem() + buildKit()
src/lib/request.ts     A   parseModelRequest / modelQuery, new fields, one inversion (§3.7)
src/lib/responses.ts   C   one error mapper, typed errors to status codes
src/lib/project.ts     A   the two identity constants, licence strings, trademark disclaimer string
src/lib/font5x7.ts     C   keep the bitmap font for the track/artist line
src/lib/palettes.ts    A   two-filament pairs instead of 7 finishes. NOT Spotify green (§7.7)

src/lib/spotify.ts     N   import "server-only". Track resolution + scannable fetch
src/lib/code.ts        N   SVG -> 23 bar heights. Pure, no network, unit-testable
src/lib/tag.ts         N   buildTag(code, options) -> BuiltMesh. Replaces build.ts
src/lib/lasersvg.ts    N   two flat SVGs, cut and engrave, mm units
src/lib/colourchange.ts N  base height snapped to a layer multiple + the layer number to change at

src/cli/main.ts        A   same hand-written parseArgs, same VALUE_FLAGS -> URLSearchParams ->
                           parseModelRequest(new URL(`https://cli/?${query}`)) trick
src/cli/noop.ts        C   9-line export {} aliased over server-only by esbuild

src/app/api/{tag,3mf,stl,svg,glb,og,card}/route.ts   A
src/app/llms.txt/route.ts                            A   generated from the same constants
src/app/{sitemap,robots}.ts                          C

test/helpers/zip.ts    C
test/stubs/server-only.ts C
data/code-fixture.json N   one frozen scannable SVG + its expected 23 heights
scripts/verify-print-kit.sh  A
scripts/verify-scan.sh       N
scripts/no-em-dash.sh        N
```

### 2.3 package.json scripts

```json
"dev":          "next dev",
"build":        "next build",
"start":        "next start",
"lint":         "eslint .",
"lint:prose":   "./scripts/no-em-dash.sh",
"typecheck":    "tsc --noEmit",
"test":         "vitest run",
"test:watch":   "vitest",
"verify:print": "./scripts/verify-print-kit.sh",
"verify:scan":  "./scripts/verify-scan.sh",
"og":           "remotion still remotion/index.ts OgCard public/og.png --overwrite",
"banner":       "remotion still remotion/index.ts Banner assets/banner.png --overwrite",
"demo":         "remotion render remotion/index.ts Demo assets/demo.mp4 --overwrite",
"assets":       "npm run og && npm run banner && npm run demo",
"build:cli":    "esbuild src/cli/main.ts --bundle --platform=node --format=esm --target=node20 --outfile=dist/<name>.mjs --alias:server-only=./src/cli/noop.ts",
"prepack":      "npm run build:cli"
```

Package fields to copy: `engines.node >= 20`, `files: ["dist","README.md","LICENSE"]`, `repository` (required for provenance to resolve), `license: "MIT"`, `bin` mapping package name to command name, no `postinstall`, no `prepare`.

**One deliberate improvement over monolith:** add `"exports"` and `"types"` and ship `buildTag` and `parseScannable` as an importable library alongside the bin. Monolith is CLI-only and therefore cannot acquire dependents. A tiny library that turns a scannable SVG into a manifold mesh is the kind of thing other people npm-install, and dependents are a more durable star driver than a launch spike.

---

## 3. ARCHITECTURE TO MIRROR

### 3.1 The shape that must survive the port

Monolith's spine is three files and one rule: **one request contract, one build pipeline, four writers.** Every download route is the same five steps.

```
parseModelRequest(url)
  -> Promise.all([resolveModelSource(req), fetchExtras(req)])
  -> buildOptionsFrom(req, src, extras)
  -> build*(...)
  -> writer (3MF | STL | GLB | ZIP)
  -> responses.ts maps every throw to a status
```

Port it literally. For the tag:

```
parseTagRequest(url)         // track uri/url, size, thickness, shape, hole, text, material, printer
  -> resolveTrack(req)       // -> { uri, title, artist, codeSvg, heights[23], demo: false }
  -> buildOptionsFrom(...)
  -> buildTag(...)
  -> writer (3MF | STL | SVG | ZIP)
```

### 3.2 Translates directly, no changes

| Monolith piece | Why it ports unchanged |
|---|---|
| `MeshBuilder` in `mesh.ts` | Non-indexed triangle soup with four parallel attribute arrays and CCW-from-outside winding. A tag is boxes and one rounded outline. `box()` and `quad()` cover 95 % of it |
| `parts.ts` in full | `weld()` at the micron, `signedVolume()` by the divergence theorem, `areaResidual() < 1e-4` as the closed test, `splitByLevel()` to get one solid per colour, `printableParts()` falling back to a single welded solid if any group came out open. This is exactly the multi-colour split the tag needs, unmodified |
| `zip.ts` | Deterministic bytes, store-if-deflate-grows, own CRC. Used for both the OPC container and the outer kit |
| `stl.ts`, `glb.ts` | Byte layouts do not care what the object is |
| `threemf.ts` core writer | Same core namespace, same `unit="millimeter"`, same bed-centred `<build>` transform. **Keep the two documented refusals** (no hand-written `project_settings.config`, no `basematerials`) as inherited, cited findings |
| `Metadata/model_settings.config` extruder writer | This is the single most valuable inherited line of code. It is what makes "exactly one filament change" arrive pre-bound in Bambu and Orca instead of as a manual instruction |
| `kit.ts` structure | `bambuPreset()` that `inherits` from the stock vendor preset and overrides ~12 keys, `printCard()` with a why per setting and `!!` warnings, `kitStem()` so no file is ever named differently from what the card says |
| `print.ts` `overrides()` shape | One source of truth for settings, read by the preset, the card, the UI panel and `llms.txt`. Values change, structure does not |
| `request.ts` degrade-never-error rule | Unknown enum to default, numbers clamped, flags re-emitted in canonical order so the same choices always produce the same URL. Keep `SHARE_VERSION` |
| `responses.ts` | One mapper, typed errors, `console.error` only for the 500 branch |
| CLI adapter | Hand-written 56-line `parseArgs`, no commander/yargs, folds flags into `URLSearchParams`, hands them to the web parser. `-h` returns a `HELP` symbol so "asked for help" (stdout, exit 0) is distinguishable from "gave nothing usable" (stderr, exit 1). Unknown flag exits 2 |
| Remotion asset generation | Three compositions importing the product's own geometry, one frozen fixture shared by every image and every calibration slice |
| Test style | `node:assert/strict`, flat `test(...)`, route handlers imported directly, `vi.stubGlobal("fetch", ...)` replaying a frozen fixture |

### 3.3 Must be new: acquiring the code

This is the part monolith has no analogue for, and it is where the engineering credibility of the project will come from.

A Spotify Code is **23 bars of 8 discrete heights** plus the Spotify mark. The bar heights are not derivable offline from a track URI: the encoding is over a server-assigned media reference, not over the URI string, so the heights must come from Spotify's scannable endpoint. [U, verify before writing a word of README about it]

```
GET https://scannables.scdn.co/uri/plain/svg/{bgHex}/{black|white}/{width}/{spotify:track:ID}
```

Architecture:

1. `src/lib/spotify.ts`, `import "server-only"`. Fetches the scannable SVG. Caches with `next: { revalidate: 86400 }`. Sets a User-Agent naming the project and its repo. Handles 404 and 429 with distinct typed errors.
2. `src/lib/code.ts`, **pure, no network, no `server-only`**. Takes the SVG text, extracts the `<rect>` elements, sorts by x, converts y/height pairs into 23 integers 0..7, and returns `{ heights: number[23], logoBox: Rect, bounds: Rect }`. This is the file that gets 20 of the sibling's tests, driven from the frozen fixture in `data/`. Never trust the endpoint's layout; measure it and assert it.
3. `src/lib/tag.ts` consumes `heights` only. The geometry layer never sees an SVG or a network response. That separation is what makes the whole pipeline testable offline and what makes the CLI, the routes and Vitest identical.

**Do not hardcode bar pitch, bar width or logo position.** Derive them from the parsed SVG and assert the derived values against the fixture, so a change on Spotify's side fails a test rather than shipping a tag that does not scan.

### 3.4 Must be new: the tag geometry

Follow monolith's rule exactly: **model everything in nominal units, scale once at the end**, so real-world feature sizes are computed in one place and can be checked against the nozzle.

```ts
const CODE_BARS = 23;
const BAR_LEVELS = 8;
const PLATE_T    = 2.4;   // base thickness, snapped to a layer multiple
const RELIEF     = 0.8;   // bar height above the plate
const HOLE_MM    = 4.4;   // physical, divided by the eventual scale factor k, as monolith does
const CORNER_R   = 3.0;
```

Layouts, behind a `LAYOUTS` record the way monolith uses `BUILDERS`:

| Layout | Shape | Why |
|---|---|---|
| `tag` | rounded rectangle, hole top-left | the default keychain |
| `disc` | circle, hole at 12 o'clock | prints with less warp, reads as a coin |
| `plaque` | rectangle, no hole, chamfered base | desk object, the upsell to a bigger print |
| `insert` | code panel only, no border, no hole | drops into someone else's model, the remix hook |

Attributes per vertex, same four arrays as monolith: `pos`, `lvl` (0 for plate, 1 for bars, 2 for text), `ord` (left to right, for the reveal animation), `base`.

Text: reuse `font5x7.ts` and **raise it, do not carve it**, for the same measured reason monolith found (a carved 0.376 mm pixel fell under the 0.42 mm nozzle line). Track title and artist go on the back or below the code.

Guards to compute in the builder and surface everywhere, exactly as monolith surfaces `engravePixelMm` and `gapMm`:

| Guard | Threshold | Consequence |
|---|---|---|
| `barGapMm` | `MIN_GAP = 0.4` | below it, adjacent bars fuse and the code stops scanning |
| `barWidthMm` | `NOZZLE_LINE_MM = 0.42` | below it, a bar is thinner than one extrusion |
| `textPixelMm` | 0.42 | the inherited finding |
| `plateFitsBed` | printer bed from the preset | monolith already warns on this |
| `minScanMm` | measured, not guessed | the smallest tag that actually scanned, per §3.6 |

### 3.5 Must be new: exactly one filament change

This is the product promise, so it needs to be a computed, tested invariant rather than an instruction.

1. `splitByLevel` already yields two closed solids: plate and bars. Assert in a test that there are exactly two, that both are closed, and that their volumes sum to the whole within 0.1 %.
2. Write `Metadata/model_settings.config` with `extruder=1` on the plate and `extruder=2` on the bars. AMS and Orca users are then done at import.
3. For single-extruder printers, the change is a Z-height pause. Therefore `PLATE_T` must be an exact integer multiple of the layer height: `plateT = Math.round(plateT / layerH) * layerH`. `src/lib/colourchange.ts` returns `{ plateT, changeAtLayer: plateT / layerH + 1, zMm: plateT }`, and `PRINT-ME.txt` prints that layer number literally. A tag whose colour change lands mid-layer is a defect, so make it a test.
4. `verify:print` gets a new grep: assert the sliced G-code contains the change (or the extruder assignment) at exactly that layer. Monolith greps 12 settings; the sibling greps those that still apply plus this one. That single grep is the strongest sentence in the launch post.

Print-profile changes from monolith, because a flat plate is not a tower field: no supports still holds, but `top_shell_layers` matters more (the code face is the only face anyone looks at), `ironing` on the top surface is worth measuring, brim is different for a wide flat part, and `sparse_infill_density` can drop because the part is nearly solid at 2.4 mm. Every value keeps its `why`.

### 3.6 Must be new: two verification harnesses

Monolith's whole credibility rests on `verify:print`. The sibling has **two** external systems it makes claims about, so it needs two harnesses, and the split between them matters.

**Automatable, in CI:** render the finished tag's top face to a raster at print resolution, re-extract the 23 bar heights from that raster, and assert they equal the heights parsed from the source SVG. This proves the geometry pipeline did not corrupt the code, which is the failure mode you actually control. It needs no phone, no printer and no network. Put it in `npm test`.

**Not automatable, dated, versioned, logged:** `scripts/verify-scan.sh` walks you through printing a tag and scanning it with the Spotify app, then appends a row to a committed `VERIFY-LOG.md`:

```
date | tag mm | layout | filament pair | measured contrast | phone | Spotify app version | scanned?
```

Publish that table in the README. Then the claim is not "it scans", it is "it scanned at 42 mm and above, on these two phones, on this app version, with these two filament pairs". That is monolith's culture (measured, not remembered) applied to the harder system.

**Third harness, cheap:** import the generated `cut.svg` and `engrave.svg` into LightBurn (or Inkscape) and confirm the physical dimensions come through in millimetres. SVG unit handling is the classic laser-export bug, and catching it in a documented round trip is another falsified-claim finding for the launch post.

### 3.7 The one pattern that must be inverted

Monolith degrades gracefully: if GitHub is unreachable, `syntheticYear()` produces a plausible deterministic year, and that fact is propagated to eight surfaces (UI, `PRINT-ME.txt`, 3MF metadata, STL header, `X-Monolith-Sample-Data`, CLI stderr, `llms.txt`, the share card).

**Do not copy that here.** A plausible-but-wrong contribution graph is a nice object. A plausible-but-wrong barcode is a physical object that silently does not scan, printed after four hours of filament. When the scannable endpoint fails, **fail loudly** with a typed error and a sentence the user can act on. Keep exactly one demo path: a frozen, real, correct code for one specific track shipped in `data/`, used by the landing page, the README images, the Remotion assets and the tests, and labelled as a demo track everywhere. Same frozen-fixture discipline, opposite fallback policy, and say so in the README. That inversion is itself a good paragraph.

---

## 4. DOC SET

### 4.1 Files to write

| File | Length target | Notes |
|---|---|---|
| `README.md` | 200 to 240 lines, ~2,700 words | Section order in §4.2 |
| `CONTRIBUTING.md` | ~50 lines, hard-wrapped at 76 cols | Two numbered bolded rules with their reasons: (1) `npm test` must pass if you touch geometry, and here is why the closure test exists; (2) if you touch the code parser or the print profile, run `verify:scan` / `verify:print` **and say what the phone and the slicer said**. Then Getting set up (2 commands, "No environment variables are needed"), a Layout table mapping directories to what lives there, one Licence sentence |
| `SECURITY.md` | ~18 lines | Where to report (private advisory), what this project touches, and the credentials paragraph. No supported-versions table, no PGP key, no SLA |
| `LICENSE` | MIT | File is `LICENSE`, prose says "Licence" |
| `TRADEMARKS.md` | ~25 lines | **New, monolith has no equivalent.** §7 is the content |
| `.github/ISSUE_TEMPLATE/bug.md` | classic front-matter markdown | "The site or the generated files are wrong", label `bug` |
| `.github/ISSUE_TEMPLATE/print-problem.md` | same | "Something came off the plate wrong", label `print`, sanity-check checkboxes |
| `.github/ISSUE_TEMPLATE/scan-problem.md` | same | **New.** "It printed but it does not scan", label `scan`. Fields: tag size, the two filament colours, phone, Spotify app version, whether the on-screen preview scans from the monitor. That last question splits geometry bugs from print bugs in one line |
| `.github/PULL_REQUEST_TEMPLATE.md` | ~12 lines | Beat monolith (§6.4). Three checkboxes: tests green, verification run and quoted, no em dashes |
| `.env.example` | all optional | A prose comment above each key describing the **degraded behaviour**, not the purpose |
| `/llms.txt` route | generated | From the same constants the kit ships, plus the trademark disclaimer and an explicit instruction not to present the demo track as the user's |
| `PR.md` | living | The PR body kept at repo root and committed with `docs: PR body for ...` commits |
| `HANDOFF.md` | private | Excluded via `.git/info/exclude`, never `.gitignore`, because a `.gitignore` line publicly announces the filename and purpose of a private file |
| `VERIFY-LOG.md` | grows | The dated scan-test table from §3.6 |

Skip, as monolith does: CHANGELOG (but see §6.2), CODE_OF_CONDUCT, NOTICE, `docs/` directory. All documentation lives at repo root plus `.github/`.

### 4.2 README section order

Follow monolith's order, adapted. No H1 anywhere. Every H2 except the last carries a 16 px inline `<img>` from a local grey (`#8b9096`) Lucide-style icon set so it reads on GitHub light and dark. All image URLs absolute `https://raw.githubusercontent.com/<user>/<repo>/main/...` with a `?v=N` cache-buster, so the README renders identically on GitHub and on npm.

| # | Section | Content |
|---|---|---|
| 0 | Centred hero, no heading | Banner (Remotion-rendered), bold one-sentence pitch, "Open <NAME>" link, an inline paste-a-link affordance, 3 badges (stars, MIT, a self-authored `scan_verified` badge deep-linking to the verification anchor), the demo GIF linked to the MP4, a `<sub>` caveat that the GIF is downsampled, **and a one-line `<sub>` trademark disclaimer** |
| 1 | Why | A link to a song dies in a chat thread after one scroll. This makes it an object on your keys. Close on a short declarative |
| 2 | What you get | Table of the kit members (`*.3mf`, `*.stl`, `cut.svg`, `engrave.svg`, `presets/*.json`, `PRINT-ME.txt`), each row "what it is + why it is that way" |
| 3 | Without a browser | The CLI, three escalating copy-paste commands, then why it is a thin wrapper over the same query parser as the routes |
| 4 | Four layouts | `tag` / `disc` / `plaque` / `insert`, the size range, and the measured minimum scannable size |
| 5 | One filament change, and why each setting is there | The 8-row settings table with a mandatory `Why` column, plus the layer-number arithmetic, plus the honest single-extruder caveat |
| 6 | Verified against a real slicer and a real phone | The centrepiece. Two shell commands, the falsified-claims list, the calibration paragraph with a measured-versus-fitted number, and the dated scan table |
| 7 | How the geometry works | `src/lib/` is pure TypeScript with no 3D dependency. Table of the 6 files. The bar-heights-are-parsed-not-guessed paragraph |
| 8 | Running it (+ `### Routes`) | `npm install && npm run dev`, then "That is the whole setup." Env vars as a **"Without it"** table. The only H3 in the file is `### Routes` |
| 9 | The preview | One dense prose paragraph on interaction and refusals |
| 10 | Legibility and scannability | Measured contrast ratios for the UI **and** for each filament pair. Numbers, not claims |
| 11 | Roadmap, and what is honestly still broken | 8 bolded known-defect paragraphs, `problem. → evidence → Next: fix`, ordered by how much it costs the reader today |
| 12 | Trademark, and what you may do with the files | Not a licence footnote. See §7. This section is longer than monolith's and is the most-read section by anyone deciding whether to trust the project |
| 13 | Tests | Three npm commands with inline `#` comments |
| 14 | Footer | `<hr>` plus centred `<sub>`: built by, and "If you print one, post it." |

### 4.3 Voice rules

1. **No em dashes. No en dashes.** The author bans them repo-wide. Use a comma, a semicolon, a colon, a full stop or parentheses. Monolith leaked exactly one, at `README.md:179`, against its own explicit rule. Do not leak one: add `scripts/no-em-dash.sh` as a CI gate that greps tracked `.md`, `.ts`, `.tsx` and commit messages for `—` and `–` and exits 1 with the file and line.
2. **British spelling throughout:** licence, colour, centre, dialled, metre. The file on disk stays `LICENSE`, every heading and prose reference says "Licence".
3. **Second person for the reader, third person for the artifact.** "your track", "if you own a printer" against "the tag therefore does not fake a scannable code".
4. **Present tense for behaviour, simple past for measurements.** "The code face reads as one surface" against "Scanning the printed tag at 32 mm failed on both phones".
5. **Bimodal sentence length.** Long comma-chained technical sentences of 40 to 60 words, closed by a short declarative. Colons are the workhorse connector.
6. **Every table has a why column.** Never `Description`.
7. **Every number carries its source.** "0.376 mm, under the 0.42 mm line a 0.4 mm nozzle lays down" is the model.
8. No marketing adjectives, no emoji, no exclamation marks, no superlatives, no "first" and no "only".
9. **Document what failed, with version numbers.** A refused approach is content, not an omission.
10. **Generate anything that can drift.** `llms.txt` from the constants, every README image from the real mesh, the settings table from `overrides()`. Do not cite line numbers in prose: monolith's `HANDOFF.md` line references have already drifted.
11. Commit style: type prefix, lowercase after it, narrative, says what was wrong. `fix: the colour change landed mid-layer on 0.16 mm profiles`.

---

## 5. MARKETING PLAYBOOK

### 5.1 What carries over unchanged

- **Decide the goal before the channel list.** If the goal is stars, prefer channels that put the *repository* in front of a person over channels that put the *product* in front of a person. Monolith's own measurement: the official `gh-skyline` CLI has 1,309 stars, the better web competitor `gh-skyline.dev` has 29. Factor 45, and the difference is the delivery form. Ship and promote the CLI and the library, not only the site.
- **Audit prohibitions first, then name a substitute.** Never plan a workaround.
- **Waves exist because posting the same text everywhere in one evening is a removal reason on Reddit and a ban reason on Discord.** Store each channel's removal rules next to the copy, because a rule in another file is a rule you did not read.
- **"Open Source (MIT)" in every post.** Here it needs one extra clause (§7.3).
- **AI provenance is a liability everywhere except r/vibecoding.** Do not lie, do not volunteer, and if asked, answer immediately and point at the verifiable: the parser tests, the scan log, the sliced G-code.
- **Product Hunt is a scheduling problem.** One slot, six-month lock. Do not burn it in July.

### 5.2 Channels, adapted

**Wave 1, launch day (Tue to Thu, 17:00 to 19:00 Berlin for HN):**

| Channel | The rule that shapes the post |
|---|---|
| Show HN | Site in the URL field, everything else in the text field. Lead with the non-trivial half: the code parser and the two verification harnesses. Never ask for upvotes. Expectation: of 6,019 Show HN posts in 2026 only 3.2 % cleared 50 points, median 2 |
| r/SideProject (784k) | `[Project] - [description]` title format |
| r/somethingimade | Photo-first. A printed tag on a keyring is exactly this sub's format |
| X thread | Native video in the post, link in the **first reply** |
| Bluesky | URL in the post, links are not penalised. The lever is custom feeds, and there are active 3D-printing and laser feeds |
| Mastodon | Invisible without hashtags. This audience checks licences and trademarks: say MIT and say "not affiliated" early |
| LinkedIn | "What I built and what was hard", link in the first comment |

**Wave 2, days 2 to 5, the repo-facing wave:**

| Channel | Note |
|---|---|
| **Hackaday tip line** (`tips@hackaday.com`) | The single biggest press lever. Hackaday's audience loves reverse-engineered scannables. Short human email, three measurable surprises, offer images. No press release |
| **r/lasercutting**, **r/lasercutters**, **r/xtool**, **r/glowforge**, **r/Lightburn** | **The community monolith never had.** The SVG export doubles the addressable audience at almost zero extra code. Post the `cut.svg` / `engrave.svg` split and the kerf note, settings-with-reasons register |
| **r/prusa3d** | The substitute for r/3Dprinting, which bans sharing 3D-printing software regardless of self-promotion rules. Invites print profiles |
| **r/functionalprint** | Check first: novelty objects were excluded since May 2026. A keyring tag is borderline. If in doubt, skip rather than get removed |
| r/opensource | Opened by MIT, rule 4 requires an OSI licence, own rule against LLM-written posts |
| r/coolgithubprojects | Language in the title |
| r/commandline | Blocked until the npm package exists |
| OrcaSlicer Discord (~47k) | Blocked on a print photo |
| Vercel Community showcase | `community.vercel.com/c/showcase/41`. Vercel has no Discord |
| `ad-si/awesome-3d-printing` PR, `## Online Tools` | ~1,900 stars, one PR per entry, AP Title Case, `[Name](link) - Description.` |
| awesome-selfhosted, OpenAlternative, an awesome-lasercutting list | Opened by MIT |
| Console.dev (`hello@console.dev`), Web Tools Weekly (**DM only**, @LouisLazaris), Frontend Focus (`editor@cooperpress.com`), Changelog News | 3 to 5 sentences, one non-obvious property, the licence, the source link |
| Dev.to article | Long-lived SEO asset, tagged `#3dprinting #lasercutting #typescript #opensource #showdev` |

**Wave 3, week 2, gated on a real printed photo:**
Printables (model host, ToS requires CC or GNU or BSD), Cults3D, Thangs (the only host that actively asks for source links), r/BambuLab, r/3Dprinting **photo only, no link**, Printables Article, short-form video, directory sitting (SaaSHub, AlternativeTo, Uneed, Peerlist, DevHunt, no paid bulk submitters).

**Model-host caveat that monolith did not have:** upload **one** demo tag, for a track you own or a Creative Commons track, never a series of popular songs, and never with a title that reads as a branded product. MakerWorld bans external links anyway and requires a real printed image since 05.02.2026. Uploading a library of celebrity-song tags is the single fastest way to a takedown and a dead account. See §7.8.

**Refused outright:** r/3Dprinting as a link post, r/programming (rule 5), r/InternetIsBeautiful (automod removes AI-related sites, circumvention is a permanent ban), Lobsters (invite-only, new domains blocked 70 days), Thingiverse and MyMiniFactory, r/spotify and r/truespotify (support subs, self-promotion is removed and the trademark question gets asked in the least friendly possible room), Etsy seller communities (§7.9).

### 5.3 Timeline

Monolith found the seasonality ratio: **47 of the top 100 "GitHub Wrapped" repos by stars are created in December, 6 in July.** A song keychain has a stronger and doubled seasonality:

- **Now (July):** launch as indexing, listing and backlink work. Get the awesome-list entries merged, the npm package published with provenance, the Dev.to article live, `llms.txt` and JSON-LD shipped. Nothing here needs a viral moment.
- **Late November to 10 December:** the gifting peak plus Spotify Wrapped, which lands around 03.12 and drags the entire genre with it. **This is where the Product Hunt slot belongs**, and it is a better fit than monolith's because Wrapped is literally about music. Re-cut every post around "your Wrapped top song as an object".
- **Second harvest, 20 January to 10 February:** Valentine's Day is the primary commercial season for song-code plaques and keychains. Monolith has no second peak. Plan a small second wave: r/somethingimade, r/lasercutting, short-form video, and a "make one for someone" README variant. [U, worth confirming with search-volume data before committing budget]

### 5.4 Copy patterns to reuse

**Pattern A, the frame.** Monolith: "Every December someone posts a screenshot of their contribution graph. It is a picture of a year of work that lives for one scroll and then is gone."
Sibling: "A song you send someone is a link in a thread. It is gone by the time they scroll past it. This makes it a thing on their keys."

**Pattern B, demote the novelty, lead with the non-trivial half.** The HN 2026 guideline is explicit that quickly-generated one-offs do not belong. There are hundreds of Spotify-code keychain STLs already, so the novelty is spent before you post. What is not spent: "The geometry was the easy half. The part that took the time was proving the printed object still scans, and three things I believed turned out to be false."

**Pattern C, the falsified-claims triplet, the content engine.** Monolith re-cut three findings across six channels and turned them into an article titled "Three things I believed about 3MF that turned out to be false". Do the same. Candidates, each of which must actually be measured before it is published:

1. Whether the bar heights can be derived from the track URI offline. [U]
2. Whether the tag scans without the Spotify mark reproduced on it. [U] This one has a trademark payoff as well as an engineering one.
3. The minimum size and the minimum contrast at which a printed tag scans, against what the internet claims.
4. Whether an SVG exported for a laser survives the import at the right physical size.

The generalisation is the LinkedIn and Dev.to payload, and monolith already wrote the sentence: "if your output makes a claim about a system you do not control, test it against that system, not against the documentation." Here there are **two** systems you do not control, a slicer and a phone camera, which is a stronger version of the same story.

**Pattern D, verification as the proof object.** "There is a verification step rather than a claim: `npm run verify:print` slices the generated 3MF with Bambu Studio's own CLI and greps the G-code for every setting the kit says it bakes in, including the layer the filament change lands on, and fails loudly if any of them did not survive."

**Pattern E, pre-emptive honesty.** Volunteer the caveats before the thread finds them: the code comes from Spotify's own endpoint and can change; a single-extruder printer needs one manual pause and here is the exact layer; the tag is not affiliated with Spotify and here is what that means for selling them. "I would rather say that than have it break in your slicer" is the register.

**Pattern F, settings with reasons, as the body of a maker post.** Literally a list of `setting, because reason`, one line each.

**Pattern G, the closer.** "MIT. Zero required environment variables. If you print one, post it. I want to see them."

**Pattern H, prior art named openly, in the post.** There are existing generators, hundreds of Thingiverse and Printables models, and a large Etsy category. Name them, then name the gap: nobody ships a slicer preset, a computed colour-change layer, a settings-rationale file, a laser SVG and a published scan log.

**Register per channel:** engineering log for HN, settings-with-reasons for print and laser subs, build process for vibe coders, five frontend bullets including measured contrast ratios for r/webdev, lesson-generalised for LinkedIn, three sentences for newsletters, one exactly-formatted line for awesome lists.

**The awesome-list one-liner** (format has to be exact):
```
[NAME](https://name.example.dev) - Turn a song link into a printable keychain tag: a 3MF with the filament change already assigned, an STL, and an SVG for laser. No upload, no signup.
```

### 5.5 The private launch board

Reuse monolith's pattern wholesale: **shape in public code, content in a private store.** `LaunchState = { version, updatedAt, brief, channels[], tasks[], metrics[] }`, `Channel` carries `rules`, `title`, `body`, `postedUrl` and `result` so the board becomes a log. Password gate via one `ADMIN_PASSWORD`, 404 when unset, scrypt-derived HMAC session cookie, `/admin` in `robots.ts` disallow, whole-state autosave on a 700 ms debounce. Two known drifts to fix before reuse: `launch-update.mjs` writes a `signups` key that `parseState` does not read, and `.data/launch.json` ships with `updatedAt: ""`.

---

## 6. WHAT MONOLITH LACKS

Honest gaps. Each one is an opportunity for the sibling to be visibly better, and several are cheap.

1. **The physical verification never runs in CI.** `verify:print` requires Bambu Studio on macOS and the README flags this as a known gap. **Fix:** split the harness. The half that is pure computation (parse the fixture, build, split, assert the re-extracted bar heights match) goes in `npm test` and runs on every PR. The half that needs a slicer or a phone appends a dated, device-versioned row to a committed `VERIFY-LOG.md`, so the evidence is in the repo even when the gate cannot be.
2. **Zero git tags, nothing ever published.** The whole OIDC publish pipeline is untested, and it has a hard prerequisite (trusted publishing configured on npmjs.com for the package, pointing at this repo and workflow) that fails as a 403 if missed. **Fix:** publish `0.1.0` on day one, before launch week, and confirm the provenance badge renders on the npm page. A broken `npx` command in a Show HN post is unrecoverable.
3. **No CHANGELOG and no release notes.** For a package with a real release workflow this is a gap. **Fix:** a `CHANGELOG.md` in Keep-a-Changelog shape, one entry per release, written in the same voice.
4. **No PR template, no CODEOWNERS, no CODE_OF_CONDUCT.** **Fix:** add a 12-line PR template with three checkboxes. CODEOWNERS is one line. A CoC is optional but some list maintainers and OpenSSF Scorecard check for it.
5. **No coverage configuration and no coverage number anywhere.** **Fix:** `vitest --coverage` in a non-blocking CI step, and put the number in CONTRIBUTING rather than in a badge.
6. **No browser or end-to-end test at all** for a product whose primary surface is an interactive canvas. **Fix:** one smoke test that boots the app, submits a link, and asserts the download href resolves to a 200 with the right content type. Use the `agent-browser` CLI rather than adding Playwright as a dependency.
7. **No bundle budget.** `three` plus `@react-three/fiber` plus `@react-three/drei` is the heaviest thing in the repo and the landing page is the funnel. **Fix:** ship v0.1 without three.js (§2.1) and add a CI check on the first-load JS number.
8. **Documentation drift in the private layer.** `HANDOFF.md` says 49 tests, `PR.md` says 116, reality is 133. Line-number cross references ("README line 163") point at content that has moved. **Fix:** never cite line numbers in prose, cite anchors or symbol names. Either generate the test count into the README from a script or do not state it.
9. **The em-dash ban is stated and then violated once** (`README.md:179`). **Fix:** `scripts/no-em-dash.sh` wired into `npm run lint:prose` and into CI. Ten lines of shell that make the rule real.
10. **The state parser is permissive about unknown keys**, which is how `signups` was silently dropped. **Fix:** log or throw on unknown keys in development while still tolerating them in production.
11. **Single upstream, single token, no documented backoff.** The README admits the fragile data path. **Fix here matters more,** because the scannable endpoint is undocumented: cache aggressively at the CDN, cache the parsed heights, return a typed 429 with a human sentence, and provide an offline "paste your own scannable SVG" path so the product still works when the endpoint does not.
12. **CLI only, no library surface.** No `exports`, no `main`, no `types`. Consumers get a binary and nothing else. **Fix:** ship `buildTag` and `parseScannable` as a typed library entry alongside the bin.
13. **No accessibility verification beyond measured contrast.** No keyboard-only path documented, no reduced-motion assertion in tests. **Fix:** one paragraph in the README on the keyboard path, and one test asserting the reduced-motion branch.
14. **English only.** Fine for the audience, but the author's marketing plan is written in German and the December gifting audience is not exclusively English-speaking. Consider one translated landing variant, or explicitly decide not to and say why.

---

## 7. RISKS

Monolith faced none of these. GitHub does not object to people modelling their own contribution graph. Spotify is a different counterparty, and getting this wrong turns a portfolio project into a liability. Everything marked **[U]** must be verified against the primary source before it appears in any published text, following the `marktanalyse.md` convention.

### 7.1 Naming, the highest-cost and cheapest-to-fix risk

"Spotify" is a registered trademark. It must not appear in:

- the GitHub repo name (so the current `SPOTIFY-TAG` directory must be renamed before `git init` or before the remote is created),
- the npm package name or the bin command,
- the domain or any subdomain,
- the product name, wordmark, logo, OG card title, banner or favicon,
- social handles.

Nominative descriptive use in prose is what is allowed: "turns a Spotify track link into a printable tag". Not: "SpotifyTag", "Spotify Keychain Generator" as a product name.

Candidate names in monolith's register (single word, uppercase wordmark, npm name suffixed like `monolith-3d`): **TONEARM** (`tonearm-3d`), **PRESSING**, **SIDE B**, **LOCKGROOVE**, **CUE**. Check npm and the domain in the same sitting. Monolith's own note applies: both `monolith` and `monolith-cli` were taken, hence `monolith-3d`.

### 7.2 The Spotify mark inside the code is the sharpest problem

The scannable image contains Spotify's logo mark. Spotify's design guidelines forbid modifying the logo: no recolouring, no rotation, no outlining, no adding depth or 3D effects, and no incorporating it into another logo or product. **Extruding it into geometry is a modification.** Options, in increasing order of risk:

1. **Default: do not extrude the mark at all.** Generate the bars only. Ship it as the default and find out by measurement whether the Spotify app still scans a bars-only tag. [U] If it does, this is both the safest and the best engineering answer, and it becomes a headline finding.
2. If the mark is required for scanning, reproduce it as a **flat, zero-relief, two-colour area** in the correct proportions and clear space, which is closer to reproducing the mark than to modifying it, and never scaled non-uniformly or recoloured.
3. Make anything beyond option 1 opt-in, with the guideline text quoted in the CLI flag help and in `PRINT-ME.txt`.

Do not stylise, chamfer, round, emboss with a bevel, or "improve" the mark under any circumstances.

### 7.3 Licence stance must differ from monolith

Monolith says: code MIT, generated models CC BY 4.0, "the objects are yours", selling them is fine, and its marketing plan calls that "the simplest answer in the whole plan". **That answer is not available here.** The generated tag embeds a third-party trademark. The project cannot license to the user rights it does not hold.

Write it plainly, in README §12 and in `TRADEMARKS.md`:

> The software is MIT. The Spotify Code in the output is Spotify's, and this project does not and cannot grant you rights to it. This exists so you can make a tag for yourself or for a friend. Selling printed tags is between you and Spotify, and Spotify has acted against exactly that before.

Do **not** stamp the generated model with CC BY 4.0. Do not put "commercial use allowed" anywhere. Do not include a print-and-ship affiliate link, which monolith's research identified as the most common monetisation in the niche: here it is the fastest route to a cease and desist.

### 7.4 The scannable endpoint is undocumented

`scannables.scdn.co` is not part of the documented Web API and therefore not clearly covered by the Developer Terms you would be agreeing to. [U] Consequences to design around:

- It can change shape or disappear. The parser must fail a **test** when it does, not fail a user.
- Rate limits are unknown. Cache the SVG and the parsed heights hard (`s-maxage=86400, stale-while-revalidate=604800`), never proxy uncached, and identify yourself with a User-Agent naming the project and repo.
- Provide an offline path: accept a pasted scannable SVG, so the product and the tests work with zero network and zero credentials. This is also what keeps the "zero required environment variables" property that monolith earned and the sibling should match.
- If the Web API is used for search-by-title and metadata, the client credentials are **server-side only**, in a `import "server-only"` module, and the product must still work without them via the paste-a-link path. Same shape as monolith's optional `GITHUB_TOKEN`.

### 7.5 Album art: refuse it, and document the refusal

An album-art lithophane or embossed cover is the obvious feature request and the worst idea in the project. Cover art is licensed from labels, the design guidelines forbid modifying it, and physical products are exactly the excluded use. **Do not build it.** Put the refusal in the roadmap section as a documented decision with its reason, in the same way monolith documents the `basematerials` and `project_settings.config` refusals. A documented refusal is content.

### 7.6 Track and artist text

Titles and artist names on the tag are facts and low risk. Keep them as plain raised text in the project's own bitmap font. Do not imitate Spotify's typography, do not set them in green, do not lay them out to resemble the Spotify player UI.

### 7.7 Do not use Spotify green as the brand accent

Monolith's accent is `#d7ff45`. Pick an accent for the sibling that is unmistakably not Spotify green (`#1ED760` / `#1DB954`), and do not use it in the OG card, banner, favicon or landing hero. Using Spotify's brand colour as your product's brand colour is the visual half of implying affiliation, and it costs nothing to avoid.

### 7.8 Model hosts are the highest-takedown-risk surface

Uploading Spotify-code models to Printables, MakerWorld, Cults3D or Thangs is where enforcement actually lands. Rules for the sibling:

- Upload **one** demo tag, not a series. MakerWorld explicitly bans homogeneous uploads anyway.
- Use a track you own the rights to, or a Creative Commons track, and say which in the description.
- Do not use the trademark in the model title. Describe the function.
- Expect removal without warning and do not make the launch depend on these channels. Monolith's own re-prioritisation lesson applies twice over here: the photo-gated model hosts serve downloads, not stars, so move them to a later wave and keep them off the critical path.

### 7.9 The commercial precedent

There is a large Etsy and marketplace category of song-code plaques and keychains, and sellers in that category have been targeted before. [U, verify with a primary source before citing in any post] Two implications: do not court that audience, and be ready for the "can I sell these" question in the first ten comments of every thread. Write the answer once, put it in the README, and paste the same three sentences every time. Monolith's plan is explicit that improvising the sensitive answer in a live thread is expensive.

### 7.10 Do not claim it scans

Version and device every scan claim, the way monolith versioned the Bambu Studio segfault at `02.00.03.54`. "Measured to scan at 42 mm and above, on iPhone 15 and Pixel 8, Spotify app version X, with the filament pairs in the table" is defensible. "It scans" is a promise about a camera, a lighting condition, a filament and a phone you do not control. The `VERIFY-LOG.md` table is what makes the careful version credible rather than evasive.

### 7.11 Privacy claim needs one extra sentence

Monolith can say "a request comes in, a mesh is built, a file goes out". The sibling sends a track identifier to a third party on every build. Say so: "The track id you paste is sent to Spotify to fetch the code image. Nothing else leaves the server, and nothing is stored." A true, slightly longer claim beats a clean, slightly false one, and this project's whole pitch is that its claims are checked.

### 7.12 Disclaimer placement

The line "Not affiliated with, endorsed by, or sponsored by Spotify AB" belongs in six places, all of them generated from one constant in `src/lib/project.ts`: the README hero, `TRADEMARKS.md`, the site footer, `PRINT-ME.txt`, `/llms.txt`, and the npm package description. One constant, six consumers, zero drift, which is the same rule monolith uses for its licence strings and owner identity.