/**
 * From a parsed Spotify Code to a printable object.
 *
 * The 2D composition is done once, in `composeTag`, and everything else reads
 * it: the mesh builder, the laser SVG, the preview and the size warnings. That
 * is the reason a tag rendered on the site and a tag cut on a laser cannot
 * disagree about where a bar sits.
 *
 * The single filament change is a property of the composition, not of the
 * exporter: nothing belonging to the body exists above `changeZ`, and nothing
 * belonging to the code exists below it. `buildTag` asserts exactly that, so
 * the claim in the README is checked on every build rather than believed.
 */

import { extrude, extrudeWithPockets } from "./geom/extrude";
import { concatMeshes, type Mesh } from "./geom/mesh";
import {
  capsule,
  polygon,
  polygonContains,
  type Polygon,
  type Ring,
} from "./geom/polygon";
import { pathToRings } from "./geom/svgpath";
import { layout, type Layout, type ShapeName } from "./layouts";
import { SOURCE_HEIGHT, type Scannable } from "./scannable";
import { GLYPH_HEIGHT, textLine } from "./text/font";
import { gridToPolygons } from "./text/raster";

export type TagOptions = {
  shape?: ShapeName;
  /** Overrides the shape's long side, in mm. */
  widthMm?: number;
  thicknessMm?: number;
  /** How far the code stands out of the plate, in mm. */
  reliefMm?: number;
  holeDiameterMm?: number;
  /**
   * Extrude Spotify's mark along with the bars. Off by default: Spotify's
   * design guidelines forbid adding depth to the logo, and the bars are what
   * a scanner reads. See TRADEMARKS.md.
   */
  mark?: boolean;
  title?: string;
  artist?: string;
  /** Only used to report which layer the filament change lands on. */
  layerHeightMm?: number;
};

export type ResolvedOptions = Required<Omit<TagOptions, "title" | "artist">> & {
  title: string;
  artist: string;
};

export const DEFAULTS = {
  shape: "bar" as ShapeName,
  reliefMm: 0.6,
  layerHeightMm: 0.2,
  /** Depth of text engraved into the back, in mm. */
  engraveMm: 0.4,
  /** Edge length of one text pixel, in mm. */
  textPixelMm: 0.45,
} as const;

export type TagGeometry = {
  layout: Layout;
  /** Plate outline with every through hole as an interior ring. */
  plate: Polygon;
  /** Bars, and the mark when it was asked for, in plate coordinates. */
  code: Polygon[];
  /** Raised text, in the same filament as the code. */
  frontText: Polygon[];
  /**
   * Always empty. Engraving the back was built, measured and refused: see the
   * note in `layouts.ts`. The field stays so the shape of the geometry object
   * does not change if a later version finds a manifold way to do it.
   */
  backText: Polygon[];
  /** Recesses in the back: magnet seats, engraved text. */
  pockets: { poly: Polygon; depth: number }[];
  code2d: { width: number; height: number; x: number; y: number };
  scale: number;
  thickness: number;
  relief: number;
  changeZ: number;
  options: ResolvedOptions;
  notes: string[];
};

export type Part = {
  name: string;
  /** 1 is the body, 2 is the code. The numbers are slicer extruder ids. */
  filament: 1 | 2;
  mesh: Mesh;
};

export type Tag = {
  parts: Part[];
  geometry: TagGeometry;
  size: { width: number; height: number; thickness: number };
  /** Where the one filament change happens, in mm and as a layer index. */
  change: { z: number; layer: number; layerHeightMm: number; exact: boolean };
  /** Volume in mm3 per filament, so a UI can quote grams without slicing. */
  volume: { body: number; code: number };
};

export function resolveOptions(options: TagOptions = {}): ResolvedOptions {
  const shape = options.shape ?? DEFAULTS.shape;
  const base = layout(shape, {
    widthMm: options.widthMm,
    holeDiameterMm: options.holeDiameterMm,
    thicknessMm: options.thicknessMm,
    textLines: [options.title, options.artist].filter(Boolean).length,
  });
  return {
    shape,
    widthMm: base.size.width,
    thicknessMm: options.thicknessMm ?? base.thickness,
    reliefMm: options.reliefMm ?? DEFAULTS.reliefMm,
    holeDiameterMm: options.holeDiameterMm ?? 3.6,
    mark: options.mark ?? false,
    layerHeightMm: options.layerHeightMm ?? DEFAULTS.layerHeightMm,
    title: options.title ?? "",
    artist: options.artist ?? "",
  };
}

