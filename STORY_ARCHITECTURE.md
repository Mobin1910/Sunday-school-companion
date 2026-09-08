# Sunday School Companion — The Story Comic

**Status: proposal. Nothing here is built yet.**

One decision drives this document:

> **A story panel is a finished comic. Dialogue, narration and their placement
> belong to the artwork, not to the interface.**

I agree with it, and the measurements below support it more strongly than the
argument from taste does. This document says what is true today, what changes,
and what it costs.

It revises two sections of `CONTENT_PIPELINE.md` — the story schema and the
asset layout — and leaves the rest of that proposal standing.

---

# 1. Current architecture

Static Next.js 16 export, React 19, Tailwind 4, Zod. No server, no database, no
runtime fetch. Content is JSON on disk, validated at build time, imported as a
typed module.

```
content/*.story.json
   → chapterSchema (Zod)          errors fail the build
   → toCards()                    sections flatten to one ordered card list
   → CardScreen                   one renderer per card kind
   → ChapterReader                page-turn, chrome, progress
```

Two things about it matter here.

**The authored shape and the runtime shape are already deliberately different.**
`cards.ts` exists to reconcile them, and it already strips things the browser has
no business receiving — author notes are dropped, picture names are resolved to
files. That existing seam is exactly where a rich authored panel becomes a thin
runtime card, and it means this proposal needs no new architectural concept.

**Validation is already two-tier.** `schema.ts` holds absolute structure that
always fails the build; `checks.ts` holds editorial rules that are errors for
shipping chapters and warnings for drafts. Everything in §21 of your brief fits
this mechanism without inventing a new one.

---

# 2. Current Story Reader

`ChapterReader.tsx` is a page-turn reader with a two-piece curl (a clipped flat
page plus a narrow 3D spine). Only two pages are ever mounted — the current one
and whichever neighbour the drag direction would reveal. Chrome floats over the
page: back top-left, `01 / 11` and the Next button bottom-left/right.

Inside, every page is a `CardScreen`:

```
[data-active] (absolute inset-0)
  └─ CardScreen   flex column, centred, pt-4 pb-32
       ├─ Picture      w-full max-w-md px-6, aspect-4/3, object-cover
       └─ <p>          text-2xl, centred, .breathe
```

So today a story page is **an image in a box with a caption under it**, centred
in a dark screen. That is the thing this proposal replaces.

## The measurements

Taken from the built app, page 2 of Chapter 1, at nine real viewports:

| Device | Stage (the drag surface) | Stage ratio | Illustration | Fit |
|---|---|---|---|---|
| iPhone SE 320×568 | 320×568 | **0.56** | 272×204 | cover |
| small Android 360×640 | 360×640 | **0.56** | 312×234 | cover |
| iPhone 13 mini 375×812 | 375×812 | **0.46** | 327×245 | cover |
| Pixel, Chrome UI 393×740 | 393×740 | **0.53** | 345×259 | cover |
| iPhone 14 390×844 | 390×844 | **0.46** | 342×257 | cover |
| 14 Pro Max 430×932 | 430×932 | **0.46** | 382×287 | cover |
| iPad portrait 834×1112 | 834×1112 | **0.75** | 400×300 | cover |
| iPad landscape 1112×834 | 1112×834 | **1.33** | 400×300 | cover |
| Laptop 1440×900 | 1440×900 | **1.60** | 400×300 | cover |

Four findings, all of which change the recommendation:

1. **The reader is full-screen and portrait on phones** — 0.46 to 0.56. It is
   not 16:9 and never was.
2. **The illustration is always 4:3 landscape**, in every case, on every device.
   A tall portrait screen currently shows a small landscape picture floating in
   the middle of it.
3. **`max-w-md` caps the picture at 448px**, so a 1440-wide laptop shows a
   400×300 illustration — a postage stamp in a cinema.
4. **`object-fit: cover` does nothing today**, because the source is 4:3 and the
   box is 4:3. It is a loaded gun that has not gone off: give it a portrait comic
   panel and it will crop 20–40% away, including baked-in dialogue.

`ARCHITECTURE.md` claims "two width tiers, art-directed per tier." **That is
aspirational — there is no responsive artwork strategy implemented at all.**
There is one image, one aspect, one size, on every screen.

---

# 3. Current content schema

