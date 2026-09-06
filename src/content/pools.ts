import type { Card, PlayInteraction } from "./cards";
import type { LoadedChapter } from "./load";

/**
 * The pools a cross-chapter session can draw from.
 *
 * Built by walking the flat card list that already exists — the same list
 * the player runs and `sections.ts` reads. There is no second definition of
 * a game anywhere: an interaction is authored once, inside its chapter, and
 * a pool is a different way of reaching the same thing.
 *
 * Every entry keeps its chapter, because a question a child meets out of
 * context should always be able to lead back to the story it came from.
 */

export type PoolQuestion = {
  /** Stable across a session so the shuffler can avoid immediate repeats. */
  id: string;
  interaction: PlayInteraction;
  chapterSlug: string;
  chapterTitle: string;
};

/**
 * Whether an interaction belongs in a shuffled, cross-chapter pool at all.
 *
 * Derived from what the interaction *is*, never from which chapter it came
 * from — no chapter is ever named here.
 *
 * Discovery (`reveal`) has no wrong answer. That is the whole point of it:
 * every tap is a discovery. An interaction with nothing to get right cannot
 * carry a streak, and rapid-fire is the wrong frame for something meant to
 * be wandered through — so it stays inside its chapter, where it makes
 * sense.
 *
 * If an author ever needs to keep a *particular* question out of a pool,
 * this is where a single optional `games: false` in the chapter schema
 * would be read. Nothing needs it yet, and an unused field is a field that
 * drifts, so it does not exist.
 */
export function eligibleForPlay(interaction: PlayInteraction): boolean {
  return interaction.type !== "reveal";
}

/**
 * Which cards feed which pool.
 *
 * The split is by what the card *is*, not by where it sits: a `practice`
 * card is the drill attached to a memory verse, so it is memory-verse
 * practice wherever it appears, and everything else a chapter asks is a
 * game. That is why the two streaks can be honest about being different
 * things — they are fed by different kinds of content, decided here once.
 */
const GAME_KINDS = new Set<Card["kind"]>(["story", "activity", "quiz"]);
const VERSE_KINDS = new Set<Card["kind"]>(["practice"]);

/** Every interaction a card can carry, wherever it lives on that card. */
function interactionsOf(card: Card): PlayInteraction[] {
  switch (card.kind) {
    case "story":
      return card.interaction ? [card.interaction] : [];
    case "activity":
    case "quiz":
    case "practice":
      return [card.interaction];
    default:
      return [];
  }
}

function poolOf(
  chapters: LoadedChapter[],
  kinds: Set<Card["kind"]>,
): PoolQuestion[] {
  return chapters.flatMap((chapter) =>
    chapter.cards.flatMap((card, index) =>
      kinds.has(card.kind)
        ? interactionsOf(card)
            .filter(eligibleForPlay)
            .map((interaction) => ({
              id: `${chapter.slug}:${index}`,
              interaction,
              chapterSlug: chapter.slug,
              chapterTitle: chapter.title,
            }))
        : [],
    ),
  );
}

/** Everything a chapter asks about its story. */
export function gamePool(chapters: LoadedChapter[]): PoolQuestion[] {
  return poolOf(chapters, GAME_KINDS);
}

/** The drills attached to memory verses, from every chapter that has one. */
export function versePool(chapters: LoadedChapter[]): PoolQuestion[] {
  return poolOf(chapters, VERSE_KINDS);
}
