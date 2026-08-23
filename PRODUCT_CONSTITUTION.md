# Tiny Disciples — Product Constitution

> **Version:** 2.1
> **Status:** Living Document
> **Repository:** `tiny-disciples`

---

# Purpose

**Tiny Disciples** exists to become the most delightful way for children aged **6–7** to revisit Bible stories after Sunday School through comics, interactive storytelling, activities, quizzes, and memory verses.

This is **not** a Bible encyclopedia or a church management platform.

It is a calm, playful, story-first experience that children enjoy opening on their own.

Tiny Disciples does not replace Sunday School. It **complements** it.

The child has already heard the story from their teacher. Our job is to help them revisit it, remember it, and enjoy it again.

---

# AI Instructions

This document is the single source of truth for this project.

When contributing to this project:

- Read this document before making design or engineering decisions.
- Follow these principles unless explicitly instructed otherwise.
- If a request conflicts with this constitution, explain the conflict before proceeding.
- Prefer improving the system over introducing one-off exceptions.
- When this document is silent, follow the **Principle Priority Order** below.
- Implementation detail belongs in the companion documents, not here.

---

# Companion Documents

The constitution governs **why** and **what**. It deliberately does not contain numbers, budgets, or implementation detail.

| Document | Owns |
|---|---|
| `PRODUCT_CONSTITUTION.md` | Product philosophy, principles, scope, values |
| `CONTENT_MODEL.md` | The chapter schema — card types, interactions, validation rules |
| `ARCHITECTURE.md` | Technical structure, performance budgets, offline strategy, persistence |
| `DESIGN_SYSTEM.md` | Tokens, typography, colour, motion specs, accessibility metrics, copy rules |

Where the constitution states a principle, the companion documents state the measurable rule that enforces it.

If a companion document ever contradicts this constitution, **this document wins** and the companion document is wrong.

---

# Product Vision

Children should leave Sunday School excited to continue learning at home.

Every lesson should feel like a small adventure rather than homework.

The product should inspire curiosity, kindness, and joy.

---

# Audience

Primary audience:

- Children aged 6–7

The real constraint is not age — it is **reading fluency**.

A six-year-old may not read fluently, or at all. Tiny Disciples must therefore be understandable through **illustration and interaction alone**. Text supports the picture. It never carries the story by itself.

Version 1 intentionally excludes:

- Teacher tools
- Parent dashboards
- Admin portals
- Community features

Every decision should answer:

> **"Will this make the experience more enjoyable for a six-year-old?"**

---

# Adults & Access

A six-year-old does not open a browser, type a URL, or install an app.

**The parent is not a user. The parent is the door.**

Tiny Disciples has exactly one adult-facing surface, and it exists only to get the child through that door:

- A link a teacher or parent can share
- An install moment written for an adult, not a child
- A short, plain explanation of what this is and what it does not do

This is not a dashboard, an account, or a control panel. It is a hand-off.

Rules:

- The adult surface must never sit in the child's path.
- A child must never be able to reach settings, external links, or anything destructive.
- Once handed over, the app belongs entirely to the child.

---

# Product Principles

- Learning through play
- Story before mechanics
- Delight before complexity
- One primary action per screen
- Show more, explain less
- Reward curiosity
- Keep cognitive load low
- Motion should have purpose
- Children should never feel lost
- Calm over clutter
- Consistency creates confidence
- **The comic tells the story. The text provides context. The interaction reinforces understanding.**
- **Always a good place to stop**

## Always a good place to stop

Children do not finish things on an adult's schedule. They are interrupted, called for dinner, or simply done.

Every chapter must be enjoyable in **short, self-contained segments** that a child can pause and resume at any moment without losing anything or feeling punished.

There is no minimum session. There is no "you didn't finish." Every card is a safe place to leave, and coming back is always easy and obvious.

---

# Principle Priority Order

When two principles conflict, resolve in this order:

1. **Child safety & privacy**
2. **Comprehension** — the child always understands what is happening and what to do
3. **Accessibility**
4. **Offline reliability**
5. **Delight**
6. **Performance**
7. **Engineering elegance**

Performance sits below delight but is enforced as a **floor, not a preference**: delight is designed to fit inside the budget defined in `ARCHITECTURE.md`, never at its expense.

