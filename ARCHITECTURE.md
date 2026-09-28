# Sunday School Companion — Architecture

> **Version:** 1.0
> **Status:** Draft — pending review
> **Governed by:** `PRODUCT_CONSTITUTION.md`

This document holds the technical structure and measurable constraints that enforce the constitution. Where the constitution states a principle, this document states the rule.

If this document ever contradicts the constitution, the constitution wins.

**Classes are the one structural fact that cuts across everything here** —
content identity, storage keys, routing and onboarding all carry a class.
`CLASSES.md` is the whole of it in one place; this document states the rules
that touch each area.

---

# Stack

- Next.js (static export — no server runtime)
- React
- TypeScript (strict)
- Tailwind CSS
- Framer Motion
- Progressive Web App
- JSON content files in-repo
- localStorage for progress
- GitHub + Vercel

**No backend. No authentication. No runtime API calls.**

The application is fully static. Every network request at runtime is for the app's own assets. This makes "no backend" structurally true rather than aspirational.

---

# Content Pipeline

```
content/<class>/*.story.json
        │
        ▼
  schema validation  ──── fails ────▶ build fails
        │
        ▼
   typed content module
        │
        ▼
   section flattening   (cover + story + activity + quiz + verse + celebration → one card sequence)
        │
        ▼
    Chapter Player
```

Rules:

- One JSON file per chapter, in its class's directory, authored by hand and reviewed in pull requests. A chapter's identity is `class + slug`: `Beginner / Chapter 01` and `Primary / Chapter 01` are different lessons, and a slug is only unique inside its class. See `CLASSES.md`.
- Content is validated against a Zod schema at build time.
- **Invalid content fails the build.** A broken chapter never reaches a child.
- Content is imported as a typed module — never fetched at runtime.
- Adding a chapter is a content-only change. Zero code changes. This is the acceptance test for content/UI separation.
- Missing pictures resolve to a visible placeholder in development, so writing is never blocked on drawing.
- Text is never baked into illustrations.

## Chapter shape

A chapter file is authored as **named sections mirroring the journey**, not as one flat array. The player flattens them into a single card sequence at load.

```
Chapter
├── title, reference
├── cover        { picture }
├── story        [ { picture, text?, interaction? } … ]
├── activity     Interaction
├── quiz         [ Interaction … ]
├── verse        { text, reference, translation, practice?: Interaction }
└── celebration  { message, picture? }
```

**The authored format and the runtime format differ deliberately.** Sections optimise for the human writing and reviewing the file; flattening gives the player one uniform loop with no special cases. That normalisation happens in exactly one place, at load.

Cards carry no `type` field — the section supplies it. Every card is rendered by the same Chapter Player through a card renderer. Adding a card kind means adding a renderer, not an engine.

**`CONTENT_MODEL.md` is the normative specification** for the schema, card types, interaction shapes, and validation rules. This section is a summary; where the two differ, `CONTENT_MODEL.md` wins.

## Schema changes

With ten chapters and one author, a schema change is a find-and-replace across ten files, done in the pull request that changes the schema. No version field, no codemods, no compatibility layer. Revisit if the library outgrows what one person can edit in an afternoon.

---

# The Interaction Player

## Standalone, beneath the Chapter Player

**Recommendation: a separate component, not part of the Chapter Player.**

The two own genuinely different things:

| | Owns |
|---|---|
| **Chapter Player** | The journey — card order, progress, resume, transitions, persistence, the way forward |
| **Interaction Player** | One interaction's life — attempt, hint, encouragement, completion, degradation |

Four reasons to split them:

1. **The requirement is only enforceable if it's separate.** "The Interaction Player must not know which section it is rendering" is a promise you can keep by giving it a prop interface that cannot express a section. Inside the Chapter Player, that knowledge is always one variable away.
2. **It appears in four places from day one.** Story, activity, quiz, memory verse. This is not a speculative abstraction — the reuse is known, not guessed.
3. **It holds the hardest logic.** Interactions carry nearly all the stateful behaviour in the product. Testing them without constructing a chapter is worth a lot.
4. **It keeps the Chapter Player small.** The journey logic stays readable because the mechanics live elsewhere.

This is a deliberate exception to "abstraction is earned, not assumed." The rule guards against *guessing* at reuse; here the reuse is a stated requirement before a line is written.

**It is a component, not a framework.** No dynamic loading, no runtime plugin discovery, no dependency injection.

## The contract

