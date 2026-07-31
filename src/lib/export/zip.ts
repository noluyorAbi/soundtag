/**
 * A ZIP writer, because a 3MF is a ZIP and pulling in a compression library to
 * write four small XML files is not a trade worth making.
 *
 * Two decisions are deliberate. Entries are stored, not deflated: the archive
 * is a few hundred kilobytes either way, and stored entries mean this file has
 * no compression code to be wrong about. Timestamps are frozen at 2020-01-01,
 * which is what makes two builds of the same tag byte identical, so a cache
 * key can be the request and a test can assert on the bytes.
 */

export type ZipEntry = { path: string; data: Uint8Array | string };

/** 2020-01-01 00:00:00 in the MS-DOS fields ZIP uses. */
const DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1;
const DOS_TIME = 0;

export function zip(entries: readonly ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const files = entries.map((e) => ({
    name: encoder.encode(e.path),
    data: typeof e.data === "string" ? encoder.encode(e.data) : e.data,
  }));

  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const crc = crc32(file.data);
    const header = new Uint8Array(30 + file.name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true); // version needed
    view.setUint16(6, 0, true); // flags
    view.setUint16(8, 0, true); // stored
    view.setUint16(10, DOS_TIME, true);
    view.setUint16(12, DOS_DATE, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, file.data.length, true);
    view.setUint32(22, file.data.length, true);
    view.setUint16(26, file.name.length, true);
    view.setUint16(28, 0, true);
    header.set(file.name, 30);

    local.push(header, file.data);

    const entry = new Uint8Array(46 + file.name.length);
    const entryView = new DataView(entry.buffer);
    entryView.setUint32(0, 0x02014b50, true);
    entryView.setUint16(4, 20, true); // version made by
    entryView.setUint16(6, 20, true); // version needed
    entryView.setUint16(8, 0, true);
    entryView.setUint16(10, 0, true);
    entryView.setUint16(12, DOS_TIME, true);
    entryView.setUint16(14, DOS_DATE, true);
    entryView.setUint32(16, crc, true);
    entryView.setUint32(20, file.data.length, true);
    entryView.setUint32(24, file.data.length, true);
    entryView.setUint16(28, file.name.length, true);
    entryView.setUint16(30, 0, true);
    entryView.setUint16(32, 0, true);
    entryView.setUint16(34, 0, true);
    entryView.setUint16(36, 0, true);
    entryView.setUint32(38, 0, true);
    entryView.setUint32(42, offset, true);
    entry.set(file.name, 46);
    central.push(entry);

    offset += header.length + file.data.length;
  }

  const centralSize = central.reduce((sum, c) => sum + c.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  return concat([...local, ...central, end]);
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
