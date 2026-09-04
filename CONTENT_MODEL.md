# Sunday School Companion — Content Model

> **Version:** 2.1
> **Status:** Draft — pending review
> **Schema version:** 1
> **Governed by:** `PRODUCT_CONSTITUTION.md`
> **Reference chapter:** `content/stephen.story.json`

This is the authoring handbook for Sunday School Companion. It defines how every chapter is written.

It is not an API specification. It is the format you will hand-write for years, so it is designed for the person holding the pen.

---

# The Acceptance Test

> **Adding a chapter means creating one `.story.json` file and drawing the pictures. Nothing else.**
>
> No React changes. No registry edits. No imports. No component work.

Everything below serves that test. Its corollary matters just as much: **adding a new kind of card does require code.** The card vocabulary is closed and small on purpose. If a story seems to need a new kind, that is a product conversation, not a content edit.

---

# Six Rules The Model Obeys

**1. Nothing points at anything else.**
No IDs. No keys. No `answerId: "opt-3"`. No lookup tables. Every card is understood by reading it, in place, top to bottom. This is the property most easily lost and hardest to recover — protect it above all others.

**2. Write it correct; the app shuffles it.**
Sequences are written in the right order. Pairs are written already paired. Correct answers are marked where they sit. You never build an answer key, never think about randomisation, never write an index.

**3. Content says what things mean, never how they look.**
No colours, no sizes, no positions, no timings, no component names. The design system decides appearance. The moment content carries layout, this becomes a CMS and the acceptance test is dead.

**4. The structure of the file mirrors the structure of the chapter.**
You should be able to open a file and see the whole chapter's anatomy without scrolling.

**5. Absent means absent.**
Leave optional fields out. Never `null`, never `""`, never `false`.

**6. Boring beats clever.**
No expressions, no templating, no conditionals, no inheritance. A chapter file is something a human reads, not a program that runs.

---

# Anatomy of a Chapter

You proposed: Metadata, Cover, Cards, Celebration, Completion.

I'd refine it into this — **named sections that mirror the constitutional journey**:

```json
{
  "title": "Stephen",
  "reference": "Acts 6–7",

  "cover":       { … },
  "story":       [ … ],
  "activity":    { … },
  "quiz":        [ … ],
  "verse":       { … },
  "celebration": { … }
}
```

Two changes from your proposal, and one thing I dropped.

## Why sections instead of one `cards` array

I originally designed this as a single flat array where each card declared `"type": "story"`. Writing Stephen changed my mind decisively.

- **You see the whole chapter at a glance.** Six keys tell you what's there. A flat array makes you scan `"type"` values to find the quiz.
- **The `type` field disappears entirely.** Inside `story`, everything is a story card. That removes a line from every card in the file — and the most common card gets the least ceremony, which is how it should be.
- **Diffs are scoped.** "Changed the quiz" shows as a change inside `quiz`. In a flat array, inserting a story card shifts everything after it.
- **Invariants become structural.** Exactly one cover and exactly one celebration is guaranteed by the shape, not by a validation rule someone has to write. Same reasoning as the drag fallback below: put the rule in the shape, not in a checklist.

The objection I had was that the Chapter Player wants one uniform loop. That dissolves on inspection — the player flattens the sections into a single card sequence at load. **The file you write and the structure the player runs are allowed to differ.** Optimising the authored format for a human and normalising it in one place is the whole point.

## Why the memory verse is a section, not a card in the flow

The verse lives in chapter front matter because the chapter has exactly one, and because the top-level Memory Verses collection needs to read it without walking the card list. Its position in the journey is fixed by the constitution, so the player already knows where to show it. You never re-declare an order that never changes.

## Why I dropped "Completion"

It's the celebration under a second name. The one real thing completion implies — the verse joining the child's collection — happens automatically because `verse` is chapter metadata. A separate section would be a field you fill in identically 100 times. Cut.

## What "reference" is for

`"reference": "Acts 6–7"` is for you, and for anyone reviewing the chapter. It is never shown to a child.

---

# Files On Disk

```
content/
├── library.json
├── stephen.story.json
├── samson.story.json
└── creation.story.json

public/art/
├── stephen/
│   ├── cover.png
│   ├── stephen-serving.png
│   └── …
└── samson/
```

- **One file per chapter.** The filename is the chapter's identity — `stephen.story.json` is the chapter `stephen`. No `id` field, no `slug` field, one source of truth.
- **Pictures are named, never pathed.** `"picture": "stephen-serving"` resolves to `public/art/stephen/stephen-serving.*`. You never write a path or an extension. The build generates the formats and sizes.
- **`library.json`** holds the order chapters appear in, and nothing else:

```json
{
  "chapters": ["creation", "noah", "samson", "stephen"]
}
```

One line, one list. Reordering is moving a name. Adding a chapter to the app is adding a name. A chapter file not listed here simply doesn't ship — which makes drafting free. When the shelf grows past roughly twenty, this file gains named groups; not before.

---

# Two Conventions That Make This Pleasant

## The string shorthand

**Anywhere an item is expected, a bare string means "the picture with this name."**

```json
"items": ["old-woman", "small-boy", "tired-man"]
```

instead of

```json
"items": [
  { "picture": "old-woman" },
  { "picture": "small-boy" },
  { "picture": "tired-man" }
]
```

When you need more, use the long form and mix freely:

```json
"items": [{ "picture": "bread", "label": "Bread", "correct": true }, "gold", "scroll"]
```

The common case is short. The rare case is possible. Nothing is magic — one rule, stated once.

## Notes

**Any object in a chapter file may carry a `note`. The app ignores it completely.**

```json
{
  "picture": "open-sky",
  "text": "Then Stephen went home to be with Jesus.",
  "note": "Aftermath, not event. Empty warm sky, one basket of bread left on the ground. Nothing frightening on screen."
}
```

JSON has no comments, and a hand-written chapter badly needs them. Notes are where art direction lives, where you record *why* a difficult card is worded the way it is, and where you leave yourself a message for six months from now.

This turns out to matter most on hard chapters. The reasoning behind an editorial choice is more valuable than the choice itself, and it is exactly what evaporates if there's nowhere to put it.

## A small typographic rule

Use curly quotes in content text: `“Jesus, please forgive them.”`

Straight quotes must be backslash-escaped in JSON, which makes dialogue ugly to write and worse to read in a diff. Curly quotes need no escaping and are typographically correct anyway.

---

# The Card Catalogue

Seven kinds of card. **You never write a `type` field for any of them** — the section it sits in says what it is.

---

## Cover

**Purpose.** The chapter's front door. One picture, the title, and an invitation to begin.

```json
"cover": { "picture": "cover" }
```

**Required.** `picture`
**Optional.** `note`

**Behaviour.** The title comes from the chapter. One primary action: begin. If the child has played before, the same button resumes instead, worded so it never implies they left something unfinished.

**UX.** This is the picture that appears on the home shelf, so it has to work at thumbnail size. A single character, large, mid-action, making eye contact.

**Accessibility.** The chapter title is the accessible name. No `alt` needed.

---

## Story

**Purpose.** The chapter itself. Everything else exists to support these cards.

```json
{
  "picture": "sharing-bread",
  "text": "Every day he shared food with people who were hungry.",
  "interaction": { … }
}
```

**Required.** `picture`
**Optional.** `text`, `interaction`, `note`, `alt`

**Behaviour.** One card, one screen, one idea. Forward is always available. An interaction on a story card is a *beat*, not a gate — it is never required to continue, per "Always a good place to stop."

**UX.** A story card must make sense with the text covered. If it doesn't, the picture is wrong — not the words. A card with no `text` is legitimate and often powerful: a wordless beat lands harder than a described one.

**Accessibility.** `text` is the accessible description by default, which is why `alt` is almost never needed — only on a card with a picture and no text, and only when the picture carries meaning. Purely decorative backgrounds need nothing.

---

## Interaction (inside a story card)

Not a separate card. That distinction is the whole product.

```json
{
  "picture": "sharing-bread",
  "text": "Every day he shared food with people who were hungry.",
  "interaction": {
    "type": "reveal",
    "prompt": "Who else is hungry?",
    "items": ["old-woman", "small-boy", "tired-man"]
  }
}
```

The child does not leave the story to play. They reach into the picture they are already looking at. Any of the thirteen presentations may sit here — see *The Interaction Library* below.

---

## Activity

**Purpose.** One longer interaction that consolidates the whole story, after it has been told.

```json
"activity": {
  "type": "arrange-story",
  "prompt": "What happened first?",
  "items": ["stephen-serving", "stephen-teaching", "stephen-looks-up", "friends-remember"],
  "hint": "Stephen was helping people at the very beginning."
}
```

**The activity section holds one interaction — any interaction.** It is not a game slot and there is no such thing as an "activity type." Choose whichever interaction best consolidates this particular story.

**Required.** Whatever the chosen presentation requires
**Optional.** `hint`, `picture`, `note`

