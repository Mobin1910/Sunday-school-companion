import type { Chapter, Interaction, Item } from "./schema";

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
 *
 * These types are written out rather than derived from the content schema.
 * They differ in two ways that matter: pictures are already resolved to files,
 * and author notes are gone. Notes are for whoever edits the chapter and have
 * no business being downloaded by a child.
 */

/** A picture, already resolved to a file, or known to be undrawn. */
export type Art = { name: string; src: string | null };

export type PlayItem = {
  art?: Art;
  label?: string;
  correct?: true;
};

export type PlayInteraction =
  | {
      type: "multiple-choice";
      prompt: string;
      hint: string;
      options: PlayItem[];
      art?: Art;
    }
  | {
      type: "match";
      prompt: string;
      pairs: { from: PlayItem; to: PlayItem }[];
      hint?: string;
    }
  | { type: "sequence"; prompt: string; items: PlayItem[]; hint?: string }
  | { type: "arrange-words"; prompt: string; words: string[]; hint?: string }
  | { type: "reveal"; prompt?: string; items: PlayItem[] };

export type Card =
  | { kind: "cover"; art: Art }
  | {
      kind: "story";
      art: Art;
      text?: string;
      alt?: string;
      interaction?: PlayInteraction;
    }
  | { kind: "activity"; interaction: PlayInteraction }
  | { kind: "quiz"; interaction: PlayInteraction }
  | {
      kind: "verse";
      text: string;
      reference: string;
      translation: string;
      attribution?: string;
    }
  | { kind: "practice"; interaction: PlayInteraction }
  /**
   * The one card that is not offline content. It carries an id, never a
   * player: nothing is embedded until a child asks to watch.
   */
  | {
      kind: "video";
      youtubeId: string;
      title: string;
      description?: string;
      art?: Art;
    }
  | { kind: "celebration"; message: string; art?: Art };

type Resolve = (name: string) => string | null;

const toArt = (name: string, resolve: Resolve): Art => ({
  name,
  src: resolve(name),
});

function toItem(item: Item, resolve: Resolve): PlayItem {
  return {
    ...(item.picture !== undefined && { art: toArt(item.picture, resolve) }),
    ...(item.label !== undefined && { label: item.label }),
    ...(item.correct !== undefined && { correct: item.correct }),
  };
}

function toInteraction(
  interaction: Interaction,
  resolve: Resolve,
): PlayInteraction {
  const item = (i: Item) => toItem(i, resolve);

  switch (interaction.type) {
    case "multiple-choice":
      return {
        type: "multiple-choice",
        prompt: interaction.prompt,
        hint: interaction.hint,
        options: interaction.options.map(item),
        ...(interaction.picture !== undefined && {
          art: toArt(interaction.picture, resolve),
        }),
      };

    case "match":
      return {
        type: "match",
        prompt: interaction.prompt,
        pairs: interaction.pairs.map((p) => ({
          from: item(p.from),
          to: item(p.to),
        })),
        ...(interaction.hint !== undefined && { hint: interaction.hint }),
      };

    case "sequence":
      return {
        type: "sequence",
        prompt: interaction.prompt,
        items: interaction.items.map(item),
        ...(interaction.hint !== undefined && { hint: interaction.hint }),
      };

    case "arrange-words":
      return {
        type: "arrange-words",
        prompt: interaction.prompt,
        words: interaction.words,
        ...(interaction.hint !== undefined && { hint: interaction.hint }),
      };

    case "reveal":
      return {
        type: "reveal",
        ...(interaction.prompt !== undefined && { prompt: interaction.prompt }),
        items: interaction.items.map(item),
      };
  }
}

/**
 * The journey order is fixed by the constitution, so it is expressed once,
 * here, and never re-declared in a chapter file.
 */
export function toCards(chapter: Chapter, resolve: Resolve): Card[] {
  const cards: Card[] = [
    { kind: "cover", art: toArt(chapter.cover.picture, resolve) },
  ];

  for (const card of chapter.story) {
    cards.push({
      kind: "story",
      art: toArt(card.picture, resolve),
      ...(card.text !== undefined && { text: card.text }),
      ...(card.alt !== undefined && { alt: card.alt }),
      ...(card.interaction !== undefined && {
        interaction: toInteraction(card.interaction, resolve),
      }),
    });
  }

  if (chapter.activity) {
    cards.push({
      kind: "activity",
      interaction: toInteraction(chapter.activity, resolve),
    });
  }

  for (const interaction of chapter.quiz ?? []) {
    cards.push({ kind: "quiz", interaction: toInteraction(interaction, resolve) });
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
    });

    if (chapter.verse.practice) {
      cards.push({
        kind: "practice",
        interaction: toInteraction(chapter.verse.practice, resolve),
      });
    }
  }

  /*
    A video held back by `enabled: false` produces no card at all, so every
    screen downstream asks one question — is there a video card? — rather
    than each remembering to check a flag.
  */
  if (chapter.video && chapter.video.enabled !== false) {
    cards.push({
      kind: "video",
      youtubeId: chapter.video.youtubeId,
      title: chapter.video.title,
      ...(chapter.video.description !== undefined && {
        description: chapter.video.description,
      }),
      ...(chapter.video.picture !== undefined && {
        art: toArt(chapter.video.picture, resolve),
      }),
    });
  }

  cards.push({
    kind: "celebration",
    message: chapter.celebration.message,
    ...(chapter.celebration.picture !== undefined && {
      art: toArt(chapter.celebration.picture, resolve),
    }),
  });

  return cards;
}
