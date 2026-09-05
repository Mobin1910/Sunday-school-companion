# Sunday School Companion — Design System

> **Version:** 1.0
> **Status:** Draft — pending review
> **Governed by:** `PRODUCT_CONSTITUTION.md`

This document holds the measurable design rules and accessibility thresholds that enforce the constitution. Where the constitution states a feeling, this document states the specification.

If this document ever contradicts the constitution, the constitution wins.

---

# Accessibility Thresholds

Non-negotiable. These exceed WCAG in the places that matter for six-year-olds.

| Rule | Threshold |
|---|---|
| Minimum touch target | 56 × 56 px (WCAG asks 44; children need more) |
| Minimum spacing between targets | 12 px |
| Text contrast | 4.5:1 minimum |
| Non-text / UI contrast | 3:1 minimum |
| Meaning from colour alone | Never — always pair with shape, icon, position, or label |
| Time limits | None, anywhere |
| Reduced motion | `prefers-reduced-motion` respected on every animation |
| Text in images | Never |
| Text resizing | Supported to 200% without loss of function |

**Colour-blindness matters most in Match and Sort.** Every matchable element carries a second distinguishing cue.

---

# Copy Rules

Copy limits and voice guidance live in **`CONTENT_MODEL.md`** under *Writing Guidelines*, alongside the rest of the authoring handbook, and are enforced by content validation.

They are not repeated here. One set of numbers, one home.

---

# Colour

Warm, saturated, and calm — not muted. Bluey and Sago Mini are saturated; "calm" comes from restraint in *quantity*, not in *chroma*.

Rules:

- One dominant hue per chapter, drawn from its illustration.
- Never more than three accent colours on screen at once.
- Backgrounds are warm neutrals, never pure white or pure grey.
- No pure black text — use a deep warm brown or ink.
- Interactive elements share one consistent accent across the whole app, so a child learns "this colour means I can touch it."

**Provisional tokens ship first.** Colour should be derived from the artwork, and the artwork does not exist yet — but nothing can be built without *some* palette. So Version 1 starts with a deliberately provisional set (warm neutral ground, one ink, one interactive accent, one success accent) and replaces it once the first chapter is illustrated.

Naming tokens by role rather than by hue — `--ground`, `--ink`, `--touchable` — means that replacement is a values change, not a refactor.

---

# Typography

- A single rounded, friendly sans-serif with a true single-storey `a` and `g` — the letterforms children learn to read first.
- Minimum body size 18 px on phone, 20 px on tablet.
- Line height 1.5 minimum.
- Line length 30–40 characters — short lines are easier for developing readers.
- Never justify. Never letter-space body text.
- Sentence case everywhere. No all-caps.

---

# Spacing & Shape

- 4 px base spacing scale.
- Generous padding — whitespace is the primary tool for "calm."
- Rounded corners throughout; nothing sharp. Large radii on cards, fully rounded on buttons.
- Soft, low-contrast shadows. No hard drop shadows, no harsh borders.

---

# Motion Specification

| Purpose | Duration | Easing |
|---|---|---|
| Confirm (tap, toggle) | 120–180 ms | ease-out |
| Guide (transition between cards) | 240–320 ms | ease-in-out |
| Celebrate | 600–1200 ms | spring |
| Ambient delight | Loops, low amplitude | linear or spring |

Rules:

- Animate `transform` and `opacity` only.
- Motion never delays a child's next action — interaction is available before the animation finishes.
- Ambient motion is subtle enough that a child does not notice it as motion.
- Under `prefers-reduced-motion`, transitions become cross-fades and ambient loops stop. Nothing becomes unusable.

---

# Recovery

The product's own voice, spoken in every chapter by the same patient teacher. Written once here, never authored per chapter — chapter authors write hints, not encouragement.

Principles are in `PRODUCT_CONSTITUTION.md`. This is the library and how it moves.

## The library

Three pools, matched to how the ladder climbs: from *noticing* a child, to *joining* them, to *moving on together*. Never toward louder praise.

**Noticing** — first spoken Recovery. Names the effort, never the outcome.

- You're thinking
- Good thinking
- You're working it out
- Nice thinking
- You're figuring it out

**Joining** — as the ladder climbs. The child stops being alone with it.

- Let's look together
- Let's find it together
- We can look again
- Let's have another look

**Moving on** — alongside a clue or the reveal. Forward-facing, never backward.

- Let's try another way
- Here's something that helps
- Let's look at this one
- Try this one

**Beginning** — for stillness, not for a mistake. A child who has done nothing has failed at nothing, so nothing may imply otherwise.

