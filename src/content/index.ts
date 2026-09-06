import { checkChapter } from "./checks";
import { ContentError, loadChapters, type LoadedChapter } from "./load";

/**
 * The way the app gets content.
 *
 * There is no separate validation step to remember to run, because there does
 * not need to be one: the app cannot render a chapter without loading it, and
 * loading it is what validates it. Broken content fails the build by being
 * unbuildable.
 */

let cached: LoadedChapter[] | undefined;

export function getChapters(): LoadedChapter[] {
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

export type { LoadedChapter };
export type { Art, Card, PlayInteraction, PlayItem } from "./cards";
export {
  activityOf,
  coverOf,
  nextChapter,
  storyCards,
  verseOf,
  versePracticeOf,
  videosOf,
} from "./sections";
export type {
  ActivityCard,
  CoverCard,
  PracticeCard,
  VerseCard,
  VideoCard,
} from "./sections";
