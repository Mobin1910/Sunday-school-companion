import type { Chapter, Interaction } from "./schema";

/**
 * The runtime shape of a chapter: one flat, ordered list of cards.
 *
 * Chapter files are authored as named sections because that is pleasant to
 * write and read. The player wants one uniform loop with no special cases.
 * Both are right, so the two shapes differ and this is the single place they
 * are reconciled.
 *
 * The discriminator is `kind` rather than `type`, because `type` already means
 * something in content — it names an interaction's presentation.
 */
export type Card =
  | { kind: "cover"; picture: string }
  | {
      kind: "story";
      picture: string;
      text?: string;
      alt?: string;
      interaction?: Interaction;
    }
  | { kind: "activity"; interaction: Interaction }
  | { kind: "quiz"; interaction: Interaction }
  | {
      kind: "verse";
      text: string;
      reference: string;
      translation: string;
      attribution?: string;
      picture?: string;
    }
  | { kind: "practice"; interaction: Interaction }
  | { kind: "celebration"; message: string; picture?: string };

/**
 * The journey order is fixed by the constitution, so it is expressed once,
 * here, and never re-declared in a chapter file.
 */
export function toCards(chapter: Chapter): Card[] {
  const cards: Card[] = [{ kind: "cover", picture: chapter.cover.picture }];

  for (const card of chapter.story) {
    cards.push({
      kind: "story",
      picture: card.picture,
      ...(card.text !== undefined && { text: card.text }),
      ...(card.alt !== undefined && { alt: card.alt }),
      ...(card.interaction !== undefined && { interaction: card.interaction }),
    });
  }

  if (chapter.activity) {
    cards.push({ kind: "activity", interaction: chapter.activity });
  }

  for (const interaction of chapter.quiz ?? []) {
    cards.push({ kind: "quiz", interaction });
  }

  if (chapter.verse) {
    cards.push({
      kind: "verse",
      text: chapter.verse.text,
      reference: chapter.verse.reference,
      translation: chapter.verse.translation,
      ...(chapter.verse.attribution !== undefined && {
        attribution: chapter.verse.attribution,
      }),
      ...(chapter.verse.picture !== undefined && {
        picture: chapter.verse.picture,
      }),
    });

    if (chapter.verse.practice) {
      cards.push({ kind: "practice", interaction: chapter.verse.practice });
    }
  }

  cards.push({
    kind: "celebration",
    message: chapter.celebration.message,
    ...(chapter.celebration.picture !== undefined && {
      picture: chapter.celebration.picture,
    }),
  });

  return cards;
}
