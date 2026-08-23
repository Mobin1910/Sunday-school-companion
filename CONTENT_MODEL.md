# Tiny Disciples — Content Model

> **Version:** 1.0
> **Status:** Draft — pending review
> **Schema version:** 1
> **Governed by:** `PRODUCT_CONSTITUTION.md`

This document defines the structure of every chapter in Tiny Disciples.

It is the contract between content and the Chapter Player. If this document and the code disagree, this document is the specification and the code is the bug.

---

# The Acceptance Test

> **Adding a new chapter requires creating one JSON file and a folder of artwork. Nothing else.**
>
> No new React components. No code changes. No registry edits. No imports.

Every decision below is subordinate to that test.

Its corollary is equally important: **adding a new *card type* does require code.** The set of card types is closed and deliberately small. If a chapter feels like it needs a new type, that is a product conversation and a schema version bump — not a content edit.

---

# Design Principles for the Model

1. **No cross-references.** Nothing in a chapter file points at anything else in the chapter file. No IDs, no keys, no lookup tables, no `answerId: "opt-3"`. Every card is understandable in isolation by reading it top to bottom. This is the single most important property of the model and the one most easily lost.
2. **Authored in the correct state; shuffled at runtime.** Sequences are written in the right order. Pairs are written already paired. The player randomises. The author never thinks about shuffling, indices, or answer keys.
3. **Content declares meaning, never appearance.** No colours, no positions, no sizes, no animation timings, no component names. The design system decides how things look. The moment content carries layout, this becomes a CMS and the acceptance test dies.
4. **Flat over nested.** One array of cards. Not steps containing cards containing elements. Depth costs more in authoring clarity than it ever returns.
5. **Absent means absent.** Optional fields are omitted, never set to `null`, `""`, or `false`.
6. **Boring beats clever.** No expressions, no templating, no conditionals, no references. A chapter file is data a human reads, not a program.

---

# Folder Layout

```
content/
├── library.json
└── chapters/
    ├── david-and-goliath/
    │   ├── chapter.json
    │   └── art/
    │       ├── cover.png
    │       ├── goliath-shouts.png
    │       └── ...
    └── the-good-samaritan/
        ├── chapter.json
        └── art/
```

- A chapter is a **self-contained folder**. Its artwork lives beside its text.
- Art is referenced by **bare filename without extension** — `"goliath-shouts"` — and resolved from the chapter's own `art/` folder. Authors never write paths.
- The build generates responsive tiers and formats from the source files. Authors supply one high-resolution image per illustration and think about nothing else.

---

# The Chapter File

```ts
interface Chapter {
  schema: 1;
  title: string;              // "David and Goliath"
  reference: string;          // "1 Samuel 17" — for adults, not shown to children
  cards: Card[];
}
```

That is the entire top level. Four fields.

Notably absent:

- **No `id` or `slug`** — the folder name is the identity. One source of truth.
- **No `order`** — ordering lives in `library.json` (below).
- **No `thumbnail`** — the cover card's art is the thumbnail.
- **No `duration`, `difficulty`, `ageRange`, or `tags`** — nothing consumes them, and "Always a good place to stop" means we do not advertise a length.

---

# Card Types

Seven types. Closed set.

| Type | Journey step | Purpose |
|---|---|---|
| `cover` | Cover | The chapter's opening title screen |
| `story` | Interactive Story | An illustrated story beat, optionally interactive |
| `game` | Game | A dedicated interaction that reinforces the story |
| `quiz` | Quiz | A gentle question with picture or word answers |
| `verse` | Memory Verse | The verse itself |
| `practice` | Memory Verse | An activity that helps the verse stick |
| `celebration` | Celebration | The chapter's warm ending |

**Card type determines journey step.** There is no separate `step` field — it would be redundant on five of seven types and drift from reality on the other two. The only non-obvious mapping is `practice`, which belongs to the Memory Verse step; that mapping is stated here and nowhere else.

Because the constitution forbids reordering steps, validation can enforce that card types appear in journey order. That constraint is what makes deriving the step safe.

## `cover`

```ts
interface CoverCard {
  type: "cover";
  art: string;
}
```

The title comes from the chapter. Exactly one cover card, always first.

## `story`

```ts
interface StoryCard {
  type: "story";
  art: string;
  caption?: string;          // ≤ 15 words, ≤ 2 sentences
  alt?: string;              // only when there is no caption
  interaction?: Interaction; // an optional beat, not a game
}
```

The workhorse. Most cards in most chapters are story cards.

An interaction here is a *beat* — tapping the stone, dragging the stone to the sling — woven into the reading. It is not the Game step, and it is never required to progress.