**Behaviour.** The same interaction library used in story cards, given a full screen and more pieces. Retelling — `arrange-story` — is the strongest default, because it rehearses the narrative rather than testing recall of a detail.

**UX.** Reuse pictures the child has already seen. Recognition is the point; new artwork here would turn consolidation into a test.

**Accessibility.** Every piece is distinguishable without colour. Labels are optional but help emerging readers anchor what they're looking at.

---

## Quiz

**Purpose.** A gentle "did you notice?" — never an examination.

**A quiz entry *is* an interaction.** There is no quiz-specific schema, because a quiz was only ever a Selection wearing a costume.

```json
"quiz": [
  {
    "type": "multiple-choice",
    "prompt": "How did Stephen help people?",
    "hint": "It was something you can eat.",
    "options": [
      { "picture": "bread-basket", "label": "He shared food", "correct": true },
      { "picture": "gold-coins", "label": "He gave them gold" },
      { "picture": "scroll", "label": "He wrote them letters" }
    ]
  }
]
```

This is what makes the section flexible: if ordering the story reinforces the lesson better than a question would, put an `arrange-story` here instead. The section names a *moment*, never a format.

**Required.** `hint` — plus whatever the presentation requires
**Optional.** `picture`, `note`

**`hint` is required for any interaction with a correct answer.** The Kindness Rules promise a hint on the second try; making the field mandatory means a chapter that breaks that promise cannot be written.

**UX.** Picture options are the default. A six-year-old who cannot read fluently must still be able to answer confidently. Two options is often better than three. One or two questions per chapter — three is already a test.

**Accessibility.** Options are never distinguished by colour. Each is a target meeting the 56px minimum with room to spare.

---

## Verse

**Purpose.** The verse the chapter leaves behind.

```json
"verse": {
  "text": "Be kind to one another, forgiving one another.",
  "reference": "Ephesians 4:32",
  "translation": "PLACEHOLDER",
  "picture": "verse-background",
  "practice": { … }
}
```

**Required.** `text`, `reference`, `translation`
**Optional.** `picture`, `attribution`, `practice`, `note`

**Behaviour.** Displayed calmly and alone. The verse screen has no interaction — a screen that shows a verse *and* asks the child to do something breaks "one primary action per screen." Practice is a separate screen, even though it is nested here in the file.

`translation` lives on the verse rather than in config, so the app stays translation-agnostic and a future swap is a content change. `PLACEHOLDER` is valid during development and blocks release.

**UX.** Choose a verse the chapter has *earned*. Stephen's chapter is about forgiveness, so it takes Ephesians 4:32 rather than a verse from Acts that a six-year-old cannot hold.

**Accessibility.** The background picture is decorative and gets no alt text. The verse is real text, never set inside artwork.

---

## Practice

**Purpose.** Helping a verse stick, without anyone being tested.

```json
"practice": {
  "type": "sequence",
  "prompt": "Put the words back together",
  "words": ["Be kind", "to one another,", "forgiving", "one another."]
}
```

**Required.** `type`, `prompt`, and either `words` or `items`
**Optional.** `hint`, `note`

`words` is a distinct key from `items` because these are phrases, not pictures — the string shorthand would otherwise mean two different things in two places. Split the verse at natural breath points, not by word count.

**Behaviour.** The verse stays visible or one tap away. This is assembly with the answer in reach, not recall under pressure.

**UX.** Optional, and worth including. A verse that is only displayed is a verse that is only read.

**Accessibility.** Word tiles are drag-or-tap like any sequence, and always completable by tapping.

---

## Celebration

**Purpose.** The warm ending.

```json
"celebration": {
  "picture": "celebration",
  "message": "You learned how Stephen stayed kind, even when it was hard."
}
```

**Required.** `message`
**Optional.** `picture`, `note`

**Behaviour.** The verse joins the child's collection here. The two ways onward — another chapter, or home — are equally weighted, with no nudge toward "keep going."

**UX.** The message is specific to this chapter and names what the child did. "Great job!" is banned by the Kindness Rules; generic praise for nothing is worth nothing. Write the sentence you would actually say to a six-year-old who just finished.

**Accessibility.** Celebration motion respects reduced-motion and never blocks the way forward.

---

# The Interaction Library

This is the heart of the model. Interactions are **reusable learning mechanics**, not games. They belong to the lesson, not to a section, and the same one may appear in a story card, the activity, the quiz, or memory verse practice.

The question is never "which quiz should we build?" It is **"which interaction best reinforces this part of the lesson?"**

## Three layers