```tsx
<InteractionPlayer
  interaction={interaction}
  onComplete={() => void}
/>
```

That is the whole surface. Two props.

What is deliberately **not** in it:

- **No section prop.** The player cannot know where it is, so it cannot behave differently.
- **No score, no result, no attempt count in `onComplete`.** It reports that the child finished, never how.
- **No `onSkip`.** Skipping belongs to the Chapter Player, which owns the way forward. The Interaction Player does not know it can be skipped.
- **No `onFail`.** There is no failure.

**Attempt count is internal state that never leaves the component.** It drives the hint and nothing else — not a callback, not a store, not persistence. The Kindness Rules become an architectural property: a number that never escapes cannot be displayed, stored, or aggregated later by someone who did not read this document.

## Assistance

The Assistance Ladder (see `PRODUCT_CONSTITUTION.md`) is part of the model contract, not something layered on afterwards.

### Where the state lives

The rung is **internal state of the Interaction Player, exactly like the attempt count.** It never appears in a prop, a callback, a store, or storage. `onComplete()` takes no arguments and never will, so nothing downstream can know — or later display — that a child needed help.

This is the same guarantee as the attempt count, and for the same reason: a number that cannot escape cannot become a score.

### Recovery

Recovery precedes every rung after the first (see `PRODUCT_CONSTITUTION.md`; the phrase library and its motion are in `DESIGN_SYSTEM.md`).

- It lives in **one shared module**, not in the four models. It is the product's voice and must sound identical everywhere; four copies would drift into four teachers.
- Phrase selection is **draw-without-replacement from a shuffled pool per rung**, with the used set held for the length of a chapter. A phrase only returns once its pool is exhausted. This is not decoration: a line that repeats becomes a tally of mistakes, and nothing in this product may keep count out loud.
- The shuffle is seeded per session, not per card, so a child does not meet the same line twice in a row across two interactions.
- **A first miss gets silent Recovery** — motion only, no words. Words begin at the second.
- Recovery's own state, like the rung and the attempt count, never leaves the Interaction Player.

### Celebration

Which of the three celebration pools is used depends on how the child arrived — alone, after trying, or after help. That is derived from the attempt count and the rung.

**Both of those are sealed inside the Interaction Player, so the choice is made there and only there.** The wording is chosen at the moment of completion and never travels. `onComplete()` still takes no arguments.

This is why behaviour is celebrated where it happened rather than summarised at the end of a chapter: a summary would need the data to escape, and the moment it escapes it becomes a report card. The constraint and the right design agree.

The chapter's own celebration card knows nothing about any of this, and needs to know nothing. It speaks about the story.

### What advances a rung

Whichever comes first:

| Trigger | Threshold |
|---|---|
| An action that did not work | Second one |
| No interaction at all | 20 seconds |
| Each rung after the first | Another attempt, or another 15 seconds |

These numbers are guesses. They are the first thing to tune from play-testing, and they should be easy to change in one place — a single `ASSISTANCE` constant, not values scattered through four models.

Two constraints on the timers:

- They only ever **add**. No timer removes an option, advances a card, or ends anything. Assistance timers are the sole exception to "no timers", and they earn it by only ever being generous.
- They **pause when the card is not on screen**. A child who wanders off and comes back should not return to the answer already revealed.

### How each model climbs

Every model implements the same four rungs. What changes is what a clue can be.

**Selection** — *Alone* · a word · **narrow the field**: one wrong option quietly withdraws, leaving fewer to choose between · **together**: the correct option draws the eye, and the child still taps it.

**Pairing** — *Alone* · a word · **narrow the field**: one item is picked out as the place to start, turning "match everything" into "find this one's partner" · **together**: that item's partner is drawn out too, and the child still makes the join.

**Ordering** — *Alone* · a word · **narrow the field**: the first position is settled, so the sequence has a beginning · **together**: the next correct piece lifts slightly, and the child still places it.

**Discovery** — nothing here can be wrong, so the ladder is not about correctness. It is about noticing: after stillness, one thing not yet found draws attention; after more, the rest do too. **There is no reveal rung, because there is nothing to reveal**, and Discovery never gates anything.

### Rules the implementation must hold

