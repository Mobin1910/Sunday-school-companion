# Tiny Disciples — Architecture

> **Version:** 1.0
> **Status:** Draft — pending review
> **Governed by:** `PRODUCT_CONSTITUTION.md`

This document holds the technical structure and measurable constraints that enforce the constitution. Where the constitution states a principle, this document states the rule.

If this document ever contradicts the constitution, the constitution wins.

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
content/*.story.json
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

- One JSON file per chapter, authored by hand, reviewed in pull requests.
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
interface InteractionModel<T> {
  schema: ZodSchema<T>;                          // validates content at build
  presentations: Record<string, Component<T>>;   // the visual variants
  defaultPresentation: string;
  assist: /* signature settled in Milestone 4 */;
}
```

Five properties worth noting:

- **The schema ships with the model.** Content validation and rendering cannot drift apart, because adding a model without a schema is a type error.
- **Assistance is in the contract**, because every model needs it and the constitution says a model without it is unfinished. Putting it in the type means a new model cannot be added without answering how it helps a stuck child. Its exact signature is deliberately left open until Selection is built — designing it against zero implementations is how contracts end up wrong.
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

- Stored in **localStorage**. Progress is a few KB; IndexedDB's async surface is not worth its cost at this size.
- The record is a chapter slug and a card index. Nothing else. No hashes, no timestamps, no attempt counts.
- If the index is out of range because a chapter was edited, clamp to the last card. That is the entire migration strategy for Version 1.
- All reads and writes are wrapped in try/catch — localStorage throws in private mode and can be evicted on iOS. A storage failure degrades the experience, never breaks it.
- **Content is never locked behind progress.** Losing progress is disappointing, never devastating — which is what makes localStorage sufficient.

---

# Testing

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