```
Chapter
├── title, reference
├── cover        { picture }
├── story        [ { picture, text?, alt?, interaction? } … ]   ← flat
├── activity     Interaction
├── quiz         [ Interaction … ]
├── verse        { text, reference, translation, practice? }
├── video        { youtubeId, title, … }
└── celebration  { message, picture? }
```

Relevant properties: pictures are **named, never pathed** (`"panel-04"` resolves
through one function); an item may be a bare string as shorthand; `text` is the
caption the reader draws under the picture; `alt` is optional, on the stated
grounds that "story cards describe themselves through their own text."

**That last assumption dies with this change.** Once the words are inside the
image, a story card no longer describes itself. `alt` becomes required.

---

# 4. Current asset handling

`public/art/<chapter-slug>/<picture-name>.<ext>`, resolved at build time by
`resolvePicture()`, which tries `avif → webp → png → jpg → svg` and returns the
first that exists, or `null`. A `null` renders `PicturePlaceholder`, which is a
calm dashed box naming the missing picture — a first-class state, not an error.
`drawnPictures()` finds orphans. `public/art/` is currently empty apart from a
`.gitkeep`: **no artwork exists yet at all.**

This resolver is good and survives intact. It is the reason content never
mentions a file extension, and it is what makes adding a second orientation a
change in one function rather than in every chapter file.

---

# 5. Current responsive image handling

There isn't any. `Picture` takes a single `src` and one className. No
`srcset`, no `<picture>`, no `sizes`, no art direction, no focal point. Next's
image optimiser is off (`images: { unoptimized: true }`) because static export
cannot use it — so whatever we ship is what the browser gets.

This is a blank slate rather than a thing to unpick, which makes the timing good.

---

# 6. What should change

## 6.1 The panel becomes the page

A story page stops being *picture + caption* and becomes *panel*. The reader
draws the artwork and its own chrome, and nothing else. `StoryCard`'s `<p>` goes.

## 6.2 Fixed aspect, full width, and nothing is ever cropped

This is the recommendation I would most argue for, because it deletes an entire
class of problem rather than managing it.

Your §9 asks for safe areas, protected faces, crop-zone discipline and contrast
behind text. All of that is necessary **only if the display crops.** So don't
crop. Give the panel a fixed aspect ratio, render the artwork at exactly that
ratio, and let the box and the source agree. `object-fit` becomes irrelevant.
Focal points become unnecessary. "No critical information in likely crop zones"
becomes vacuous, because there are no crop zones.

The panel is full-width until height binds, then height-bound and centred with
side margins. On a phone that is edge-to-edge; on an iPad it is a page with
margins, which is what a comic actually looks like.

The dark ground around it is not wasted space — it is the page margin, and this
product already has the best possible colour for it.

**Recommended ratios**, derived from the measured stage minus the chrome bands
(≈60px top, ≈104px bottom):

| | Portrait art | Landscape art |
|---|---|---|
| Narrative panel | **4:5** | **16:10** |
| Panel carrying an interaction | **4:3** | **16:9** |

Checked against the measurements: at 320×568, a 4:5 panel is 320×400 and
60 + 400 + 104 = 564 fits in 568. At 834×1112 it becomes height-bound at 758×948.
At 1440×900 the landscape variant is 1178×736 — cinematic, and the first time
this product would use a laptop screen properly.

The interaction aspect is **derived, not authored**: a panel that carries an
interaction is shorter, and the pipeline knows which it is because it knows
whether it wrote one. No field, no decision, no way to get it wrong.

## 6.3 Two variants, keyed to orientation — not three, keyed to device

Your §7 and §19 assume mobile / tablet / desktop. The measurements say that is
the wrong axis:

- iPad **portrait** is 0.75 — much closer to a phone than to itself in landscape.
- iPad **landscape** is 1.33, essentially the same problem as a 1.60 laptop.

So "tablet" is not a composition. **Orientation is.** Two art-directed renders
per panel — portrait and landscape — selected by `@media (orientation: landscape)`
in a plain `<picture>` element. This is a third fewer illustrations than the
three-tier plan, for strictly better fit.

Landscape is also **optional**. A chapter with portrait art only is complete and
valid; a landscape screen shows the portrait panel height-bound with generous
side margins, which is exactly what a comic looks like on a wide screen. Landscape
variants are an enhancement to be added chapter by chapter, not a gate on shipping.

