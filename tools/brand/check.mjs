import { readFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

import { CONTRACT, ICO_SOURCES, PUBLIC_DIR } from "./contract.mjs";

/**
 * Checks the brand artwork against the contract.
 *
 * Six questions, and each one is a way this has actually gone wrong for
 * people before:
 *
 *   Is the file there at all?            a 404 in every page load
 *   Is it the size it claims?            a 500px "512" icon Android rejects
 *   Is it still a flat placeholder?      shipping a dark square as branding
 *   Is it opaque where it must be?       iOS composites alpha onto black
 *   Does the ICO parse, with both sizes? a favicon nothing will render
 *   Does the code agree with this list?  an asset added in one file only
 *
 * It exits non-zero only for a real fault — missing, wrong-sized, or a
 * transparent asset that cannot be. A placeholder is reported loudly but is
 * not a failure: it is the expected state until the artwork exists, and a
 * checker that fails on the known situation is a checker people turn off.
 *
 *   npm run brand:check
 */

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const amber = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const faults = [];
const placeholders = [];
const good = [];

/**
 * Whether every pixel is the same colour.
 *
 * How a placeholder is recognised, with nothing to mark and nothing to
 * remember to unmark: real artwork is never one flat colour, and a flat
 * fill is exactly what `placeholders.mjs` writes. `sharp`'s per-channel
 * min and max are equal across a flat image and cannot be for anything
 * with a Halo in it.
 */
async function isFlat(file) {
  const { channels } = await sharp(file).stats();
  return channels.every((c) => c.min === c.max);
}

async function checkPng(name, asset, file) {
  let meta;
  try {
    meta = await sharp(file).metadata();
  } catch {
    faults.push(`${name}: ${asset.path} is missing or is not a readable image`);
    return;
  }

  if (meta.width !== asset.width || meta.height !== asset.height) {
    faults.push(
      `${name}: ${asset.path} is ${meta.width}×${meta.height}, contract says ${asset.width}×${asset.height}`,
    );
    return;
  }

  /*
    Where transparency is a bug rather than a choice. iOS composites an
    apple-touch icon onto black and Android composites a maskable one onto
    the launcher's own background, so alpha in either shows up as a hole in
    the icon on a real phone and nowhere else. A social preview with alpha
    is flattened to white by most scrapers, which on a dark composition is
    worse than it sounds.
  */
  if (asset.opaque) {
    const { isOpaque } = await sharp(file).stats();
    if (!isOpaque) {
      faults.push(
        `${name}: ${asset.path} has transparency and must be fully opaque`,
      );
      return;
    }
  }

  if (await isFlat(file)) {
    placeholders.push(`${name}: ${asset.path} (${asset.width}×${asset.height})`);
    return;
  }

  good.push(`${name}: ${asset.path}`);
}

async function checkIco(name, asset, file) {
  let data;
  try {
    data = await readFile(file);
  } catch {
    faults.push(`${name}: ${asset.path} is missing — run \`npm run brand:ico\``);
    return;
  }

  if (data.length < 6 || data.readUInt16LE(0) !== 0 || data.readUInt16LE(2) !== 1) {
    faults.push(`${name}: ${asset.path} is not a valid ICO`);
    return;
  }

  const count = data.readUInt16LE(4);
  if (count < 2) {
    faults.push(
      `${name}: ${asset.path} holds ${count} image(s); it should hold 16 and 32`,
    );
    return;
  }

  const sizes = Array.from({ length: count }, (_, i) => {
    const at = 6 + i * 16;
    return data.readUInt8(at) === 0 ? 256 : data.readUInt8(at);
  });

  /*
    Derived, so it is only as real as what it was built from. Reporting the
    ICO as done while the PNGs inside it are flat squares would be the one
    line in this output that lied.
  */
  const from = await Promise.all(
    ICO_SOURCES.map((key) => isFlat(join(PUBLIC_DIR, CONTRACT[key].path))),
  );

  if (from.every(Boolean)) {
    placeholders.push(`${name}: ${asset.path} (built from placeholder PNGs)`);
    return;
  }

  good.push(`${name}: ${asset.path} (${sizes.join(", ")})`);
}

/*
  The two lists that have to agree.

  `contract.mjs` is a copy of what `src/brand/assets.ts` declares, because
  these scripts are plain Node and that file is TypeScript behind a path
  alias. A copy that nothing compares is a copy that drifts, so this reads
  the keys straight out of the source and refuses to pass if they differ.
*/
async function checkInSync() {
  const source = await readFile("src/brand/assets.ts", "utf8");
  const table = source.slice(
    source.indexOf("export const brandAssets"),
    source.indexOf("} as const;", source.indexOf("export const brandAssets")),
  );

  const declared = new Set(
    [...table.matchAll(/^\s{2}([a-zA-Z0-9]+):/gm)].map((m) => m[1]),
  );
  const expected = new Set(Object.keys(CONTRACT));

  for (const key of expected) {
    if (!declared.has(key)) {
      faults.push(
        `${key} is in tools/brand/contract.mjs but not in src/brand/assets.ts`,
      );
    }
  }
  for (const key of declared) {
    if (!expected.has(key)) {
      faults.push(
        `${key} is in src/brand/assets.ts but not in tools/brand/contract.mjs`,
      );
    }
  }
}

for (const [name, asset] of Object.entries(CONTRACT)) {
  const file = join(PUBLIC_DIR, asset.path);
  if (asset.ico) await checkIco(name, asset, file);
  else await checkPng(name, asset, file);
}

await checkInSync();

if (good.length > 0) {
  console.log(green(`\n✓ ${good.length} asset(s) in place`));
  for (const line of good) console.log(dim(`    ${line}`));
}

if (placeholders.length > 0) {
  console.log(
    amber(`\n▲ ${placeholders.length} asset(s) are still TEMPORARY PLACEHOLDERS`),
  );
  for (const line of placeholders) console.log(amber(`    ${line}`));
  console.log(
    dim("\n    A flat fill of the ground colour, not branding. See BRAND_ASSETS.md"),
  );
  console.log(dim("    for what each one should be, then drop the artwork in."));
}

if (faults.length > 0) {
  console.log(red(`\n✗ ${faults.length} problem(s)`));
  for (const line of faults) console.log(red(`    ${line}`));
  console.log();
  process.exit(1);
}

console.log(
  placeholders.length === 0
    ? green("\nEvery brand asset is real artwork at the right size.\n")
    : "\n",
);