**On `alt`:** the caption is the accessible description by default. `alt` is required only when a card has art and no caption, so authors write it rarely rather than 2,000 times.

## `game`

```ts
interface GameCard {
  type: "game";
  prompt: string;            // ≤ 8 words
  interaction: Interaction;  // required
  art?: string;              // optional scene behind the game
}
```

## `quiz`

```ts
interface QuizCard {
  type: "quiz";
  question: string;          // ≤ 10 words
  options: QuizOption[];     // 2–3
  hint: string;              // required — shown on a second attempt
}

interface QuizOption {
  label?: string;
  art?: string;              // pictures are the preferred answer format
  correct?: true;            // exactly one option has this
}
```

Picture answers are the default, not the exception — the audience may not read fluently.

`hint` is **required**, not optional. The Kindness Rules say a second attempt always comes with a gentle hint; making the field mandatory means content cannot be authored that breaks that promise.

There is no `explanation`, no `points`, no `difficulty`. There are no scores in this product.

## `verse`

```ts
interface VerseCard {
  type: "verse";
  text: string;
  reference: string;         // "Psalm 23:1"
  translation: string;       // "WEB"
  attribution?: string;      // when the translation requires it
  art?: string;
}
```

Translation lives on the verse, not in configuration, so the app stays translation-agnostic and a future translation swap is a content change.

Display only. No interaction — a card that shows a verse *and* asks the child to do something violates "one primary action per screen." Practice is its own card.

## `practice`

```ts
interface PracticeCard {
  type: "practice";
  prompt: string;            // ≤ 8 words
  interaction: Interaction;
}
```

Optional. Typically a `sequence` of the verse's words or phrases, or a `tap` to find the missing word.

## `celebration`

```ts
interface CelebrationCard {
  type: "celebration";
  message: string;           // ≤ 15 words, specific to this chapter
  art?: string;
}
```

Exactly one, always last. The message is chapter-specific because the Kindness Rules require encouragement to be specific — "you helped David remember he was not alone" rather than "Great job!"

---

# Interactions

**Four engines, three data shapes.**

This is the one place I'd ask you to look hardest, because it is a deliberate departure from a literal reading of the constitution.

Match and Drag & Drop are the same data: *these things belong with those things.* They differ only in how the child's hand moves. And since the constitution requires every drag interaction to have a tap-based fallback, the fallback **is** the match interaction — same pairs, same correctness, different input.

Modelling them as one shape with an `input` field means a drag interaction that lacks a tap fallback is **not expressible**. The constitutional requirement stops being a rule someone has to remember and becomes a property of the schema.

The four engines still exist as runtime behaviours in `ARCHITECTURE.md`. Only the content shape is shared.

```ts
type Interaction =
  | TapInteraction
  | PairInteraction
  | SequenceInteraction;
```

## `tap`

```ts
interface TapInteraction {
  kind: "tap";
  items: Item[];
  hint?: string;             // required if any item is marked correct
}
```

Two uses, distinguished by whether anything is marked `correct`:

- **Explore** — nothing correct. Tap anything, something delightful happens. Used in story beats.
- **Find** — one or more items correct. "Tap the shepherd."

## `pair` — powers Match and Drag & Drop

```ts
interface PairInteraction {
  kind: "pair";
  input: "tap" | "drag";     // presentation only
  pairs: { from: Item; to: Item }[];
  hint?: string;
}
```

Written already paired. The player separates and shuffles them. The author never writes an answer key.

`input: "drag"` requests the drag presentation; the player falls back to tap on small screens, on reduced-motion, and after repeated failed attempts.

## `sequence`

```ts
interface SequenceInteraction {
  kind: "sequence";
  items: Item[];             // written in the correct order
  hint?: string;
}
```

Written in the right order. The player shuffles. No index fields, no `position`, no `correctOrder` array.

## `Item`

```ts
interface Item {
  art?: string;
  label?: string;            // ≤ 5 words
  correct?: true;            // tap only
}
```

At least one of `art` or `label`.

## Why not one generic interaction?

It is tempting to collapse all three into `{ items, rule }`. I'd argue against it: three small explicit shapes are read faster and authored more accurately than one abstract shape with a mode switch. Flexibility is exactly what we are not optimising for.

---

# Identity, Progress and Resume

**Authors write no IDs anywhere.**

- Card identity is derived at build time as `<chapter-folder>:<card-index>`.
- Progress records store the card index plus a **content hash** of the chapter.
- If the hash still matches, the child resumes on the exact card.
- If the chapter has been edited since, the child resumes at **the start of the current step** instead. Silent, graceful, and invisible — this only happens when the author changes content.

