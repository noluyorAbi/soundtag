#!/usr/bin/env node
/**
 * The command line tool.
 *
 * Argument parsing is thirty lines rather than a dependency, and every command
 * writes files to disk and prints what it wrote and why. The one network call
 * is the code image, and `--from-svg` removes even that, which is what makes
 * this usable in a workshop with no internet and in a test with no mocking.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { binaryStl } from "../lib/export/stl";
import { laserSvg, previewSvg } from "../lib/export/svg";
import { BEDS, singleTagPlacement, threeMf, type Bed } from "../lib/export/threemf";
import { bestPairs, changePlan, pairing } from "../lib/filament";
import { layout, SHAPES, type ShapeName } from "../lib/layouts";
import { packPlate } from "../lib/plate";
import { PROJECT } from "../lib/project";
import { fetchScannable, parseRef, parseScannable } from "../lib/scannable";
import { buildTag, type Tag, type TagOptions } from "../lib/tag";

type Flags = Record<string, string | boolean>;

const USAGE = `${PROJECT.name} ${PROJECT.tagline}

  soundtag <spotify link> [options]     build one tag
  soundtag batch <link> <link> ...      pack several tags onto one plate
  soundtag shapes                       list the shapes
  soundtag palette                      list filament pairs by contrast

Options
  --shape <name>        ${SHAPES.join(", ")} (default bar)
  --width <mm>          long side of the tag
  --thickness <mm>      total thickness
  --relief <mm>         how far the code stands out (default 0.6)
  --hole <mm>           keyring hole diameter
  --title <text>        song title, engraved or raised depending on the shape
  --artist <text>       second line of text
  --layer-height <mm>   only used to report the change layer (default 0.2)
  --mark                extrude Spotify's logo as well, see TRADEMARKS.md
  --bed <name>          ${Object.keys(BEDS).join(", ")}
  --format <list>       3mf, stl, svg, preview (default 3mf,svg)
  --out <dir>           where to write (default .)
  --from-svg <file>     use a saved code image instead of the network
  --body <hex>          body colour, for the preview and the contrast check
  --code <hex>          code colour

${PROJECT.disclaimer}`;

export async function main(argv: string[]): Promise<number> {
  const { positional, flags } = parseArgs(argv);
  const command = positional[0];

  if (!command || flags.help || flags.h) {
    console.log(USAGE);
    return command ? 0 : 1;
  }

  try {
    if (command === "shapes") return listShapes();
    if (command === "palette") return listPalette();
    if (command === "batch") return await batch(positional.slice(1), flags);
    return await one(command, flags);
  } catch (error) {
    console.error(`${PROJECT.name}: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

function listShapes(): number {
  for (const name of SHAPES) {
    const l = layout(name);
    console.log(
      `${name.padEnd(9)} ${l.size.width} by ${l.size.height} mm, ${l.thickness} mm thick. ${l.about}`,
    );
  }
  return 0;
}

function listPalette(): number {
  console.log("body            code            contrast");
  for (const pair of bestPairs(14)) {
    console.log(
      `${pair.body.name.padEnd(15)} ${pair.code.name.padEnd(15)} ${pair.ratio.toFixed(1)} to 1`,
    );
  }
  console.log(
    "\nContrast is what a camera reads. What has actually been printed and scanned is in VERIFY-LOG.md.",
  );
  return 0;
}

async function one(link: string, flags: Flags): Promise<number> {
  const tag = await build(link, flags);
  const out = String(flags.out ?? ".");
  const base = slug(String(flags.title ?? "") || parseRef(link).id);
  await writeOutputs(tag, out, base, flags);
  report(tag, flags);
  return 0;
}

async function batch(links: string[], flags: Flags): Promise<number> {
  if (links.length === 0) throw new Error("batch needs at least one link");
  const bed = bedFrom(flags);
  const tags: { tag: Tag; label?: string }[] = [];
  for (const link of links) {
    tags.push({ tag: await build(link, flags), label: parseRef(link).id });
  }

  const packed = packPlate(tags, bed);
  if (packed.placements.length === 0) throw new Error("nothing fits on that plate");
  for (const drop of packed.dropped) {
    console.error(`did not fit and was left out: ${drop.label ?? "a tag"}`);
  }

  const out = String(flags.out ?? ".");
  await mkdir(resolve(out), { recursive: true });
  const file = join(resolve(out), `soundtag-batch-${packed.placements.length}.3mf`);
  await writeFile(file, threeMf(packed.placements, { bed, title: `soundtag batch` }));

  const first = packed.placements[0].tag;
  console.log(`${packed.placements.length} tags on a ${bed.name} plate`);
  console.log(`  ${file}`);
  console.log(`  one filament change for the whole plate, ${changeSentence(first, flags)}`);
  return 0;
}

async function build(link: string, flags: Flags): Promise<Tag> {
  const ref = parseRef(link);
  const svg = flags["from-svg"]
    ? await readFile(String(flags["from-svg"]), "utf8")
    : await fetchScannable(ref);
  return buildTag(parseScannable(svg), optionsFrom(flags));
}

function optionsFrom(flags: Flags): TagOptions {
  const shape = flags.shape ? String(flags.shape) : undefined;
  if (shape && !(SHAPES as string[]).includes(shape)) {
    throw new Error(`unknown shape "${shape}". Try one of ${SHAPES.join(", ")}`);
  }
  return {
    shape: shape as ShapeName | undefined,
    widthMm: num(flags.width),
    thicknessMm: num(flags.thickness),
    reliefMm: num(flags.relief),
    holeDiameterMm: num(flags.hole),
    layerHeightMm: num(flags["layer-height"]),
    mark: flags.mark === true,
    title: flags.title ? String(flags.title) : undefined,
    artist: flags.artist ? String(flags.artist) : undefined,
  };
}

async function writeOutputs(tag: Tag, out: string, base: string, flags: Flags): Promise<void> {
  const formats = String(flags.format ?? "3mf,svg")
    .split(",")
    .map((f) => f.trim().toLowerCase())
    .filter(Boolean);
  const bed = bedFrom(flags);
  const dir = resolve(out);
  await mkdir(dir, { recursive: true });

  for (const format of formats) {
    const file = join(dir, `${base}.${format === "preview" ? "preview.svg" : format}`);
    await mkdir(dirname(file), { recursive: true });

    if (format === "3mf") {
      await writeFile(file, threeMf([singleTagPlacement(tag, bed, base)], { bed, title: base }));
    } else if (format === "stl") {
      await writeFile(file, binaryStl(tag.parts.map((p) => p.mesh)));
    } else if (format === "svg") {
      await writeFile(file, laserSvg(tag.geometry));
    } else if (format === "preview") {
      await writeFile(
        file,
        previewSvg(tag.geometry, {
          bodyColour: String(flags.body ?? "#101012"),
          codeColour: String(flags.code ?? "#f6f6f4"),
        }),
      );
    } else {
      throw new Error(`unknown format "${format}". Try 3mf, stl, svg or preview.`);
    }
    console.log(`  ${file}`);
  }
}

function report(tag: Tag, flags: Flags): void {
  const { width, height, thickness } = tag.size;
  console.log(`${width} by ${height} by ${thickness} mm, ${tag.geometry.options.shape}`);
  console.log(`  ${changeSentence(tag, flags)}`);
  console.log(
    `  material ${((tag.volume.body + tag.volume.code) / 1000).toFixed(2)} cm3, about ${(((tag.volume.body + tag.volume.code) / 1000) * 1.24).toFixed(1)} g of PLA`,
  );

  const pair = pairing(String(flags.body ?? "#101012"), String(flags.code ?? "#f6f6f4"));
  console.log(`  contrast ${pair.ratio.toFixed(1)} to 1, which is ${pair.verdict}`);
  for (const note of tag.geometry.notes) console.log(`  note: ${note}`);
  if (!tag.geometry.options.mark) {
    console.log("  the Spotify mark is not extruded. --mark adds it, see TRADEMARKS.md first.");
  }
}

function changeSentence(tag: Tag, flags: Flags): string {
  const layerHeight = num(flags["layer-height"]) ?? tag.change.layerHeightMm;
  const plan = changePlan(tag.change.z, layerHeight);
  return plan.instruction;
}

function bedFrom(flags: Flags): Bed {
  const name = String(flags.bed ?? "bambu-a1");
  const bed = BEDS[name];
  if (!bed) throw new Error(`unknown bed "${name}". Try one of ${Object.keys(BEDS).join(", ")}`);
  return bed;
}

function num(value: string | boolean | undefined): number | undefined {
  if (value === undefined || typeof value === "boolean") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function slug(text: string): string {
  const clean = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || "soundtag";
}

export function parseArgs(argv: string[]): { positional: string[]; flags: Flags } {
  const positional: string[] = [];
  const flags: Flags = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const [name, inline] = arg.slice(2).split("=");
    if (inline !== undefined) {
      flags[name] = inline;
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      flags[name] = true;
    } else {
      flags[name] = next;
      i++;
    }
  }

  return { positional, flags };
}

// Running as a bundled binary rather than being imported by a test.
if (process.argv[1] && /soundtag(\.mjs)?$/.test(process.argv[1])) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
