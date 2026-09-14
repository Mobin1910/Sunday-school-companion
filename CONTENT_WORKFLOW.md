# Sunday School Companion — Content Workflow

How curriculum becomes a child's experience, and who touches what on the way.

`CONTENT_MODEL.md` specifies what a chapter *is*. `CONTENT_PIPELINE.md` is the
long-form design reasoning behind the spreadsheet and the generation step. This
document is the shorter, current statement of the architecture — where the
source lives, where the brief lives, where production lives, and which of those
the running app is allowed to know about.

Top-level rather than under `docs/`, matching every other document here.

---

# The four places, and the one question each answers

| | Answers |
|---|---|
| **Google Drive** | What does the official curriculum say? |
| **Google Sheets** | What are we doing with this curriculum? |
| **GitHub** | What does the child actually experience? |
| **Vercel** | Where is the finished app? |

The separation is the architecture. Each is authoritative for its own question
and for nothing else, and none of the first two is ever reachable from the
running app.

```
  GOOGLE DRIVE                          teachers upload here
  photographed / scanned Samajham pages
        │
        │  (future) ingestion — reads the pages
        ▼
  GOOGLE SHEETS                         teachers and you work here
  one row per chapter: what we are doing with it
        │
        │  npm run content:pull          you run it; needs a Google key
        ▼
  content/brief/<class>.json            committed. The sheet, frozen.
  content/classes.json
        │
        │  npm run content:generate      you run it; needs an AI key
        ▼
  content/<slug>.story.json             committed. Reviewed as a diff.
  public/art/<slug>/**
        │
        │  npm run build                 Vercel runs this. No keys, no network.
        ▼
  static export → PWA
```

Only the last command runs in CI. **Vercel never holds a Google credential and
never makes a request to Google.** That is not a convenience; it is what keeps
the build hermetic and the app offline-first.

---

# 1. Google Drive — the curriculum source

The curriculum already exists, as pages of the Sunday School Samajham books.
Asking a teacher to retype a lesson into a spreadsheet is asking them to do
work that has already been done, badly, in a format that loses the original.
So they upload what they have.

```
Sunday School Companion/
│
├── 00 - Admin & Templates/
├── 01 - Nursery/
│   ├── Chapter 01/
│   │   ├── 01 - Curriculum Source/   ← the lesson pages. Authoritative.
│   │   │   ├── page-01.jpg
│   │   │   ├── IMG_4821.jpg          ← also fine
│   │   │   └── lesson.pdf            ← also fine
│   │   ├── 02 - Teacher Materials/
│   │   ├── 03 - Working Content/
│   │   ├── 04 - Story Artwork/
│   │   ├── 05 - Games/
│   │   ├── 06 - Memory Verse/
│   │   └── 07 - Approved Assets/
│   └── … Chapter 20
│
├── 02 - Beginner/
├── 03 - Primary/
├── 04 - Junior/
├── 05 - Intermediate/
├── 06 - Senior/
├── 07 - Young Adult/
└── 08 - Shared/
```

The library is built and the folders are real — see **`CONTENT_LIBRARY.md`**,
which owns this structure, what belongs in each folder, and the asset
lifecycle. Only the first two folders concern a contributor.

**JPG, PNG, WEBP and PDF are all acceptable.** A photograph of a page taken on a
phone is a perfectly good contribution. Nobody converts anything by hand.

**Filenames do not matter.** `page-01.jpg`, `IMG_4821.jpg` and
`chapter1-page1.jpg` are equally welcome. The folder hierarchy carries the
meaning; where page order matters it is taken from numbers in the filename,
then from file creation time. Contributors are never asked to rename anything.

**Folder naming is normalised, not enforced.** `Chapter 01` is preferred because
it sorts correctly past chapter 9, but `Chapter 1` and `chapter-1` all resolve
to chapter `1`. A class folder's numeric prefix is display order, not
identity: `04 - Junior` is the class `junior`. See `normaliseClassId` and
`normaliseChapterNumber` in
`tools/content/brief-schema.mjs` — one implementation, so the rule cannot be
applied two ways.

**Raw curriculum never becomes an app asset.** The pages are copyrighted source
material. They are read by the generation workflow and they stay in Drive;
nothing copies them into `public/`. The child sees the generated experience,
never the book.

## Permissions

Two areas, and the distinction matters:

| Area | Who | What |
|---|---|---|
| Class folders (`04 - Junior/…`) | contributors + you | Upload curriculum. Contributors need nothing else. |
| `08 - Shared/` | contributors (read) + you | References. Read-only for contributors. |
| Production working files | **you only** | Generated artwork, prompts, drafts. Not in the contributor tree at all. |

