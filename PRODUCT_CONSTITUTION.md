# Sunday School Companion — Product Constitution

> **Version:** 2.5
> **Status:** Living Document
> **Repository:** `sunday-school-companion`

---

# Purpose

**Sunday School Companion** exists to become the most delightful way for children aged **6–7** to revisit Bible stories at home — through comics, interactive storytelling, activities, quizzes, and memory verses.

This is **not** a Bible encyclopedia or a church management platform.

It is a calm, playful, story-first experience that children enjoy opening on their own.

The name is the promise. This is a **companion** to Sunday School, never a replacement for it.

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
| `DESIGN_NOTES.md` | Visual judgements deferred until real artwork exists — observations, not decisions |

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

A six-year-old may not read fluently, or at all. Sunday School Companion must therefore be understandable through **illustration and interaction alone**. Text supports the picture. It never carries the story by itself.

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

Sunday School Companion has exactly one adult-facing surface, and it exists only to get the child through that door:

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
| **Chapter Hub** | A chapter's own front page — where its Sections are chosen. Every chapter is entered here |
| **Section** | A part of a chapter a child can choose: Story, Games, Memory Verse, and whatever follows them |
| **Step** | A stage within the Story section (Cover, Interactive Story, Quiz, Celebration) |
| **Card** | A single screen within a Step — the atomic unit the Chapter Player renders |
| **Learning Goal** | What a moment should help the child do — recall, association, sequencing, observation |
| **Interaction Model** | The kind of thinking an interaction requires — Selection, Pairing, Ordering, Discovery |
| **Presentation** | How an interaction model looks and behaves on screen — Match, Drag & Drop, Reveal, and so on |
| **Halo** | The companion. An abstract organic blob that expresses the Assistance Ladder — never a mascot, never a chatbot |
| **Halo State** | What Halo is expressing: idle, listening, curious, thinking, helping, hinting, recovering, celebrating, transitioning |

"Lesson" is not a term in this project. Use **Chapter**.

"Engine" is not a term in this project. **Games** is the destination a child sees, **Activity** is what an author writes in a chapter file, and **Interaction** is the mechanic underneath. The three are different levels and should not be swapped for one another.

**Games** is what a child calls them, so it is what the product says. The word was avoided at first for fear of an arcade; the arcade is prevented by what is actually behind the door — no levels, no locks, no scores, no "Game 1 / Game 2" — and not by refusing the child's own word for play. "Practice" survives in one narrower place: practising a memory verse, which is what that genuinely is.

---

# Non-Goals (Version 1)

Sunday School Companion will **not** include:

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

Sunday School Companion is used by children. Therefore:

- We collect **nothing**.
- No analytics, no telemetry, no beacons, no fingerprinting.
- No third-party scripts, no advertising, no tracking SDKs.
- No personal information is requested, stored, or transmitted — ever.
- All progress stays on the child's device.
- The app makes no network requests at runtime beyond loading its own static assets.

This is a product principle, not a compliance checkbox. It is also a promise we can make plainly to parents.

---

# Child Safety & Tone

Bible stories include violence, fear, and death. Sunday School Companion tells them honestly but gently.

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

# The Assistance Ladder

**No child should ever be stuck.**

Every interaction model must answer one question: *how do we help a child who does not know what to do next?* Assistance is not a feature that some interactions have. It is part of what an interaction **is**, and a model that has not answered this question is not finished.

## Recovery comes before help

**Before the app helps a child, it notices them.**

Recovery is the bridge between a try that did not work and the help that follows. Its job is to protect confidence, not to correct behaviour, and it always comes first:

> a try that did not work → **Recovery** → the ladder

Without it, help arrives as a verdict. With it, help arrives as company.

**Recovery is mostly not words.** This product is visually led and has no narration, so a child who cannot yet read fluently would never receive a written kindness — and those are exactly the children who need it most. Recovery is carried by warmth and motion first; words reinforce it for those who can read them.

So Recovery has two forms:

- **Silent Recovery**, on a first try that did not work. The choice settles gently back, the card warms for a moment, and nothing is said. A teacher usually says nothing the first time. Silence is not coldness — it is a mistake being treated as unremarkable.
- **Spoken Recovery**, from the second onwards. A short line arrives before the help does.