This trades exact resume in a rare case for the removal of roughly 2,000 hand-written IDs across 100 chapters, and eliminates every class of duplicate-ID and dangling-reference bug.

Progress display uses the seven-step journey, never the card count — a child sees where they are in the adventure, not "card 14 of 23."

---

# The Library File

Chapter ordering and grouping live in exactly one place.

```json
{
  "schema": 1,
  "collections": [
    {
      "title": "Old Testament",
      "chapters": ["creation", "noahs-ark", "david-and-goliath"]
    },
    {
      "title": "Jesus",
      "chapters": ["the-good-samaritan", "the-lost-sheep"]
    }
  ]
}
```

Why this rather than an `order: 47` field on each chapter:

- Inserting a chapter between two others is moving one line, not renumbering.
- Reordering is a readable one-line diff in git.
- Grouping — which the home screen will need past roughly 20 chapters — comes free.
- A chapter folder that is not listed simply does not ship, which makes drafts trivial.

Validation fails if a listed chapter has no folder, or a folder is listed twice.

---

# Validation Rules

Enforced at build. **Any failure fails the build.** A broken chapter must never reach a child.

**Structure**
- Exactly one `cover`, first. Exactly one `celebration`, last.
- Card types appear in journey order and never interleave.
- At least one `story` card.
- A `practice` card must follow a `verse` card.

**References**
- Every `art` value resolves to a file in the chapter's `art/` folder.
- Every art file in the folder is referenced by at least one card (catches orphans and typos).
- Every chapter folder appears in `library.json`, and every entry has a folder.

**Correctness**
- `quiz` has 2–3 options and exactly one marked `correct`.
- `quiz.hint` is present and non-empty.
- `pair` has at least two pairs.
- `sequence` has at least three items.
- `tap` with any `correct` item has a `hint`.
- Every `Item` has `art` or `label`.

**Accessibility**
- A card with `art` and no `caption` has `alt`.
- No interaction distinguishes its items by colour reference alone — the validator flags captions and labels containing only a colour word.

**Copy** — enforced from `DESIGN_SYSTEM.md`, which makes the design system executable rather than aspirational
- Story caption ≤ 15 words, ≤ 2 sentences, ≤ 10 words per sentence.
- Prompts ≤ 8 words. Questions ≤ 10 words. Item labels ≤ 5 words.
- Celebration message ≤ 15 words.

Copy limits are warnings in development and errors in CI, so drafting is not interrupted but nothing over-long ships.

---

# Schema Versioning

- Every chapter file declares `"schema": 1`.
- Adding an **optional** field is a minor change; no version bump.
- Adding a card type, removing a field, or changing a meaning is a **major bump**.
- A version bump ships with a codemod that migrates every existing chapter, in the same pull request. Content is never left behind for someone to fix later.
- The player supports exactly one schema version at a time. No compatibility layers.

---

# Deliberately Not In The Model

The most valuable part of this document. Each of these has a plausible argument for inclusion, and each would cost more than it returns.

| Excluded | Why |
|---|---|
| Branching / choices that change the story | Every child gets the same Bible story. Branching multiplies authoring and testing without serving the product. |
| Styling, colour, layout, positions | Content declares meaning; the design system decides appearance. This is the boundary that keeps the acceptance test alive. |
| Animation timings or timelines in content | Motion is the design system's job. Content that choreographs becomes unmaintainable at 100 chapters. |
| Per-chapter component overrides | The first override ends "adding a chapter is one JSON file" permanently. |
| Sound effect references | Taps, successes and celebrations are system sounds, chosen once, applied everywhere. Consistency creates confidence. |
| Narration or audio fields | Version 1 has no narration. Text is data, so narration is addable later without restructuring — that is sufficient insurance. |
| Scoring, points, stars, difficulty | There are no scores in this product. |
| Markdown or rich text in captions | Plain strings. Emphasis is the illustrator's job. |
| Translation / i18n structure | English only in Version 1. All text is already data and none is baked into art, so this is a later addition, not a later rewrite. |
| Shared or cross-chapter art | Chapters stay self-contained. Revisit only if duplication becomes genuinely painful. |
| Templating or expressions | A chapter file is data a human reads. |

---

# Worked Example

A complete, valid, deliberately short chapter.