- Help never retreats. A rung once reached stays reached for as long as the card is open.
- **Options are shuffled when the question begins, and are then still.** A fixed order teaches *tap the second one* instead of *think about the answer*, and an order fixed per question teaches it just as well one question at a time — so the shuffle is genuinely random and rolled again each time the question is presented. What an author wrote is the semantic order, never the visual one.
- **Nothing after that may reorder them.** Not a wrong tap, not Recovery, not a hint, not the ladder climbing, not a re-render. A child looking again at the same choices must be looking at the same choices; reordering under them turns a second try into a fresh puzzle.
- Withdrawing a wrong option is a removal, not a disabling. Nothing is left on screen greyed out — `DESIGN_SYSTEM.md` says disabled states do not exist.
- The final rung reveals but never completes. No model may call `onComplete()` on the child's behalf.
- Every clue has a non-visual equivalent, and every clue that moves has a still version under `prefers-reduced-motion`.
- No clue relies on colour alone.

## Registry architecture

```
src/interactions/
├── registry.ts          ← the only shared file that changes for a new model
├── types.ts             ← Item, Pair, InteractionBase, Environment
├── selection/
│   ├── schema.ts
│   ├── Selection.tsx            ← model logic: what "correct" means, hint timing
│   └── presentations/
│       └── MultipleChoice.tsx
├── pairing/          (Match — Drag late, Connect not in V1)
├── ordering/         (Sequence, ArrangeWords)
└── discovery/        (Reveal)
```

**Version 1 builds five presentations**, not thirteen: `multiple-choice`, `match`, `sequence`, `arrange-words`, `reveal` — one per model, plus a second Ordering for verse practice. `drag` follows once `match` is solid, and can slip without blocking launch.

The remaining presentations are documented vocabulary in `CONTENT_MODEL.md`, not work in progress. Ten chapters do not need thirteen ways to interact, and the registry makes each one cheap on the day a chapter genuinely wants it.

Each model exports one module:

```ts
type ModelProps<T> = {
  interaction: T;
  rung: number;      // 0 alone · 1 a word · 2 a clue · 3 together
  locked: boolean;
  onMiss: () => void;
  onArrive: () => void;
};
```

Settled by building Selection, and simpler than what was planned. **Assistance turned out not to be a function a model exposes — it is how a model renders at a given rung.** There is no `assist()` and no registry object: a model is a component, the rung is a required prop, and a model cannot be written without deciding what it looks like at each one.

Which presentation gets which model is a typed switch rather than a lookup table, because a switch narrows the interaction type as it goes — each model receives exactly the shape it handles, checked by the compiler rather than asserted.

Three properties worth noting:

- **Schemas live in `content/schema.ts`, not in the model.** They validate at build time, before any model exists, so keeping them beside the components would have split content validation across five files for no gain.
- **A model reports two things: that did not work, and we are there.** Never how many times. `onMiss` and `onArrive` take no arguments, so a model cannot leak a count even by accident.
- **Degradation is not in the contract.** Only Pairing degrades, so the drag → match fallback lives inside `pairing/` as that model's own business. Adding it to all four models would be symmetry for its own sake — the opposite call to assistance, and for the opposite reason.
- **The registry is a static object**, statically imported. Tree-shakeable, fully typed, no runtime resolution — which matters for the bundle budget and the offline story.
- **Model logic and presentation are separate layers.** `Selection.tsx` decides what correct means and when the hint appears; `MultipleChoice.tsx` decides how it looks. A new presentation inherits all the behaviour for free.

## Cost of extending

| Change | Cost |
|---|---|
| **New presentation** of an existing model | One file in that model's `presentations/`, one line in its map. **Nothing else in the system changes.** |
| **New interaction model** | New folder, one line in `registry.ts`, one arm on the content union, a migration if it changes existing content. |

The first case is the common one, and it is deliberately near-free — of the fourteen presentations in Version 1, all fourteen are variants of four models. Most future "new interaction" requests are new clothes, not new thinking.

The second case is intentionally not free. Four models is a considered ceiling, and a fifth needs an argument about what kind of thinking it enables that the others cannot.

## Build order

Selection → Ordering → Discovery → Pairing (match) → Pairing (drag).

Selection first because it is simplest and unblocks quizzes. Drag last because it is the hardest to make reliable on low-end Android — and by then its `match` fallback already exists and is tested, so drag ships with its safety net already built.

## Degradation

Never authored. The player derives the presentation from the environment:

| Condition | Effect |
|---|---|
| Small screen | `drag` → `match` |
| `prefers-reduced-motion` | `drag` → `match`; transitions become cross-fades |
| Two unsuccessful attempts | `drag` → `match`, silently |
| Long pause | Gentle pulse on a correct target. Nothing is removed |

