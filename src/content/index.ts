import { CLASSES, isClassId, type ClassId } from "@/classes/registry";

import { checkChapter } from "./checks";
import { ContentError, loadChapters, type LoadedChapter } from "./load";

/**
 * The way the app gets content.
 *
 * There is no separate validation step to remember to run, because there does
 * not need to be one: the app cannot render a chapter without loading it, and
 * loading it is what validates it. Broken content fails the build by being
 * unbuildable.
 *
 * Content is asked for *by class*, and that is the whole point of this file.
 * `Beginner / Chapter 01` and `Primary / Chapter 01` are two different
 * lessons that happen to share a number, so a screen that asks simply for
 * "the chapters" is asking a question with no answer. `getChapters` takes a
 * class and will not compile without one; `everyChapter` is the deliberate,
 * named exception for the handful of callers that genuinely need all seven
 * — the static-params generators and the per-class maps the browser filters.
 */

let cached: LoadedChapter[] | undefined;

/**
 * Every chapter in every class.
 *
 * Only for code that is building something *across* classes and knows it:
 * `generateStaticParams`, which must emit a route per class, and the per-class
 * maps a global screen ships so the browser can pick one. A screen showing a
 * child their chapters must never call this — that is `getChapters(classId)`,
 * and the difference is the guard against a Beginner child meeting a Primary
 * lesson because the chapter numbers matched.
 */
export function everyChapter(): LoadedChapter[] {
  if (cached) return cached;

  const chapters = loadChapters();
  const advisories = chapters.flatMap(checkChapter);

  for (const { level, where, message } of advisories) {
    const line = `  ${where}\n    ${message}`;
    if (level === "warning") {
      console.warn(`\nContent warning:\n${line}`);
    }
  }

  const errors = advisories.filter((a) => a.level === "error");
  if (errors.length > 0) {
    throw new ContentError(
      "\n" +
        errors.map((e) => `  ${e.where}\n    ${e.message}`).join("\n") +
        `\n\n  ${errors.length} problem(s) in chapters that ship.` +
        `\n  Remove a chapter from content/library.json to keep working on it as a draft.\n`,
    );
  }

  cached = chapters;
  return chapters;
}

/** One class's chapters, in the order the content layer loads them. */
export function getChapters(classId: ClassId): LoadedChapter[] {
  return everyChapter().filter((chapter) => chapter.classId === classId);
}

/**
 * Every class's chapters, keyed by class, including the classes with none.
 *
 * The shape a static export needs for a screen whose content depends on a
 * choice only the browser knows. There is no server at runtime, so `/chapters`
 * cannot be rendered per child; it ships one small map and the browser reads
 * one entry out of it. Each class is present even when empty, so a screen can
 * tell "this class has nothing written yet" — which is a real, sayable state —
 * from "this is not a class".
 *
 * Callers pass the projection they want, so what crosses into the bundle is
 * whatever that screen actually draws and never the chapters themselves.
 */
export function byClass<T>(
  project: (chapters: LoadedChapter[]) => T,
): Record<ClassId, T> {
  const all = everyChapter();
  const out = {} as Record<ClassId, T>;

  for (const { id } of CLASSES) {
    out[id] = project(all.filter((chapter) => chapter.classId === id));
  }
  return out;
}

/**
 * A chapter looked up by the two halves of its identity.
 *
 * `classId` arrives as a raw route segment, so it is checked against the
 * registry before it is trusted; `/chapter/beginners/…` with the stray s is
 * not a class and resolves to nothing rather than to an empty chapter list.
 * Every chapter route starts here, and none of them looks a chapter up by
 * slug alone.
 */
export function chapterWithin(
  classId: string,
  slug: string,
): LoadedChapter | undefined {
  if (!isClassId(classId)) return undefined;
  return everyChapter().find(
    (chapter) => chapter.classId === classId && chapter.slug === slug,
  );
}

/**
 * The routes to build, one per chapter per class.
 *
 * `keep` narrows it for the sections that only some chapters have — a verse
 * route is generated for chapters with a verse and no others, so a static
 * export never ships a page whose only content is "not found".
 */
export function chapterParams(
  keep: (chapter: LoadedChapter) => boolean = () => true,
): { class: string; slug: string }[] {
  return everyChapter()
    .filter(keep)
    .map(({ classId, slug }) => ({ class: classId, slug }));
}

export type { LoadedChapter };
export { toInteraction } from "./cards";
export { interactionSchema } from "./schema";
export { chapterHref, chapterKey } from "./key";
export type { Art, Card, PlayInteraction, PlayItem } from "./cards";
export {
  gamesOf,
  gameOf,
  coverOf,
  nextChapter,
  storyCards,
  verseOf,
  versePracticeOf,
  videosOf,
} from "./sections";
export type {
  GameCard,
  CoverCard,
  PracticeCard,
  VerseCard,
  VideoCard,
} from "./sections";
