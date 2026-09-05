import type { Card } from "./cards";
import type { LoadedChapter } from "./load";

/**
 * A chapter's parts, picked back out of the flat card list.
 *
 * Chapters are authored as named sections, flattened to one ordered list of
 * cards so the player can run one loop. That flattening is right for the
 * player and wrong for navigation: a child chooses "the memory verse", not
 * "card fourteen". Rather than keep a second shape of the content around,
 * this reads the parts back out of the one that already exists.
 *
 * A chapter is not obliged to have every part. A chapter with no activity is
 * a chapter with no activity, not an error — the Hub simply has less to
 * offer, and says so honestly rather than showing a door into an empty room.
 */

export type CoverCard = Extract<Card, { kind: "cover" }>;
export type VerseCard = Extract<Card, { kind: "verse" }>;
export type ActivityCard = Extract<Card, { kind: "activity" }>;
export type PracticeCard = Extract<Card, { kind: "practice" }>;

/** What the story section reads: the narrative arc, and nothing else. */
const STORY_KINDS = new Set<Card["kind"]>([
  "cover",
  "story",
  "quiz",
  "celebration",
]);

export function coverOf(chapter: LoadedChapter): CoverCard | undefined {
  return chapter.cards.find((card): card is CoverCard => card.kind === "cover");
}

export function verseOf(chapter: LoadedChapter): VerseCard | undefined {
  return chapter.cards.find((card): card is VerseCard => card.kind === "verse");
}

export function activityOf(chapter: LoadedChapter): ActivityCard | undefined {
  return chapter.cards.find(
    (card): card is ActivityCard => card.kind === "activity",
  );
}

/** The drill that follows the verse, where one was written. */
export function versePracticeOf(
  chapter: LoadedChapter,
): PracticeCard | undefined {
  return chapter.cards.find(
    (card): card is PracticeCard => card.kind === "practice",
  );
}

export function storyCards(chapter: LoadedChapter): Card[] {
  return chapter.cards.filter((card) => STORY_KINDS.has(card.kind));
}

/**
 * Reading order, and therefore what "the next chapter" means.
 *
 * Chapters load in filename order today. When `library.json` starts carrying
 * a deliberate order, this is the one function that changes.
 */
export function nextChapter(
  chapters: LoadedChapter[],
  slug: string,
): LoadedChapter | undefined {
  const here = chapters.findIndex((chapter) => chapter.slug === slug);
  return here === -1 ? undefined : chapters[here + 1];
}
