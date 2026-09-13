import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { CONTRACT, ICO_SOURCES, PUBLIC_DIR } from "./contract.mjs";

/**
 * Builds `public/favicon.ico` from the favicon PNGs.
 *
 * An ICO is a container, not a format: since Windows Vista an entry inside
 * one may be a whole PNG file rather than a raw bitmap, and every browser
 * in use reads that. So this is a header, one directory entry per size, and
 * the PNGs appended unchanged — about forty lines, against a dependency
 * whose only job would be the same forty lines.
 *
 * It exists so that the root `.ico` is derived rather than authored. The
 * whole promise of this system is that finished artwork is dropped into
 * `public/brand/` and nothing else happens; an ICO nobody can regenerate
 * would be the one file that had to be hand-made somewhere else, and would
 * be the one that silently went stale.
 *
 *   node tools/brand/ico.mjs
 */

const HEADER = 6;
const ENTRY = 16;

export async function buildIco() {
  const images = await Promise.all(
    ICO_SOURCES.map(async (name) => {
      const asset = CONTRACT[name];
      return {
        size: asset.width,
        data: await readFile(join(PUBLIC_DIR, asset.path)),
      };
    }),
  );

  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  // Payloads start after the header and the whole directory.
  let offset = HEADER + ENTRY * images.length;

  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(ENTRY);
    // 0 means 256 in this field, which is why it is a single byte and why
    // nothing here may be larger than that.
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette colours: none, it is a PNG
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

// Run directly rather than imported: write the file.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const out = join(PUBLIC_DIR, CONTRACT.faviconIco.path);
  await writeFile(out, await buildIco());
  console.log(`Wrote ${out} from ${ICO_SOURCES.join(", ")}.`);
}