export function composeTag(scannable: Scannable, options: TagOptions = {}): TagGeometry {
  const resolved = resolveOptions(options);
  const notes: string[] = [];

  const l = layout(resolved.shape, {
    widthMm: resolved.widthMm,
    holeDiameterMm: resolved.holeDiameterMm,
    thicknessMm: resolved.thicknessMm,
    textLines: [resolved.title, resolved.artist].filter(Boolean).length,
  });

  // The artwork's own bounding box, in source units with y up.
  const bars = scannable.barsBox;
  const markBox =
    resolved.mark && scannable.mark
      ? {
          x: scannable.mark.x,
          y: SOURCE_HEIGHT - scannable.mark.y - scannable.mark.size,
          width: scannable.mark.size,
          height: scannable.mark.size,
        }
      : null;

  if (resolved.mark && !scannable.mark) {
    notes.push("the code image contained no mark, so the bars were used on their own");
  }

  const content = markBox
    ? {
        x: Math.min(bars.x, markBox.x),
        y: Math.min(bars.y, markBox.y),
        width: Math.max(bars.x + bars.width, markBox.x + markBox.width) - Math.min(bars.x, markBox.x),
        height:
          Math.max(bars.y + bars.height, markBox.y + markBox.height) - Math.min(bars.y, markBox.y),
      }
    : bars;

  const scale = Math.min(l.codeBox.width / content.width, l.codeBox.height / content.height);
  const offsetX = l.codeBox.x + (l.codeBox.width - content.width * scale) / 2 - content.x * scale;
  const offsetY = l.codeBox.y + (l.codeBox.height - content.height * scale) / 2 - content.y * scale;
  const toPlate = (x: number, y: number): [number, number] => [x * scale + offsetX, y * scale + offsetY];

  const code: Polygon[] = scannable.bars.map((b) => {
    const [x, y] = toPlate(b.x, b.y);
    return polygon(capsule(x, y, b.width * scale, b.height * scale));
  });

  if (markBox && scannable.mark) {
    code.push(markPolygon(scannable.mark.path, scannable.mark.x, scannable.mark.y, scale, offsetX, offsetY));
  }

  const plate = polygon(l.outline, l.holes);

  // Text goes on the front when the shape reserved room for it, and into the
  // back when it did not, because the front of a bar is entirely code.
  const frontText: Polygon[] = [];
  const backText: Polygon[] = [];
  const lines = [resolved.title, resolved.artist].filter((s) => s.length > 0);

  if (lines.length > 0) {
    const box = l.textBox;
    if (!box) {
      notes.push(`the ${l.name} shape has no room for text, so it was left off`);
    } else {
      const pixel = Math.min(0.9, box.height / (lines.length * GLYPH_HEIGHT * 1.4));
      lines.forEach((line, i) => {
        const rendered = textLine(line, { maxPixels: Math.floor(box.width / pixel) });
        if (rendered.truncated) notes.push(`"${line}" was cut to fit the shape`);
        const x = box.x + (box.width - rendered.widthPx * pixel) / 2;
        const y = box.y + box.height - (i + 1) * GLYPH_HEIGHT * pixel * 1.4;
        frontText.push(...gridToPolygons(rendered.grid, pixel, x, y));
      });
    }
  }

  const pockets = l.pockets.map((p) => ({ poly: polygon(p.ring), depth: p.depth }));

  const thickness = resolved.thicknessMm;
  const relief = resolved.reliefMm;
  const changeZ = thickness - relief;

  if (changeZ <= 0) throw new Error(`relief ${relief} mm does not fit in a ${thickness} mm tag`);
  for (const p of pockets) {
    if (p.depth >= changeZ) {
      throw new Error(`a ${p.depth} mm pocket does not fit under a ${changeZ} mm body`);
    }
  }

  // Every code shape has to sit on the plate, or it prints in mid air.
  for (const shape of code) {
    for (const point of shape.outer) {
      if (!polygonContains(plate, point)) {
        throw new Error("the code artwork does not fit inside the plate outline");
      }
    }
  }

  const codeMinX = Math.min(...code.flatMap((p) => p.outer.map(([x]) => x)));
  const codeMaxX = Math.max(...code.flatMap((p) => p.outer.map(([x]) => x)));
  const codeMinY = Math.min(...code.flatMap((p) => p.outer.map(([, y]) => y)));
  const codeMaxY = Math.max(...code.flatMap((p) => p.outer.map(([, y]) => y)));

  const barPitch = (scannable.bars[1].x - scannable.bars[0].x) * scale;
  const barWidth = scannable.bars[0].width * scale;
  if (barWidth < 0.85) {
    notes.push(
      `a bar is ${barWidth.toFixed(2)} mm wide, which is close to what a 0.4 mm nozzle can express. A wider tag prints cleaner.`,
    );
  }
  if (barPitch - barWidth < 0.5) {
    notes.push(`the gap between bars is ${(barPitch - barWidth).toFixed(2)} mm, which may merge in print`);
  }

  return {
    layout: l,
    plate,
    code,
    frontText,
    backText,
    pockets,
    code2d: { x: codeMinX, y: codeMinY, width: codeMaxX - codeMinX, height: codeMaxY - codeMinY },
    scale,
    thickness,
    relief,
    changeZ,
    options: resolved,
    notes,
  };
}

