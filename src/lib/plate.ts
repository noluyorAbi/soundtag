/**
 * Packing several tags onto one build plate.
 *
 * A playlist is the natural unit here: twelve songs is twelve tags, and twelve
 * separate print jobs is how a good idea turns into an afternoon of babysitting
 * a printer. Packed onto one plate they are one job with one filament change,
 * because every tag in a batch shares the same change height.
 *
 * The packer is shelf packing: sort by height, fill rows left to right, start
 * a new row when the next tag will not fit. For rectangles of nearly identical
 * height, which is what a batch of one shape is, shelf packing is within a few
 * percent of optimal, and the alternative is a bin packing library.
 */

import type { Bed, Placement } from "./export/threemf";
import type { Tag } from "./tag";

export type PackOptions = {
  /** Gap between tags and to the plate edge, in mm. */
  gap?: number;
  /** Keep this margin free at every edge, in mm. */
  margin?: number;
};

export type PackResult = {
  placements: Placement[];
  /** Tags that did not fit, in the order they were given. */
  dropped: { tag: Tag; label?: string }[];
  used: { width: number; height: number };
};

export function packPlate(
  tags: readonly { tag: Tag; label?: string }[],
  bed: Bed,
  options: PackOptions = {},
): PackResult {
  const gap = options.gap ?? 4;
  const margin = options.margin ?? 6;
  const usableWidth = bed.width - margin * 2;
  const usableDepth = bed.depth - margin * 2;

  const order = tags
    .map((entry, index) => ({ ...entry, index }))
    .sort((a, b) => b.tag.size.height - a.tag.size.height || a.index - b.index);

  const placements: Placement[] = [];
  const dropped: { tag: Tag; label?: string }[] = [];

  let rowY = 0;
  let rowHeight = 0;
  let cursorX = 0;
  let widest = 0;

  for (const entry of order) {
    const { width, height } = entry.tag.size;
    if (width > usableWidth || height > usableDepth) {
      dropped.push(entry);
      continue;
    }
    if (cursorX + width > usableWidth) {
      rowY += rowHeight + gap;
      cursorX = 0;
      rowHeight = 0;
    }
    if (rowY + height > usableDepth) {
      dropped.push(entry);
      continue;
    }

    placements.push({
      tag: entry.tag,
      label: entry.label,
      // The plate's origin is its front left corner, and a placement is the
      // centre of the tag, which is what the 3MF build item wants.
      x: margin + cursorX + width / 2,
      y: margin + rowY + height / 2,
    });

    cursorX += width + gap;
    rowHeight = Math.max(rowHeight, height);
    widest = Math.max(widest, cursorX - gap);
  }

  return {
    placements,
    dropped,
    used: { width: widest, height: rowY + rowHeight },
  };
}

/** How many tags of this shape fit on the plate, without building them all. */
export function capacity(tag: Tag, bed: Bed, options: PackOptions = {}): number {
  const gap = options.gap ?? 4;
  const margin = options.margin ?? 6;
  const columns = Math.floor((bed.width - margin * 2 + gap) / (tag.size.width + gap));
  const rows = Math.floor((bed.depth - margin * 2 + gap) / (tag.size.height + gap));
  return Math.max(0, columns) * Math.max(0, rows);
}
