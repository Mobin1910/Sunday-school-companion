import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import sharp from "sharp";

import { CONTRACT, PUBLIC_DIR } from "./contract.mjs";
import { buildIco } from "./ico.mjs";

/**
 * Writes a flat placeholder for every brand asset that has no artwork yet.
 *
 * These are not branding and are not a draft of it. Each one is a single
 * flat fill of the product's ground colour at the exact size the contract
 * asks for — no mark, no gradient, no Halo, nothing that could be mistaken
 * for a decision anybody made. Their entire job is to let the app build,
 * the manifest validate and `/favicon.ico` resolve while the real artwork
 * is being drawn.
 *
 * Flat is also how `check.mjs` recognises them. A placeholder is a file
 * whose pixels are all one colour, which no real icon will ever be, so
 * nothing has to be marked, tracked or remembered to un-mark later. Drop
 * the finished artwork in and it stops being a placeholder by being
 * artwork.
 *
 *   node tools/brand/placeholders.mjs          fill in what is missing
 *   node tools/brand/placeholders.mjs --force  overwrite everything
 *
 * Without `--force` it will not touch a file that already exists, so it can
 * never eat real artwork.
 */

/** `--color-ground`, the room every screen is a dark corner of. */
const GROUND = { r: 7, g: 12, b: 28, alpha: 1 };

const force = process.argv.includes("--force");

const flat = (width, height) =>
  sharp({ create: { width, height, channels: 4, background: GROUND } })
    .png({ compressionLevel: 9 })
    .toBuffer();

const exists = async (file) => {
  try {
    const { access } = await import("node:fs/promises");
    await access(file);
    return true;
  } catch {
    return false;
  }
};

const written = [];
const kept = [];

for (const [name, asset] of Object.entries(CONTRACT)) {
  // The ICO is built from the PNGs rather than filled in on its own, so
  // there is still exactly one place a favicon comes from.
  if (asset.ico) continue;

  const file = join(PUBLIC_DIR, asset.path);

  if (!force && (await exists(file))) {
    kept.push(name);
    continue;
  }

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, await flat(asset.width, asset.height));
  written.push(`${name} → ${asset.path} (${asset.width}×${asset.height})`);
}

const ico = join(PUBLIC_DIR, CONTRACT.faviconIco.path);
await writeFile(ico, await buildIco());

console.log(
  written.length > 0
    ? `Wrote ${written.length} temporary placeholder(s):\n  ${written.join("\n  ")}`
    : "No placeholders needed; every asset already has a file.",
);
if (kept.length > 0) {
  console.log(`\nLeft alone (already present): ${kept.join(", ")}`);
}
console.log(`\nRebuilt ${CONTRACT.faviconIco.path} from the favicon PNGs.`);
console.log("\nRun `npm run brand:check` to see what is still a placeholder.");