Because `match` and `drag` share one content shape, degradation is a presentation swap with no data transformation.

## Hotspot geometry — deferred

In-scene presentations (tapping things *inside* an illustration) need to know where those things are. The clean answer is a companion SVG exported by the illustrator with named regions, since position is appearance and appearance never belongs in content.

**Version 1 does not build this.** It puts an entire art-tooling pipeline on the critical path and would block development on the illustrator's toolchain. In Version 1, `reveal` presents its items as tappable picture cards beneath the illustration — simpler, no geometry, still delightful.

Revisit when a chapter genuinely needs a hidden-object scene.

---

# Halo

The companion layer. Product rules are in `PRODUCT_CONSTITUTION.md`, the visual spec in `DESIGN_SYSTEM.md`; this is the structure.

```
src/halo/                    imports nothing from interactions or content
├── state.ts                 HaloState · HaloSize · HaloPlacement · announcements
├── expression.ts            HaloState → visual spec (the tuning table)
├── Halo.tsx                 spec → CSS custom properties. Pure presentation
└── HaloPresence.tsx         where Halo sits, separate from what Halo is

src/interactions/halo.ts     the adapter: interaction state → HaloState
```

## The one-way dependency

`interactions → halo`, never the reverse. Halo cannot import a chapter, an interaction, or a rung, so it *cannot* contain business logic — the boundary is structural rather than a rule someone has to remember.

## The adapter

`haloStateFor(interaction, moment)` runs **inside** the Interaction Player, which is what keeps the constitution's promise intact. It takes `misses` and `rung` as arguments and returns `"recovering"`. The counts are read; they are never returned. A number that cannot escape cannot become a score.

It is also where interaction-model awareness lives — Discovery's "no wrong answer, therefore no recovery" is a rule about interactions, so it belongs on the interactions side, not inside a blob.

## The expression table

`expression.ts` maps each state to shape, scale, squish, lean, glow, internal light, warmth, gaze, eye openness, eye tilt, eye curve, the ring's four properties, how turned-up the ambient life is, and the transition duration. Every field becomes a CSS custom property.

This is why there is no animation code: the browser interpolates the properties, so `idle → thinking → helping` is free and adding a state is a row in a table. Retuning Halo means changing numbers in one file. No component branches on a state name — only this table knows what a state looks like.

The four corner radii and the wobble added to them are registered with `@property`, which is what lets a silhouette *morph* between states rather than snap, and lets the body deform by genuinely moving its corners instead of being scaled.

The ambient loops are the one thing the table does not set. They run at fixed periods that share no common multiple, and `life` scales their **amplitude only** — a state is more alive by moving further, never by moving faster. React sets the custom properties when the state changes and is then out of the loop entirely: the motion continues without a single re-render, and every layer animates `transform` or `opacity`, so it stays on the compositor.

## Presentation

`HaloPresence` owns placement (`inline`, `beside`, `corner`, `hero`) and the natural size for each. Surfaces reach for it rather than positioning a blob themselves, or the next surface positions it slightly differently and Halo stops being one thing.

## Content stays clean

No chapter JSON carries Halo configuration, and none ever should. Halo's behaviour is derived from the interaction system. Should content-specific assistance arrive later, it enters as *assistance data* the author writes about the moment (what a child should notice) — the Interaction Player passes it through, and Halo decides how that is expressed. Content says what; Halo says how.

## Playground

`/debug/halo` — every state and size, one tap apart, with the live expression values beside it. Not linked from anything a child sees.

---

# Performance Budgets

Reference device: **Moto G-class Android, 4GB RAM, mid-tier CPU, 4G.** Test on real hardware, not a throttled desktop.

| Metric | Budget |
|---|---|
| Initial JS (gzipped) | < 150 KB |
| Largest Contentful Paint | < 2.5s on reference device |
| Time to interactive (chapter) | < 2.5s |
| Frame rate during interaction | 60fps sustained |
| Per-illustration weight | < 150 KB |
| Total precached assets | < 40 MB |

Measured by hand on the reference device before each release. CI enforcement is worth building once there is a team to protect the budget from — not for one author and ten chapters.

## Motion cost

- Framer Motion is reserved for real orchestration — sequencing, shared layout, celebration choreography.
- Routine transitions use CSS `transform` and `opacity`.
- Nothing animates layout properties (`width`, `height`, `top`, `left`) during an interaction.