## 6.4 Two-layer panels: illustrate, then typeset

Your §10 instinct is right and I would go further: **never let an image model
render final dialogue.** Not because it usually fails, but because when it fails
it fails silently, in a child's Bible story, and the only detector is a human
re-reading every panel.

So a panel is produced in two passes:

```
  scene + art direction
        ▼
  ① ILLUSTRATE          → panel art with NO text, and empty
                           compositional room where bubbles will sit
        ▼
  ② TYPESET             → bubbles drawn as vectors, canonical dialogue
                           set in the product's own font
        ▼
  ③ FLATTEN             → one .webp per orientation
```

Step ② is deterministic code, not a model. **Playwright is already a
devDependency in this repo** — the compositor can be an HTML template rendered
and screenshotted by the browser that is already installed, using the same font
stack and the same bubble styling as everything else. No new heavy dependency,
and the bubble design lives in CSS where it can be reviewed like any other design
decision.

What this buys:

- **Perfect spelling, always.** The text rendered is the text in the JSON.
- **Editable dialogue.** Fix a word, re-run ②③, keep ① untouched. No re-illustration.
- **Consistent typography** across every panel of every chapter, for free.
- **Translation becomes cheap** — a second language re-runs only ②③.
- **The app still receives one flat image.** The comic stays self-contained.

The bubble plan (shape, anchor, size, tail direction, speaker) is content data
written by the generator, and it is what makes ① and ② agree: the illustrator
prompt is told to leave that region quiet, and the typesetter draws into it.

## 6.5 The script stays canonical, and becomes the alt text

Per §5, and with one addition: the dialogue is the only description of a panel a
screen reader will ever get once the words are paint. So `alt` stops being
optional and starts being **generated from the script** — speaker plus line, in
order — rather than written by hand. That is better than today, where `alt` is
usually absent.

## 6.6 What the runtime receives

The authored panel is rich. The runtime card is thin. `cards.ts` already draws
this line for author notes and it should draw it here too:

| Authored (JSON, in git) | Shipped to the browser |
|---|---|
| `scene` — description, characters, emotion, visual direction | ✗ dropped |
| `bubbles` — the typesetting plan | ✗ dropped |
| `dialogue` / `narration` — canonical text | ✗ dropped as text, ✓ becomes `alt` |
| `artwork` | ✓ resolved file paths |
| `interaction` | ✓ |

A child downloads a picture, an alt string, and possibly an interaction. Nothing
else. The generation material is repository content, like a note.

---

# 7. Proposed schema

```jsonc
"story": {
  "connect": [
    {
      "id": "panel-01",

      // ── Generation input. Never shipped. ──────────────────────────
      "scene": {
        "description": "A boy of six sits at his desk in a warm bedroom,
                        late afternoon light through the window. Story Halo
                        floats at his shoulder, tilted, curious.",
        "characters": ["child", "story-halo"],
        "emotion": "curious, unhurried",
        "direction": "Camera at the child's eye level. Quiet space upper
                      right for one bubble. Halo small — a companion, not
                      the subject."
      },

      // ── Canonical text. Typeset into the art; also becomes alt. ───
      "dialogue": [
        { "speaker": "halo", "text": "Have you ever gone to church with your family?" }
      ],
      "narration": [],

      // ── The typesetting plan. Read by the compositor, not the app. ─
      "bubbles": [
        { "for": 0, "shape": "round", "anchor": "top-right", "tail": "down-left", "width": 0.42 }
      ],

      "interaction": null,

      // ── Resolved by the build, not written by hand. ───────────────
      "artwork": { "portrait": "panel-01", "landscape": "panel-01" }
    }
  ],
  "discover": [ … ],
  "reflect":  [ … ]
}
```

Notes on the departures from your §6 sketch:

- **`act` is not a field.** It is the section a panel is in. Named acts make
  interleaved, missing or out-of-order acts impossible by shape rather than
  forbidden by a rule — the reasoning `CONTENT_PIPELINE.md` §F sets out.
- **No `focalPoint`.** Nothing crops, so there is nothing to focus. Its absence
  is the proof that §6.2 worked.
- **No `mobile` / `tablet` / `desktop`.** `portrait` and `landscape`, per §6.3.
  Both are picture *names*, not paths — the existing resolver rule holds.
