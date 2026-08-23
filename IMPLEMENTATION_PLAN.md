# Tiny Disciples — Implementation Plan

> **Version:** 1.0
> **Status:** Ready to begin
> **Governed by:** `PRODUCT_CONSTITUTION.md`

The roadmap for Version 1: one Sunday School class, ten chapters, children aged 6–7.

---

# How This Roadmap Thinks

**Optimise for validation, not completeness.** The biggest unknown in this project is not technical. It is whether a six-year-old enjoys the thing. Every ordering decision below serves getting a real chapter in front of a real child as early as possible.

**Every milestone leaves the app working.** Not "compiles" — *working*. You can open it on a phone and something good happens. There is no milestone that leaves the product in pieces waiting for the next one.

**Small enough to finish in a sitting.** Fourteen small milestones beat five large ones. A milestone that cannot be reviewed in one pass is two milestones.

**Art is on a parallel track.** Illustration throughput is the real constraint, and it is not on the critical path for any milestone here. Placeholder art arrives in Milestone 1 precisely so that nothing waits on drawing.

## Two rules for the whole build

**Nothing is built before a chapter needs it.** The content model documents thirteen presentations. Version 1 builds five. The others are vocabulary, not backlog.

**When a milestone tempts you toward generality, stop.** The abstractions in this product are already chosen and already justified. Any new one has to earn its place the same way.

---

# Milestone 1 — Skeleton and Placeholders

**Why this exists.** Nothing can be validated until something runs on a phone. This milestone's real job is removing the two things that would otherwise block every later milestone: a project that doesn't build, and artwork that doesn't exist.

**Goal.** A deployed page on a real device, and a placeholder art system so no future milestone waits on an illustrator.

**Deliverables**
- Next.js with static export, TypeScript strict, Tailwind.
- Provisional design tokens named by role — `--ground`, `--ink`, `--touchable`, `--joy` — not by hue.
- Placeholder picture component: any unresolved picture name renders a labelled placeholder block showing that name.
- Deployed to Vercel.

**Acceptance criteria**
- The URL opens on a phone and renders a styled page.
- A missing picture shows its name, visibly, without an error.
- `next build` produces a fully static export with no server runtime.

**Dependencies.** None.

**Not yet.** Routing beyond one page. Real tokens. PWA. Any component from the design system.

---

# Milestone 2 — Content Pipeline

**Why this exists.** The acceptance test of this whole product is *adding a chapter requires no code*. That property is either true from the first chapter or it is never true. Building the pipeline before the player means the player is forced to consume real validated content from its first render — it can never quietly grow a dependency on hardcoded data.

**Goal.** Stephen loads, validates, and flattens into a card sequence.

**Deliverables**
- Zod schema for the chapter format, per `CONTENT_MODEL.md`.
- Loader that reads `content/*.story.json` at build time as typed modules.
- Section flattening: cover + story + activity + quiz + verse + celebration → one ordered card list.
- Validation script that fails the build on invalid content.
- A debug page listing every card in Stephen.

**Acceptance criteria**
- Stephen validates and produces the expected card sequence in order.
- Deliberately breaking the file — removing a required `hint`, misspelling a picture — fails the build with a message naming the file and field.
- The app imports no chapter by name. Adding a second file requires no code change.

**Dependencies.** Milestone 1.

**Not yet.** Rendering anything properly. Interactions. `library.json` — one chapter is enough to prove the pipeline.

---

# Milestone 3 — Chapter Player: The Spine

**Why this exists.** This is the first milestone that produces something a child could sit with, and the first real test of whether the content model feels right in motion rather than on paper. It deliberately excludes interactions, because the story is the product and it should be validated on its own before mechanics are layered on.

**Goal.** Stephen is playable start to finish as a silent comic.

**Deliverables**
- Chapter Player: renders the flattened card sequence, one card per screen.
- Card renderers for cover, story, verse, celebration. Interaction cards render their picture and text with the interaction skipped.
- Forward and back navigation, thumb-reachable, meeting the 56px minimum.
- Step-based progress indicator — dots, never a number.
- Card transitions honouring `prefers-reduced-motion`.

**Acceptance criteria**
- You can read Stephen cover to celebration on a phone.
- Forward is always available. No card is a dead end.
- Reduced motion turns transitions into cross-fades with nothing broken.
- **First play-test opportunity** — a child can read the story even with placeholder art.

**Dependencies.** Milestone 2.

**Not yet.** Interactions. Persistence. Home screen. Sound.

---

# Milestone 4 — Interaction Player and Selection

**Why this exists.** The Interaction Player's contract is the load-bearing architectural decision in the product: two props, no section, no score, attempt count that never escapes. Building it with a single simple model proves the contract before four models depend on it. Selection comes first because it is the simplest and it unblocks the quiz.

**Goal.** Stephen's quiz works, and it works kindly.

**Deliverables**
- `<InteractionPlayer interaction onComplete />` — exactly those two props.
- The registry, with one model in it.
- Selection model plus the `multiple-choice` presentation with picture options.
- The kindness behaviours: wrong answers soften and stay, nothing turns red, nothing is removed, no score exists anywhere.
- **The full Assistance Ladder for Selection**, and the shared timing constants that drive it. This is the milestone that settles the `assist` signature for every model that follows, so it is designed here and copied there.

