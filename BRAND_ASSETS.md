# Brand Assets

The app's own identity: the mark in a browser tab, the icon on a home
screen, the picture a shared link shows. Chapter artwork is a different
thing and lives in `public/art/` under `CONTENT_PIPELINE.md`; nothing here
goes through the content pipeline and no chapter file ever references it.

**Halo is the brand.** Not a mascot placed beside a logo — the mark itself.
Every asset below is Halo, at a size and crop suited to where it appears.
There is no wordmark-only variant and no separate logo to fall back on.

> **Status: awaiting final artwork.** Every file listed below currently
> holds a temporary placeholder — a flat fill of the ground colour, written
> by `npm run brand:placeholders`. They are not a draft and not a direction.
> They exist so the app builds, `/favicon.ico` resolves and the manifest
> validates while the real artwork is drawn. `npm run brand:check` reports
> which are still placeholders.

---

## Where things live

```
public/
├── favicon.ico                                ← root, not brand/ (see below)
└── brand/
    ├── app-icon/
    │   └── icon-1024.png                      master
    ├── favicon/
    │   ├── favicon-16.png
    │   └── favicon-32.png
    ├── pwa/
    │   ├── icon-192.png
    │   ├── icon-512.png
    │   ├── icon-512-maskable.png
    │   └── apple-touch-icon-180.png
    └── social/
        └── preview-1200x630.png
```

`public/brand/` rather than `public/assets/brand/`, because this project
already names public directories for what is in them — chapter artwork is
`/art/<chapter>/…`, so the app's own identity is `/brand/…`.

**`favicon.ico` is the one exception and it is deliberate.** Browsers
request `/favicon.ico` from the site root on their own, with no markup
involved; a `rel="icon"` link adds to that request rather than replacing
it. A file anywhere else means a 404 on every page load. It is *derived*
from the two favicon PNGs by `npm run brand:ico`, so there is still only
one place artwork is put.

---

## The contract

| Asset | File | Size | Format | Transparency | Where used |
|---|---|---|---|---|---|
| Master app icon | `brand/app-icon/icon-1024.png` | 1024×1024 | PNG | Either | Nowhere at runtime — the source every square icon is exported from |
| Favicon, small | `brand/favicon/favicon-16.png` | 16×16 | PNG | Allowed | `<link rel="icon">`, and inside `favicon.ico` |
| Favicon, standard | `brand/favicon/favicon-32.png` | 32×32 | PNG | Allowed | `<link rel="icon">`, and inside `favicon.ico` |
| Root favicon | `favicon.ico` | 16 + 32 | ICO | Allowed | The implicit root request. **Generated — do not hand-author** |
| Apple touch icon | `brand/pwa/apple-touch-icon-180.png` | 180×180 | PNG | **Must be opaque** | iOS/iPadOS home screen |
| PWA icon | `brand/pwa/icon-192.png` | 192×192 | PNG | Allowed | Android home screen, install prompt |
| PWA icon, large | `brand/pwa/icon-512.png` | 512×512 | PNG | Allowed | Android splash, high-density home screens |
| PWA maskable | `brand/pwa/icon-512-maskable.png` | 512×512 | PNG | **Must be opaque** | Android adaptive icon |
| Social preview | `brand/social/preview-1200x630.png` | 1200×630 | PNG | **Must be opaque** | Open Graph, Twitter/X, messaging previews |

Transparency is checked, not merely requested. iOS composites an
apple-touch icon onto black and Android composites a maskable icon onto the
launcher's own background, so alpha in either becomes a hole in the icon on
a real phone and nowhere else. A preview image with alpha is flattened to
white by most scrapers, which on a dark composition is worse than it
sounds. `npm run brand:check` fails on all three.

---

## Colours

From `globals.css`, not invented here.

| | | |
|---|---|---|
| Ground | `#070c1c` | `theme_color`, `background_color`, `<meta name="theme-color">` |
| Raised surface | `#0e1731` | |
| Gold | `#ffc65a` | Halo's ring — the product's only warm note |
| Halo's own light | `#4fd6ff` cyan, `#3d7bff` electric blue, `#9b6bff` violet, `#ff8ecb` pink, `#ffb583` peach | |

The old orange/terracotta identity is gone and must not return. See the
palette note at the top of `globals.css`.

---

## Which Halo

**The UI Halo**, always — the companion in `src/halo/`: an organic blob lit
from within, a thin gold ellipse floating above it, two pale vertical
capsule eyes set slightly high and right of centre. No arms, no legs, no
mouth, no cross, nothing that turns it into a mascot. `DESIGN_SYSTEM.md`
under *Form*, *Colour* and *The ring* is the specification.

**Never the Story Halo.** Halo also appears drawn inside chapter comic
panels, as part of those illustrations. Those are a different rendering at
a different fidelity, sit inside a Bible scene, and are not the brand. Do
not crop one out of a panel to make an icon.

