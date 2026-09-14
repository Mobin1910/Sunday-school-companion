# Content Library — the Google Drive master library

The filing cabinet. Every piece of source material, working draft and
approved asset for every class and chapter lives here, and the repository
holds only what a child actually receives.

`CONTENT_WORKFLOW.md` covers where curriculum comes from and how a brief
reaches the repository. This document is about the Drive library itself:
what the folders are, what belongs in each, and how an asset moves from a
photograph of a book page to something on a phone.

Top-level rather than under `docs/`, matching every other document here.

---

# Status

**The library exists.**

https://drive.google.com/drive/folders/1bUylCp5oc4PAn6I1zV4SuDSblTv7d9OJ

| | |
|---|---|
| Root, `00 - Admin & Templates`, all seven classes, `08 - Shared` + 6 subfolders | created and verified |
| `Contributor Guide` in `00 - Admin & Templates` | created |
| `01 - Nursery / Chapter 01` with all seven subfolders | created and verified |
| The other 139 chapters | run `tools/drive/create-library.gs` |

The remaining chapters are about 1,100 folders. That is one run of the Apps
Script and several hundred round trips any other way, so the script does
them. It is idempotent: it reuses everything above and creates only what is
missing.

---

# The four places

| | Answers |
|---|---|
| **Google Drive** | What material do we have, and where is it up to? |
| **Google Sheets** | What are we doing with this chapter? |
| **GitHub** | What does the child actually experience? |
| **Vercel** | Where is the finished app? |

**The PWA never contacts Drive.** Not at build time, not at runtime. Assets
reach the app by being copied into the repository during a deliberate,
reviewed publish — never fetched. This is what keeps the app offline-first,
and it is a hard requirement rather than a preference.

---

# The structure

```
Sunday School Companion/
│
├── 00 - Admin & Templates/        Contributor Guide, naming conventions, specs
│
├── 01 - Nursery/
│   ├── Chapter 01/
│   │   ├── 01 - Curriculum Source/    the book pages. Authoritative.
│   │   ├── 02 - Teacher Materials/    anything else a contributor gives us
│   │   ├── 03 - Working Content/      our workings. Private.
│   │   ├── 04 - Story Artwork/
│   │   ├── 05 - Games/
│   │   ├── 06 - Memory Verse/
│   │   └── 07 - Approved Assets/      cleared for production
│   ├── Chapter 02/
│   └── … Chapter 20
│
├── 02 - Beginner/
├── 03 - Primary/
├── 04 - Junior/
├── 05 - Intermediate/
├── 06 - Senior/
├── 07 - Young Adult/
│
└── 08 - Shared/
    ├── Character References/
    ├── Halo References/
    ├── Brand References/
    ├── App Branding/
    ├── General Bible References/
    └── Templates/
```

**The numeric prefixes are load-bearing.** Drive sorts alphabetically, so
without them "Beginner" comes before "Nursery" and a teacher looking for
the youngest class finds it second. The prefixes are the only place an
order is expressed; the names themselves carry no ages, because which age
band sits in which class is a fact about a congregation rather than about
this content.

**`Chapter 01`, never `Chapter 1`.** Two digits sort correctly past nine.
The ingestion side tolerates both — see `normaliseChapterNumber` — but what
we create is always padded.

**Empty chapter folders are the point.** Twenty drawers per class is a
year's room. A drawer is not a promise that there is anything in it.

---

# What goes where

Ask one question — *what is this?* — and the answer names the folder.

| | |
|---|---|
| A page of the Samajham book | `01 - Curriculum Source` |
| A teacher's own notes, a handout, an activity idea | `02 - Teacher Materials` |
| Our extraction, brief, story draft, game design | `03 - Working Content` |
| Story and comic artwork | `04 - Story Artwork` |
| Artwork and material for one game | `05 - Games` |
| Memory verse artwork | `06 - Memory Verse` |
| Finished, reviewed, cleared for the app | `07 - Approved Assets` |
| Anything that applies to more than one class | `08 - Shared` |