**Acceptance criteria**
- Both of Stephen's quiz cards play.
- Answering wrongly three times reaches the right answer with more help each time and no negative signal at any point.
- **A child who touches nothing is helped anyway** — the ladder climbs on stillness, not only on wrong answers.
- The final rung reveals the answer but never taps it; `onComplete` is only ever called by the child.
- Leaving the card and returning does not find the answer already given away.
- Grepping the codebase for `score`, `points`, `attempts` outside the Selection component's internals returns nothing. The same is true of the rung.
- The Interaction Player receives no prop that could tell it which section it is in.

**Dependencies.** Milestone 3.

**Not yet.** The other three models. Sound. `drag`.

---

# Milestone 5 — Ordering

**Why this exists.** Ordering is the second model, which is what actually proves the registry — one model in a registry proves nothing. It also completes two whole sections of the chapter at once: the activity and verse practice.

**Goal.** Stephen's activity and memory verse practice both work.

**Deliverables**
- Ordering model with `sequence` and `arrange-words`.
- Shuffle-on-load, with authored order as truth.
- Tap-to-place interaction — no dragging yet.

**Acceptance criteria**
- The activity shuffles Stephen's four story pictures and accepts the correct order.
- Verse practice reassembles the Ephesians phrases.
- Adding the second model touched `registry.ts` and the new folder, and nothing else.

**Dependencies.** Milestone 4.

**Not yet.** Drag. Connect. `arrange-story` as anything other than `sequence` with story pictures.

---

# Milestone 6 — Discovery

**Why this exists.** Discovery is the model with no correct answers, so it tests something none of the others do: that the Interaction Player handles an interaction which cannot be completed wrongly and does not gate progress. It also delivers the story-card beat, which is where the product's "interaction inside the story" promise actually lives.

**Goal.** Stephen's story beat works, and nothing in it can be wrong.

**Deliverables**
- Discovery model with `reveal`, presented as tappable picture cards beneath the illustration.
- Completion that never gates: a child who taps nothing moves on freely.

**Acceptance criteria**
- The sharing-bread card offers three tappable items, each rewarding.
- Moving forward without tapping anything is possible and unremarked.
- No hint, no correctness, no completion requirement anywhere in the model.

**Dependencies.** Milestone 5.

**Not yet.** Hidden object. In-scene hotspots.

---

# Milestone 7 — Pairing

**Why this exists.** Pairing completes the four-model set, and `match` must exist before `drag` because `match` *is* drag's fallback. Building them in this order means drag arrives with its safety net already tested.

**Goal.** All four interaction models exist.

**Deliverables**
- Pairing model with `match`: tap one, tap its partner.
- Second distinguishing cue on every pairable element — never colour alone.
- A pairing example added to a second chapter draft, since Stephen has no natural pairing moment.

**Acceptance criteria**
- Match works with pictures and with labelled pictures.
- Every pair is distinguishable in greyscale.

**Dependencies.** Milestone 6.

**Not yet.** Drag — that is Milestone 12, and it is allowed to slip.

---

# Milestone 8 — Home and Library

**Why this exists.** Until now there has been one chapter and no way to choose. This milestone makes the product a *product* rather than a demo, and it is the first that requires `library.json` to do anything.

**Goal.** A child can choose a chapter.

**Deliverables**
- Home screen: a shelf of chapter covers, readable by thumbnail with no reading required.
- `library.json` driving order.
- Routing: home ↔ chapter.
- A second chapter, even if thin, so the shelf is real.

**Acceptance criteria**
- Adding a chapter to `library.json` puts it on the shelf with no code change. **This is the acceptance test, and it is met here or not at all.**
- The shelf is navigable by a child who cannot read.

**Dependencies.** Milestone 3 is enough; do it after 7 so the second chapter can exercise pairing.

**Not yet.** Grouping or collections. Memory Verses top-level section. About page.

---

# Milestone 9 — Progress and Resume

**Why this exists.** Everything so far forgets the child the moment they close the tab. This is small, but it is the difference between a demo and something a child returns to — and returning is the entire success metric.

**Goal.** The app remembers where a child was.

**Deliverables**
- localStorage: chapter slug and card index. Nothing else.
- Every read and write in try/catch — private mode throws.
- Resume affordance on the cover, worded so it never implies something was left unfinished.
- Played chapters marked on the shelf.

**Acceptance criteria**
- Close mid-chapter, reopen, resume on the same card.
- Clearing storage loses progress and breaks nothing — every chapter still fully playable.
- Private browsing works normally.

**Dependencies.** Milestone 8.

**Not yet.** The verse collection. Export or restore. Any record of attempts or correctness.

---

# Milestone 10 — Memory Verses and About

**Why this exists.** The constitution's information architecture has three top-level destinations and only one exists. This closes the IA and delivers the parent hand-off surface, which is the one thing standing between a finished app and a child actually having it.

**Goal.** The app matches its own information architecture.

