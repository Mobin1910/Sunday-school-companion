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
- IndexedDB for progress
- GitHub + Vercel

**No backend. No authentication. No runtime API calls.**

The application is fully static. Every network request at runtime is for the app's own assets. This makes "no backend" structurally true rather than aspirational.

---

# Content Pipeline

```
content/chapters/*.json
        │
        ▼
  schema validation  ──── fails ────▶ build fails
        │
        ▼
   typed content module
        │
        ▼
    Chapter Player
```

Rules:

- One JSON file per chapter, authored by hand, reviewed in pull requests.
- Content is validated against a versioned Zod schema at build time.
- **Invalid content fails the build.** A broken chapter never reaches a child.
- Content is imported as a typed module — never fetched at runtime.
- Adding a chapter is a content-only change. Zero code changes. This is the acceptance test for content/UI separation.
- Text is never baked into illustrations.

## Chapter shape

A chapter is metadata plus a flat, ordered list of typed cards. Journey steps are derived from card type, not stored.

```
Chapter
├── schema, title, reference
└── cards[]
      ├── type: cover | story | game | quiz | verse | practice | celebration
      ├── art
      ├── caption
      └── interaction?  (tap | pair | sequence)
```

Every card type is rendered by the same Chapter Player through a card renderer. Adding a card type means adding a renderer, not an engine.

**`CONTENT_MODEL.md` is the normative specification** for the schema, card types, interaction shapes, and validation rules. This section is a summary; where the two differ, `CONTENT_MODEL.md` wins.

## Schema versioning

- The schema carries a version number.
- Content files declare the schema version they target.
- A version bump requires a migration for existing content, applied in the same pull request.

---

# Interaction Engines

Four engines, shared by all card types that need interaction:

| Engine | Notes |
|---|---|
| Tap | Simplest, most reliable. Default choice. |
| Match | No colour-only matching (see `DESIGN_SYSTEM.md`). |
| Sequence | Ordering and retelling. |
| Drag & Drop | Hardest on low-end Android. **Must have a tap fallback path.** |

Build order: Tap → Match → Sequence → Drag & Drop.

Match and Drag & Drop consume the **same content shape** (`pair` — see `CONTENT_MODEL.md`), differing only by input modality. This makes the tap fallback structurally guaranteed rather than a rule to remember: a drag interaction without a tap fallback is not expressible.

Memory, hidden object, sorting, reveal, and pairing are **configurations** of these engines, never new engines.

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

Budgets are enforced in CI. A pull request that exceeds a budget fails.

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

- Stored in **IndexedDB**, not localStorage. localStorage is evictable within days on iOS for non-installed sites and throws in private mode.
- Progress records are versioned with a migration path from day one.
- All reads and writes are wrapped — a storage failure degrades the experience, never breaks it.
- **Content is never locked behind progress.** Losing progress is disappointing, never devastating.
- Chapters resume at the exact card the child left on.

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
