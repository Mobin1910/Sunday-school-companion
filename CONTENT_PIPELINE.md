# Sunday School Companion — Content Pipeline

**Status: proposal. Nothing here is built yet.**

This document proposes how content gets from a Sunday School teacher's head into
a child's hands, once there are many chapters, several classes, and contributors
who have never opened a terminal.

`CONTENT_MODEL.md` remains the normative specification for what a chapter *is*.
This document is about where chapters come from. Where the two overlap, this one
proposes changes and says so explicitly.

> **Revised by `STORY_ARCHITECTURE.md`** in two places: the story panel schema
> (§F/§G below) and the asset layout (§L below). That document takes the story
> comic further — dialogue is typeset into the artwork rather than drawn by the
> reader — and where the two disagree, it wins. Everything else here stands.

---

# The one decision everything else follows from

**Google Sheets holds the brief. The repository holds the chapter.**

That sentence is the whole architecture, and it is the one place I would push
back on the plan as written.

A teacher writes what a lesson is *about*: the passage, what it means, what a
child should come away understanding, a verse worth keeping, a video if they
found a good one. That is a dozen fields of plain English and it belongs in a
spreadsheet, because a spreadsheet is where a teacher already lives.

Nobody writes eleven story panels, four distractors, three hint ladders and a
celebration line into a spreadsheet. Those are *generated* from the brief. They
are long, they are numerous, they change every time the generator improves, and
they need to be read as a diff before a child sees them.

So the split is not "Sheets is the source of truth" but:

| Layer | Lives in | Written by | Reviewed as |
|---|---|---|---|
| **The brief** — curriculum, reference, objectives, verse, video, take-home | Google Sheet → snapshotted to git | teachers | a spreadsheet row, then a git diff |
| **The chapter** — acts, panels, games, options, hints, celebration | git, as JSON | the generator, run by you | a pull request |
| **The artwork** | git, as files | the generator, run by you | looking at it |

Once you accept that, most of the hard questions in the brief dissolve. There is
no "Panel 1 … Panel 11" column problem, because panels are never in the sheet.
There is no "Game 1 Interaction, Game 2 Interaction" column problem, because game
content is never in the sheet. The class tab is about fourteen columns of plain
English and it stays that way whether a chapter has three panels or thirty.

---

# A. Recommended architecture

```
  GOOGLE SHEET                      ← teachers work here, and only here
  one tab per class
        │
        │  npm run content:pull      (you run it; needs a Google key)
        ▼
  content/brief/<class>.json        ← committed. The sheet, frozen and diffable.
        │
        │  npm run content:generate  (you run it; needs an AI key)
        ▼
  content/chapters/<class>/NN.story.json
  public/art/<class>/NN/**          ← committed. Reviewed in a pull request.
        │
        │  npm run build             (Vercel runs this; no keys, no network)
        ▼
  schema validation → static export → PWA
```

Three commands, and only the third one runs in CI. The first two are yours.

**Why snapshot the sheet into git rather than pulling it at build time.** The
brief adds a second author to the product; git is how this project already tells
you what an author changed. Snapshotting gives you four things a live fetch
cannot: a teacher's edit arrives as a reviewable diff, the build is hermetic and
offline, a bad edit is undone with `git revert` rather than by asking someone to
retype a cell, and Vercel never needs a Google credential. It costs one command.

This is a strengthening of what you proposed, not a departure from it: Sheets is
still the human interface and still never touched by the running app.

---

# B. Should Google Sheets be the structured content source of truth?

**Yes, for the brief. No, for the chapter.** Agreed on every constraint you set:
the PWA must never fetch a sheet, content must be bundled, the core experience
must work offline, and no backend database appears anywhere in this design.

Two things I would name as risks so they are chosen rather than discovered:

- **A spreadsheet has no schema.** Anyone can type `Luke 2 : 22 - 33 ` with
  stray spaces, or paste a full YouTube URL where an ID is expected, or write
  "chapter one". The pull step must normalise aggressively and refuse clearly.
  This is fine — it is exactly what the existing Zod layer already does for JSON.
- **A spreadsheet has no branches.** Two teachers editing the same row at once
  is last-write-wins with no conflict. At the scale described (a handful of
  contributors, one row per chapter) this is a non-problem; it becomes one at
  twenty contributors, and the answer then is one sheet per class, not a CMS.

---

# C, D, E. The spreadsheet

