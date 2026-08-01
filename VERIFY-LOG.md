# Verification log

What has actually been measured, with the tool and the version that measured it. Anything not in this file is not claimed anywhere else.

## Runs in CI, on every push

`npm test`, 92 tests, about 0.8 seconds.

| Property | How it is checked |
|---|---|
| Every part is a closed surface | `openEdges` is empty for all five shapes, with and without text, with and without the mark |
| Every part is manifold by a slicer's measure | `nonManifoldEdges` merges vertices by position and asserts every edge has exactly two faces |
| Normals point outwards | the signed volume is positive |
| Volume is the geometry, not a guess | plate area times the change height, and artwork area times the relief, to 1e-9 |
| The archive is readable | a second ZIP reader in `test/helpers/zip.ts` walks the central directory and checks every CRC |
| Output is deterministic | two builds of the same tag are byte identical |
| One filament change | nothing of the body above the change height, nothing of the code below it |
| The code is Spotify's, unmodified | every bar's height equals the source height times one uniform scale |

## Runs on a machine with a slicer

`npm run verify:print`, macOS 15, Bambu Studio 2.0.3.54 command line.

Last run: 2026-07-31, all five shapes built with a title, exported as 3MF, opened with `BambuStudio --info`.

| Shape | Result | Volume |
|---|---|---|
| bar | `manifold = yes` | 3885 mm3 |
| coin | `manifold = yes` | 4779 mm3 |
| card | `manifold = yes` | 8596 mm3 |
| ornament | `manifold = yes` | 9350 mm3 |
| magnet | `manifold = yes` | 5684 mm3 |

Round trip through `BambuStudio --export-3mf`, which makes the slicer rewrite the file in its own format:

```
round trip kept value="Body"
round trip kept value="Code"
round trip kept key="extruder" value="2"
round trip kept edges_fixed="0"
round trip kept facets_reversed="0"
```

The slicer's own mesh statistics report `edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"` for both parts, which is the slicer saying it had nothing to repair.

## The deployment, checked against the live origin

`node ~/.claude/skills/domain/lib/verify.mjs soundtag.adatepe.dev --old soundtag-psi.vercel.app`, 01.08.2026.

| Check | Result |
|---|---|
| DNS resolves | `cname.vercel-dns.com` |
| Not behind the Cloudflare proxy | grey cloud, which is what Vercel needs to renew a certificate |
| HTTPS answers | 200, served by Vercel |
| `robots.txt` names this origin | `Host: https://soundtag.adatepe.dev` |
| Sitemap names this origin | first `loc` matches |
| `security.txt` canonical matches | matches |
| The old origin does not compete | `soundtag-psi.vercel.app` redirects, 308 |

The last row failed on the first run: two origins were serving the same pages, and which one is canonical was whichever a crawler saw first. That is what the redirect in `next.config.ts` is for.

A 3MF was also downloaded from the live route and opened in the slicer, rather than only from a local build: `manifold = yes`, 75.6 by 16.2 by 3.0 mm.

## Three things that were believed and turned out to be false

Each was believed, built, and then contradicted by the slicer.

1. **A stack of slabs is as good as one solid.** Cutting magnet seats by stacking a slab with holes under a plain slab produces a closed mesh that every test passed. Bambu Studio: `manifold = no, non_manifold_edges = 234`. The two slabs share a face, so every edge on it belongs to four triangles. The body is one solid with real pockets now.

2. **Engraving text into the back is a small feature.** A letter's counter has to stay standing inside the recess, and the bridges a triangulator adds to reach it land on the outline. Same failure, and the fix would have cost more than the feature was worth. Text is raised on the front, and the tag grows to make room rather than the code shrinking.

3. **A triangle with no area can be dropped.** It cannot. Dropping a sliver from a cap turns two of its interior edges into boundary edges, and the wall generator then grows a wall in the middle of a flat face. Three shapes were non manifold for exactly that reason and no test noticed, because index based closure still held. That check now runs by position, in the suite.

## Not measured yet

**Whether a printed tag scans, at what size, and with which filament pairs.** Nothing in this project claims it does. The contrast numbers in the UI are computed with the WCAG formula, which is a property of two colours, not a promise about a camera.

When a tag is printed and scanned, a row goes here: filament pair, tag width, code width, phone, operating system version, Spotify app version, lighting, and whether it scanned. Until then the honest answer is that this has not been tested.
