import type { Card, PlayInteraction } from "./cards";
import type { LoadedChapter } from "./load";

/**
 * The pool of questions Games can draw from, across every chapter.
 *
 * Built by walking the flat card list that already exists — the same list
 * the player runs and `sections.ts` reads. There is no second definition of
 * a game anywhere: an interaction is authored once, inside its chapter, and
 * Games is a different way of reaching the same thing.
 *
 * Every entry keeps its chapter, because a question a child meets out of
 * context should always be able to lead back to the story it came from.
 */

export type GameQuestion = {
  /** Stable across a session so the shuffler can avoid immediate repeats. */
  id: string;
  interaction: PlayInteraction;
  chapterSlug: string;
  chapterTitle: string;
};

/**
 * Whether an interaction belongs in a shuffled, cross-chapter pool.
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
 * If an author ever needs to keep a *particular* question out of Games,
 * this is where a single optional `games: false` in the chapter schema
 * would be read. Nothing needs it yet, and an unused field is a field that
 * drifts, so it does not exist.
 */
export function eligibleForGames(interaction: PlayInteraction): boolean {
  return interaction.type !== "reveal";
}

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

export function gamePool(chapters: LoadedChapter[]): GameQuestion[] {
  return chapters.flatMap((chapter) =>
    chapter.cards.flatMap((card, index) =>
      interactionsOf(card)
        .filter(eligibleForGames)
        .map((interaction) => ({
          id: `${chapter.slug}:${index}`,
          interaction,
          chapterSlug: chapter.slug,
          chapterTitle: chapter.title,
        })),
    ),
  );
}