## One spreadsheet. One tab per class. Yes.

One tab per class is right, for the reason you gave: a teacher opens one file and
picks their class. It also happens to be right technically, because a tab is a
natural unit to pull and a natural unit to snapshot.

With one correction: **a tab name must never be an identity.** Someone will
eventually rename "6–7 Years" to "6-7 years (Juniors)" and every chapter in it
would change identity. So a `Classes` tab maps a stable ID to a tab name, and the
ID is what reaches the app.

## The tabs

```
Sunday School Content
├── How to use this sheet      ← help + one filled-in example
├── Classes                    ← config: which tabs are classes, and their IDs
├── 6–7 Years                  ← one row per chapter
├── 8–10 Years
├── 11–13 Years
└── Learning Objectives        ← one row per objective, all classes
```

That is **one supporting tab**, not seven.

I would explicitly reject the Story / Games / Game Items / Videos / Memory Verses
/ Practice / Assets tab set floated in §6. Seven tabs cross-referenced by ID is a
relational database drawn in a spreadsheet: a teacher adding a chapter would have
to make consistent entries in five places and keep foreign keys straight by hand.
That is precisely the technical burden this whole design exists to avoid, and it
is the version teachers quietly stop using.

Every one-per-chapter thing (verse, video, take-home, celebration) is columns on
the chapter row. The single genuinely one-to-many thing a *teacher* writes is
learning objectives — a chapter has two, three, sometimes five — so that gets the
one supporting tab. Everything else that is one-to-many (panels, options, game
items, assets) is generated, and generated things do not belong in a sheet at all.

## `Classes` tab

| Column | Example | Notes |
|---|---|---|
| Class ID | `6-7` | Stable forever. Appears in URLs and folder names. Set once, never edited. |
| Tab name | `6–7 Years` | Must match the tab exactly. |
| Display name | `6–7 Years` | What a child's grown-up sees in the app. |
| Order | `1` | Order the classes appear in. |
| Live | `Yes` / `No` | `No` keeps a whole class out of the build while it is being written. |

Adding a class is: add a tab, add a row here, sync. No code change. This is what
makes §19 true.

## Class tab — one row per chapter

Frozen header row. Column A frozen. Dropdowns where marked.

| # | Column | Who fills it | Notes |
|---|---|---|---|
| 1 | **Chapter** | teacher | A number: `1`, `2`, `3`. Unique **within this class only** — chapter 1 exists in every class and that is fine. |
| 2 | **Title** | teacher | `Baby Jesus at the Temple` |
| 3 | **Bible reference** | teacher | `Luke 2:22–33` |
| 4 | **What this lesson is about** | teacher | The curriculum. Free text, several sentences or several lines. **This is the most important cell in the sheet.** |
| 5 | **The child's world (Act 1)** | teacher, optional | "Have you been to church with your family?" A situation to open with. Blank is fine — it can be generated from column 4. |
| 6 | **What they take away (Act 3)** | teacher, optional | "You belong to God and your family helps you grow in His love." |
| 7 | **Memory verse** | teacher, optional | The words. |
| 8 | **Memory verse reference** | teacher, optional | `Luke 2:30–31` |
| 9 | **Video link** | teacher, optional | Paste the whole YouTube URL. We extract the ID. |
| 10 | **Video title** | teacher, optional | |
| 11 | **Ask at home** | teacher, optional | "Ask your parents about your baptism, and who your Godparents are." |
| 12 | **Notes for us** | teacher, optional | Anything: a caution, a local reference, "don't mention X". |
| 13 | **Status** | teacher | Dropdown: `Draft` · `Ready for Review` · `Published` |
| 14 | **Updated** | auto | Date, filled by a script or a simple formula. |

Fourteen columns. It fits on a laptop screen. There is no word in it a Sunday
School teacher needs explained, and nothing that requires knowing what an
interaction, a panel, a slug or a schema is.

Two owner-only columns sit to the right, in a visually separated and
range-protected block:

| # | Column | Notes |
|---|---|---|
| 15 | **Review notes** | Your reply to the teacher. The one place a conversation happens. |
| 16 | **Generated** | Auto-filled by the generator: the date and version it last ran. Never typed. |

## `Learning Objectives` tab