A contributor with access to one class folder can do their entire job. Nothing
about generation — prompts, artwork sources, working files — is visible from
the contributor side.

---

# 2. Google Sheets — the editorial control layer

Already built. `tools/sheet/create-sheet.gs` creates it; `tools/sheet/build-xlsx.py`
produces an `.xlsx` you can upload instead. Six tabs, and that number is
deliberate:

```
Sunday School Companion — Content
├── Config              ← instructions, class IDs, controlled values
├── Nursery             ← one row per chapter
├── Beginner
├── Primary
├── Junior
├── Intermediate
├── Senior
├── Young Adult
└── Learning Objectives ← one row per objective, all classes
```

## Class tab — one row per chapter

| Column | Who | Notes |
|---|---|---|
| Chapter | teacher | A number. Unique **within this class only** — chapter 1 exists in every class. |
| Title | teacher | |
| Bible Reference | teacher | |
| **Curriculum** | teacher | **The link to this chapter's Drive `Curriculum` folder.** Free text may be added, but is not required. |
| Learning Objectives | *formula* | Read-only mirror of the Learning Objectives tab. |
| Memory Verse | teacher | The complete words, as the curriculum gives them. |
| Memory Verse Reference | teacher | |
| Video | teacher, optional | The whole YouTube URL. The ID is extracted downstream. |
| Take Home | teacher, optional | |
| Teaching Notes | teacher, optional | |
| Game Suggestion | teacher, optional | A suggestion, never binding. |
| Contributor | teacher | A name. This is the whole of contributor identity for V1 — no accounts. |
| Status | teacher | `Draft` · `Ready for Review` · `Published` |
| Notes | teacher, optional | |

**What changed with the Drive model:** only the meaning of *Curriculum*. It used
to ask a teacher to write the lesson out in their own words. It now asks for the
link to the pages they already have. Both still work — the field accepts either
— but nobody has to transcribe a lesson to contribute one. No column was added,
removed or reordered.

## Learning Objectives tab

| Column | Who |
|---|---|
| Class, Chapter | teacher |
| Objective ID | auto |
| Learning Objective | teacher |
| Priority (`Core` / `Supporting`) | teacher |
| Notes | teacher |

Separate from the class tabs because a chapter has several objectives and a
spreadsheet row has one of everything. It stays separate.

**The objective is what chooses the game.** Not the teacher, and not a column
they fill in:

| An objective like… | tends towards |
|---|---|
| "Understand the order of events" | Ordering |
| "Recognise the people and their roles" | Pairing |
| "Remember who/what/where" | Selection |
| "Notice something for themselves" | Discovery |

A teacher may suggest in plain English — *Pick the right one*, *Match things
together*, *Put things in order*, *Explore and find* — and that is recorded as a
suggestion. The private workflow decides the actual interaction.

## What the sheet must never contain

Panels, dialogue, Halo placement, distractors, hint ladders, interaction types,
option IDs, asset paths, slugs, generated IDs. All of it is production data.
A teacher who has to think about `panelId` has been handed our problem.

The brief schema enforces this rather than trusting it: every object in
`tools/content/brief-schema.mjs` is `.strict()`, so the first attempt to put a
panel array into a brief fails by name.

---

# 3. How a chapter is identified

**`classId` + `chapterNumber`. Never the number alone.**

`nursery` chapter 1 and `junior` chapter 1 are different lessons that happen
to share a number. Every part of the system carries both:

| | |
|---|---|
| Drive | `04 - Junior/Chapter 01/` |
| Sheet | the `Junior` tab, row with Chapter `1` |
| Brief | `content/brief/junior.json`, the entry with `"chapter": 1` |
| Production | the chapter file named in that entry's `produces` |

`content/classes.json` is the registry that makes a class id stable. **A class id
is set once and never edited** — it names a Drive folder, a brief file and a
future content directory, and renaming it orphans all three. The tab name and
display name may be changed freely, which is exactly why identity does not
depend on them.

---

# 4. The editorial brief in the repository

```
content/
├── classes.json          the class registry: id, tab, display, order, live
└── brief/
    └── <class>.json      one file per class, one entry per chapter
```

A brief is one class's rows, frozen into git. `npm run content:check` validates
them (`tools/content/check-brief.mjs`).

**Why snapshot the sheet rather than read it at build time.** A teacher's edit
arrives as a reviewable diff; the build is hermetic and offline; a bad edit is
undone with `git revert` rather than by asking someone to retype a cell; and
Vercel never needs a Google credential. It costs one command.

## Fields beyond the sheet's own

Three things live in the brief that no teacher fills in:

**`curriculumSource`** — where the pages are.

