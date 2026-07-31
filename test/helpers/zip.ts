/**
 * An independent ZIP reader for the tests.
 *
 * It exists so that the container is never validated by the code that wrote
 * it. This walks the central directory, which is what a real reader does, and
 * returns each entry's stored checksum alongside its bytes so a test can check
 * the CRC against a separate implementation.
 */

export type ZipRead = { path: string; data: Uint8Array; crc: number };

export function readZip(bytes: Uint8Array): ZipRead[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error("no end of central directory record");

  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const entries: ZipRead[] = [];

  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error("bad central directory entry");
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const offset = view.getUint32(at + 42, true);
    const path = new TextDecoder().decode(bytes.slice(at + 46, at + 46 + nameLength));

    if (view.getUint32(offset, true) !== 0x04034b50) throw new Error("bad local header");
    const localName = view.getUint16(offset + 26, true);
    const localExtra = view.getUint16(offset + 28, true);
    const start = offset + 30 + localName + localExtra;

    entries.push({ path, data: bytes.slice(start, start + size), crc });
    at += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}