---

# Glossary

Used consistently in code, content, and conversation. No synonyms.

| Term | Meaning |
|---|---|
| **Story** | The biblical narrative itself (e.g. David and Goliath) |
| **Chapter** | One complete playable unit built around a Story |
| **Step** | A stage of the chapter journey (Cover, Interactive Story, Activity, Quiz, Memory Verse, Celebration) |
| **Card** | A single screen within a Step — the atomic unit the Chapter Player renders |
| **Learning Goal** | What a moment should help the child do — recall, association, sequencing, observation |
| **Interaction Model** | The kind of thinking an interaction requires — Selection, Pairing, Ordering, Discovery |
| **Presentation** | How an interaction model looks and behaves on screen — Match, Drag & Drop, Reveal, and so on |

"Lesson" is not a term in this project. Use **Chapter**.

"Game" and "Engine" are not terms in this project. Use **Activity** for the journey step and **Interaction** for the mechanic.

---

# Non-Goals (Version 1)

Tiny Disciples will **not** include:

- Backend
- Authentication
- User accounts
- Parent dashboard
- Teacher dashboard
- Admin portal
- CMS
- Chat
- Social features
- Leaderboards
- Analytics or telemetry of any kind
- Cloud sync
- User-generated content
- Spoken narration
- Streaks, daily goals, or return-tomorrow prompts

---

# Privacy Promise

Tiny Disciples is used by children. Therefore:

- We collect **nothing**.
- No analytics, no telemetry, no beacons, no fingerprinting.
- No third-party scripts, no advertising, no tracking SDKs.
- No personal information is requested, stored, or transmitted — ever.
- All progress stays on the child's device.
- The app makes no network requests at runtime beyond loading its own static assets.

This is a product principle, not a compliance checkbox. It is also a promise we can make plainly to parents.

---

# Child Safety & Tone

Bible stories include violence, fear, and death. Tiny Disciples tells them honestly but gently.

- Never depict graphic violence, gore, or terror.
- Difficult moments are told through implication, aftermath, and consequence — not spectacle.
- Fear is always resolved within the same chapter. A child never leaves a chapter frightened.
- Never use shame, guilt, or judgement as a motivator.
- Never frame a child's mistake as a moral failing.

Every chapter's ending should leave a child feeling safe, encouraged, and glad they read it.

---

# Kindness Rules

How the product treats a child when they get something wrong is a **values** decision, not an implementation detail.

- There are no wrong answers — only "try that again."
- No scores, no percentages, no grades, no red crosses.
- No fail state. A child can never be blocked from continuing.
- No timers, no countdowns, no time pressure of any kind.
- A second attempt always comes with a gentle hint.
- Encouragement is specific and warm, never generic praise for nothing.

Getting it wrong should feel like part of the play, not the end of it.

---

# Information Architecture

```
Home

├── Bible Stories
│      └── Chapter
│             ├── Cover
│             ├── Interactive Story
│             ├── Activity
│             ├── Quiz
│             ├── Memory Verse
│             └── Celebration
│
├── Memory Verses
│
└── About
```

Every chapter follows the same journey, in the same order.

Children should always know what comes next.

A step may be **omitted** when it genuinely would not serve the story. Steps are never **reordered**, and new steps are never invented. The child's mental model stays intact; the content does not get padded.

**Memory Verses** (top level) is the child's growing collection of verses from chapters they have played — a place to revisit and practise, not a reference library.

**About** is the adult-facing surface described in *Adults & Access*.

---

# The Interactive Story

Comics, captions, and lightweight interactions are **one continuous experience**, not separate sections.

A story is a sequence of illustrated cards. Each card may contain:

- An illustration
- A short caption
- An optional interaction (tap, drag, match, animation)

**The child never feels like they are leaving the comic to "read the story." The story is the comic.**

Text is always data, never baked into an illustration. This keeps the story resizable, translatable, and open to narration later — at no cost today.

---

# Content Philosophy

Every chapter must be data-driven.

Never hardcode Bible stories into the application.

Version 1 stores content as **JSON files in the repository** — one file per chapter, authored by hand, reviewed in pull requests, versioned in git.

This is chosen deliberately over a spreadsheet or CMS: with a single author, version control and simplicity matter more than an editing UI.