```jsonc
"curriculumSource": {
  "provider": "google-drive",
  "folderId": "…",
  "folderUrl": "https://drive.google.com/drive/folders/…",
  "label": "Chapter 1 Curriculum"
}
```

A folder, not a file list: contributors add and replace pages, and a list in the
repository would be wrong within a week. A `folderId` is an opaque identifier,
useless without permission to read that folder — it is not a credential and not a
secret. See *Security* below.

**`provenance`** — what was actually used, last time this chapter was generated.

```jsonc
"provenance": {
  "generatedAt": "2026-09-13",
  "sourceFiles": ["page-01.jpg", "page-02.jpg", "page-03.jpg"]
}
```

Written by the generation workflow, never by hand. It exists so that
regenerating a chapter in six months can answer *which pages was this built
from?* without anyone remembering. Deliberately thin: git already holds the
production history; this holds the one thing git cannot, which is what the input
was.

**`flags`** — what the workflow could not resolve.

```jsonc
"flags": [
  { "kind": "unreadable-source", "message": "page-03.jpg is out of focus", "blocking": true }
]
```

The kinds are fixed: `unreadable-source`, `missing-page`, `duplicate-page`,
`wrong-chapter`, `wrong-class`, `unclear-reference`, `incomplete-verse`,
`missing-objective`, `contradictory-metadata`, `other`.

**A chapter with a blocking flag cannot be `published`.** `content:check` fails
on it. That refusal is what makes "never invent missing curriculum" a rule
rather than an intention.

---

# 5. Production — what the child gets

The repository today:

```
content/
├── library.json                        which chapters ship
├── classes.json
├── brief/beginner.json
├── baby-jesus-at-the-temple.story.json
└── wedding-at-cana.story.json

public/
├── art/<slug>/                         story panels, option art
│   └── games/<game-id>/                artwork drawn for one game
└── brand/                              the app's own identity
```

**This is single-class today** — every chapter that ships belongs to `beginner`, and
the class is implied rather than in the path. `CONTENT_PIPELINE.md` §S proposes
`content/chapters/<class>/NN.story.json` and `public/art/<class>/NN/` for when a
second class goes live. That migration has not happened and is not part of this
work; the brief's `produces` field is the bridge in the meantime, naming the
slug a brief produced.

Do not create a parallel asset tree. `public/art/` is the asset convention;
`src/content/art.ts` is the only thing that resolves it.

---

# 6. The contributor's workflow

1. Photograph or scan the lesson pages.
2. Put them in Drive: *your class → Chapter NN → Curriculum*. Any filenames.
3. Add a row on your class tab: chapter, title, Bible reference.
4. Paste the Drive folder link into **Curriculum**.
5. Add the memory verse, and a video or take-home if the lesson has them.
6. Add rows on **Learning Objectives** for what a child should come away with.
7. Set **Status** to `Ready for Review`.

That is the whole job. A contributor never needs:

AI or image-generation credentials · generation prompts · GitHub access ·
deployment access · the internal tooling · any knowledge of panels, games,
interactions, slugs or schemas.

> Teacher: "I uploaded Chapter 4."
> You: "Great. I'll turn this into the child experience."

Multiple contributors work in parallel by class and chapter; the Contributor
column is the whole of identity for V1. No accounts, no permissions system.

---

# 7. The private generation workflow

Yours. Not automated yet — see *What is not built* — and this is the shape it
will take.

1. **Read** the Drive folder for `classId` + `chapter`, and the sheet row.
2. **Extract**, from the pages: title, reference, the story, teaching points,
   the memory verse, activities, songs, prayer, take-home.
3. **Flag** anything unreadable, missing, duplicated, contradictory or unclear.
   Never fill a gap with general Bible knowledge — if the source says something
   specific, the source wins, and if it says nothing, that is a flag.
4. **Propose** a content structure: objectives → story (connect / discover /
   reflect) → games → memory verse.
5. **Review** — you read it before anything is drawn.
6. **Generate** artwork and game assets.
7. **Validate** — `npm run build` on the chapter, `npm run content:check` on the
   brief, `npm run brand:check` on branding.
8. **Commit** to GitHub. The diff is the review.
9. **Deploy** — Vercel builds from the repository.

## Source fidelity

The curriculum is authoritative. Preserve its terminology, its Bible references,
its memory verses and its lesson structure. Do not silently correct wording, do
not shorten a verse, and do not substitute a more familiar translation. Where
the source and general Bible knowledge differ, say so explicitly rather than
quietly choosing.