### What Recovery may never do

- **Never name the outcome.** "Almost", "Good try", "Not quite" and "Oops" all tell a child something failed, however warmly. Recovery does not mention the attempt.
- **Never praise the person.** "You're so clever" and "You're doing great" attach a label a child then has to protect, and children protect labels by avoiding hard things. Recovery speaks about effort and about what happens next.
- **Never repeat itself.** The same phrase every time stops meaning anything, and worse, it becomes a tally — a child who hears it five times has been told five times. In a product with no scores, nothing may keep count out loud.
- **Never outshine success.** Recovery is always quieter, smaller and shorter than arriving. If encouragement ever feels as good as getting there, we have given a child a reason to be wrong.
- **Never say "but".**

### What Recovery is for

It is recognition that a child is learning, not applause for being wrong. The three things it may do are name the effort, join the child, or move forward — and as the ladder climbs it moves from *noticing* toward *company*, never toward louder praise.

## How help arrives

Help arrives in rungs, and it only ever climbs. Recovery precedes every rung after the first.

| Rung | What happens |
|---|---|
| **Alone** | The child explores. Nothing is offered. A first miss gets silent Recovery. |
| **A word** | Recovery, then a gentle sentence in the chapter's own voice. |
| **A clue** | Recovery, then something changes on screen — the field narrows, or the right place draws the eye. |
| **Together** | Recovery, then the answer is shown, and the child still performs it themselves. |

**Two voices are speaking.** Recovery is the product's voice — the same patient teacher in every chapter, written once, never authored per chapter. The hint is the story's voice, written by the chapter's author about this particular moment.

**Stillness gets Recovery too, in its own register.** A child who has not acted has not failed at anything, so nothing may imply they have. Not "Need help?" — which asks a child to admit something — but "Let's look together", offered as though it were the plan all along.

Different models climb differently. A pairing puzzle cannot narrow its field the way a question can. But every model climbs.

## What the ladder is really doing

A patient teacher who sees a child struggling does not deliver progressively more information. They lean in. They go quiet. They move a distracting thing off the table. They rest a finger near the right place.

Almost none of that is telling. It is **attention and company**. The ladder should feel like someone sitting closer, not like a machine releasing more of the answer.

From which follows the rule that governs all the others:

> **Help changes the task, never the child.**

The screen quietly becomes easier. The child is never told they need help, never told they were wrong, and never told anything about themselves at all.

## What each model's help is for

The four ladders share a promise — help always comes, it always climbs, it never judges. They do not share a purpose, and flattening them into one shape would lose the thing that matters.

| Model | What being stuck feels like | What help is for |
|---|---|---|
| **Selection** | *"I might get this wrong."* | Taking the fear out of choosing |
| **Pairing** | *"There's too much here."* | Shrinking the world to one thing |
| **Ordering** | *"I don't know where to start."* | Giving the story a beginning so it can carry |
| **Discovery** | *"Is there anything here?"* | Inviting, never assisting |

**Ordering always helps from the front.** Settle the beginning, never reveal the end. A story with a beginning is far less frightening than a pile of pieces.

**Discovery's ladder goes quiet.** Nothing there can be wrong, so its help is an invitation rather than assistance — and an invitation repeated forever becomes nagging. It offers, it offers once more, and then it lets the child be. This is the only place in the product where help retreats, and it retreats because continuing would stop being kind.

## Rules

- **Two things call for help: a try that did not work, and stillness.** A child who does not know what to do usually does nothing at all, so time alone is enough to bring help. If the ladder only answered wrong answers, the most stuck children would get the least help.

- **Time may only ever add help. It may never take an opportunity away.** This is what separates assistance from a countdown, and the distinction is absolute. Nothing expires, nothing advances without the child, nothing is lost by taking longer. There are still no timers in this product.

- **Help never retreats.** Once a hint has been given it stays. Taking help back would punish a child for pausing.

- **The ladder is never visible as a ladder.** No counter, no "hint 2 of 4", no record that help was needed. The child should experience the app quietly becoming more helpful, never a measurement of their struggle.

