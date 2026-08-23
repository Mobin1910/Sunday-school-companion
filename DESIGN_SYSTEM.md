# Tiny Disciples — Design System

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

Text supports the picture. It never carries the story alone.

| Rule | Limit |
|---|---|
| Words per story caption | ≤ 15 |
| Sentences per card | ≤ 2 |
| Words per sentence | ≤ 10 |
| Words per instruction | ≤ 8 |
| Syllables | Prefer one and two |

Voice:

- Present tense, active voice.
- Concrete nouns over abstract ones.
- Never use shame, guilt, or judgement.
- Encouragement is specific — "you put them all in order" beats "great job."
- No exclamation-mark inflation. Warmth comes from word choice, not punctuation.

Every word must survive the question: *would a six-year-old say this?*

---

# Colour

Warm, saturated, and calm — not muted. Bluey and Sago Mini are saturated; "calm" comes from restraint in *quantity*, not in *chroma*.

Rules:

- One dominant hue per chapter, drawn from its illustration.
- Never more than three accent colours on screen at once.
- Backgrounds are warm neutrals, never pure white or pure grey.
- No pure black text — use a deep warm brown or ink.
- Interactive elements share one consistent accent across the whole app, so a child learns "this colour means I can touch it."

*Palette tokens to be defined alongside the first illustrated chapter — colour should be derived from the artwork, not chosen before it exists.*

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