---

# Assets

- Format: AVIF with WebP fallback.
- Two width tiers: phone and tablet. No more.
- Fixed intrinsic dimensions on every image to prevent layout shift.
- Illustrations are art-directed per tier, not merely scaled — tablets get more room and richer scenes, never more information.
- Illustration throughput, not code, is the real roadmap bottleneck. Plan chapter releases around it.

---

# Offline Strategy

Offline is the expected state, not the exception.

| Scope | Policy |
|---|---|
| App shell | Always precached |
| Current chapter | Always precached |
| Next chapter | Precached opportunistically |
| Played chapters | Cached on visit, LRU eviction |
| All chapters | Optional adult-initiated "download everything" |

Constraints:

- iOS Safari evicts storage under pressure and offers no install prompt. Request persistent storage; design for eviction rather than assuming durability.
- A chapter that is not cached and cannot be reached shows a character and a way back — never an error code.

---

# Progress & Persistence

Everything the product remembers lives in `src/local/`, under the `ssc.` namespace in **localStorage**. It is a few KB; IndexedDB's async surface is not worth its cost at this size, and `navigator.storage.persist()` is deliberately never called — it would change nothing here and can only add a prompt.

| Key | Holds |
|---|---|
| `ssc.child` | `{ name }` — a word the app says back, not an identifier |
| `ssc.welcomed` | `true` once the welcome is finished |
| `ssc.settings` | `{ sound, motion }` |
| `ssc.place` | `{ v, slug, section, page, pages, done, at }` |
| `ssc.games.streak` | `{ best, todayBest, day }` |
| `ssc.verse.streak` | the same shape, and never the same store |
| `ssc.pwa-install` | `{ v, status, activeUseMs, lastPromptShownAt, lastDismissedAt, dismissedUntil }` — the only entry here that is about the device rather than the child |

- **Being welcomed is its own fact**, kept apart from the name. A child may reach the end without giving one, or clear their name later, and neither should mean being introduced to Halo again. It is also why this is a flag rather than a check for stored data: a returning child with nothing else saved has still been met.
- **Which screen `/` is gets decided before the first paint.** A blocking inline script (`DOORWAY_SCRIPT`) reads the flag and sets an attribute; the stylesheet hides the other branch. Both are in the prerendered HTML, and React drops the unwanted one once it knows. With no JavaScript at all, nothing is hidden and Home is what shows — the right fallback, because the welcome is lovely and the stories are the point.
- **A place, not a URL.** A stored address is a promise about routing that content changes quietly break; a stored place can be checked against the content that exists now and repaired or discarded honestly. `nextStep()` resolves a missing chapter, an out-of-range page, a record from a future version and a first-time child to the same honest answer: a chapter that exists, at its beginning.
- The record carries no history — no chapters-visited list, no times-opened count, no per-page timing. `at` exists only so a later feature can tell stale progress from fresh, and is never shown to a child.
- **Every key is enumerated** in `store.ts`, so "clear progress" is exact rather than hopeful and a new key that nobody thought about deleting is a compile error rather than data that quietly survives.
- All reads and writes are wrapped in try/catch — localStorage throws in private mode and can be evicted on iOS. A storage failure degrades the experience, never breaks it: every screen is written so that *this device has no memory* is an ordinary state.
- Stored data outlives the code that wrote it, so nothing downstream assumes it is well-formed. Each reader is handed the raw value and must repair it or return the fallback.
- **Content is never locked behind progress.** Losing progress is disappointing, never devastating — which is what makes localStorage sufficient.

---

# Install Invitation

The product has one adult-facing moment, and the constitution is specific about it: *"The parent is not a user. The parent is the door"*, and what the door gets is *"an install moment written for an adult, not a child."* This is that moment. It is an invitation, never a requirement, and nothing in the product is withheld from anyone who ignores it.

Everything lives in `src/pwa/`, plus one line in `layout.tsx` and one record in `src/local/install.ts`. **No route knows it exists.** The reader, the game player and the verse practice did not gain a prop, a callback or a line of state between them.

## When it appears

Three things must be true at once, and they are decided in three different places.

| | Decided by | Rule |
|---|---|---|
| **Earned** | `pwa/invitation.ts` | five minutes of *active* use, no cooldown running, not installed |
| **A calm screen** | `pwa/moment.ts` | Home, Chapters, Games, Verses, a chapter hub, or a chapter's games shelf |
| **Settled** | `components/pwa/InstallInvitation.tsx` | that screen has been the current screen for 1.5s |

