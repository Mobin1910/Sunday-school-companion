import { assetName } from "./art";
import type {
  AssetReference,
  Chapter,
  Game,
  Interaction,
  Item,
} from "./schema";

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
  /**
   * Ordering. Each step carries where it goes, so the array this arrives in
   * is only a list — never the answer. See `sequence` in the schema.
   */
  | {
      type: "sequence";
      prompt: string;
      items: (PlayItem & { position: number })[];
      hint?: string;
    }
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
  /**
   * A game: an interaction a child chose to play, rather than one the story
   * put in front of them. It carries its own name and its own point — see
   * `game` in the schema for why the objective is not optional.
   */
  | {
      kind: "game";
      id: string;
      title: string;
      objective: string;
      interactions: PlayInteraction[];
      featured?: true;
      /** What the shelf shows. See `art` below for where it comes from. */
      art?: Art;
    }
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
  /**
   * The ending. No picture: the companion is what a child sees here, and a
   * chapter that ends on artwork ends by pointing back at the story rather
   * than at the person who just read it.
   */
  | { kind: "celebration"; message: string };

type Resolve = (ref: AssetReference) => string | null;

const toArt = (ref: AssetReference, resolve: Resolve): Art => ({
  name: assetName(ref),
  src: resolve(ref),
});

/** Cover and story pictures are story panels, always. */
const panel = (name: string): AssetReference => ({
  source: "story",
  panelId: name,
});

/** The first picture a game already uses, wherever it sits inside it. */
function firstPicture(game: Game): AssetReference | undefined {
  for (const interaction of game.interactions) {
    if ("picture" in interaction && interaction.picture) return interaction.picture;

    const items =
      interaction.type === "multiple-choice"
        ? interaction.options
        : interaction.type === "sequence" || interaction.type === "reveal"
          ? interaction.items
          : interaction.type === "match"
            ? interaction.pairs.flatMap((pair): Item[] => [pair.from, pair.to])
            : [];

    for (const item of items) if (item.picture) return item.picture;
  }
  return undefined;
}

function shelfArt(game: Game, resolve: Resolve): Art | undefined {
  const ref = game.picture ?? firstPicture(game);
  return ref ? toArt(ref, resolve) : undefined;
}

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
        // The step keeps the position it was written with. Nothing here
        // sorts, and nothing downstream may read the array order as meaning.
        items: interaction.items.map((step) => ({
          ...item(step),
          position: step.position,
        })),
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
    { kind: "cover", art: toArt(panel(chapter.cover.picture), resolve) },
  ];

  for (const card of chapter.story) {
    cards.push({
      kind: "story",
      art: toArt(panel(card.picture), resolve),
      ...(card.text !== undefined && { text: card.text }),
      ...(card.alt !== undefined && { alt: card.alt }),
      ...(card.interaction !== undefined && {
        interaction: toInteraction(card.interaction, resolve),
      }),
    });
  }

  for (const game of chapter.games ?? []) {
    cards.push({
      kind: "game",
      id: game.id,
      title: game.title,
      objective: game.objective,
      interactions: game.interactions.map((i) => toInteraction(i, resolve)),
      ...(game.featured !== undefined && { featured: game.featured }),
      /*
        The picture the game named, or the first one it already uses.

        Resolved here rather than on the shelf so that the shelf receives a
        picture like every other card does, and so a game that is all words
        simply has none — which the shelf can then draw around instead of
        leaving a hole.
      */
      ...(shelfArt(game, resolve) !== undefined && {
        art: shelfArt(game, resolve)!,
      }),
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
        art: toArt(panel(chapter.video.picture), resolve),
      }),
    });
  }

  cards.push({ kind: "celebration", message: chapter.celebration.message });

  return cards;
}