Choose top-down, and the presentation last:

```
Learning Goal   →   Interaction Model   →   Presentation
what the child       what kind of             how it looks
should be able        thinking that            and feels
to do                 requires
```

| Learning Goal | Interaction Model | Presentations |
|---|---|---|
| **Recall** — remember what happened | **Selection** | Tap · Multiple Choice · True/False · Fill in the Blank · Find the Picture |
| **Association** — see what belongs together | **Pairing** | Match · Connect · Drag & Drop |
| **Sequencing** — understand what follows what | **Ordering** | Sequence · Arrange Story · Arrange Words |
| **Observation** — notice and attend | **Discovery** | Reveal · Hidden Object |

Thirteen presentations. Four models. **One field to write.**

## What Version 1 actually builds

Five: `multiple-choice`, `match`, `sequence`, `arrange-words`, `reveal`. One per model, plus a second Ordering for verse practice. `drag` follows once `match` is solid.

The other presentations below are **documented vocabulary, not work in progress**. They describe how the library grows, and each is cheap to add on the day a chapter genuinely wants it. Ten chapters do not need thirteen ways to interact.

Two are deliberately *not* on the Version 1 list for pedagogical reasons rather than effort: `true-false` and `fill-blank` are the most text-dependent presentations in the library, and a child who cannot yet read fluently should not meet them first.

## You only ever write the presentation

```json
"interaction": { "type": "multiple-choice", … }
```

The model is derived from the presentation — `multiple-choice` is always Selection — so writing both would be saying the same thing twice.

**The learning goal is not in the file either.** It is how you *decide*, not something the app needs, and a field that nothing reads is a field you would fill in a hundred times for nothing. It lives in this table, where it does its work at the moment you are choosing.

## Choosing well

| If this moment should… | Reach for |
|---|---|
| Check the child noticed something | `multiple-choice`, `find-picture` |
| Confirm one simple fact without options | `true-false` |
| Reinforce the words of the verse | `fill-blank`, `arrange-words` |
| Show that two things belong together | `match`, `connect` |
| Make the child physically place something | `drag` |
| Rehearse the whole story | `arrange-story` |
| Slow a child down inside a picture | `reveal`, `hidden-object` |
| Add a beat without asking anything | `reveal` |

When two would work, choose the gentler one.

---

# The Four Models

## Selection

*Recall. Pick the one that's right.*

Exactly one option is correct. `hint` is required.

**`tap`** — touch the right thing inside the illustration.

```json
{
  "type": "tap",
  "prompt": "Find the bread",
  "items": [{ "picture": "bread", "correct": true }, "jar", "basket"],
  "hint": "It is round and warm."
}
```

**`multiple-choice`** — pick from option cards.

```json
{
  "type": "multiple-choice",
  "prompt": "How did Stephen help people?",
  "hint": "It was something you can eat.",
  "options": [
    { "picture": "bread-basket", "label": "He shared food", "correct": true },
    { "picture": "gold-coins", "label": "He gave them gold" }
  ]
}
```

**`find-picture`** — the same thing with pictures only, laid out as a grid. Honestly a layout variant of `multiple-choice`, kept separate because it is worth naming what you mean.

```json
{
  "type": "find-picture",
  "prompt": "Which one is Stephen?",
  "hint": "He is carrying the basket.",
  "options": [{ "picture": "stephen", "correct": true }, "soldier", "merchant"]
}
```

**`true-false`** — one statement, two answers. Authoring sugar: write the statement and whether it's true.

```json
{
  "type": "true-false",
  "statement": "Stephen shared food with hungry people.",
  "answer": true,
  "hint": "Think about the baskets he carried."
}
```

**`fill-blank`** — a sentence with a gap.

```json
{
  "type": "fill-blank",
  "sentence": "Be kind to one ___.",
  "answer": "another",
  "others": ["day", "friend"],
  "hint": "The verse says it twice."
}
```

`answer` is the word itself, not a pointer to one — no cross-reference, nothing to mark. The player shuffles `answer` in with `others`.

## Pairing

*Association. These go with those.*

All three share `pairs`, written already paired. The player separates and shuffles.

```json
{
  "type": "match",
  "prompt": "Who goes with what?",
  "pairs": [
    { "from": "shepherd", "to": "sheep" },
    { "from": "fisherman", "to": "net" }
  ]
}
```

**`match`** — tap one, tap its partner.
**`connect`** — draw a line between them.
**`drag`** — carry one onto the other.

Identical data. Only the hand moves differently.