---

## Art direction, per asset

### Master app icon — 1024×1024

Halo, centred, filling roughly 70% of the square, on the ground colour. The
ring must be fully inside the frame with room to breathe — it is the single
most recognisable part of the silhouette and the first thing a crop takes.
Halo's own glow may bloom into the surrounding dark; that bloom is what
makes the icon read as a light source rather than a sticker.

No text. Not the product name, not an initial, not a book. At 32px a letter
form and a blob are indistinguishable, and the whole point of Halo as the
mark is that the silhouette carries it.

### Favicons — 16×16, 32×32

Not the master scaled down. At these sizes the internal colour blending,
the sheen and the eyes all disappear into mud, so these need their own
export with the detail simplified: the blob silhouette, the ring, and the
two eyes as solid shapes. Ring stroke at least 1px at 16×16 or it vanishes.

Judge them at actual size in a real tab, never zoomed.

### Apple touch icon — 180×180

Same composition as the master, opaque, no rounded corners and no gloss —
iOS applies its own mask and has done since iOS 7. Corners drawn into the
artwork get masked twice and show as a dark fringe.

Keep Halo clear of the outer ~10% so Apple's squircle does not clip the
ring.

### PWA icons — 192×192, 512×512

Straight exports of the master. Nothing special: these are shown whole.

### Maskable icon — 512×512, opaque

**A different export, not the same file relabelled.** Android crops this to
whatever shape the launcher wants and guarantees only the central 80%
survives — a circle of 409px diameter, centred.

Halo and the entire ring must sit inside that circle. Everything outside it
is bleed: the ground colour and Halo's glow, nothing that matters. In
practice Halo occupies about 55–60% of the square here, noticeably smaller
than in `icon-512.png`, and that is correct rather than a mistake.

Reusing `icon-512.png` here is the single most common way this goes wrong,
and the symptom is a home screen icon with its ring shaved off.

### Social preview — 1200×630, opaque

The one asset that is a composition rather than a mark, and the one that
needs independent art direction.

- **1.91:1.** Exactly 1200×630.
- **Halo is the focal point** and belongs left of centre or centred — never
  in a corner, which platforms crop first.
- **Text:** `Sunday School Companion`. Optionally the line the app already
  uses, *Bible stories to read again at home.* Nothing else — no URL, no
  badges, no "install now".
- **Safe area:** keep Halo and all text inside a centred 1080×510 region,
  ~60px in from every edge. Several platforms crop to 1.91:1 and some to
  nearer 1.5:1; anything outside that box may be cut.
- May include the modern child and story elements from the chapter artwork
  and the deep night environment, so long as Halo stays the brightest thing
  in the frame.

---

## What the app does with them

Every path is declared once, in **`src/brand/assets.ts`**. Nothing else in
the codebase writes a branding path.

| Consumer | Reads |
|---|---|
| `src/app/layout.tsx` | favicons, apple touch icon, OG image, Twitter image |
| `src/app/manifest.ts` | the three PWA icons, name, colours |
| `tools/brand/check.mjs` | the whole contract, via `tools/brand/contract.mjs` |

`tools/brand/contract.mjs` is a small deliberate copy of the same table for
the plain-Node scripts. `brand:check` compares the two and fails if they
disagree, so the copy cannot drift.

### Open Graph and absolute URLs

A scraper reading a shared link has no page to resolve a relative image
against, so `metadataBase` makes the OG image absolute. No domain is
hardcoded:

1. `NEXT_PUBLIC_SITE_URL` if set — use this for a custom domain.
2. `https://$VERCEL_PROJECT_PRODUCTION_URL`, which Vercel sets at build
   time and which is stable across renames and preview deployments.
3. `http://localhost:3000` otherwise.

**Set `NEXT_PUBLIC_SITE_URL` in Vercel once the production domain is
fixed.** Until then previews work and production uses the Vercel hostname.

---

## Replacing the artwork

```
1.  Export the sizes above from the approved master.
2.  Drop each file at its path in public/brand/.
3.  npm run brand:ico          rebuilds favicon.ico from the two PNGs
4.  npm run brand:check        sizes, transparency, nothing left placeholder
5.  npm run build
```

No code changes at any step. `brand:check` exits non-zero on a real fault —
missing, wrong size, transparent where it must not be, or the two asset
tables disagreeing — and reports placeholders without failing, because a
placeholder is the expected state until step 2 happens.

Then, on a device: install on Android and on iOS, look at the home screen
icon, and run a shared URL through a link preview debugger.

---

## Not in scope here

The manifest is complete and correct, but **Chrome will not offer to
install the app until there is a service worker with a fetch handler.**
That is Milestone 11 in `IMPLEMENTATION_PLAN.md`, along with precaching the
shell and chapters. No service worker exists yet and this work does not add
one. When it lands, nothing in this document changes.