- Let's start together
- I'll help you begin
- Shall we look?
- Let's begin here

## Choosing a line

- Draw from the pool matched to the rung.
- Never repeat a line within one interaction.
- Shuffle each pool and draw without replacement across a chapter, so a phrase only returns once the others have been used.
- Maximum five words. These are read at a glance or not at all.
- No exclamation marks. Warmth comes from the words, and an exclamation mark makes a small kindness shout.

## How Recovery moves

**Recovery settles. Success blooms.** That contrast is the whole grammar, and it must survive every future change — if the two ever feel alike, arriving stops meaning anything.

| Moment | Motion | Duration |
|---|---|---|
| The tap itself | Depress and lift — acknowledged, never evaluated | 150 ms |
| A choice that did not stay | Settles back where it came from. Ease-out, no bounce | 250 ms |
| The card | Warms almost imperceptibly, then returns | 1000 ms |
| Recovery words | Fade in, rise 8px, hold, fade out | 400 ms in |
| The remaining choices | One shared, tiny breath — 1 → 1.02 → 1 | 600 ms |
| Success, for contrast | Rises and opens outward, larger and longer than any of the above | — |

**Never:** shake, flash, red, cross marks, bounce, or a pop. A bounce reads as an error sound made visible. Red is a verdict.

Under `prefers-reduced-motion`, settling and warming become simple cross-fades. The words still arrive; only the movement stops.

## Timing

Help must never be causally adjacent to the mistake. A hint that appears the instant a wrong answer is tapped reads as a response *to that answer*. A beat of silence first, and it reads as company.

```
tap acknowledged        150 ms
choice settles back     250 ms
quiet                   600 ms   ← this pause is the whole effect
Recovery arrives        400 ms
quiet                   800 ms
the ladder's help
```

Roughly two seconds from mistake to hint. That is what a person feels like. Anything faster is a machine reacting.

---

# Celebration

What the product says when a child arrives. Principles are in `PRODUCT_CONSTITUTION.md`; this is the library and how it moves.

## Three pools, one volume

Which pool is chosen depends on how the child arrived. **How much warmth they get does not.** Same size, same duration, same weight — only the words differ.

**Capability** — arrived on their own.

- You found it
- You spotted it
- You did it
- That's the one

**Persistence** — arrived after more than one try. Never mentions what did not work.

- You kept looking
- You stayed with it
- You didn't give up
- You worked it out

**Partnership** — arrived after help. Honest about the company, never about the need for it.

- We found it together
- We got there together
- We did that together

## Choosing a line

- Never repeat within a chapter until the pool is exhausted, exactly as with Recovery.
- Maximum five words.
- No exclamation marks.
- Never name what went wrong, and never use "but".

## Discovery has no completion line

Nothing there can be wrong and nothing is required, so there is no arriving. Each reveal is its own small delight, and a child who finds one thing and moves on has had a complete experience. **Never count what was found.**

## How celebration moves

**Recovery settles. Celebration blooms.** Recovery moves down and inward; celebration moves up and outward. The two must never be mistaken for each other, or arriving stops meaning anything.

| Moment | Motion | Duration |
|---|---|---|
| Interaction complete | The answer rises slightly and opens; a soft warmth spreads once | 500 ms |
| Words | Fade in and rise 8px, a beat after the motion begins | 400 ms |
| Chapter celebration | Fuller — the one moment in a chapter that earns real motion | 600–1200 ms, spring |

Every interaction's celebration is the same size regardless of pool. The chapter's celebration is the only larger one, and restraint everywhere else is what lets it land.

**Never:** confetti, stars, points, trophies, badges, counters, or anything that accumulates. Under `prefers-reduced-motion`, the bloom becomes a gentle cross-fade and the warmth still spreads.

---

# Halo

The companion. Principles are in `PRODUCT_CONSTITUTION.md`; this is how it looks and moves. **The approved reference image is the visual source of truth** — this section describes it, and does not reinterpret it.

## Form

An organic blob, never a circle. Asymmetric corner radii give it a silhouette that differs per state, and the bottom radius stays the flattest of the four: Halo rests on something rather than floating like a bubble.

It is **lit from within, never shaded from outside**. No dark rim, no specular modelling — the colours are overlapping soft radials, and what gives it form is the light it casts. One glass sheen high on the left shoulder is the single detail that makes the surface read as jelly rather than as a coloured cloud. A soft reflection beneath grounds it.

No arms, no legs, no clothing, no mouth, no brows, no cross. Nothing that turns it into a mascot.

## Colour