**Because all three share one shape, a drag interaction without a tap fallback cannot be written.** The rule stops being something a developer must remember and becomes a property of the format.

## Ordering

*Sequencing. What comes first?*

Written in the correct order. The player shuffles. No positions, no indices, no `correctOrder`.

**`sequence`** — put pictures in order.

```json
{
  "type": "sequence",
  "prompt": "What happened first?",
  "items": ["sunrise", "midday", "sunset"],
  "hint": "Start when the sun comes up."
}
```

**`arrange-story`** — the same mechanic using the chapter's own story pictures, on larger cards. Named separately because retelling the story is a different pedagogical act from ordering three objects, and because it is the strongest default for the activity section.

**`arrange-words`** — put phrases back together.

```json
{
  "type": "arrange-words",
  "prompt": "Put the words back together",
  "words": ["Be kind", "to one another,", "forgiving", "one another."]
}
```

`words` rather than `items` because the string shorthand means "a picture" everywhere else. Split at breath points, not by word count.

## Discovery

*Observation. Look closer.*

**Nothing in Discovery is ever wrong.** No correct answers, no hints, no completion requirement. This is the model for slowing a child down inside a picture, and it is the one that most often belongs in a story card.

**`reveal`** — tap things and something happens. In Version 1 the items appear as tappable picture cards beneath the illustration rather than as hotspots inside it; in-scene geometry is deferred (see `ARCHITECTURE.md`).

```json
{
  "type": "reveal",
  "prompt": "Who else is hungry?",
  "items": ["old-woman", "small-boy", "tired-man"]
}
```

**`hidden-object`** — find things tucked into the scene. Every item is findable; none is a mistake.

```json
{
  "type": "hidden-object",
  "prompt": "Can you find three loaves?",
  "items": ["loaf-1", "loaf-2", "loaf-3"]
}
```

Discovery never gates progress. A child who taps nothing and moves on has lost nothing.

---

# Shared Vocabulary

Three collection fields across all thirteen presentations:

| Field | Used by | Contains |
|---|---|---|
| `items` | Selection (`tap`), Ordering, Discovery | Pictures, in a scene or as cards |
| `options` | Selection (`multiple-choice`, `find-picture`) | The things to choose between |
| `pairs` | Pairing | `{ from, to }`, written already paired |
| `words` | `arrange-words` | Phrases, not pictures |

Plus `prompt` (≤ 10 words), `hint` (required wherever something is correct), and `note`.

## One hint is all you write

The app helps a stuck child in stages — a gentle sentence, then a clue, then the answer shown but not performed. That is the Assistance Ladder in `PRODUCT_CONSTITUTION.md`, and it is part of every interaction.

**You write one sentence.** The `hint` field is the first stage. Every stage after it is worked out from the content you have already written: which option to withdraw, which item to single out, where the sequence begins. There is no list of hints to write, no levels to fill in, and no chapter where you have to imagine four different ways of being stuck.

Write the hint you would say if a child looked up at you — the smallest nudge that would get them moving, not the answer.

If an interaction seems to need more than one sentence of help, that is a signal the interaction is too hard for six, and the fix is a simpler interaction rather than more hints.

`true-false` and `fill-blank` use presentation-specific sugar — `statement`/`answer`, `sentence`/`answer`/`others` — because forcing them into `options` would make the common case worse to write. **The model unifies the runtime; a presentation may offer sugar that normalises to it.** Same principle as sections flattening into cards: optimise the authored form, normalise in one place.

---

# Where Interactions May Appear

| Section | Allowed | Why |
|---|---|---|
| Story card | Yes | A beat inside the narrative. Never required to continue. |
| Activity | Yes | The consolidating interaction. |
| Quiz | Yes | Each quiz entry *is* an interaction. |
| Memory verse practice | Yes | Assembly with the answer in reach. |
| Cover | **No** | The cover is a door, not a task. |
| Celebration | **No** | The celebration is a gift. Never ask a child to perform for it. |

---

# How Interactions Degrade

Degradation is automatic and never authored. You describe what the interaction *is*; the player decides how it can be performed.

| Condition | What happens |
|---|---|
| Small screen | `drag` and `connect` present as `match` |
| Reduced motion | `drag` and `connect` present as `match`; transitions cross-fade |
| Repeated difficulty | After two unsuccessful attempts, drag switches to tapping, silently |
| Long pause | The correct target gains a gentle pulse. Nothing is ever taken away |
| Storage unavailable | The interaction still plays; only the remembering is lost |

There is no failure branch to write, because there is no failure.

---

