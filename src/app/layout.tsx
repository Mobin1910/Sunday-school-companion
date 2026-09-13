import type { Metadata, Viewport } from "next";

import {
  BRAND_COLOURS,
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_SHORT_NAME,
  brandAssets,
} from "@/brand/assets";
import Preferences from "@/components/Preferences";
import { DOORWAY_SCRIPT } from "@/local/child";

import "./globals.css";

/**
 * Where the app says who it is.
 *
 * Every path here comes from `brand/assets.ts` and none is written out, so
 * the head, the manifest and the checker all describe the same files. The
 * artwork is replaced by dropping files into `public/brand/`; nothing in
 * this file changes when it is.
 */

/**
 * What an absolute URL means for this build.
 *
 * Open Graph needs one: a scraper reading a shared link has no page to
 * resolve `/brand/social/preview-1200x630.png` against, so a relative image
 * is simply dropped and the link shows nothing. `metadataBase` is what Next
 * resolves it with.
 *
 * No domain is written here, because guessing one would be worse than
 * having none — a wrong absolute URL is a preview that 404s for everyone
 * rather than a preview that is missing. Vercel sets
 * `VERCEL_PROJECT_PRODUCTION_URL` during the build, which is the production
 * hostname however the project is renamed or aliased, and
 * `NEXT_PUBLIC_SITE_URL` overrides it for a custom domain. Locally it falls
 * back to the dev server, where nobody is scraping anything.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  /*
    A template, so a section names itself before the product does. Settings
    already titles itself this way by hand; this is that rule in one place.
  */
  title: {
    default: BRAND_NAME,
    template: `%s · ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  applicationName: BRAND_NAME,

  /*
    The tab, the bookmark, and the home screen.

    `/favicon.ico` is listed as well as linked because browsers ask for it
    at the root regardless — see `faviconIco`. The two PNGs are what a
    browser that reads the markup will prefer, and they are sharper.
  */
  icons: {
    icon: [
      { url: brandAssets.faviconIco.src, sizes: "any" },
      {
        url: brandAssets.favicon16.src,
        sizes: "16x16",
        type: brandAssets.favicon16.type,
      },
      {
        url: brandAssets.favicon32.src,
        sizes: "32x32",
        type: brandAssets.favicon32.type,
      },
    ],
    apple: [
      {
        url: brandAssets.appleTouch.src,
        sizes: "180x180",
        type: brandAssets.appleTouch.type,
      },
    ],
  },

  /*
    iOS has no manifest support worth the name, so the things Android reads
    out of the manifest have to be said again here.

    `statusBarStyle` is deliberately `default` — an opaque bar — and not
    `black-translucent`. Translucent puts the page underneath the clock and
    the notch, which is right only for a layout that pads itself with
    `env(safe-area-inset-top)`. Nothing in this product does yet, so
    choosing it would hide the back link on every screen of an iPhone. It is
    a one-word change here on the day the layout grows safe-area padding.

    `capable` emits `mobile-web-app-capable`, the standard spelling, and not
    the apple-prefixed one — Next 16 made that swap deliberately, Chrome
    warns about the prefixed tag, and Safari has read the standard name
    since 15.4. Adding the old one back by hand only produces a duplicate
    and a console warning, which is what happened when this was first
    written. Verified against the emitted HTML, not assumed.
  */
  appleWebApp: {
    capable: true,
    title: BRAND_SHORT_NAME,
    statusBarStyle: "default",
  },

  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    url: "/",
    images: [
      {
        url: brandAssets.social.src,
        width: brandAssets.social.width,
        height: brandAssets.social.height,
        alt: `${BRAND_NAME} — Halo, the companion who reads along.`,
      },
    ],
  },

  /*
    The large card, because the preview is a composition rather than an
    icon. A summary card would crop it to a square and lose both the name
    and half of Halo.
  */
  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    images: [brandAssets.social.src],
  },
};

export const viewport: Viewport = {
  themeColor: BRAND_COLOURS.theme,

  // Children hold devices close and press hard. Let them zoom if they need to,
  // but never zoom by accident — the font sizes are already large enough.
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        {/*
          Runs before anything paints, so the first frame of the first screen
          is already the right one. It sets an attribute and nothing else —
          the stylesheet does the hiding, and this makes no request and
          writes nothing. See `DOORWAY_SCRIPT`.
        */}
        <script dangerouslySetInnerHTML={{ __html: DOORWAY_SCRIPT }} />

        <Preferences />
        {children}
      </body>
    </html>
  );
}