| # | Column | Who | Notes |
|---|---|---|---|
| 1 | **Class** | teacher | Dropdown, from `Classes`. |
| 2 | **Chapter** | teacher | Number. |
| 3 | **What should the child understand, remember or notice?** | teacher | `Simeon recognised Jesus as the promised Saviour.` |
| 4 | **Idea for a game** | teacher, optional | Dropdown in plain English (below), **or leave blank**, **or type a sentence**. |
| 5 | **Notes** | teacher, optional | |
| 6 | **Game type** | *you* | Dropdown: `Selection` · `Pairing` · `Ordering` · `Discovery`. Protected. |
| 7 | **Presentation** | *you* | Dropdown: `multiple-choice` · `match` · `sequence` · `arrange-words` · `reveal`. Protected. |

Column 4's dropdown deliberately avoids our vocabulary:

| What a teacher picks | What it means to us |
|---|---|
| Pick the right one | Selection |
| Match things together | Pairing |
| Put things in order | Ordering |
| Explore and find | Discovery |
| *(blank)* | you decide |

This is §12's Interaction Plan, made literal: the teacher owns the **learning
objective** and may *suggest*; you own the **interaction** and the
**presentation**. Columns 3–5 and 6–7 are the two conceptual layers of §13,
sitting next to each other so the decision is visible rather than buried.

---

# F. The three acts

Today `story` is a flat array of panels. I propose it becomes three named acts:

```jsonc
"story": {
  "connect":  [ { "picture": "panel-01", "text": "…" }, … ],
  "discover": [ { "picture": "panel-04", "text": "…" }, … ],
  "reflect":  [ { "picture": "panel-10", "text": "…" }, … ]
}
```

rather than a flat list where each panel carries `"act": "connect"`.

The reason is the one this codebase already uses for `cover` and `celebration`:
*guaranteed by the shape rather than by a rule someone has to remember.* Named
acts make it impossible to write a story whose acts interleave, impossible to
omit an act silently, and impossible to get them out of order. A flat list with
an `act` field makes all three of those possible and then needs validation rules
to forbid them.

The flattening in `cards.ts` already exists and already turns authored sections
into one card sequence — this adds one more section boundary to a function whose
entire job is section boundaries. Each story card gains `act`, so the reader can
mark an act change if we ever want it to, and so **§9's two-Halos rule becomes
checkable**: Halo appears in `connect` and `reflect` artwork and never in
`discover`. That is a property of a generation prompt template selected by act,
not a field anyone types.

The runtime card sequence and therefore the page counter, the stored place, and
the reader are otherwise unchanged.

---

# G. Story panels

**Keep the existing convention exactly: pictures are named, never pathed.**

`"picture": "panel-04"` resolves to `public/art/6-7/01/story/panel-04.*` through
one function (`resolvePicture`). It is a genuinely good piece of design — content
never knows about file extensions, formats or directory layout, and the build can
change all three without touching a chapter. It survives this proposal untouched
apart from learning about classes.

Panels are numbered per chapter, continuously across acts (`panel-01` … `panel-11`),
not restarted per act. Numbering is generated. A chapter with eleven panels has
eleven files, and the missing-artwork warning that already exists tells you which
of them have not been drawn.

---

# H. Games and the interaction plan

Today a chapter has `activity` (one interaction, behind the Games door) and
`quiz` (a list, played inside the story reader). Those are two names for one
idea, split by where they happen to appear. With multiple games per chapter and
an explicit interaction plan, I propose they collapse:

```jsonc
"games": [
  {
    "objective": "Recall who Simeon was waiting to see.",
    "suggested": "Selection",           // what the teacher offered, kept for the record
    "interaction": { "type": "multiple-choice", … }
  },
  {
    "objective": "Understand the order the story happened in.",
    "interaction": { "type": "sequence", … }
  }
]
```

`objective` is **required**. That is §11 enforced by the build rather than by
discipline: you cannot write a game without saying what it is for, and a chapter
of five multiple-choice questions with five near-identical objectives becomes
visible as a problem at review time instead of shipping.

`suggested` is optional and is only ever the teacher's words, preserved so the
decision trail survives into the content — §12's "suggested vs final" made real.

Interactions embedded *inside a story panel* stay where they are. Those are a
different thing: a moment inside the narrative, not a game in the Games section.

**This is the one meaningful refactor in the proposal.** It touches `schema.ts`,
`cards.ts`, `sections.ts` (`activityOf` → `gamesOf`), `pools.ts`, the Chapter Hub
and the chapter Games route. Nothing below that moves: `Card`, `PlayInteraction`,
`InteractionPlayer`, the registry, the models, Halo and `src/local/` are all
untouched.