## 01 - Curriculum Source

The original material and nothing else: photographed or scanned pages,
PDFs, screenshots, official curriculum documents.

It answers exactly one question — **what did the official curriculum
actually say?** — and it can only answer it if nothing else is in there.
Never modify these files. Never overwrite one with generated artwork. Never
mix a draft in beside them.

**Filenames do not matter.** `IMG_4821.jpg`, `page-01.jpg` and
`chapter1-page1.jpg` are equally fine, and contributors are never asked to
rename anything. The folder hierarchy carries the meaning; where page order
matters it is taken from numbers in the filename, then from creation time.
If ingestion ever renames a file, it keeps the original name in metadata.

**These pages are copyrighted source material.** They are read by the
generation workflow and they stay in Drive. Nothing copies them into
`public/`, into the repository, or into the app. The child sees the
generated experience, never the book.

## 03 - Working Content

The production workspace: extracted notes, briefs, three-act drafts,
storyboards, game designs, verse drafts, review notes. None of it is what a
child sees, and none of it is approved by existing.

## 05 - Games

One folder per game — `Game 01`, `Game 02` — holding artwork, references
and drafts.

The **structured game data lives in the repository**, not here. Drive is the
creative asset library; `content/<class>/*.story.json` is where a game is actually
defined. Keeping a second copy of the interaction data in Drive would create
two answers to the same question.

## 06 - Memory Verse

Artwork and references supporting the verse. **The canonical verse text is
structured content data**, in the chapter file — never only a filename here.
A verse that exists only as `cast-all-your-anxiety.png` is a verse nobody
can validate.

## 07 - Approved Assets

The one folder that means something has been decided.

```
07 - Approved Assets/
├── story/
├── games/
└── memory-verse/
```

It answers *what is safe to put in the app?* Everything else in a chapter is
work in progress, however finished it looks.

---

# The asset lifecycle

```
SOURCE        01 - Curriculum Source
   ↓
WORKING       03 - Working Content, 04/05/06 drafts
   ↓
REVIEW        a person looks at it
   ↓
APPROVED      07 - Approved Assets
   ↓
PRODUCTION    committed to GitHub, reviewed as a diff
   ↓
DEPLOYED      Vercel builds, the PWA bundles it
```

**An asset is not production-ready because it exists in Drive.** That is the
whole reason `07 - Approved Assets` is a separate folder rather than a
naming convention, and the reason nothing syncs automatically.

## Draft, review, approved

Not as three subfolders under every artwork folder. The repository has no
asset-state convention to match, and 140 chapters × 3 states × 3 artwork
folders is over a thousand folders that exist to hold a status.

Instead: **work in `03 - Working Content` and `04`/`05`/`06`, and copy into
`07 - Approved Assets` when it is approved.** Presence in `07` *is* the
approved state. If a class ever needs finer tracking, add `Draft/` and
`Review/` inside that one chapter's artwork folder rather than everywhere.

---

# Drive, Sheets and the repository

## Identity

**`classId` + `chapterNumber`.** Never a number alone — chapter 1 exists in
every class and they are different lessons.

| | |
|---|---|
| Drive | `04 - Junior / Chapter 07 /` |
| Sheet | the `Junior` tab, row with Chapter `7` |
| Registry | `content/classes.json`, id `junior` |
| Brief | `content/brief/junior.json`, entry `"chapter": 7` |
| Production | the chapter file named in that entry's `produces` |

The numeric prefix is display order and is not part of the identity: the
class id is `junior`, not `04 - Junior`. A class id is set once and never
edited, because it names a Drive folder, a brief file and a future content
directory at the same time.

Folder naming is normalised rather than enforced — `Chapter 01`, `Chapter 1`
and `chapter-1` all resolve to `1`; see `tools/content/brief-schema.mjs`.

## What the Sheet holds, and does not

The Sheet stays teacher-friendly: Chapter, Title, Bible Reference,
Curriculum, Learning Objectives, Memory Verse and Reference, Video, Take
Home, Teaching Notes, Game Suggestion, Contributor, Status, Notes.