- **`artwork` is optional in authoring.** Omit it and it defaults to the panel
  `id`, which is what it will be every time. It exists for the rare panel that
  reuses another's art.
- **`bubbles[].for` indexes `dialogue`**, so the text cannot drift from its
  bubble — a validation rule rather than a naming convention.
- **`width` is a fraction of the panel**, not pixels, so one plan serves both
  orientations.

The runtime `Card` gains almost nothing:

```ts
| { kind: "story";
    act: "connect" | "discover" | "reflect";
    art: ResponsiveArt;          // { portrait: Art; landscape?: Art }
    alt: string;                 // generated from dialogue + narration
    interaction?: PlayInteraction }
```

`text` is gone. `alt` is required. Everything below — `PlayInteraction`,
`InteractionPlayer`, the models, the registry, Halo, `src/local/` — is untouched.

---

# 8. Google Sheet

**No change from `CONTENT_PIPELINE.md`, and I would resist the one your §16
opens the door to.**

The sheet holds the brief: chapter, title, reference, curriculum, the child's-world
opening, the takeaway, verse, video, take-home, learning objectives, status. A
teacher writes what a lesson is *about*.

§16 says contributors could provide "story/script content where appropriate." I
would not build that door. A comic script with panel breaks, speaker attribution
and bubble-aware line lengths is a craft skill; a teacher supplying prose into a
cell would produce something the generator has to rewrite anyway, and now there
are two authors of the same text and no clear owner. The teacher's paragraph of
curriculum is a better input than a teacher's attempt at a script.

If a teacher has strong feelings about a particular line, "Notes for us" carries
it, and you decide.

---

# 9. The panel pipeline

```
 curriculum + learning objectives          (the sheet → content/brief/*.json)
        ▼
 ① STORY STRUCTURE      acts, panel count, pacing, where interactions land
        ▼
 ② SCRIPT               dialogue and narration, canonical text
        ▼
 ③ BUBBLE PLAN          shape, anchor, size, tail per line
        ▼
 ④ ART DIRECTION        one prompt per panel per orientation, told where to
                        stay quiet, and which act it is in
        ▼
 ⑤ ILLUSTRATE           panel art, NO text          → art/_raw/  (git-ignored)
        ▼
 ⑥ TYPESET              bubbles + canonical text, deterministic
        ▼
 ⑦ FLATTEN + ENCODE     webp at the panel's exact ratio, ≤150 KB
        ▼
 ⑧ VALIDATE             schema + checks
        ▼
 app
```

Steps ①–⑦ are `npm run content:generate`, run by you, keys in `.env.local`, never
in CI and never in Vercel. Step ⑧ is the build.

**Two act-specific rules the prompt template enforces**, which is what §2's
two-Halos distinction becomes in practice:

- `connect` and `reflect` — Story Halo present: a compact luminous blue-violet
  companion with simple white eye-lights and a warm cross-shaped glow inside,
  integrated into the painting. Beside the child, never in front of them.
- `discover` — **Story Halo absent.** Biblical scene, cinematic, painterly, warm
  key light against cooler shadow. The UI Halo's palette is not imposed on it.

That rule is enforceable because the act is structural. A `discover` prompt
cannot mention Halo, because the template that builds it is chosen by section.

**Raw art is kept but not committed.** `art/_raw/` holds the untyped
illustrations so a dialogue fix can re-run ⑥⑦ without re-illustrating; it is
git-ignored and lives on your machine. Only flattened panels are committed.

---

# 10. Asset layout

```
public/art/
└── 6-7/                          class id
    └── 01/                       chapter number, zero-padded
        ├── cover/
        │   ├── portrait.webp
        │   └── landscape.webp
        ├── story/
        │   ├── panel-01/
        │   │   ├── portrait.webp
        │   │   └── landscape.webp        ← optional
        │   └── … panel-11/
        ├── games/
        │   └── game-01/
        │       ├── option-01.webp        ← no orientation; these are small
        │       └── option-03.webp
        ├── verse/artwork.webp
        └── celebration/
            ├── portrait.webp
            └── landscape.webp
```

- **A directory per panel, a file per orientation.** One logical panel is one
  folder; adding landscape later is adding a file, not renaming anything.