- **The last rung shows, it does not do.** Reveal the answer, then let the child place it, tap it, or say it. An interaction that completes itself leaves a child watching someone else succeed.

- **Arriving with help is arriving.** There is no distinction anywhere in the product — on screen, in storage, or in a child's mind — between a first try and a fourth.

- **The way forward is always open anyway.** No interaction may be required to continue, so a child is never trapped by one. The ladder is generosity offered to a child who wants to succeed, not a lock they must pick.

- **Help is never only visual.** A clue that depends on colour, or on motion a child has asked to stop, is not a clue for everyone.

## Being generous, but not too soon

Help offered too early steals the moment a child was about to have. Help offered too late leaves them defeated. When in doubt, wait longer than feels comfortable — six-year-olds think slowly, and slow thinking is not struggling.

The timings that govern this are in `ARCHITECTURE.md`, and they are guesses until we have watched real children meet them.

---

# Halo

Halo is the companion: an abstract organic blob lit from within, with a golden ring above and two pale eye-like highlights. It deforms, gazes, and shifts tone, and it is alive at rest — light moves inside it whether or not anything is happening. It carries no cross, no badge and no mark.

**Halo is the visual voice of the Assistance Ladder.** That is its job, and it is the reason it exists. Where the ladder says a child is being noticed, met, or joined, Halo is what that looks like.

## What Halo is not

Not a mascot, not a cartoon character, not an orb, not a robot, and **never a chatbot**. There is no "ask Halo", no chat surface, no free-text anything. Halo has no arms, legs, clothes or costume. Its intelligence is expressed entirely through context-aware visual behaviour.

## Halo never decides anything

The Assistance Ladder is authoritative. Halo is told what is happening and expresses it — it never determines correctness, never chooses an assistance level, and never decides that a child needs help.

```
Interaction  →  assistance system  →  Halo state  →  how Halo looks
```

Reversing that arrow — a companion working out whether an answer was wrong — would make Halo a grading system with a friendly face. It is forbidden.

## Halo never counts

Halo receives states, never numbers. Attempts, scores and rungs stay inside the Interaction Player, exactly as the Kindness Rules require. What crosses to Halo is *recovering*, never *two wrong*.

## A wrong answer

A try that did not work earns a **beat, not a verdict**. Halo may soften, dim, look toward something, or breathe differently. It never flashes, reddens, shakes, or plays a large animation at a mistake.

The sequence is fixed, and it is the ladder's own:

```
child acts → Halo notices → a beat → Recovery → help if needed → child arrives → Halo celebrates
```

## Discovery has no recovery

Where an interaction has no wrong answer, Halo has no recovery state. In Discovery every tap is a discovery, so Halo stays a curious companion — entering a recovery state there would invent a mistake that was never made.

## Where Halo appears

The Chapter Hub, activities, memory-verse practice, help and celebration moments, and onboarding guidance.

**Halo stays out of the story artwork.** A companion floating over a page of Scripture is the one place it would make the product feel like a game.

## Time may only add

Stillness may bring Halo's help forward. It may never punish, remove an opportunity, force advancement, or introduce a countdown.

---

# What We Celebrate

**We celebrate what a child did, never whether they happened to know the answer.**

Correctness is the least interesting thing about a six-year-old reading a Bible story. What is worth recognising is that they looked closely, stayed with something hard, tried again, noticed something, or reached the end.

## The behaviours

| We celebrate | Because |
|---|---|
| **Curiosity** | They touched something they did not have to |
| **Careful looking** | They noticed what was there |
| **Persistence** | They stayed with it |
| **Trying again** | They came back after something did not work |
| **Finishing** | They reached the end of the story |
| **Discovering** | They found something for themselves |

**Kindness is not on this list, and its absence is deliberate.** The app cannot see whether a child is kind, and pretending to would be the most artificial thing we could do. Kindness is celebrated *in the story* — Stephen was kind, and the child recognises it — never as a behaviour we claim to have observed.

## Warmth is constant. Words are responsive.

A child who needed help did not fail. They kept going. So they are never celebrated less.

But nor are they celebrated *more*. Warmth that scales with struggle builds a reason to struggle, and it quietly tells a child *we know that was hard for you*, which is condescension wearing a kind face.

