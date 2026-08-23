# Tiny Disciples — Design Notes

> **Status:** Open observations
> **Act on these in:** Milestone 13, when Stephen is fully illustrated

A holding pen, not a specification.

These are things we have noticed while building against placeholder artwork. **None of them are decisions.** Placeholder boxes are blank, grey and uniformly sized, which makes every judgement about visual weight, balance and spacing unreliable — so we are writing them down rather than acting on them, precisely so that scaffolding does not quietly become the visual language.

Nothing here is settled until it has been judged against real illustrations on a real phone.

---

# Open Observations

## 1. Illustrations should carry far more visual weight

**Seen:** on a story page the illustration takes roughly 30% of the screen height and the text feels like an equal partner. It should not be. The picture tells the story; the words give it context.

**Why we are not fixing it yet:** blank placeholder boxes look emptier and less important than any real illustration will. Growing them now would be compensating for the absence of art.

**Concretely, when we do:** the picture is **width-constrained on a phone**, not height-constrained — a 4:3 image inside `px-6` padding can only be 342px wide on a 390px screen, and giving its container more vertical room changes nothing. The real lever is horizontal: reducing or removing the page padding for the illustration while keeping it for the text. Near-full-bleed art with text in a narrower measure is the shape worth trying first.

## 2. Typography feels oversized and instructional

**Seen:** story text at 24px reads more like a worksheet than a storybook.

**An important caution before we shrink anything:** the typeface is not chosen yet. The stack asks for `ui-rounded`, which only resolves on Apple platforms — on Android and on the machine the screenshots came from it silently falls back to plain `system-ui`. **What currently reads as "instructional" is at least partly the absence of a warm rounded typeface, not the size.**

Reducing text size to fix a typeface problem would be the wrong trade: this audience may not read fluently, and `DESIGN_SYSTEM.md` sets 18px as a floor for good reason.

**When we do:** choose the typeface first, look again, and only then decide about size. The ratio between picture and text is likely to fix itself once observation 1 is addressed.

## 3. Navigation feels app-like

**Seen:** two floating round buttons read as application chrome sitting on top of a storybook rather than part of it.

**Directions worth trying, none chosen:**
- Large invisible tap zones on the left and right of the page, with the visible buttons reduced to a quiet hint
- Navigation that sits *on* the ground colour rather than floating above it — no shadow, no circle
- A soft page-corner affordance, closer to a real book
- Removing the forward button once a child has swiped a few times

**The constraint to respect:** a six-year-old must be able to discover how to move on without being told. Whatever replaces the buttons has to be at least as obvious, and still meet the 56px minimum. Elegance that costs discoverability is not elegance here.

## 4. Spacing is mathematically consistent but not yet warm

**Seen:** the 4px scale is applied evenly and the result is orderly rather than playful.

**Worth exploring:** deliberate asymmetry, more generous and *uneven* rhythm, letting the illustration break its container, a slightly rotated or hand-placed feel. Warmth in children's design usually comes from things being a little off-grid, which is the opposite of what a spacing scale produces by default.

## 5. Every page uses the same frame

**Seen:** the cover, story pages, verse and celebration all share one layout — same height, same margins, same centre.

That consistency was deliberate and it is doing real work, but the cover in particular may deserve to feel like a *cover* rather than the first page. Worth revisiting whether the payoff pages (cover, celebration) earn a distinct treatment without breaking the sense of one continuous book.

## 6. The dots may not scale

**Seen:** fourteen per-card dots work well at this length and give feedback on every page turn.

At twenty or more pages they will get cramped. Revisit if a chapter grows, and reconsider step-based dots then — but only then, because per-card dots are the better experience at the length chapters actually are.

---

# What Is Working — Do Not Lose These

Recording these so a redesign does not quietly discard them.

- **The verse page.** Nothing competes with the words. It is the calmest screen in the product and the closest to what we are aiming for overall.
- **Native scroll-snap paging.** Real momentum, real swipe physics. Any redesign of navigation must keep the gesture feeling like this.
- **Navigation that never moves between pages.** Stability is calming; controls that slide in with each screen are not.
- **The words rising a beat after the page arrives.** It gives the illustration a moment alone. Subtle, and worth keeping.
- **Ending with "read it again" rather than stopping.** No dead ends, and re-reading is what this age actually wants.
- **The warm ground colour.** It reads correctly even with nothing on it.

---

# Choices Currently Contaminated By Placeholders

The specific things we should assume are wrong until proven otherwise:

- Every proportion between picture and text
- Page padding and the gaps between elements
- The 4:3 assumption for illustrations — real art may want to vary
- Whether text belongs below the picture at all, rather than beside or overlapping it
- Text alignment; centred suits short captions, but longer ones may read better left-aligned
- The celebration page, which is currently a colour and a sentence and little else

---

# Open Question From Milestone 3

The verse currently renders with no illustration, and the `picture` field was removed from Stephen's verse section so that content did not declare something the app ignores.

**To decide:** drop `picture` from the verse schema entirely, or keep it and render it as soft background art once real illustrations exist? The picture-free verse page is genuinely good — but that judgement was also made against a placeholder.
