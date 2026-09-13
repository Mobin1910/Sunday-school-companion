/**
 * The brand asset contract, as data the tools can read.
 *
 * A deliberate, small duplication of `src/brand/assets.ts`. These scripts
 * are plain Node run outside the Next build — they cannot import a
 * TypeScript module with a `@/` alias without dragging a whole toolchain in
 * for three scripts. The list is short, it changes rarely, and `check.mjs`
 * compares the two files line for line so the copy cannot quietly drift:
 * add an asset in one and the checker fails until it is in both.
 */

export const PUBLIC_DIR = "public";

/** Every asset, keyed the same way `brandAssets` keys it. */
export const CONTRACT = {
  master: { path: "brand/app-icon/icon-1024.png", width: 1024, height: 1024 },
  favicon16: { path: "brand/favicon/favicon-16.png", width: 16, height: 16 },
  favicon32: { path: "brand/favicon/favicon-32.png", width: 32, height: 32 },
  faviconIco: { path: "favicon.ico", width: 32, height: 32, ico: true },
  appleTouch: {
    path: "brand/pwa/apple-touch-icon-180.png",
    width: 180,
    height: 180,
    opaque: true,
  },
  icon192: { path: "brand/pwa/icon-192.png", width: 192, height: 192 },
  icon512: { path: "brand/pwa/icon-512.png", width: 512, height: 512 },
  icon512Maskable: {
    path: "brand/pwa/icon-512-maskable.png",
    width: 512,
    height: 512,
    opaque: true,
  },
  // The illustration as drawn, at whatever aspect it came in. Not served.
  socialMaster: { path: "brand/social/preview-master.png", anySize: true },
  social: {
    path: "brand/social/preview-1200x630.jpg",
    width: 1200,
    height: 630,
    opaque: true,
    // Scrapers cap link-preview images. WhatsApp drops anything much past
    // 600 KB, which is how a correct og:image can still show no picture.
    maxKb: 300,
  },
};

/** Which PNGs the root `.ico` is built from, largest last. */
export const ICO_SOURCES = ["favicon16", "favicon32"];
