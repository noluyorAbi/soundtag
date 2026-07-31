/**
 * A 3MF that Bambu Studio, OrcaSlicer and PrusaSlicer all open with the parts
 * already assigned to their filaments.
 *
 * The container is the 3MF core spec: one `<object>` per part holding a mesh,
 * one `<object>` holding them as components, and a build item that places the
 * assembly on the plate. What makes it useful rather than merely valid is
 * `Metadata/model_settings.config`, Bambu's own sidecar, which is where the
 * per-part extruder assignment lives. Bambu Studio reads it on import, so the
 * body arrives on filament 1 and the code on filament 2 without the user
 * assigning anything.
 *
 * Verified by round tripping through Bambu Studio's CLI: it re-exports the
 * file with `edges_fixed="0" degenerate_facets="0" facets_reversed="0"` and
 * keeps both part names and both extruder ids. See VERIFY-LOG.md.
 */

import type { Mesh } from "../geom/mesh";
import { PROJECT } from "../project";
import type { Tag } from "../tag";
import { zip } from "./zip";

export type Bed = { name: string; width: number; depth: number };

export const BEDS: Record<string, Bed> = {
  "bambu-a1": { name: "Bambu A1", width: 256, depth: 256 },
  "bambu-a1-mini": { name: "Bambu A1 mini", width: 180, depth: 180 },
  "bambu-p1": { name: "Bambu P1S", width: 256, depth: 256 },
  "bambu-x1": { name: "Bambu X1 Carbon", width: 256, depth: 256 },
  "prusa-mk4": { name: "Prusa MK4", width: 250, depth: 210 },
  "generic-220": { name: "Generic 220", width: 220, depth: 220 },
};

export type Placement = {
  tag: Tag;
  /** Centre of the tag on the bed, in mm. */
  x: number;
  y: number;
  label?: string;
};

export type ThreeMfOptions = {
  bed?: Bed;
  title?: string;
};

export function threeMf(placements: readonly Placement[], options: ThreeMfOptions = {}): Uint8Array {
  if (placements.length === 0) throw new Error("nothing to export");
  const bed = options.bed ?? BEDS["bambu-a1"];
  const title = options.title ?? "soundtag";

  const objects: string[] = [];
  const items: string[] = [];
  const configObjects: string[] = [];
  const instances: string[] = [];

  let nextId = 1;
  placements.forEach((placement, index) => {
    const partIds: { id: number; part: (typeof placement.tag.parts)[number] }[] = [];
    for (const part of placement.tag.parts) {
      const id = nextId++;
      partIds.push({ id, part });
      objects.push(`  <object id="${id}" type="model">${meshXml(part.mesh)}</object>`);
    }

    const assemblyId = nextId++;
    objects.push(
      `  <object id="${assemblyId}" type="model">\n   <components>\n${partIds
        .map((p) => `    <component objectid="${p.id}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>`)
        .join("\n")}\n   </components>\n  </object>`,
    );

    // The mesh is built with its own origin at a corner, so centring is a
    // translation in the build item rather than a transform baked into the
    // vertices. That keeps two placements of the same tag byte identical.
    const dx = placement.x - placement.tag.size.width / 2;
    const dy = placement.y - placement.tag.size.height / 2;
    items.push(
      `  <item objectid="${assemblyId}" transform="1 0 0 0 1 0 0 0 1 ${round(dx)} ${round(dy)} 0" printable="1"/>`,
    );

    const name = escapeXml(placement.label ?? title);
    configObjects.push(
      `  <object id="${assemblyId}">\n` +
        `    <metadata key="name" value="${name}"/>\n` +
        `    <metadata key="extruder" value="1"/>\n` +
        partIds
          .map(
            (p) =>
              `    <part id="${p.id}" subtype="normal_part">\n` +
              `      <metadata key="name" value="${escapeXml(p.part.name)}"/>\n` +
              `      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n` +
              `      <metadata key="extruder" value="${p.part.filament}"/>\n` +
              `    </part>`,
          )
          .join("\n") +
        `\n  </object>`,
    );

    instances.push(
      `    <model_instance>\n      <metadata key="object_id" value="${assemblyId}"/>\n` +
        `      <metadata key="instance_id" value="${index}"/>\n    </model_instance>`,
    );
  });

  const model =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021">\n` +
    ` <metadata name="Application">${PROJECT.name}</metadata>\n` +
    ` <metadata name="Title">${escapeXml(title)}</metadata>\n` +
    ` <metadata name="Description">${escapeXml(PROJECT.disclaimer)}</metadata>\n` +
    ` <metadata name="LicenseTerms">${escapeXml(PROJECT.outputRights)}</metadata>\n` +
    ` <resources>\n${objects.join("\n")}\n </resources>\n` +
    ` <build>\n${items.join("\n")}\n </build>\n` +
    `</model>\n`;

  const settings =
    `<?xml version="1.0" encoding="UTF-8"?>\n<config>\n` +
    `${configObjects.join("\n")}\n` +
    `  <plate>\n    <metadata key="plater_id" value="1"/>\n` +
    `    <metadata key="plater_name" value="${escapeXml(bed.name)}"/>\n` +
    `    <metadata key="locked" value="false"/>\n${instances.join("\n")}\n  </plate>\n</config>\n`;

  return zip([
    { path: "[Content_Types].xml", data: CONTENT_TYPES },
    { path: "_rels/.rels", data: RELS },
    { path: "3D/3dmodel.model", data: model },
    { path: "Metadata/model_settings.config", data: settings },
  ]);
}

/** Places one tag in the middle of the bed. */
export function singleTagPlacement(tag: Tag, bed: Bed = BEDS["bambu-a1"], label?: string): Placement {
  return { tag, x: bed.width / 2, y: bed.depth / 2, label };
}

function meshXml(mesh: Mesh): string {
  const vertices: string[] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    vertices.push(
      `<vertex x="${round(mesh.positions[i])}" y="${round(mesh.positions[i + 1])}" z="${round(mesh.positions[i + 2])}"/>`,
    );
  }
  const triangles: string[] = [];
  for (let i = 0; i < mesh.triangles.length; i += 3) {
    triangles.push(
      `<triangle v1="${mesh.triangles[i]}" v2="${mesh.triangles[i + 1]}" v3="${mesh.triangles[i + 2]}"/>`,
    );
  }
  return `<mesh><vertices>${vertices.join("")}</vertices><triangles>${triangles.join("")}</triangles></mesh>`;
}

/**
 * Four decimals is 100 nanometres, three orders of magnitude below what a
 * printer resolves, and it keeps the numbers free of float noise so the bytes
 * stay deterministic.
 */
function round(n: number): string {
  const fixed = n.toFixed(4);
  return fixed === "-0.0000" ? "0.0000" : fixed;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
 <Default Extension="png" ContentType="image/png"/>
</Types>
`;

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>
`;