It never holds story panels, image files, artwork, asset paths,
`correctOptionId`, `matchId`, interaction details or generation prompts.
Those are production concerns, and a teacher who has to think about a panel
id has been handed our problem.

The **Curriculum** column holds the link to that chapter's
`01 - Curriculum Source` folder. That link is the join between the two
systems.

## Drive is not the production source of truth

| | |
|---|---|
| **Drive** | the master *human* asset library |
| **GitHub** | the version-controlled *production* source |

A change in Drive changes nothing in the app. Approved assets reach
production through a deliberate commit, which is reviewed as a diff and
carries its own history. **An arbitrary Drive edit must never be able to
silently change what a child sees.**

---

# Permissions

| Area | Contributors | You |
|---|---|---|
| Their class folders | upload | full |
| `08 - Shared` | read | full |
| `03 - Working Content`, `07 - Approved Assets` | not needed | full |
| Generation tooling, prompts, credentials | never | full |

A contributor with access to one class folder can do their entire job.
Nothing about generation is visible from the contributor side, and nobody
needs an AI key, an image-generation key, a GitHub account or deployment
access to contribute a lesson.

---

# The contributor's job

Written out in full as **Contributor Guide** in `00 - Admin & Templates`.
In short:

1. Photograph the lesson pages. Any filenames.
2. Put them in *your class → Chapter NN → 01 - Curriculum Source*.
3. Anything else helpful goes in *02 - Teacher Materials*.
4. Add a row on your class tab in the Sheet; paste the Drive folder link
   into **Curriculum**.
5. Add rows on **Learning Objectives**.
6. Set **Status** to `Ready for Review`.

That is the whole job.

> Teacher: "I uploaded Chapter 4."
> You: "Great. I'll turn this into the child experience."

---

# The private workflow

1. **Read** the chapter's `01 - Curriculum Source` and the Sheet row.
2. **Extract**: title, reference, the story, teaching points, the memory
   verse, activities, songs, prayer, take-home.
3. **Flag** anything unreadable, missing, duplicated, contradictory or
   unclear. Never fill a gap with general Bible knowledge — the source is
   authoritative, and where it is silent that is a flag, not an invitation.
   The flag kinds are fixed; see `tools/content/brief-schema.mjs`.
4. **Propose** a structure: objectives → story → games → memory verse. Draft
   it in `03 - Working Content`.
5. **Review** — you read it before anything is drawn.
6. **Generate** artwork into `04`, `05`, `06`.
7. **Approve** — copy what is cleared into `07 - Approved Assets`.
8. **Publish** — commit the approved assets and the chapter JSON to GitHub.
9. **Deploy** — Vercel builds from the repository.

The learning objective chooses the interaction: *understand the order of
events* wants Ordering, *recognise the people and their roles* wants
Pairing. A teacher may suggest in plain English; the workflow decides.

## Provenance

Enough to answer *where did this come from?* and no more: the brief's
`curriculumSource` names the Drive folder, `provenance` records which files
were read and when, and git holds the production history. Folder structure,
filenames and git are V1 — there is no asset database and does not need to
be one.

## Revising a chapter

New pages in Drive → status back to `Ready for Review` → regenerate → review
the diff → commit. Old production content is never overwritten blindly; the
diff is the review.

---

# What is not built

| | |
|---|---|
| Automatic Drive → GitHub sync | approved assets are copied by a person |
| Automatic publishing from Status | Status is read by a human, for now |
| OCR / page reading | nothing processes an image or a PDF yet |
| Runtime Drive access in the PWA | and there never will be |

No `fetchDriveAsset()`, no `getDriveChapter()`, no `loadFromGoogleDrive()`.
Nothing under `src/` knows Drive exists.

---

# Pre-existing Drive content

One folder was found during setup and **left completely alone**:

`Sunday School Primary Class` — created July 2020, inside an unrelated
parent folder. Not moved, not renamed, not touched. If it holds curriculum
worth keeping, copying it into the new library is a decision for a person,
not a script.