Requirements:

- Content is validated against a versioned schema at build time.
- **Invalid content fails the build.** A broken chapter must never reach a child.
- Adding a new chapter is a **content-only change** — zero code changes. This is the acceptance test for whether content and UI are genuinely separated.
- The content layer is abstracted so another source (Markdown, CMS, API) could replace it later without touching the UI.

## Memory Verses

Memory verses are **content, not code**. The content model stores verse text, reference, translation name, and any required attribution.

The application remains **translation-agnostic**. Version 1 develops against placeholder or manually supplied verses.

A single child-friendly translation should be chosen and applied consistently **before public release**. This constitution does not lock the project to one, and licensing must be confirmed for whichever is chosen.

---

# Design Language

The experience should feel:

- Warm
- Playful
- Calm
- Premium
- Handcrafted

Avoid:

- Visual clutter
- Loud colours
- Corporate UI
- Traditional church website aesthetics

Design inspiration:

- Bluey
- Pok Pok
- Khan Academy Kids
- Sago Mini

Concrete tokens — palette, typography, spacing, radii, illustration style, and copy rules — live in `DESIGN_SYSTEM.md`.

---

# Motion System

Animations exist to:

- Celebrate
- Guide
- Confirm
- Encourage
- Reward
- **Delight**

Motion must always serve a purpose — and **creating delight is a legitimate purpose**. Ambient charm is part of the craft this product is aiming for.

The limits: motion never competes with the primary action, never delays a child, and never becomes the reason a screen feels busy.

Reduced-motion preferences are always respected.

---

# Sound

Version 1 is a **visually led** experience. There is no spoken narration.

Sound is used sparingly and only to enhance delight:

- Celebrations
- Page turns
- Taps and successes

Rules:

- Sound is never required to understand anything.
- Nothing autoplays on load.
- A mute control is always available and easy for a child to find.
- No background music.

The architecture must not make narration difficult to add later — but Version 1 does not build or optimise for it.

---

# Interaction Philosophy

**Tiny Disciples is not a collection of games. It is a collection of meaningful interactions that reinforce learning.**

The question is never "which game should we build here?" It is **"which interaction best reinforces this part of the lesson?"**

## Three layers

Every interaction is chosen top-down:

| Layer | Question it answers |
|---|---|
| **Learning Goal** | What should this moment help the child do? |
| **Interaction Model** | What kind of thinking does that require? |
| **Presentation** | How does it look and feel on screen? |

Choosing a learning goal first is what keeps this pedagogical rather than mechanical. The presentation is the last decision, not the first.

## Four interaction models

Version 1 supports four, and only four:

| Model | Learning goal it serves | Presentations |
|---|---|---|
| **Selection** | Recall — remembering what happened | Tap, Multiple Choice, True/False, Fill in the Blank, Find the Picture |
| **Pairing** | Association — seeing what belongs together | Match, Connect, Drag & Drop |
| **Ordering** | Sequencing — understanding what follows what | Sequence, Arrange Story, Arrange Words |
| **Discovery** | Observation — noticing and attending | Reveal, Hidden Object |

New **presentations** may be added freely; they are new clothes on an existing model. New **models** are rare, deliberate, and require an argument.

## Rules

- Every interaction must directly support its chapter's story.
- The same model may appear anywhere — story, activity, quiz, or memory verse. Interactions belong to the lesson, not to a section.
- Every Drag & Drop must have a tap-based path to completion.
- No interaction may be required to move forward.
- No interaction records, reports, or reveals how many attempts a child took.

---

# Component Philosophy

Build reusable systems instead of pages.

The application is built around **two players**.

**The Chapter Player** renders a sequence of typed cards. Story, activity, quiz, memory verse, and celebration are **card types**, not separate engines. It owns the journey: order, progress, transitions, resume.

**The Interaction Player** renders one interaction, and knows nothing about where it sits. It owns a single interaction's life: attempt, hint, encouragement, completion. It cannot be told which section it is in, because it is never given that information.

That separation is the point. The chapter owns rhythm; the interaction owns mechanics; neither reaches into the other.

Core systems:

- App Shell
- Chapter Player
- Card Renderers (story, activity, quiz, verse, celebration)
- Interaction Player (selection, pairing, ordering, discovery)
- Progress & Persistence
- Navigation
- Buttons & Cards

Abstraction is earned, not assumed. Build the first chapter concretely, build the second, and extract the shared system at the third — when the real variance is visible.

---

# Engineering Principles

- Separate content from UI.
- Prefer reusable components.
- Keep the application static wherever possible.
- Offline-first thinking.
- Optimise for low-end Android devices.
- Accessibility is required, not optional — and is measured, not asserted.
- Never ship invalid content.
- Maintain a clean folder structure.

Budgets, targets, and the reference device are defined in `ARCHITECTURE.md`.

---

# Accessibility

Accessibility is a requirement of Version 1, not a future improvement.

Principles:

- Meaning is never carried by colour alone.
- Touch targets are sized for imprecise six-year-old fingers.
- Nothing depends on hearing.
- Nothing is time-limited.
- Reduced-motion preferences are respected.
- Text is resizable and never embedded in images.

Measurable thresholds live in `DESIGN_SYSTEM.md`.

---

# Resilience

Children should never feel lost — including when something goes wrong.

- A child always sees a character and a way forward, never a spinner or an error code.
- Chapters resume exactly where the child left off.
- Progress is stored durably and versioned, so content updates never corrupt it.
- Losing progress must be disappointing, never devastating: content is never locked behind progress.
- Offline is the expected state, not the exception.

---

# How We'll Know It Works

We collect no data. Therefore our instrument is **watching real children**.

- Play-test with children aged 6–7 before each release.
- Observe silently. Do not explain, prompt, or rescue.
- Record where they hesitate, tap the wrong thing, or lose interest.
- Confusion is a design defect, not a child's mistake.

A feature is validated when a child uses it correctly without being told how.

---

# Future Expansion

Future versions may consider:

- Spoken narration
- Teacher resources
- Parent features
- More Bible stories
- Additional interaction engines
- Localisation

Only after Version 1 succeeds.

---

# Success Metric

Success is **not** downloads.

Success is a child saying:

> "Can I read one more Bible story?"

---

# Amending This Document

This is a living document, but it changes deliberately.

- Amendments are made in a pull request, never in passing.
- Every amendment states what changed and why.
- The minor version increments for clarifications and additions; the major version increments when a principle, scope boundary, or non-goal changes.
- A decision that contradicts this document requires amending it first — not an exception.

---

# Changelog

## 2.1

- Replaced *Game Philosophy* with *Interaction Philosophy*: Tiny Disciples is not a collection of games, it is a collection of meaningful interactions that reinforce learning.
- Introduced the three-layer model — **Learning Goal → Interaction Model → Presentation** — so interactions are chosen pedagogically rather than mechanically.
- Replaced four interaction *engines* with four interaction **models** (Selection, Pairing, Ordering, Discovery) and thirteen presentations across them.
- Replaced the Game Engine with the **Interaction Player**, a standalone renderer that knows nothing about which section it is rendering.
- Renamed the journey step **Game → Activity**. The journey order is unchanged.
- Retired "Game" and "Engine" as project vocabulary.

## 2.0

- Added *Adults & Access* — the parent as installer, not user.
- Added *Privacy Promise*, *Child Safety & Tone*, *Kindness Rules*, *Resilience*, *Sound*, *Glossary*, *Companion Documents*, *Principle Priority Order*, *How We'll Know It Works*, and *Amending This Document*.
- Merged Comic and Interactive Story into a single continuous *Interactive Story* of illustrated cards; chapter journey reduced to six steps.
- Replaced Google Sheets with JSON content files in the repository; added build-time schema validation and the content-only-change acceptance test.
- Replaced four parallel engines with **one Chapter Player rendering typed cards**.
- Reduced game interactions from eight types to four reusable engines with variations.
- Made memory verses translation-agnostic and deferred the translation decision to pre-release.
- Moved budgets, tokens, and accessibility thresholds to `ARCHITECTURE.md` and `DESIGN_SYSTEM.md`.
- Reframed motion so that delight is a legitimate purpose.
- Removed accessibility from Future Expansion; it is a Version 1 requirement.
- Standardised terminology: Story, Chapter, Step, Card.

## 1.0

- Initial constitution.