```json
{
  "schema": 1,
  "title": "David and Goliath",
  "reference": "1 Samuel 17",
  "cards": [
    { "type": "cover", "art": "cover" },

    {
      "type": "story",
      "art": "army-waiting",
      "caption": "The soldiers were afraid. Nobody wanted to fight."
    },
    {
      "type": "story",
      "art": "goliath-shouts",
      "caption": "Goliath was very tall. He shouted every morning.",
      "interaction": {
        "kind": "tap",
        "items": [{ "art": "goliath" }, { "art": "shield" }, { "art": "spear" }]
      }
    },
    {
      "type": "story",
      "art": "david-with-sheep",
      "caption": "David looked after sheep. He was not a soldier."
    },
    {
      "type": "story",
      "art": "david-chooses-stones",
      "caption": "David chose five smooth stones from the stream.",
      "interaction": {
        "kind": "pair",
        "input": "drag",
        "pairs": [
          { "from": { "art": "stone" }, "to": { "art": "pouch" } },
          { "from": { "art": "sling" }, "to": { "art": "hand" } }
        ],
        "hint": "The stones go in the pouch."
      }
    },
    {
      "type": "story",
      "art": "david-stands-tall",
      "caption": "David was not alone. God was with him."
    },

    {
      "type": "game",
      "prompt": "Put the story in order",
      "interaction": {
        "kind": "sequence",
        "items": [
          { "art": "army-waiting", "label": "The soldiers waited" },
          { "art": "david-with-sheep", "label": "David watched the sheep" },
          { "art": "david-chooses-stones", "label": "David chose five stones" },
          { "art": "david-stands-tall", "label": "David was brave" }
        ],
        "hint": "What happened first?"
      }
    },

    {
      "type": "quiz",
      "question": "What did David take with him?",
      "hint": "He found them in the stream.",
      "options": [
        { "art": "stones", "label": "Five stones", "correct": true },
        { "art": "sword", "label": "A big sword" },
        { "art": "shield", "label": "A shield" }
      ]
    },

    {
      "type": "verse",
      "text": "Be strong and courageous. Do not be afraid, for the Lord your God is with you.",
      "reference": "Joshua 1:9",
      "translation": "PLACEHOLDER",
      "art": "verse-background"
    },
    {
      "type": "practice",
      "prompt": "Put the words in order",
      "interaction": {
        "kind": "sequence",
        "items": [
          { "label": "Be strong" },
          { "label": "and courageous." },
          { "label": "Do not be afraid," },
          { "label": "for the Lord your God" },
          { "label": "is with you." }
        ]
      }
    },

    {
      "type": "celebration",
      "message": "You helped David remember he was never alone.",
      "art": "celebration"
    }
  ]
}
```

Read it top to bottom. Nothing points anywhere else.

---

# Thinking About Chapter 100

What this model does well at scale:

- **Chapters are fully independent.** No shared state, no global registry, no cross-chapter references. Chapter 100 is exactly as easy to author as chapter 1 — the property that matters most.
- **One global file**, `library.json`, and it holds one line per chapter.
- **Art is colocated**, so a chapter can be moved, drafted, or deleted as a unit.
- **Orphan detection** catches the mess that accumulates naturally at volume.
- **Git-native.** A chapter is a readable diff and a reviewable pull request.

What genuinely gets harder, and is not solved here:

- **Artwork volume.** Roughly 15 illustrations per chapter means ~1,500 images at 100 chapters. This will hit the offline budget in `ARCHITECTURE.md` long before it hits any limit in this model. The precache strategy is the answer, and it will need revisiting around chapter 25.
- **Illustration throughput** remains the real roadmap constraint. The content model cannot help with this.
- **Home screen browsing** past roughly 20 chapters. `library.json` collections give the structure; the design does not exist yet.
- **Repeated verses** across chapters. Duplication is fine and probably correct — resist the urge to normalise it.

---

# Decisions I'd Like You To Confirm

1. **Four engines, three data shapes.** Pair covers both Match and Drag & Drop, which makes the tap fallback structurally guaranteed rather than a rule to remember. This is a considered deviation from a literal reading of the constitution and I'd like it explicitly approved or rejected.

2. **`cover` and `celebration` as authored cards.** I considered generating both from chapter metadata, which would remove two boilerplate blocks from every chapter. I kept them as cards so that *every screen is a card* holds with no exceptions and the player has one loop and zero special cases. It costs about four lines per chapter. Reasonable trade, or would you rather save the lines?

3. **No IDs, resume degrades on content edits.** A child resumes at the start of a step rather than the exact card after you edit that chapter. I think that is invisible in practice and worth the removal of every ID in the system.

4. **`practice` as a card type.** It is the seventh type and only sometimes used. The alternative is folding practice into the verse card, which I rejected on "one primary action per screen." Keeping it means memory verses are learned rather than displayed.

---

# Open Questions

- Typical chapter length in cards — the example has 12; real chapters will suggest the natural range.
- Whether `story` interactions should ever be *required* to progress, or always skippable. I lean always skippable, per "Always a good place to stop."
- Whether the first release ships one collection or several in `library.json`.