Reaching five minutes almost always happens mid-story or mid-question, so eligibility waits — with no time limit. A child who never leaves the story is never asked, which is the correct outcome.

`moment.ts` is an **allow-list**, and the direction is deliberate. Forgetting to add a new calm screen costs a later invitation; forgetting to add a new immersive screen to a deny-list costs an interruption mid-game. Between those, there is no contest.

## Active use

Not a five-minute timeout from page load, which measures how long a tab has been open — a number about the tablet rather than about anyone using it.

A stretch of active use is time during which the document is visible, the window has focus, and somebody has interacted within `ACTIVE_IDLE_MS`. The clock is a single interval that exists **only** while all of that holds; it is cleared on hide and on blur, so nothing wakes in the background. Time accrues in memory and reaches storage every `PERSIST_EVERY_MS`, on `pagehide`, and immediately on crossing the threshold — never on a pointer event.

Two guards, for two different lies a clock can tell: the idle rule handles a person who has stopped, and a per-tick ceiling handles a machine that was asleep and fires one tick carrying hours.

The arithmetic is pure (`pwa/activeUse.ts`); the browser events that drive it are in `pwa/manager.ts`. That split is why "hidden time does not count" is a test rather than a hope.

## Not every five minutes

Five minutes is the **first** eligibility point, not a recurring alarm. On "Not now":

- `lastDismissedAt` is stamped and `dismissedUntil` is set a week out (`INSTALL_PROMPT_DISMISS_COOLDOWN_MS`).
- `activeUseMs` goes back to **zero**.
- Nothing else changes — not the installation status, not progress, not a streak.

That reset is the line that makes this a cooldown rather than a snooze. Without it the counter would sit at the threshold all week and the invitation would reappear in the first second after the cooldown lapsed. The clock is also switched off entirely during a cooldown, so the week banks nothing: after it lapses, another five active minutes must be earned. Declining the browser's own native prompt takes the same path — refusing in Chrome's dialog rather than in ours is the same answer.

## Installation state

`unknown` · `not-installed` · `installed`, and the first one earns its place: a browser too old to answer must not be read as having said "not installed", because that is the answer that leads to asking.

Detected on every startup, from several signals because no single one is available everywhere:

- `matchMedia` on `display-mode`, checking **`standalone`, `fullscreen` and `minimal-ui`** — Android hands back `minimal-ui` when the app was installed from the browser menu, so checking only `standalone` keeps inviting an installed app to install itself.
- `navigator.standalone`, Apple's own signal and the only reliable one on iOS.
- `appinstalled`, taken when it arrives but never depended upon — several platforms never fire it.

The record is **sticky at `installed`**: an installed app opened in a browser tab truthfully reports `not-installed` about *that launch*, and letting it overwrite the record would invite a grown-up to install what is already on the home screen. The cost is that uninstalling is invisible here, and that is the right way round — the failure mode is "never asked again", not "asked forever".

**Dismissal is never read as installation.** Neither is having visited, or having played anything.

## Android and Chromium

`beforeinstallprompt` is captured at **module evaluation**, not in a React effect: the event is not replayed, so a listener that only exists once a component has mounted is a listener that can miss it. `preventDefault()` suppresses the browser's mini-infobar so the offer is made at a moment this product chose. The event is held **in memory only** — it is a live object with a promise on it, and nothing derived from it is ever stored.

`requestInstall()` opens it, awaits `userChoice`, and drops the event either way, because it is single-use. Accepted marks installed; dismissed starts the cooldown.

> **Today this path is dormant.** Chrome will not fire `beforeinstallprompt` until the app has a service worker with a fetch handler, and there is not one yet — see *Offline Strategy* and Milestone 11. Until then Android falls into the case below and is shown nothing. The code is correct and lights up on its own the day the worker lands; nothing here changes.

## iOS and iPadOS

No `beforeinstallprompt` has ever existed here, but Add to Home Screen is real and documented, so instructions are the honest offer. Two stages: the invitation, then **Show me how** → Share, Add to Home Screen, Add, with a Back and a Close.

The steps name what to look for rather than where it is. The Share button has moved between iOS versions and sits in different corners on iPhone and iPad, and a sheet that says "bottom of the screen" is wrong on an iPad and wrong again next September.

