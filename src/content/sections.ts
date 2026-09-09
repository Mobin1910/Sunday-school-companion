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
export type GameCard = Extract<Card, { kind: "game" }>;
export type PracticeCard = Extract<Card, { kind: "practice" }>;
export type VideoCard = Extract<Card, { kind: "video" }>;

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

/**
 * A chapter's games, in the order they were written.
 *
 * Plural, and a list even when there is one, because the Hub and the Games
 * section both have to cope with none, one and several without three
 * different shapes. Authored order is presentation order — the first game is
 * the one the chapter leads with — and it is never an order a child has to
 * play them in.
 */
export function gamesOf(chapter: LoadedChapter): GameCard[] {
  return chapter.cards.filter((card): card is GameCard => card.kind === "game");
}

export function gameOf(
  chapter: LoadedChapter,
  id: string,
): GameCard | undefined {
  return gamesOf(chapter).find((game) => game.id === id);
}

/** The drill that follows the verse, where one was written. */
export function versePracticeOf(
  chapter: LoadedChapter,
): PracticeCard | undefined {
  return chapter.cards.find(
    (card): card is PracticeCard => card.kind === "practice",
  );
}

/**
 * A chapter's videos.
 *
 * Plural from the start, though the schema allows one today, so that the
 * screens are already written for a chapter with two. A chapter with none
 * returns an empty list, which is the ordinary case and never an error.
 */
export function videosOf(chapter: LoadedChapter): VideoCard[] {
  return chapter.cards.filter((card): card is VideoCard => card.kind === "video");
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