Halo carries **its own light rather than the interface's palette**. These are the only literal colours in the product — everything else is a role token — because they belong to a character rather than to a surface, and they are meant to survive Milestone 13's retokenising.

| | |
|---|---|
| cyan | `#4fd6ff` — high left |
| electric blue | `#3d7bff` — through the middle |
| violet | `#9b6bff` — low centre |
| pink | `#ff8ecb` — gathering at the base |
| peach | `#ffb583` — bottom left |
| gold | the ring, and only the ring |

They blend inside the body as overlapping radials, never as bands. `warmth` cross-fades the peach and pink forward without changing the family — that is how a state shows care.

## The ring

Golden, thin, floating above, and one of Halo's strongest signatures.

An **ellipse rather than a circle**, so it reads as a ring seen from slightly below; a flat circle above a head looks like a sticker. Slightly uneven in width, because a mathematically perfect ring is precisely what it is not. Built from a soft border plus bloom — **light, never metal**, never neon.

It drifts on its own clock, a quarter slower than the body breathes, so the two never look mechanical.

## Eyes

Two pale **vertical capsules**. No pupils, no iris, no lashes, no brows. Set slightly right of centre and high — centring them makes the blob symmetrical, and symmetry is what turns a companion into a cartoon face.

Only two things change: **openness** (they squash for a state looking hard) and **tilt** (a few degrees carries most of the mood). Position shifts with gaze.

## States

| State | Reads as |
|---|---|
| `idle` | resting, cool, unhurried |
| `listening` | attending, brighter, turned toward the child |
| `curious` | leaning, eyes and ring following — **never a verdict** |
| `thinking` | considering; cool, eyes narrowed, ring lifted |
| `helping` | company; largest, warmest, ring at its most present |
| `hinting` | leaning and looking toward something worth noticing |
| `recovering` | settling down and inward, dimmer, ring drawn closer |
| `celebrating` | up and outward, brightest, ring widest |
| `transitioning` | small and quiet, out of the way |

Recovery **settles down and inward**. Celebration **rises up and outward**. Nothing shakes, flashes, reddens, bounces, spins or emits particles, at any state, ever.

## Environment

**The interface is the night. Halo is the light.** Deep navy, a soft blue atmospheric gradient, restrained haze, subtle reflective grounding. `HaloPresence` takes `ground="night"` to provide it, so the atmosphere stays one thing everywhere rather than being reinvented per surface.

Halo remains legible on the light surfaces the app uses today, but night is the primary presentation. Never a black-and-neon sci-fi UI.

## Sizes

`compact` 40px · `standard` 72px · `large` 120px · `hero` 200px. The rendered box is 1.42× the size to hold the ring above and the reflection below, and the body sits well inside it so the largest state has room to grow.

## Reduced motion

Breathing, drift and the ring's float stop. **Shape, colour, warmth, light, glow, lean, gaze, eye openness and the ring's height and brightness all remain**, because those are what distinguish helping from recovering — a child who needs stillness still needs to tell the two apart.

## Announcement

Silent to screen readers in most states. Only `helping` and `celebrating` announce, because only those carry meaning a child would otherwise miss. Nothing announces a mistake.

---

# Illustration

- One coherent hand-drawn style across all chapters — visible texture, imperfect line, warm palette.
- Characters are expressive and readable at phone size. Test every panel at 360 px wide.
- Faces and body language carry the emotional beat, because text cannot be relied on.
- Difficult moments are told through implication and aftermath, never spectacle.
- Tablet artwork is art-directed for more room and richer scenes — never more information.

**The clarity test:** cover the caption. If a six-year-old cannot tell what is happening, the illustration has failed — not the text.

---

# Sound

| Event | Character |
|---|---|
| Tap | Very short, soft, low-volume |
| Success | Warm, rising, brief |
| Page turn | Subtle paper texture |
| Celebration | Fuller, but under 1.5s |

Rules:

- Nothing autoplays on load.
- Sound never conveys required information.
- Mute is always reachable and obvious to a child.
- No background music.
- Respect the device silent switch.

---

# Component Rules

- **One primary action per screen.** The primary action is always the largest, most saturated element.
- Back and exit are always available, never louder than "next."
- Progress is shown as dots or a path — never a percentage, never a number.
- Loading shows a character, never a spinner.
- Empty and error states show a character and one obvious way forward.
- Disabled states do not exist. If a child cannot do something yet, it is not on screen.

---

# Open Questions

- Palette tokens, pending the first illustrated chapter.
- Typeface selection and licensing.
- Whether celebration artwork is per-chapter or shared.