**Deliverables**
- Memory Verses: verses from played chapters, as a growing collection.
- About: written for an adult, reachable from home, not in the child's path.

**Acceptance criteria**
- A verse appears in the collection after its chapter's celebration.
- Nothing in About is reachable by a child who is playing.

**Dependencies.** Milestone 9.

**Not yet.** Verse practice from the collection. Anything resembling a parent dashboard.

---

# Milestone 11 — Offline and Install

**Why this exists.** "Offline support is a core requirement" has been a claim in a document for the entire project. This is where it becomes true. It comes late deliberately: caching an app that is still changing shape wastes effort and produces confusing bugs.

**Goal.** The app installs and works with no network.

**Deliverables**
- Service worker: shell and current chapter precached, played chapters cached on visit.
- Manifest, icons, install prompt aimed at the adult.
- Offline state for an uncached chapter — a character and a way back, never an error.

**Acceptance criteria**
- Install to home screen on Android and iOS.
- Aeroplane mode: previously played chapters work completely.
- An uncached chapter offline shows something friendly.
- Total precached assets stay under budget.

**Dependencies.** Milestone 10.

**Not yet.** Download-everything. Background sync.

---

# Milestone 12 — Drag & Drop

**Why this exists.** The most delightful interaction and the hardest to make reliable on low-end Android. It sits here, after everything else works, because it is the one milestone allowed to slip without affecting launch — `match` already covers every pairing moment.

**Goal.** Drag works, and degrades invisibly when it shouldn't.

**Deliverables**
- `drag` presentation on the Pairing model.
- Automatic degradation to `match`: small screens, reduced motion, two unsuccessful attempts.

**Acceptance criteria**
- Drag works with a six-year-old's imprecision — generous targets, forgiving drop zones.
- Degradation is silent. Nothing announces it.
- Content is byte-identical between `match` and `drag`.

**Dependencies.** Milestone 7.

**Not yet.** Connect.

---

# Milestone 13 — Real Art and Real Tokens

**Why this exists.** Colour should come from the artwork, and until now there hasn't been any. This is where the provisional palette is replaced and the product stops looking like a prototype. It is also the first honest test of the performance budget, because real illustrations are the payload.

**This is the milestone that acts on `DESIGN_NOTES.md`.** Every visual judgement deferred while building against placeholders — the weight of illustrations against text, the typeface, how navigation should feel, the warmth of the spacing — is collected there and is settled here, not before. Work through that document as part of this milestone.

**Goal.** Stephen looks like the product, not the scaffolding.

**Deliverables**
- Stephen fully illustrated, replacing placeholders.
- `DESIGN_NOTES.md` worked through, each observation either resolved or consciously carried forward.
- Real palette derived from the artwork; provisional token *values* replaced, names unchanged.
- Typeface selected and licensed.
- Image pipeline: AVIF with WebP fallback, two width tiers, fixed dimensions.

**Acceptance criteria**
- No placeholder art in Stephen.
- The clarity test passes on every card: cover the text, a six-year-old still follows the story.
- Performance budget measured by hand on the reference device and met.

**Dependencies.** Illustration — the parallel track. Everything else can proceed without this.

**Not yet.** Illustrating all ten chapters. That is content work, not a milestone.

---

# Milestone 14 — Sound, Accessibility and Play-Testing

**Why this exists.** The last mile is where a good product becomes one a child trusts. Accessibility has been asserted in documents for the entire project; this is where it is measured. And the success metric has always been a child asking for one more story — which can only be discovered by watching one.

**Goal.** Ship-ready.

**Deliverables**
- Sound: tap, success, page turn, celebration. Mute control a child can find. Nothing autoplays.
- Accessibility audit against `DESIGN_SYSTEM.md` thresholds.
- Greyscale pass — nothing depends on colour.
- Real-device testing on the reference Android and on iOS.
- **Play-test with children aged 6–7.** Observe silently. Do not explain or rescue.

**Acceptance criteria**
- Every threshold in `DESIGN_SYSTEM.md` met and checked.
- The app is fully playable in greyscale and in silence.
- A child completes a chapter without an adult explaining anything.
- Confusion observed in play-testing is logged as a defect, not as a child's mistake.

**Dependencies.** Milestone 13 for the visual audit; sound and accessibility can start earlier.

**Not yet.** Anything on the Future Expansion list.

---

# What Is Not In Version 1

Not because they are bad, but because ten chapters and one class have not earned them: narration, the remaining eight presentations, in-scene hotspots, hidden object, connect, collections on the home shelf, verse practice from the collection, download-everything, export and restore, CI budget enforcement, schema versioning and codemods, i18n, and every item under Future Expansion.

---

# Start Here

## Milestone 1 — Skeleton and Placeholders

It is first because everything is blocked behind it, and because it removes the dependency that would otherwise dominate the schedule: **the placeholder art system means no milestone ever waits on an illustrator.**

It is small enough to finish in a sitting, and it ends with a URL that opens on a phone.

One decision to make before starting, which I would answer as follows unless you disagree: **Next.js App Router with static export.** It is the current default, it works cleanly with `output: 'export'`, and nothing in this product needs server rendering.