# Quiz Philosophy

A quiz here asks *did you notice?* — never *did you get it right?*

**What a wrong answer does.** The answer stays where it is and softens slightly. The hint appears. Nothing turns red, nothing shakes, nothing is removed, no sound plays that could be read as a buzzer. The child tries again with more help than before.

**What a right answer does.** Warm confirmation, a short specific line, and forward.

**What never exists.** Scores. Percentages. Stars. "3 out of 4." Timers. Red crosses. Streaks. A results screen. Any record that a child answered anything incorrectly — including in storage, where nobody would see it, because the moment it is stored someone will eventually display it.

**Getting it right the second time is getting it right.** There is no distinction in the product, and none in the data.

**How many.** One or two questions. Three is already a test.

**What to ask about.** Something the child *saw*. "How did Stephen help people?" works because the answer was a picture they looked at for several seconds. Avoid names, numbers, and anything that rewards memorisation over attention.

---

# Memory Verse Philosophy

The verse is a gift the chapter leaves behind, not homework it sets.

**Choose a verse the story earned.** It does not have to come from the passage. Stephen's chapter is about forgiveness, so it takes Ephesians 4:32. A verse the child can hold beats a verse that is technically correct.

**Keep it short.** One clause is plenty at six. Trim to the part that carries the meaning, and let `reference` handle the provenance.

**Practice ideas that encourage rather than test:**

- **Assemble the words** — phrases, split at breath points, put back in order. The default, and the best.
- **The gentle gap** — one word missing, three picture-or-word choices, the verse fully visible above.
- **Echo** — the verse appears one phrase at a time as the child taps forward, then all together. Repetition without any question at all.
- **Match the picture** — pair phrases with small illustrations of what they mean. Especially good for abstract words like "forgiving."

**Never:** ask a child to recall a verse with the text hidden; time anything; report accuracy; compare against a previous attempt.

The measure of success is a child saying the words along with the screen — which we will never detect, and that is fine.

---

# Writing Guidelines

## Hard limits

| | Limit |
|---|---|
| Words per card | 15 max, 10 is better |
| Sentences per card | 2 max |
| Words per sentence | 10 max |
| Prompt | 10 words |
| Answer or item label | 5 words |
| Celebration message | 15 words |

Prompt and question used to have separate limits. Once a quiz became an interaction there was only one field, and the Interaction Player deliberately cannot know it is in a quiz — so there is one field and one limit.

These are enforced by validation. A chapter still being written gets warnings; a chapter listed in `library.json` gets errors. So drafting is never interrupted, and nothing over-long ships.

## Vocabulary

Words a six-year-old already owns. Concrete over abstract: *bread*, *stone*, *road*, *food*, *friend*.

Abstract words are allowed **when the picture shows them**. "Forgiving" is fine on a card where you can see forgiveness happening. It is not fine floating on its own.

Church vocabulary is not automatically child vocabulary. *Sacrifice*, *covenant*, *righteous*, *disciple*, *repent* — each needs either a picture or a plain replacement. Usually the plain replacement is better and nothing is lost.

## Tone of voice

A warm adult telling a story to a child sitting next to them.

- Past tense, active voice, simple order: *Stephen shared the bread.*
- Say what happened. Do not explain what it means. The picture and the ending carry the meaning.
- Never address the child's behaviour. No "you should," no "remember to be kind."
- No exclamation marks in story text. Warmth comes from word choice.
- Never wink over the child's head at an adult reader.

## Repetition

The strongest tool available, and the most underused.

Repeat a phrase across cards to build a spine — *Every day he shared food.* … *So they kept sharing food.* Children at this age love recognising a returning line, and a repeated phrase at the beginning and end of a chapter makes the whole thing feel finished.

Repeat words rather than reaching for synonyms. Variety serves the writer; repetition serves the reader.

## Humour

Gentle and situational. A surprised animal, a comically enormous fish, a small character struggling with a large object.

Never irony or sarcasm — six-year-olds read them literally and come away with the opposite of what you meant. Never make a person in the story the joke. Never undercut a serious moment for a laugh.

## Explaining difficult ideas

Prefer the consequence to the concept. Rather than *"Stephen forgave them,"* which requires knowing what forgiveness is, write *"He prayed, 'Jesus, please forgive them,'"* which shows it happening and lets the child arrive at the word themselves.

---

# Difficult Stories

Some of the best stories in the Bible contain violence, death, fear, judgement, and miracles. We tell them. We do not dilute them into something else. But how we tell them is a deliberate craft, and here is how.