- **Only full-bleed things get orientations.** Game options and verse artwork are
  small images inside a laid-out screen — they have no composition to art-direct.
- The resolver learns one thing: a picture name may resolve to a directory of
  orientations or to a single file. Both stay names, never paths.
- `_raw/` sits outside `public/` and outside git.

---

# 11. Migration

**There are two chapters, and neither has any artwork.** `public/art/` contains a
`.gitkeep`. Every picture in both chapters is a placeholder box.

That makes this the cheapest possible moment to do it, and it is the strongest
argument for doing it now rather than after twenty chapters exist:

1. **`baby-jesus-at-the-temple`** — rewrite by hand into the new shape, as the
   reference implementation. Its eight story cards become three acts of panels
   with dialogue, following your §13 beat sheet. It is the proving ground for
   the schema, the reader and the compositor before anything is generated.
2. **`stephen`** — mechanically convertible. Its eleven story cards have `text`
   that becomes a single narration line per panel, all in `discover`, with a
   `connect` and `reflect` act to be written. It can sit at `Draft` until then;
   the existing draft-warning path already permits exactly this.
3. Both keep their placeholder artwork throughout. **Nothing in this migration is
   blocked on illustration**, which is the property that makes it safe.

There is no chapter 3–20 to migrate. If chapters are written between now and
this landing, they should be written in the new shape.

---

# 12. Risks and trade-offs

**We lose the words rising a beat after the picture.** `DESIGN_NOTES.md` lists
this on the do-not-lose list, and it is a genuine casualty: once the words are
paint, they arrive with the paint. Partial mitigation — the panel as a whole can
still settle in — but the specific effect of the illustration getting a moment
alone is gone. This is the real cost of the decision and it should be accepted
knowingly, not discovered later.

**Text becomes unselectable, unzoomable and unrestylable.** No text scaling, no
dynamic type, no font-size setting for a struggling reader. The alt text keeps
screen readers whole, but a sighted child who needs bigger words has only pinch
zoom. If per-child text size ever becomes a requirement, this decision is what
would have to be revisited — so it is worth deciding now whether that is a
requirement, because reversing later means re-typesetting everything.

**Asset weight roughly doubles per chapter.** Eleven panels × two orientations at
the existing 150 KB budget is ~3.3 MB of story art per chapter, against a
documented 40 MB precache ceiling — about twelve chapters. Mitigations: landscape
is optional and can be added only where it earns its place; the documented policy
already precaches only the current and next chapter; and a rotate can fetch the
other orientation on demand.

**Any text change is a build step, not an edit.** Fixing a typo means re-running
the compositor and committing new binaries. The two-layer design keeps that
cheap (no re-illustration), but it is no longer a one-character diff, and it makes
the artwork a build artifact that lives in git. That is a real cost of the
approach and the reason the raw art must be kept.

**Illustration throughput is already named as the roadmap bottleneck.** Two
orientations plus a typesetting pass makes each panel more work. The
orientation-not-device recommendation is partly a response to this: three tiers
would have been 50% more art for a worse fit.

**The compositor is a new thing that can break.** It is small — an HTML template
and a Playwright screenshot — but it is a piece of infrastructure between the
script and the child. It should be treated as such: deterministic, reviewable,
with the typeset panel checked in and diffable so a regression is visible.

**`object-fit: cover` must be deliberately removed**, not left in place. Today it
is harmless because the ratios agree. Leave it, put a portrait panel in a box
that disagrees by a few pixels, and it will quietly shave a bubble off the edge.
The box should assert the panel's ratio and the fit should be `contain`, so a
mismatch shows as a visible letterbox in review rather than as lost dialogue in
production.

---

# Open questions

1. **Text scaling.** Is per-child text size a requirement we might want later? It
   is the one thing this decision genuinely forecloses.
2. **Landscape at all, for V1?** Portrait-only ships sooner, and a portrait panel
   centred on a wide screen is honest rather than broken. Landscape could wait.
3. **Interactive panels** — does the interaction sit *below* the shortened panel,
   or over its lower third? Below is safer and I have assumed it; over is more
   comic-like and needs the art to reserve space.
4. **Cover.** It is already full-bleed with its title painted in, at the stage
   ratio rather than a fixed one. Should it stay a special case, or become a
   4:5 panel like the rest? I lean towards leaving it — a cover is a cover.