export function buildTag(scannable: Scannable, options: TagOptions = {}): Tag {
  const geometry = composeTag(scannable, options);
  const { plate, code, frontText, pockets, changeZ, thickness } = geometry;

  const body = extrudeWithPockets(plate, 0, changeZ, pockets);
  const codeMesh = concatMeshes([...code, ...frontText].map((p) => extrude(p, changeZ, thickness)));

  // The property the whole design rests on, checked rather than assumed.
  assertBand(body, 0, changeZ, "body");
  assertBand(codeMesh, changeZ, thickness, "code");

  const layerHeight = geometry.options.layerHeightMm;
  const layerFloat = changeZ / layerHeight;
  const parts: Part[] = [
    { name: "Body", filament: 1, mesh: body },
    { name: "Code", filament: 2, mesh: codeMesh },
  ];

  return {
    parts,
    geometry,
    size: { width: geometry.layout.size.width, height: geometry.layout.size.height, thickness },
    change: {
      z: changeZ,
      layer: Math.round(layerFloat) + 1,
      layerHeightMm: layerHeight,
      exact: Math.abs(layerFloat - Math.round(layerFloat)) < 1e-6,
    },
    volume: { body: volumeOf(body), code: volumeOf(codeMesh) },
  };
}

function markPolygon(
  path: string,
  markX: number,
  markY: number,
  scale: number,
  offsetX: number,
  offsetY: number,
): Polygon {
  // The mark's path is drawn in the group's local space with y pointing down.
  const rings = pathToRings(path).map((ring) =>
    ring.map(([px, py]) => {
      const sourceX = markX + px;
      const sourceY = SOURCE_HEIGHT - (markY + py);
      return [sourceX * scale + offsetX, sourceY * scale + offsetY] as [number, number];
    }),
  );
  if (rings.length === 0) throw new Error("the mark path produced no rings");

  const withArea = rings.map((r) => ({ ring: r, area: ringArea(r) }));
  withArea.sort((a, b) => b.area - a.area);
  return polygon(
    withArea[0].ring,
    withArea.slice(1).map((r) => r.ring),
  );
}

function ringArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return Math.abs(sum) / 2;
}

function assertBand(mesh: Mesh, low: number, high: number, name: string): void {
  for (let i = 2; i < mesh.positions.length; i += 3) {
    const z = mesh.positions[i];
    if (z < low - 1e-6 || z > high + 1e-6) {
      throw new Error(
        `${name} reaches z ${z.toFixed(3)}, outside its band ${low} to ${high}. That would need a second filament change.`,
      );
    }
  }
}

function volumeOf(mesh: Mesh): number {
  let sum = 0;
  for (let i = 0; i < mesh.triangles.length; i += 3) {
    const a = mesh.triangles[i] * 3;
    const b = mesh.triangles[i + 1] * 3;
    const c = mesh.triangles[i + 2] * 3;
    const p = mesh.positions;
    sum +=
      p[a] * (p[b + 1] * p[c + 2] - p[c + 1] * p[b + 2]) -
      p[a + 1] * (p[b] * p[c + 2] - p[c] * p[b + 2]) +
      p[a + 2] * (p[b] * p[c + 1] - p[c] * p[b + 1]);
  }
  return sum / 6;
}