---

# I. Game options, items and images

No change to the item model — the existing one is already right for this:

```jsonc
"options": [
  { "picture": "option-01", "label": "Simeon", "correct": true },
  { "picture": "option-02", "label": "A soldier" },
  "option-03"                                    // the string shorthand
]
```

Option artwork lives at `public/art/<class>/<NN>/games/game-01/option-01.webp`
and is referenced by name. Game images are generated alongside game content, in
the same run, which is why they never need a sheet row: the thing that invents
"a soldier" as a distractor is the thing that draws him.

---

# J. Videos

Nearly no change. The current schema is already correct — a validated 11-character
ID rather than a URL, an optional chapter-owned poster picture rather than a
YouTube thumbnail, and an `enabled` flag. I propose only:

- `video` becomes `videos: [ … ]`. `videosOf()` already returns a list and every
  screen is already written for a chapter with two.
- Each entry gains an optional `sequence` for ordering when there are several.

The teacher pastes a URL; the pull step extracts and validates the ID, and fails
the sync with a plain message if it cannot. YouTube stays the one online-only
feature, embedded on the privacy-enhanced domain, mounted only on tap. That is
already how `WatchSection` works and none of it should change.

---

# K. Memory verse, practice, celebration

Verse and celebration keep their current shapes. Two notes:

**"Practice" means two different things in the brief, and we should pick names
before either is built.** §17 lists practice as *"Ask parents about
baptism/Godfather/Godmother"* — a take-home for the family. But the existing
schema's `verse.practice` is an *interaction*: a drill that helps a child hold
the words, and the thing that feeds the Memory Verse streak. Those are unrelated.

I propose:

- `verse.practice` — unchanged. An interaction. The verse drill.
- `takeHome` — new, a top-level string. One sentence for a grown-up. Not an
  interaction, not scored, not a card in any pool. It appears once, quietly, at
  the end of a chapter.

**Celebration** stays as it is, and stays generated by default: the existing rule
that it must *name what this child just did* rather than praise them generically
is a rule the generator can hold and a teacher will not think about. Column 6
("what they take away") feeds it.

---

# L. Assets

```
public/art/
└── 6-7/                        ← class ID
    └── 01/                     ← chapter number, zero-padded
        ├── cover.webp
        ├── story/
        │   ├── panel-01.webp
        │   └── … panel-11.webp
        ├── games/
        │   └── game-01/
        │       ├── option-01.webp
        │       └── option-03.webp
        ├── verse/artwork.webp
        └── celebration.webp
```

- **Named, never pathed** in content. One resolver knows this layout.
- **Class and chapter number in the path**, matching identity, so a file's home
  is derivable from where it is used and orphans are findable. The existing
  orphan check ("drawn but no card uses it") keeps working per chapter.
- **kebab-case, zero-padded, no spaces, no capitals.** A filename is an API.
- The existing two-tier art direction (phone/tablet) is orthogonal and unchanged.

---

# M. Google Drive → repository

**My recommendation is to skip Drive for V1.**

Drive is worth its complexity when contributors supply binaries. In this design
they do not — every asset is generated by you, in the same run that generates the
content that references it, and lands directly in the repo. Adding Drive would
mean a sync step, an ID mapping, and a second place for an asset to be stale.

If a teacher does have a photograph or a diagram they want used, the answer for
V1 is: they email it, you drop it in the folder, you write the filename into the
sheet's "Notes for us" cell. That is a handful of times a year, and a workflow
that costs nothing when unused.

Revisit if a class ever gets a dedicated illustrator — then a Drive folder per
chapter with a `content:pull-assets` step is the right shape, and the naming
convention above is already what it would sync into.

---

# N. Sync and build

**`npm run content:pull`** — reads the sheet, writes `content/brief/<class>.json`
and `content/classes.json`, normalises (trims, extracts video IDs, coerces chapter
numbers), and refuses on anything it cannot make sense of. Needs a Google service
account key in `.env.local`. Output is committed. Idempotent: running it twice
with an unchanged sheet produces no diff.

**`npm run content:generate [--class 6-7 --chapter 1]`** — reads a brief, writes
`content/chapters/<class>/NN.story.json` and the artwork. Needs an AI key in
`.env.local`. Never runs in CI, never runs on Vercel, and the keys are never in
the sheet, the repo, or Vercel's environment. Regenerating one chapter must not
touch another — the diff is the review.

