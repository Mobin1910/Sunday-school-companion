import type { MetadataRoute } from "next";

import {
  BRAND_COLOURS,
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_SHORT_NAME,
  brandAssets,
} from "@/brand/assets";

/**
 * The web app manifest — what a phone reads when a grown-up installs this.
 *
 * A route rather than a static `public/manifest.json`, which is Next's own
 * convention and survives the static export as `/manifest.webmanifest`. It
 * earns the extra file by reading the same asset table the document head
 * does, so the manifest and the `<link rel="apple-touch-icon">` can never
 * end up pointing at different artwork — which is what happens when a
 * manifest is a hand-maintained JSON file next to the icons it lists.
 *
 * It is a manifest and nothing more. There is no service worker here and
 * this does not add one: caching the shell is Milestone 11, and an install
 * prompt on Chrome needs both. Everything declared here is correct now and
 * becomes an installable app the moment that worker lands, with no changes
 * to this file.
 *
 * Nothing is fetched from anywhere. Every icon is a file in this repository,
 * served from this origin, available offline — see BRAND_ASSETS.md.
 */
/*
  A manifest route is a route handler, and a static export has to be told
  that this one has nothing to do at request time. Without it the build
  fails outright rather than emitting a file — which is the right way round,
  since a manifest that needed a server would be a manifest this product
  could never ship.
*/
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const { icon192, icon512, icon512Maskable } = brandAssets;

  return {
    name: BRAND_NAME,
    short_name: BRAND_SHORT_NAME,
    description: BRAND_DESCRIPTION,

    /*
      Launched as its own app, with no browser chrome. That is the whole
      point of installing it: a child taps a home screen icon and is in a
      story, not in a tab with an address bar above it.
    */
    display: "standalone",
    start_url: "/",
    scope: "/",

    /*
      Portrait only. Every screen in the product is drawn to one fold on a
      phone held upright, the reader turns portrait pages, and a landscape
      tablet would get a story panel with its top and bottom cut off.
    */
    orientation: "portrait",

    theme_color: BRAND_COLOURS.theme,
    background_color: BRAND_COLOURS.background,

    /*
      Three icons, and the third is not a duplicate of the second.

      `any` is the icon as drawn, used where the platform shows it whole.
      `maskable` is a different export of the same artwork, drawn smaller on
      a full bleed so Android can crop it to a circle or a squircle without
      taking Halo's ring with it.

      They are kept as separate files rather than one file carrying
      `purpose: "any maskable"`. A single file has to satisfy both at once,
      which in practice means it is padded for the mask and therefore looks
      shrunken everywhere the mask is not applied.
    */
    icons: [
      { src: icon192.src, sizes: "192x192", type: icon192.type, purpose: "any" },
      { src: icon512.src, sizes: "512x512", type: icon512.type, purpose: "any" },
      {
        src: icon512Maskable.src,
        sizes: "512x512",
        type: icon512Maskable.type,
        purpose: "maskable",
      },
    ],
  };
}
