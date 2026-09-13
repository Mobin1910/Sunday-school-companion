import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import sharp from "sharp";

import { CONTRACT, PUBLIC_DIR } from "./contract.mjs";
import { buildIco } from "./ico.mjs";

/**
 * Exports the icons that cannot simply be the master at another size.
 *
 * Most of the set is a straight resize and is drawn once, by hand, from the
 * approved master. Two are not, and both are the ones people get wrong:
 *
 *   apple-touch  must be opaque, because iOS composites alpha onto black —
 *                Halo on a transparent background becomes Halo in a black
 *                hole. It also gets an inset, because Apple applies its own
 *                squircle and this artwork runs to all four edges.
 *
 *   maskable     must be opaque *and* drawn smaller. Android crops an
 *                adaptive icon to whatever shape the launcher wants and
 *                guarantees only the central 80% — a circle of 409px on a
 *                512 canvas. The master fills its frame edge to edge, ring
 *                at the top and wings at the sides, so used as-is it loses
 *                all three.
 *
 * And the social preview, which arrives at whatever aspect the artwork was
 * made at and has to become exactly 1200x630.
 *
 * This is compositing, not drawing. Every pixel comes from the approved
 * master or the approved preview; nothing here invents artwork, and the
 * output is deterministic, so re-running it after the master is redrawn
 * regenerates all three.
 *
 *   npm run brand:derive
 */

/** `--color-ground`. What Halo is lit against everywhere else in the product. */
const GROUND = { r: 7, g: 12, b: 28, alpha: 1 };

const iconMaster = join(PUBLIC_DIR, CONTRACT.master.path);

/**
 * Halo, scaled to `fraction` of a square of `size`, centred on the ground.
 *
 * `contain` rather than `cover`, so nothing is cropped, and the ground is
 * flattened in rather than left as alpha — both of the icons this builds
 * are ones a platform will composite for us if we do not.
 */
async function onGround(size, fraction) {
  const art = Math.round(size * fraction);
  const halo = await sharp(iconMaster)
    .resize(art, art, { fit: "contain", background: { ...GROUND, alpha: 0 } })
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: GROUND },
  })
    .composite([{ input: halo, gravity: "centre" }])
    .flatten({ background: GROUND })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const wrote = [];

async function write(key, buffer) {
  const file = join(PUBLIC_DIR, CONTRACT[key].path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, buffer);
  const { width, height } = await sharp(file).metadata();
  const kb = Math.round(buffer.length / 1024);
  wrote.push(`${CONTRACT[key].path} (${width}×${height}, ${kb} KB)`);
}

/*
  0.88 — a small inset, because Apple's mask rounds the corners and this
  artwork's ring and wings touch the edges of the master. Not the 0.6 the
  maskable needs: iOS crops corners, it does not crop to a circle.
*/
await write("appleTouch", await onGround(180, 0.88));

/*
  0.6 — the whole of Halo inside Android's guaranteed circle, which is 80%
  of the width. A square drawn at 60% has its corners at 0.6 × √2 ≈ 85% of
  the width, so the corners sit just outside the circle and the artwork
  itself, which is round, sits comfortably inside it.
*/
await write("icon512Maskable", await onGround(512, 0.6));

/*
  The preview: cropped to 1.91:1, resized, and written as JPEG.

  JPEG is the whole point of this step. The illustration is photographic, and
  as a PNG it came to 1.6 MB — past every scraper's cap for a link preview,
  which is how a perfectly correct og:image still produces a card with no
  picture in it. At quality 85 the same image is about 107 KB and looks the
  same.

  Cropped from the bottom only. The title sits at the top left and the
  child's face in the middle; the bottom edge is carpet and the lower lip of
  the book, which is the only part of this composition nothing depends on.
  Cropping from the top would move the title towards the frame edge, which is
  the one thing the safe area exists to prevent.
*/
const master = join(PUBLIC_DIR, CONTRACT.socialMaster.path);
const { width: sw, height: sh } = await sharp(master).metadata();
const target = CONTRACT.social.width / CONTRACT.social.height;
const keep = Math.min(Math.round(sw / target), sh);

await write(
  "social",
  await sharp(master)
    .extract({ left: 0, top: 0, width: sw, height: keep })
    .resize(CONTRACT.social.width, CONTRACT.social.height)
    .flatten({ background: GROUND })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer(),
);

/* And the root ICO, from whatever the favicon PNGs now are. */
await writeFile(join(PUBLIC_DIR, CONTRACT.faviconIco.path), await buildIco());
wrote.push(`${CONTRACT.faviconIco.path} (from the favicon PNGs)`);

console.log(`Derived:\n  ${wrote.join("\n  ")}`);
console.log("\nRun `npm run brand:check` to verify against the contract.");