**`npm run build`** — unchanged in spirit. Loads, validates, fails on error. No
network, no keys.

The brief being committed is what lets these three be genuinely separable: you
can generate on a plane, and CI can build without ever having heard of Google.

---

# O. Validation

**The existing two-tier mechanism is already right and should be kept.**
`checks.ts` distinguishes errors from warnings by whether a chapter ships;
`schema.ts` holds absolute structural rules that always fail the build. The only
change is where "does it ship" comes from: the sheet's Status column, via the
brief, instead of `library.json`. `library.json` retires.

**Always an error, at any status** (structural — `schema.ts`):

- missing or unknown class ID; class ID not in `classes.json`
- missing chapter number; duplicate chapter number *within a class* (across
  classes is expected and legal)
- missing title or Bible reference
- an act with no panels
- a game with no learning objective
- unknown interaction type
- selection with fewer than two options, or not exactly one marked correct
- ordering with fewer than three items; pairing with an unmatched pair
- a video ID that is not eleven valid characters
- a memory verse without a reference or a translation
- a `Ready for Review` or `Published` row referring to a class that is not `Live`

**Error when `Published`, warning when `Draft` or `Ready for Review`** (editorial
— `checks.ts`, exactly today's behaviour):

- referenced artwork that does not exist
- artwork that exists but nothing references
- placeholder translation
- copy over the length limits (15 words a panel, 10 a sentence, and the rest)
- no games at all
- every game in a chapter using the same presentation — the §11 guard

**Warning only, always:** no video, no take-home, no verse. A chapter without
these is a chapter without these, not an error.

---

# P. Draft, review, publish

**Three statuses, not six.**

| Status | Means | Build behaviour |
|---|---|---|
| **Draft** | Being written. | Not in the app at all. Editorial problems are warnings. |
| **Ready for Review** | The teacher is done; it is yours now. | Not in the app. Warnings. |
| **Published** | Reviewed, generated, approved. | In the app. Every rule is an error. |

Your six-state ladder describes *your* workflow accurately, but four of the
states are things a teacher should never have to think about — and a status a
contributor cannot correctly set is a status that will be set wrongly. "Interaction
ready" and "Generated" are facts the pipeline already knows: whether the objective
rows have a Game type, and whether the JSON file exists. It can report them without
anyone typing them.

The safety property you asked for — *nobody publishes broken content by accident*
— holds because `Published` is a status **only you set**, after generation and
review, and because a chapter at `Published` is held to every rule as an error.
A teacher moving a row to `Ready for Review` cannot break the build or reach a
child. Protect the Status column so teachers can choose `Draft` and `Ready for
Review` but not `Published`.

---

# Q. Contributor experience

- **Frozen header, frozen first column.** Wide sheets are unusable without it.
- **Dropdowns** on Status, Class and the game idea — never free text where a
  fixed set exists.
- **Plain English column headers that are questions**, not nouns: "What this
  lesson is about", "What should the child understand, remember or notice?" A
  question tells someone what to type; a noun makes them guess.
- **A worked example.** Chapter 1 of 6–7 Years, filled in completely, in a
  visually distinct row at the top of every class tab. One filled-in example
  teaches more than a page of instructions.
- **A help tab** with five short sections: what this sheet is, how to add a
  chapter, what the statuses mean, what happens after you mark Ready for Review,
  and who to ask. Under a screen of text.
- **No slugs, no IDs, no JSON, no file names** anywhere a teacher can see. The
  Class ID lives on the config tab, which they have no reason to open.
- **Blank is always allowed** except for chapter number, title, reference and the
  curriculum. Everything else has a sensible generated default.
- **Protected ranges** on the owner columns and the config tab — not as security,
  but so nobody has to worry about breaking something by clicking in the wrong
  cell.

---

# R. Private generation

Keys live in `.env.local`, git-ignored, and are read by `content:generate` only.
They are never in the sheet, never in the repo, and never in Vercel's environment
— which is safe by construction, because generation is not part of the build.

What the generator owns, from a brief:

- child-friendly story language, at the reading level the class implies
- Act 1 Connect, Act 2 Discover, Act 3 Reflect panel text
- panel count and pacing
- game content from each learning objective: prompt, options, distractors, hint
- celebration text
- image prompts, per act, with the Story Halo present in Connect and Reflect and
  absent from Discover
- the artwork itself

What the generator must **never** invent: the Bible reference, the memory verse
words, or the take-home. Those come from a person or they do not exist. A
generated verse is a theological liability, not a convenience.

Every run is committed by you, as a diff, on a branch. The review is reading it.

---

# S. How this fits the existing codebase

The runtime already has the right shape for this and mostly does not move.

**Changes:**

| File | Change |
|---|---|
| `content/schema.ts` | `story` becomes three acts; `activity` + `quiz` become `games[]` with a required `objective`; `video` becomes `videos[]`; add `class`, `chapter`, `status`, `takeHome`. |
| `content/load.ts` | Walk `content/chapters/<class>/` rather than a flat directory; read `classes.json`; `shipping` comes from `status === "published"` instead of `library.json`. |
| `content/cards.ts` | Flatten three acts instead of one array; story cards gain `act`; game cards gain `objective`. |
| `content/sections.ts` | `activityOf` → `gamesOf`; `nextChapter` becomes class-aware. |
| `content/art.ts` | Resolve under `<class>/<NN>/<section>/`. |
| `content/pools.ts` | Scope a pool to a class. A 6-year-old should not meet a 13-year-old's question. |
| `local/place.ts` | `Place` gains `classId`; `v: 1` → `v: 2`. Old records repair to null, which the existing repair path already handles honestly. |
| `local/store.ts` | One new key, `ssc.class`. |
| Routes | `/chapters` gains a class step; chapter routes become class-scoped. |

**A note on identity.** Because chapter numbers are not globally unique, identity
is the pair `(classId, chapter)`. I recommend the URL be built from exactly that —
`/c/6-7/1` — rather than from a title slug. A title is display text and will be
edited; an identity that changes when someone fixes a typo breaks every stored
place and every bookmark. Titles stay display-only.

---

# T. What stays untouched

Worth stating plainly, because it is most of the product:

- **`InteractionPlayer`** and its whole contract — the assistance ladder, the
  rung, the `onComplete()` that takes no arguments, the rule that attempt counts
  never leave the file. Content changes shape; how a child is helped does not.
- **The interaction models and the registry.** A new presentation is still one
  file and one switch arm.
- **`PlayInteraction` and `PlayItem`.** The item model with its string shorthand
  is already exactly what generated game content needs.
- **All of Halo** — the expression table, the arrival, the eyes, every layer of
  it. The UI Halo has no relationship to content and must not gain one. The Story
  Halo is paint.
- **All of `src/local/`** except one added key and one version bump. No account,
  no sync, no identifier, nothing leaving the device.
- **The privacy promise in full.** Nothing in this pipeline puts a network call
  in the app. The sheet is a build-time input to a static export, which is the
  same category of thing as a JSON file someone typed.
- **The two-tier validation idea**, the missing-artwork warning, the copy-length
  limits, the orphan check.
- **Static export, no backend, no database.**

---

# Chapter 1, end to end

**In the sheet** — one row on the `6–7 Years` tab:

| | |
|---|---|
| Chapter | `1` |
| Title | `Baby Jesus at the Temple` |
| Bible reference | `Luke 2:22–33` |
| What this lesson is about | *Mary and Joseph bring baby Jesus to the temple to present him to God, as the law asked. Simeon, an old man who had been promised he would see the Saviour before he died, is waiting there. He recognises Jesus, takes him in his arms and blesses God. Mary and Joseph are amazed at what is said about him.* |
| The child's world (Act 1) | *Have you ever gone to church with your family? Why do families bring children to church? What happened when you were a baby?* |
| What they take away (Act 3) | *Jesus was brought to God by his family. You were too — your parents, your Godparents and your church family help you grow in God's love.* |
| Memory verse | `My eyes have seen your salvation.` |
| Memory verse reference | `Luke 2:30` |
| Video link | *(blank)* |
| Ask at home | *Ask your parents about your baptism, and who your Godfather and Godmother are.* |
| Status | `Ready for Review` |

Three rows on `Learning Objectives`:

| Class | Chapter | What should the child understand…? | Idea for a game | Game type *(you)* | Presentation *(you)* |
|---|---|---|---|---|---|
| 6-7 | 1 | Recall who Simeon was waiting to see. | Pick the right one | Selection | `multiple-choice` |
| 6-7 | 1 | Understand the order the story happened in. | *(blank)* | Ordering | `sequence` |
| 6-7 | 1 | Notice how Simeon knew Jesus was the promised one. | *(blank)* | Discovery | `reveal` |

**After `content:pull`** — `content/brief/6-7.json` holds exactly the above, as
JSON, committed.

**After `content:generate`** — `content/chapters/6-7/01.story.json`:

```jsonc
{
  "class": "6-7",
  "chapter": 1,
  "title": "Baby Jesus at the Temple",
  "reference": "Luke 2:22–33",
  "status": "published",

  "cover": { "picture": "cover" },

  "story": {
    "connect": [
      { "picture": "panel-01", "text": "Have you been to church with your family?" },
      { "picture": "panel-02", "text": "Families bring their children to meet God." },
      { "picture": "panel-03", "text": "Someone brought Jesus to God too." }
    ],
    "discover": [
      { "picture": "panel-04", "text": "Mary and Joseph carried baby Jesus to the temple." },
      { "picture": "panel-05", "text": "An old man named Simeon was waiting there." },
      { "picture": "panel-06", "text": "God had promised he would see the Saviour." },
      { "picture": "panel-07", "text": "Simeon saw Jesus and knew him at once." },
      { "picture": "panel-08", "text": "He held the baby and blessed God." },
      { "picture": "panel-09", "text": "Mary and Joseph were amazed." }
    ],
    "reflect": [
      { "picture": "panel-10", "text": "Jesus was brought to God by his family." },
      { "picture": "panel-11", "text": "Your family helps you grow in God's love too." }
    ]
  },

  "games": [
    {
      "objective": "Recall who Simeon was waiting to see.",
      "suggested": "Pick the right one",
      "interaction": {
        "type": "multiple-choice",
        "prompt": "Who was Simeon waiting to see?",
        "hint": "God had promised him one special baby.",
        "options": [
          { "label": "Jesus", "correct": true },
          { "label": "A king's soldier" },
          { "label": "A shepherd" }
        ]
      }
    },
    {
      "objective": "Understand the order the story happened in.",
      "interaction": {
        "type": "sequence",
        "prompt": "What happened first?",
        "items": ["panel-04", "panel-05", "panel-08", "panel-09"],
        "hint": "They had to arrive before anyone could see them."
      }
    },
    {
      "objective": "Notice how Simeon knew Jesus was the promised one.",
      "interaction": {
        "type": "reveal",
        "prompt": "What did Simeon see?",
        "items": ["reveal-01", "reveal-02", "reveal-03"]
      }
    }
  ],

  "verse": {
    "text": "My eyes have seen your salvation.",
    "reference": "Luke 2:30",
    "translation": "WEB",
    "picture": "artwork"
  },

  "takeHome": "Ask your parents about your baptism, and who your Godparents are.",

  "videos": [],

  "celebration": {
    "message": "You belong to God, and you can grow in His love.",
    "picture": "celebration"
  }
}
```

Eleven panels, three games with three different presentations, one verse, one
take-home, one celebration — and the reader's counter reads `01 / 15`.

**Artwork** at `public/art/6-7/01/`: `cover.webp`, `story/panel-01…11.webp`,
`games/game-03/reveal-01…03.webp`, `verse/artwork.webp`, `celebration.webp`.

---

# Open questions for you

1. **"Practice"** — confirm the split in §K: `verse.practice` stays an
   interaction, and the family take-home becomes `takeHome`. If you meant one
   thing rather than two, this changes.
2. **Cross-class games.** Should the Games destination shuffle across a child's
   own class only, or everything they have played? I have assumed class-scoped.
3. **Class selection.** Is it chosen once by a grown-up and remembered, or
   switchable by a child from Home? This decides whether `ssc.class` is a setting
   or a destination.
4. **Chapter 1 in every class.** Confirm the app is happy to show "Chapter 1"
   twice if a child ever sees two classes. I have assumed a child sees one class
   at a time.

---

# What I would build first, when you say go

1. `classes.json` + `content/brief/` shape, with Chapter 1 hand-written into the
   brief format — no Google API yet. Proves the split works.
2. Schema and loader changes: acts, `games[]`, class-scoped paths, status.
   Migrate `stephen` and `baby-jesus-at-the-temple`. Build stays green.
3. Routes and `place.ts` for classes.
4. `content:pull` against a real sheet.
5. `content:generate`, last, because by then the target shape is fixed and proven.

Nothing before step 4 needs Google to exist, which means nothing before step 4
can be blocked by it.