## Aftermath, not event

Show the moment before and the moment after. Skip the moment itself.

Stephen's chapter has no stoning in it. It has Stephen looking up with light on his face, then an empty warm sky with a basket of bread on the ground. Every child understands. No child is frightened. Nothing is hidden.

This is not squeamishness. It is what good picture books have always done, and it is usually *more* affecting than depiction.

## Tell the truth, briefly

Do not soften a fact into something untrue. "Went home to be with Jesus" is honest and gentle. "Went to sleep" is neither — and it teaches a six-year-old to be afraid of sleeping.

Say the true thing in the fewest plain words, then move to what happened next. Brevity is the mercy, not vagueness.

## Fear is always resolved inside the chapter

Constitutional, and load-bearing. If a chapter frightens a child, it must un-frighten them before it ends. Stephen's story does not end with Stephen's death — it ends with his friends carrying on his kindness. Two extra cards, and the whole emotional shape changes.

Never end a chapter on the darkest card.

## Keep the theology, drop the spectacle

Ask what the story is *for*. Stephen's story is for forgiveness under pressure — so the forgiveness card gets the most space and the best drawing, and the violence gets none. That is not a reduction of the story. That is the story.

If removing the spectacle removes the meaning, you have found the wrong meaning.

## People are never monsters

The crowd in Stephen's chapter is drawn small, soft, out of focus. They are people who got it wrong — not villains to hate. A product about kindness should not teach children to enjoy despising anyone.

## Judgement

Lead with rescue rather than punishment. Noah is about a family and animals kept safe. The consequence can be present without being dwelt on or made vivid.

Never suggest that frightening things happen to children who behave badly. No child should close this app worried about themselves.

## Miracles

State them plainly and let them be wonderful. Do not explain them, do not rationalise them, do not over-sell them with amazement the picture should be providing. *Then there was enough food for everyone.* The child's face does the rest.

## The test

**Would I read this card aloud, in this room, to a six-year-old at bedtime?**

If you hesitate, the card is wrong. Put the reason in a `note` so you don't relitigate it in a year.

---

# Illustration Guidelines

This is a comic-first product. When picture and text disagree about who is carrying the story, the picture wins.

## Consistency

Build a **character sheet before the first chapter** — face, proportions, palette, silhouette, and how each character looks from the front and side. Recurring figures (Jesus, the disciples, recurring animals) are drawn once and referenced forever.

Within a chapter, a character wears the same clothes on every card. Children notice, and inconsistency reads as a different person.

## How many pictures

**8–14 story cards** per chapter. Stephen has 11.

Below eight, the story is being told in words. Above fourteen, a child is being asked to sit longer than they want to, and "Always a good place to stop" starts working against you.

One idea per picture. If a picture needs two things to happen in it, it is two cards.

## Composition

- **One focal point.** The child's eye should land in the right place with no searching.
- **Faces readable at 360px wide.** Test every panel at phone size before it is finished, not after.
- **Emotion in face and body.** The text cannot be relied on, so posture and expression carry the beat. Exaggerate more than feels natural.
- **Subject sharp and central; crowds soft and peripheral.** This is how we handle threat without depicting it.
- **Calm backgrounds.** Enough to place the scene, never enough to hunt through — unless hunting is the interaction, in which case that card gets a busier background on purpose.

## Image-to-text balance

**The clarity test:** cover the text. If a six-year-old cannot tell what is happening, the illustration has failed — not the writing. Do not fix a weak picture by adding words.

Text sits in consistent, generous space, never overlapping the focal point, and never inside the artwork file. Words are always real text: resizable, and open to translation or narration later.

## Supporting comprehension

- **Continuity of direction.** Characters move consistently left-to-right through a chapter; reversing direction reads as going back.
- **Draw the interactive thing to look touchable.** If a card asks the child to tap the bread, the bread is lit, separated, and slightly larger than realism wants.
- **Scale carries feeling.** Goliath is large because the panel makes him large, not because a caption says so.
- **Reuse in the activity.** Recognition is the mechanic; the activity should be a reunion, not a fresh test.

## Tablet

More room and richer scenes — never more information. Same cards, same words, more air and more detail to fall into.

---

# Validation

Every rule fails the build. A broken chapter must never reach a child.

**Structure** — required sections present; `story` has at least one card; `practice` only inside `verse`; unknown fields rejected (a typo is a bug, not an extension).

**Pictures** — every `picture` resolves to a file in the chapter's art folder; every art file is referenced by at least one card (catches orphans and misspellings in both directions).