So the size, length and volume of a celebration never change. Only what it names changes:

- Arrived alone → **capability**
- Arrived after trying → **persistence**
- Arrived after help → **partnership**

Three honest recognitions of three different journeys, none of them louder than the others, none of them mentioning what went wrong.

## Being real rather than positive

Children detect insincerity faster than adults do, and praise that does not fit the act teaches them the praise means nothing.

- **Specificity is the whole of sincerity.** "You put them all in order" proves someone was watching. "Great job!" proves only that a machine fired. If a celebration could be pasted onto any other moment, it is not a celebration.
- **Proportion.** Small things get small acknowledgement. Tapping a picture is not an achievement and treating it as one is embarrassing for everyone.
- **Restraint is not stinginess — it is what makes the real moments land.** Celebrating everything devalues the currency. A child who is celebrated constantly stops hearing it, and a child rewarded heavily for something they already enjoyed enjoys it less afterwards.
- **Never repeat.** As with Recovery, a phrase that recurs becomes a counter.
- **Celebrate attention, not ability.** "You noticed" is available to every child. "You're so clever" is not, and it hands a child a label they will avoid hard things to protect.

## Where celebration happens

**In the moment, where the behaviour was.** What a child did is known only inside the interaction they did it in, and it stays there — a summary at the end of a chapter would be a report card, and this product does not issue those.

**At the end of the chapter**, one fuller moment, about the story and what the child did with it. This one is written by the chapter's author, because it is the only celebration that can say something true about *this* story.

**A discovery celebrates itself.** The reward for curiosity is the thing you found. Nothing counts how many a child found, and finding one and moving on is a complete experience.

## What we never celebrate

- Being right first time
- Being fast
- Doing it without help
- Finding all of something
- Completing everything
- Coming back — re-reading is a private pleasure, and noticing it out loud would make it feel watched

## Keepsakes, not trophies

The memory verse a child collects is **the thing they learned**, not a token they earned. We keep what a child made. We never keep what a child scored.

---

# Information Architecture

There are exactly **two levels of navigation**, and they are never mixed.

**Global navigation** is the product. It is a bottom bar, because this is a phone and tablet product first, and it holds four destinations:

```
Home  |  Chapters  |  Games  |  Verses
```

**Chapter navigation** is inside one chapter. It is the Chapter Hub, and it never appears in the bottom bar.

```
Home
  │
Chapters
  │
Chapter Hub                    ← every chapter is entered here
  ├── Story                    → the full-screen reader
  ├── Games                    → the chapter's activities
  ├── Memory Verse             → the verse, and practising it
  └── future sections
```

The bottom bar is **absent inside a chapter**. A story framed by a tab bar is a web page; a story with nothing around it is a story.

It is also **absent on Home**. Home already carries the greeting, the chapter to carry on with and the three doors, so a bar repeating those doors is the same navigation offered twice — and the row it costs is a row taken from Halo, who is the reason that screen exists. The architecture is unchanged: the four destinations and their routes are exactly as above. Only the bar's visibility differs, and it differs in one place in the code so no screen can get it wrong.

## Entering a chapter

**Every chapter begins at its Hub, without exception** — including a chapter arrived at by "Next Chapter" from the chapter before it. A child sees what a chapter holds before being put inside part of it.

Choosing a chapter never drops a child straight into the Story.

## Sections are real

A chapter is not one linear thing. Story, Games and Memory Verse are **first-class parts** a child chooses between.

The Chapter Player may still flatten a section's content into one card list internally — that is the player's business. The child-facing architecture understands sections, and adding a fourth one is a new entry rather than a redesign.

Within the **Story** section the order is still fixed: Cover, Interactive Story, Quiz, Celebration. A step may be **omitted** when it genuinely would not serve the story; steps are never **reordered**, and new steps are never invented.

## Back

Back always goes up one level, and never sideways:

| From | Back goes to |
|---|---|
| Story, Games, Memory Verse | that chapter's Hub |
| Chapter Hub | Chapters |

The browser and device back gestures follow the same hierarchy, because each level is a real route rather than a change of state.

## Ending a chapter

No section may leave a child asking "what now?". At the end of the Story:

- **Next Chapter** — primary, and it leads to the next chapter's **Hub**, never straight into its story.
- **Chapter Menu** — back to this chapter's Hub.

Where there is no next chapter, **Chapters** takes the primary place. A disabled "Next Chapter" is never shown: a door a child can see and cannot open is worse than no door.

Nothing at the end happens on its own. There is no timer and no auto-advance — offered, never done for them.

## The global destinations

**Home** is where a child meets Halo. Not a door and not a dashboard: the room the companion lives in, and the one screen presented in the night rather than on parchment. The order of it is greeting, Halo, the chapter to carry on with, then the ways further in — and Halo is given more of the first screenful than anything else on it. Nothing there counts anything; "continue learning" names a chapter, which is a fact about the content and not a measurement of the child. **Chapters** is the shelf. **Games** is every chapter's activities in one place, and will shuffle between them as chapters gain more than one — still no levels, locks or scores. **Verses** becomes the child's growing collection of verses from chapters they have read.

**About** is the adult-facing surface described in *Adults & Access*, reachable from Home and not in the child's path.

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

**Sunday School Companion is not a collection of games. It is a collection of meaningful interactions that reinforce learning.**

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
- **Every model implements the Assistance Ladder.** A model that cannot say how it helps a stuck child is not finished, whatever else it does.

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

## 2.5

- Renamed the product from *Tiny Disciples* to **Sunday School Companion**, everywhere — documents, code, and the app itself.
- The name now carries a principle it used to need a sentence for: this is a **companion** to Sunday School, never a replacement for it.

## 2.4

- Added **What We Celebrate**: behaviours, never correctness — curiosity, careful looking, persistence, trying again, finishing, discovering.
- Established that **warmth is constant and only the words respond**: arriving alone names capability, arriving after trying names persistence, arriving after help names partnership. A child who needed help is never celebrated less, and never more — warmth that scales with struggle builds a reason to struggle.
- Ruled kindness out of the celebrated behaviours, because the app cannot observe it. Kindness is celebrated in the story, never claimed as something we detected.
- Established that **specificity is the whole of sincerity**, and that restraint is what lets the real moments land.
- Established that behaviour is celebrated **where it happened**, never summarised at the end of a chapter, because a summary is a report card.
- Added an explicit list of what is never celebrated, including coming back — re-reading is a private pleasure and noticing it would make it feel watched.
- Named the distinction between **keepsakes and trophies**: we keep what a child made, never what a child scored.

## 2.3

- Added **Recovery**: before the app helps a child, it notices them. A try that did not work is met with acknowledgement before any assistance arrives.
- Established that **Recovery is mostly not words** — a visually led product with no narration cannot deliver kindness in text to children who cannot yet read it.
- Split Recovery into **silent** (a first miss, motion only) and **spoken** (from the second onwards).
- Ruled out language that names the outcome ("Almost", "Good try") or praises the person ("You're doing great") in favour of naming effort, joining the child, or moving forward.
- Established that **Recovery may never repeat**, because a repeating phrase becomes a tally of mistakes in a product that has no scores.
- Established that **Recovery must always feel quieter than success**, so that encouragement never becomes a reason to be wrong.
- Named the two voices: Recovery is the product's, the hint is the story's.
- Added *What the ladder is really doing* — help changes the task, never the child.
- Gave each interaction model its own purpose for help: Selection removes fear, Pairing removes overwhelm, Ordering restores momentum, Discovery invites.
- Established that **Ordering always helps from the front**, and that **Discovery's ladder goes quiet** rather than nagging.

## 2.2

- Added **The Assistance Ladder**: no child should ever be stuck, and every interaction model must say how it helps one who is.
- Established that **stillness calls for help as loudly as a wrong answer** — a stuck child usually does nothing rather than something wrong.
- Drew the line between assistance and pressure: time may only ever add help, never take an opportunity away.
- Established that the final rung **shows the answer but never performs it**, so the child's success stays their own.
- Added the ladder as a requirement of every interaction model, not an optional feature.

## 2.1

- Replaced *Game Philosophy* with *Interaction Philosophy*: Sunday School Companion is not a collection of games, it is a collection of meaningful interactions that reinforce learning.
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
