import { z } from "zod";

/**
 * What an editorial brief is allowed to contain.
 *
 * A brief is one class's rows from the Google Sheet, frozen into the
 * repository: what a teacher knows about each chapter and what we have
 * decided to do with it. It is the *input* to the private generation
 * workflow, never its output, and never anything the app reads.
 *
 * Two rules the schema exists to enforce, both of which are product
 * decisions rather than data hygiene:
 *
 *   A brief holds no production data. No panels, no distractors, no hint
 *   ladders, no asset paths, no interaction types. `.strict()` everywhere
 *   means the first person to paste a panel array into a brief gets an
 *   error naming the field rather than a chapter that half-works. See
 *   CONTENT_WORKFLOW.md on why teachers never see those concepts.
 *
 *   A chapter's identity is class + number. Never the number alone —
 *   chapter 1 exists in every class and they are different lessons — and
 *   never a title, which gets edited.
 *
 * It deliberately lives in `tools/` and not in `src/`. Nothing the child's
 * app runs may import a brief: the app reads chapter files and bundled
 * artwork, and a brief in the bundle would be the first step towards the
 * sheet becoming a runtime dependency. Plain ESM so a Node script can read
 * it without a TypeScript toolchain, using the Zod the project already has.
 */

/** Draft → Ready for Review → Published. The sheet's own dropdown, lowercased. */
export const STATUSES = ["draft", "ready-for-review", "published"];

/**
 * Where a chapter's curriculum actually is.
 *
 * The material already exists as photographed or scanned pages of the
 * Samajham books, so the brief points at it rather than asking a teacher to
 * retype it. A folder, not a list of files: contributors add and replace
 * pages, and a list in the repository would be wrong within a week. What
 * pages were actually read is recorded at generation time as provenance —
 * see `provenance` below.
 *
 * `folderId` is not a secret. It is an opaque Drive identifier, useless
 * without the permission to read that folder, and it is what makes the
 * future ingestion step able to find the source without a human pasting a
 * link. Credentials to *use* it never enter the repository; see §Security
 * in CONTENT_WORKFLOW.md.
 */
const curriculumSource = z
  .strictObject({
    provider: z.literal("google-drive"),
    folderId: z.string().min(1).optional(),
    folderUrl: z.string().url().optional(),
    label: z.string().min(1).optional(),
    note: z.string().optional(),
  })
  .refine((s) => s.folderId !== undefined || s.folderUrl !== undefined, {
    message:
      "a curriculum source needs a folderId or a folderUrl, or it points at nothing",
  });

/**
 * What was actually used, the last time this chapter was generated.
 *
 * Written by the generation workflow, never by a teacher and never by hand.
 * It exists so that regenerating chapter 5 in six months can answer "which
 * pages was this built from?" without anyone remembering. Deliberately thin
 * — a list of filenames and a date, not a version-control system. Git
 * already holds the production history; this holds the one thing git
 * cannot, which is what the input was.
 */
const provenance = z.strictObject({
  generatedAt: z.string().min(1),
  sourceFiles: z.array(z.string().min(1)).optional(),
  note: z.string().optional(),
});

/**
 * One objective, from the Learning Objectives tab.
 *
 * The objective is what drives the interaction choice — "put things in
 * order" wants Ordering, "who was who" wants Pairing — which is why it is
 * here and the interaction is not. A teacher may *suggest* a game in plain
 * English; the private workflow decides the actual model. `suggestion` is
 * that suggestion and nothing more, and it is never binding.
 */
const objective = z.strictObject({
  id: z.string().min(1).optional(),
  objective: z.string().min(1),
  priority: z.enum(["core", "supporting"]).optional(),
  suggestion: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Something the workflow could not resolve on its own.
 *
 * The rule the whole ingestion design turns on: never invent missing
 * curriculum. A page that will not read, a verse that stops mid-sentence, a
 * reference that does not parse — all of it surfaces here and stops the
 * chapter from being published, rather than being quietly filled in with
 * general Bible knowledge. `blocking` is the difference between "look at
 * this" and "this cannot ship".
 */
const flag = z.strictObject({
  kind: z.enum([
    "unreadable-source",
    "missing-page",
    "duplicate-page",
    "wrong-chapter",
    "wrong-class",
    "unclear-reference",
    "incomplete-verse",
    "missing-objective",
    "contradictory-metadata",
    "other",
  ]),
  message: z.string().min(1),
  blocking: z.boolean().optional(),
});

/**
 * One chapter's brief — the sheet row, normalised.
 *
 * Every field below is something a Sunday School teacher can answer without
 * being taught our vocabulary, and the column names match the sheet's so
 * that a row and its JSON can be read side by side. Everything is optional
 * except the two that make it a chapter at all: which chapter, and what it
 * is called.
 */
export const chapterBriefSchema = z.strictObject({
  chapter: z.number().int().positive(),
  title: z.string().min(1),
  bibleReference: z.string().optional(),

  /** The Drive folder holding the curriculum pages. */
  curriculumSource: curriculumSource.optional(),
  /**
   * Anything a teacher typed instead of, or as well as, the source pages.
   * Optional on purpose — the point of the Drive model is that nobody has
   * to transcribe a lesson to contribute one.
   */
  curriculumNotes: z.string().optional(),

  learningObjectives: z.array(objective).optional(),

  memoryVerse: z.string().optional(),
  memoryVerseReference: z.string().optional(),

  /** Whatever the teacher pasted. The ID is extracted downstream, not here. */
  video: z.string().optional(),
  takeHome: z.string().optional(),
  teachingNotes: z.string().optional(),
  gameSuggestion: z.string().optional(),

  contributor: z.string().optional(),
  status: z.enum(STATUSES),
  notes: z.string().optional(),

  provenance: provenance.optional(),
  flags: z.array(flag).optional(),

  /**
   * The chapter file this brief produced, once it has produced one.
   *
   * A slug today, because that is what the repository uses. It is the only
   * field that points from editorial into production, and it points one way
   * — nothing in `content/*.story.json` refers back here.
   */
  produces: z.string().min(1).optional(),
});

export const briefSchema = z.strictObject({
  note: z.string().optional(),
  classId: z.string().min(1),
  chapters: z.array(chapterBriefSchema),
});

export const classesSchema = z.strictObject({
  note: z.string().optional(),
  classes: z.array(
    z.strictObject({
      id: z.string().regex(/^[a-z0-9-]+$/),
      tab: z.string().min(1),
      display: z.string().min(1),
      order: z.number().int().positive(),
      live: z.boolean(),
    }),
  ),
});

/**
 * `6–7 Years`, `6-7 Years`, `6-7` — all the same class.
 *
 * Contributors type an en dash because Google Docs autocorrects one in, and
 * Drive folders get renamed by whoever made them. Identity cannot depend on
 * any of that, so anything class-shaped is put through here before it is
 * compared. See CONTENT_WORKFLOW.md on folder naming.
 */
export function normaliseClassId(raw) {
  return String(raw)
    .replace(/[‐-―]/g, "-")
    .replace(/years?/gi, "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

/** `Chapter 01`, `Chapter 1`, `chapter-1` → `1`. */
export function normaliseChapterNumber(raw) {
  const found = String(raw).match(/\d+/);
  return found ? Number(found[0]) : null;
}
