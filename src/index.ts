/**
 * The library surface.
 *
 * Monolith shipped a binary and nothing else, which means a consumer who wants
 * the geometry has to shell out to a CLI and parse its output. This package
 * exports the same functions its own CLI and web app call, so a caller can
 * build a tag in process and get a mesh, a 3MF or an SVG back.
 */

export { PROJECT } from "./lib/project";

export {
  BAR_COUNT,
  fetchScannable,
  heightLevels,
  parseRef,
  parseScannable,
  scannableUrl,
  type Bar,
  type Scannable,
  type SpotifyRef,
} from "./lib/scannable";

export {
  buildTag,
  composeTag,
  DEFAULTS,
  resolveOptions,
  type Part,
  type ResolvedOptions,
  type Tag,
  type TagGeometry,
  type TagOptions,
} from "./lib/tag";

export { layout, outlineBox, SHAPES, type Layout, type ShapeName } from "./lib/layouts";

export {
  BEDS,
  singleTagPlacement,
  threeMf,
  type Bed,
  type Placement,
} from "./lib/export/threemf";
export { binaryStl } from "./lib/export/stl";
export { laserSvg, previewSvg, type PreviewOptions } from "./lib/export/svg";
export { zip, crc32, type ZipEntry } from "./lib/export/zip";

export { capacity, packPlate, type PackResult } from "./lib/plate";

export {
  bestPairs,
  changePlan,
  contrastRatio,
  FILAMENTS,
  GOOD_CONTRAST,
  pairing,
  POOR_CONTRAST,
  relativeLuminance,
  verdictFor,
  type ChangePlan,
  type Filament,
  type Pairing,
} from "./lib/filament";

export { LIMITS, parseRequest, toSearchParams, type TagRequest } from "./lib/request";

export {
  bounds,
  concatMeshes,
  isClosed,
  nonManifoldEdges,
  openEdges,
  surfaceArea,
  triangleCount,
  volume,
  type Mesh,
} from "./lib/geom/mesh";
