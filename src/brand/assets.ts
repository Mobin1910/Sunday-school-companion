/**
 * Every file the app's own identity is made of, named once.
 *
 * This is the only place in the codebase that knows a branding path. The
 * manifest reads it, the document head reads it, and the checker reads it —
 * so the contract between "what the artwork has to be" and "what the app
 * asks for" cannot drift, and replacing the artwork is a matter of dropping
 * files into `public/brand/` and running the checker. No code changes.
 *
 * It deliberately does not go through `content/art.ts`. That resolves a
 * *chapter's* pictures: it searches five extensions, tolerates a picture
 * that has not been drawn yet, and reports one that nothing uses. None of
 * that is right here. A favicon has exactly one format, is not optional,
 * and is not content — a chapter can ship with a panel missing and the app
 * is fine; it cannot ship without an icon and be fine. Two different jobs,
 * two different modules, and neither pretending to be the other.
 *
 * Sizes live beside the paths because they are part of the same promise.
 * `tools/brand/check.mjs` reads the width and height from the actual file
 * and compares, so a 512 icon exported at 500 is caught before it ships
 * rather than by an Android home screen.
 *
 * See BRAND_ASSETS.md for what each one is for and how it should be drawn.
 */

export type BrandAsset = {
  /** The URL the app asks for. Always absolute from the site root. */
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly type: string;
  /** What it is for, in one line. Printed by the checker. */
  readonly purpose: string;
};

const png = (
  src: string,
  size: number | [number, number],
  purpose: string,
): BrandAsset => ({
  src,
  width: Array.isArray(size) ? size[0] : size,
  height: Array.isArray(size) ? size[1] : size,
  type: "image/png",
  purpose,
});

/**
 * Where brand artwork lives.
 *
 * `public/brand/`, a sibling of `public/art/`, because the project already
 * names public directories after what is in them rather than nesting them
 * under an `assets/`. Chapter artwork is `/art/<chapter>/…`; the app's own
 * identity is `/brand/…`.
 */
export const BRAND_DIR = "/brand";

export const brandAssets = {
  /**
   * The master. Nothing in the app requests it — it ships so that every
   * smaller icon has a single source to be exported from, and so that the
   * thing they were all cut from is in the repository rather than in
   * somebody's downloads folder.
   */
  master: png(
    `${BRAND_DIR}/app-icon/icon-1024.png`,
    1024,
    "Master app icon. Every square icon below is exported from this.",
  ),

  favicon16: png(
    `${BRAND_DIR}/favicon/favicon-16.png`,
    16,
    "Browser tab, smallest. Halo's silhouette and ring only.",
  ),

  favicon32: png(
    `${BRAND_DIR}/favicon/favicon-32.png`,
    32,
    "Browser tab and bookmarks, the size most browsers actually pick.",
  ),

  /**
   * The one asset that is not under `brand/`, and it is not an oversight.
   *
   * Browsers request `/favicon.ico` from the site root on their own, with no
   * markup involved and no way to point them elsewhere — a rel="icon" link
   * is an addition to that request, not a replacement for it. A file
   * anywhere else means a 404 in the network tab of every page load. So the
   * ICO sits at the root, and `tools/brand/ico.mjs` builds it from the two
   * PNGs above so there is still only one place to put artwork.
   */
  faviconIco: {
    src: "/favicon.ico",
    // An ICO is a container; the sizes inside it are the two PNGs above.
    width: 32,
    height: 32,
    type: "image/x-icon",
    purpose: "The root favicon every browser asks for whether or not we link it.",
  } satisfies BrandAsset,

  appleTouch: png(
    `${BRAND_DIR}/pwa/apple-touch-icon-180.png`,
    180,
    "iOS and iPadOS home screen. No transparency — iOS composites on black.",
  ),

  icon192: png(
    `${BRAND_DIR}/pwa/icon-192.png`,
    192,
    "Android home screen and the install prompt.",
  ),

  icon512: png(
    `${BRAND_DIR}/pwa/icon-512.png`,
    512,
    "Android splash screen and high-density home screens.",
  ),

  /**
   * The same icon drawn for a mask it cannot see.
   *
   * Android crops an adaptive icon to whatever shape the launcher wants — a
   * circle, a squircle, a teardrop — and guarantees only the central 80%
   * survives. So this is a separate export rather than the same file with a
   * different `purpose`: the artwork inside it has to be smaller, on a full
   * bleed background, with Halo's ring well inside the safe circle. Reusing
   * `icon-512.png` here is what produces the icons with their edges shaved
   * off, and it is the single most common way this goes wrong.
   */
  icon512Maskable: png(
    `${BRAND_DIR}/pwa/icon-512-maskable.png`,
    512,
    "Android adaptive icon. Art inside the central 80% safe circle.",
  ),

  /**
   * The illustration as drawn, at whatever aspect it arrived in. Nothing
   * requests it; it is the lossless source the served preview is cut from,
   * kept for the same reason the 1024 icon master is.
   */
  socialMaster: {
    src: `${BRAND_DIR}/social/preview-master.png`,
    width: 0,
    height: 0,
    type: "image/png",
    purpose: "Master social illustration. Never served — `social` is cut from it.",
  } satisfies BrandAsset,

  /**
   * The link preview. Not an icon at all — a composition, landscape, with
   * room for the product's name.
   *
   * JPEG, and that is not a style preference. This is a photographic
   * illustration, and as a PNG it came to 1.6 MB — over every scraper's cap
   * for a link preview, which is why a correct og:image still produced a
   * card with no picture in WhatsApp. The same image as JPEG is about
   * 107 KB and identical to look at.
   */
  social: {
    src: `${BRAND_DIR}/social/preview-1200x630.jpg`,
    width: 1200,
    height: 630,
    type: "image/jpeg",
    purpose: "Open Graph and Twitter/X link preview. 1.91:1, under 300 KB.",
  } satisfies BrandAsset,
} as const;

/** Everything, for the checker to walk. */
export const ALL_BRAND_ASSETS: readonly (readonly [string, BrandAsset])[] =
  Object.entries(brandAssets);

/**
 * The colours the installed app is dressed in.
 *
 * Both are the product's own ground — `--color-ground` in globals.css, the
 * room every screen is a dark corner of. `theme_color` tints the Android
 * task switcher and toolbar; `background_color` is what fills the splash
 * screen before the first paint, so any other value would mean the app
 * flashes a colour it never uses again.
 *
 * Written out rather than imported because a manifest is generated at build
 * time and a CSS custom property does not exist then. If the ground ever
 * moves, these move with it — that is what the note in globals.css is for.
 */
export const BRAND_COLOURS = {
  /** `--color-ground`. */
  theme: "#070c1c",
  background: "#070c1c",
} as const;

export const BRAND_NAME = "Sunday School Companion";
/** Twelve characters or fewer, or a home screen truncates it itself. */
export const BRAND_SHORT_NAME = "Sunday School";
export const BRAND_DESCRIPTION = "Bible stories to read again at home.";