The memory verse is the sharpest case, and it has already gone wrong once:
chapter 1 shipped carrying Simeon's line from panel 8 — "My eyes have seen your
salvation!" — instead of the curriculum's verse, *"For my eyes have seen your
salvation, which you have prepared in the presence of all peoples"* (St Luke
2:30,31). Story dialogue is not the memory verse. Extract the complete verse and
reference, and preserve both exactly.

## Status, and what moves a chapter through it

```
Draft  →  curriculum uploaded  →  objectives reviewed  →  content generated
       →  reviewed  →  Ready for Review  →  approved  →  Published
```

**Files appearing in Drive publish nothing.** Status is an editorial decision a
person makes. `Published` is set by the production owner, after review — never by
a contributor and never by a script.

## Revising a chapter

New pages in Drive → status back to `Ready for Review` → regenerate → review the
diff → commit. **Old production content is not overwritten blindly**: git history
is the production history, and a regeneration that changes a chapter shows up as
a diff to read rather than a silent replacement.

---

# 8. Runtime — what the app is allowed to know

**The PWA never contacts Google.** Not Drive, not Sheets, not at build time on
Vercel, not at runtime on a phone.

| | |
|---|---|
| Runtime, in the app | `content/<class>/*.story.json`, `public/art/<class>/**`, `public/brand/**` — all bundled |
| Build time, on Vercel | the same files. No network, no credentials |
| Build time, on your machine | Drive and Sheets, for `content:pull` and `content:generate` |

Nothing under `src/` imports a brief. That is why the brief schema lives in
`tools/` and not in `src/`: a brief that could be imported by a component is one
refactor away from the sheet becoming a runtime dependency.

The one thing the app fetches from the internet is a YouTube embed, and only
after a child taps *watch*. `ARCHITECTURE.md` covers that.

---

# 9. Security

**Nothing in this repository is a credential.** Not now, and not when the
ingestion step is built.

Never committed: OAuth tokens · service-account JSON · client secrets · API keys
· refresh tokens · passwords.

When ingestion needs to authenticate, it reads from `.env.local` (git-ignored) on
your machine, and from nowhere else. It never runs in CI and never runs on
Vercel, so those credentials never leave the machine that generates content.

A Drive `folderId` is not a credential. It is an opaque identifier that does
nothing without permission to read the folder, in the same way a Google Docs URL
does nothing for someone who has not been shared on it. Storing one is how the
future ingestion step finds a chapter's source without a human pasting a link
each time.

Generated production assets are not exposed in the contributor Drive tree.

---

# 10. What is not built

Deliberately, and this is the honest list:

| | |
|---|---|
| `npm run content:pull` | The sheet → brief sync. Briefs are hand-maintained today. |
| `npm run content:generate` | Curriculum → chapter. Chapters are hand-authored today. |
| Drive API access | No client, no OAuth, no service account, nothing that talks to Google. |
| OCR / page reading | No image or PDF processing of any kind. |
| Artwork generation | Not here, and not in this repository. |
| Automatic GitHub publishing | Commits are made by a person. |
| Class-scoped content directories | `content/chapters/<class>/` is a proposal, not a migration. |

No fake integration was written. There is no stub Drive client, no mock API and
no hard-coded identifier pretending to be a folder. What exists is the shape the
data will have and the checks that keep it honest — everything else waits until
it is actually built.

## The interface the future ingestion needs

Documented so it can be built incrementally, against a boundary that already
exists:

```
resolveClassFolder(classId)                  → Drive folder
resolveChapterFolder(classId, chapter)       → Drive folder
listCurriculumFiles(folder)                  → [{ name, mimeType, createdTime }]
readCurriculumFile(file)                     → bytes
readEditorialRow(classId, chapter)           → the sheet row
buildBrief(row, source)                      → a brief entry  (schema exists)
generateChapter(brief, pages)                → chapter JSON + an artwork plan
validate(chapter)                            → the existing Zod layer
publish(chapter, assets)                     → files in the repository
```

Only `buildBrief`'s output shape and `validate` exist today. The rest are names
for work not yet done.

---

# 11. Where each document stands

| Document | Owns |
|---|---|
| `CONTENT_MODEL.md` | What a chapter is. Normative. |
| `CONTENT_PIPELINE.md` | The long design argument behind the sheet and the generator. |
| **`CONTENT_WORKFLOW.md`** | This. Where source, brief and production live, and who touches what. |
| `STORY_ARCHITECTURE.md` | How a story becomes panels. |
| `BRAND_ASSETS.md` | The app's own identity. |

Where `CONTENT_PIPELINE.md` and this document disagree about Drive, **this one
wins** — that document recommended skipping Drive for V1, on the assumption that
contributors would type the curriculum. They will not; the books already exist as
pages. §M there now records the reversal.