iPadOS is why `pwa/platform.ts` exists at all: since iPadOS 13 Safari reports itself as a Mac, so `userAgent.includes("iPad")` alone would send every modern iPad down the silent path — on the one platform where the instructions *are* the feature. The tell is `navigator.platform === "MacIntel"` **plus** `maxTouchPoints > 1`.

## Anything else

Every other browser with no native prompt is **shown nothing**. The app never promises an installation action it cannot actually trigger, and never invents instructions for a menu it has not seen — a grown-up who follows made-up steps and finds nothing learns that this app does not know what it is talking about.

## Failing safely

- No storage at all: the feature works for the sitting and simply cannot remember afterwards. Nothing throws.
- Malformed or hand-edited storage: every field is repaired or discarded. `NaN` is the one worth naming — `NaN < threshold` is false, so an unchecked one would mean the invitation never appears again and nothing would look broken.
- A second tab: a `storage` listener picks up an answer given elsewhere, so nobody is asked twice. Only the visible tab accrues time.
- No `window` at all (prerender): the server snapshot is always quiet, so no install sheet is ever baked into exported HTML.

## Configuration

All of it in `src/pwa/config.ts`, and nowhere else:

| | Default | |
|---|---|---|
| `INSTALL_PROMPT_ACTIVE_MS` | 5 min | what earns the invitation |
| `INSTALL_PROMPT_DISMISS_COOLDOWN_MS` | 7 days | what "Not now" buys |
| `ACTIVE_TICK_MS` | 5s | how often active time accrues |
| `ACTIVE_IDLE_MS` | 90s | how long after a tap the app still counts as in use |
| `PERSIST_EVERY_MS` | 30s | how often accrued time is written down |
| `SETTLE_MS` | 1.5s | how long a calm screen stays calm first |

## Testing it locally

`npm test` covers the rules, the arithmetic, the platform probe and the manager driven through a fake browser. To see the sheet without waiting five minutes, seed the record **before the page loads** — a live page owns its record and settles it on `pagehide`, so writing it into a running tab is overwritten:

```js
// devtools console, then reload
localStorage.setItem("ssc.pwa-install", JSON.stringify({
  v: 1, status: "not-installed", activeUseMs: 5 * 60 * 1000,
  lastPromptShownAt: null, lastDismissedAt: null, dismissedUntil: null,
}));
```

Then navigate to Home, Chapters, or a chapter hub and wait 1.5s. `localStorage.removeItem("ssc.pwa-install")` resets everything, including a cooldown.

Safari on iOS is the one path that cannot be fully checked on a desktop: `navigator.standalone` and a real Add to Home Screen need the device.

## What it deliberately does not do

No analytics, no telemetry, no count of refusals, no escalation, no shorter second cooldown, no device model, no session count, no backend, and no third-party package. The record holds six fields and every one of them is needed for the arithmetic above.

---

# Online and offline

The distinction is explicit, and it is one line long.

**Offline** — the app shell, chapter content, artwork, the reader, Games, Memory Verse, both streaks, settings, the child's name, Continue Learning, and Halo. All of it is static, bundled and local.

**Online** — YouTube playback, and nothing else.

A chapter with a video is not a chapter that needs the internet. The player is *offered* rather than loaded: no embed and no thumbnail until the child taps, so opening the chapter contacts nobody, and `navigator.onLine` decides whether to offer it at all. That check is optimistic on purpose — `onLine` is only reliable when it says false — so a child on a connection the browser is unsure about is never shown a video hidden for no reason. Going offline mid-video takes the player away rather than leaving a frozen frame.

---

# Testing

- `npm test` — the unit suites in `tests/`, run by Node's own test runner with its own type stripping. No test framework is installed and none is needed; the agent self-tests in `agents/` make the same bargain. `tests/resolve.mjs` teaches Node the `@/` alias and the missing file extensions so the app's modules can be imported unchanged.
- Schema validation runs on every content change.
- One smoke test per card type.
- Interaction engines have unit coverage for their state machines.
- Manual pass on the reference device before each release.
- Play-testing with children aged 6–7 before each release (see the constitution's *How We'll Know It Works*).

---

# Deployment

- Vercel, static export.
- Preview deploy per branch — content changes go through the same review flow as code.
- No environment variables containing secrets. There are no secrets.

---

# Open Questions

- Chapter count for the Version 1 release.
- Home screen browse model at 20+ chapters (flat list vs. grouping).
- Whether the "download everything" affordance ships in Version 1.