**Correctness** — Selection has 2–3 options with exactly one `correct`; every interaction with a correct answer has a non-empty `hint`; `pairs` has at least two; ordering has at least three items; every item has a picture or a label; Discovery has no `correct` and no `hint` (nothing there is ever wrong).

**Kindness** — no field named `score`, `points`, `stars`, `time`, `timeout`, or `attempts` exists anywhere in the schema, so they cannot be introduced by accident.

**Accessibility** — a card with a picture and no text has `alt`; no item is distinguished by a colour word alone.

**Copy** — the limits in *Writing Guidelines*, as warnings locally and errors in CI.

**Release** — no `"translation": "PLACEHOLDER"` in any chapter listed in `library.json`.

That last one is how the translation decision gets made before launch rather than remembered after it.

---

# Drafting

A chapter file not listed in `library.json` is a draft. Drafts are validated more loosely: missing pictures are warnings, copy limits are warnings, `PLACEHOLDER` is fine.

Write the words first with picture names that don't exist yet. That is the natural order — the story should be finished before anything is drawn — and the format should not fight it.

---

# Growing The Model

- Adding an **optional field** is free.
- Adding a **card kind or interaction family** is a schema bump, ships with a migration for every existing chapter in the same pull request, and needs a real argument. The vocabulary staying small is a feature.
- The app supports exactly one schema version. No compatibility layers.

Before adding anything, check whether an existing card can carry it. Most requests for a new kind are a story card with a picture that hasn't been drawn yet.

---

# Deliberately Excluded

Each of these has a reasonable argument, and each costs more than it returns.

| Excluded | Why |
|---|---|
| Branching or choices that change the story | Every child gets the same Bible story. Branching multiplies authoring and testing and serves nothing. |
| Styling, colour, layout, position | Content means; the design system appears. This boundary is what keeps the acceptance test alive. |
| Animation timings or choreography | The design system's job. Content that choreographs is unmaintainable by chapter twenty. |
| Per-chapter component overrides | The first override permanently ends "one file, no code." |
| Sound effect references | Taps, successes, and celebrations are chosen once and applied everywhere. Consistency creates confidence. |
| Narration or audio fields | Version 1 has no narration. All text is data and none is inside artwork, so it stays addable without restructuring. |
| Scores, points, stars, difficulty, timing | There are none, and the fields do not exist so they cannot arrive quietly. |
| Markdown or rich text | Plain strings. Emphasis is the illustrator's job. |
| Translation structure | English only in Version 1. Text is already data — a later addition, not a later rewrite. |
| Shared art across chapters | Chapters stay self-contained. Revisit only when duplication genuinely hurts. |
| Templating, expressions, inheritance | A chapter file is read, not run. |

---

# What Writing Stephen Changed

The example was written before this document was finished, and it moved four things. Recording them because the reasoning is worth more than the result.

**1. Notes became part of the schema.** Writing the card where Stephen dies, I needed to record *why* it shows an empty sky and a basket instead of what happened — for the illustrator, and for myself later. JSON has no comments and there was nowhere to put it. `note` on any object, ignored by the app. It is now the field I would least want to give up.

**2. The flat `cards` array became named sections.** The single-array version made me scan for the quiz and re-declare a journey that never varies. Sections made the whole chapter visible at once and deleted the `type` field from every card. This reversed a decision I had argued for on the grounds that the player wants one uniform loop — which turned out not to be a real constraint, because the player can flatten sections at load.

**3. Verse practice needed its own key.** With the string shorthand meaning "a picture," `"items": ["Be kind", "to one another,"]` quietly meant something wrong. Renaming it `words` fixed it with no cleverness. Overloaded keys are the kind of thing you only catch by writing real content.

**4. Curly quotes.** The first line of dialogue produced `\"Jesus, please forgive them.\"` — ugly to write and worse in a diff. Curly quotes need no escaping and are correct anyway.

The structure itself held up. Nothing about writing the chapter felt like filling in a form, and the story section reads close to a storybook, which was the goal.

---

# Open Questions

- **Chapter length.** Stephen has 11 story cards and feels right. Two or three more chapters will confirm whether 8–14 is the true range.
- **Two activities.** `activity` is a single interaction. If a chapter ever wants two, that is a small schema change — worth waiting for a real case.
- **Grouping the shelf.** `library.json` is a flat list, which is right for ten chapters and wrong for forty. Add groups when the home screen needs them.
- **The verse translation.** Every chapter says `PLACEHOLDER`, and validation blocks release until they don't. Still needs deciding before launch, not before development.
