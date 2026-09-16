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
  | { type: "reveal"; prompt?: string; items: PlayItem[] }
  | { type: "pouring"; prompt: string; then: string; during?: string }
  | { type: "find-the-coin"; prompt: string; rounds?: 1 | 2 }
  /**
   * The one answered with a keyboard. `answer` is the reference as the
   * curriculum wrote it — the display form as well as the thing compared —
   * and the comparison that forgives case, spacing and punctuation lives in
   * `interactions/reference/match.ts`.
   */
  | {
      type: "write-reference";
      prompt: string;
      answer: string;
      hint: string;
      shape?: string;
    }
  /** Chapter 4: choose who leads, and the people walk. */
  | {
      type: "journey";
      prompt: string;
      hint: string;
      choices: { label: string; art?: Art; correct?: true }[];
      then: string;
    }
  /** Chapter 4: morning bread, then evening meat. */
  | {
      type: "provision";
      phases: {
        time: "morning" | "evening";
        falls: "manna" | "quail";
        prompt: string;
        hint: string;
        options: { label: string; correct?: true }[];
        then: string;
      }[];
      closing: string;
    }
  /**
   * Chapter 4: the curriculum's right/wrong statements, asked as questions.
   * `source` stays in the content and is deliberately not carried here — it
   * is the book's wording for whoever edits the chapter, and a child is
   * shown the question, not the sentence it was made from.
   */
  | {
      type: "true-or-not";
      prompt?: string;
      statements: { ask: string; answer: boolean; because: string }[];
    };

export type Card =
  | { kind: "cover"; art: Art }
  | {
      kind: "story";
      art: Art;
      text?: string;
      alt?: string;
      interaction?: PlayInteraction;
      /** The story waits on this page until the interaction is finished. */
      gate?: boolean;
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
  /**
   * The drill that follows a verse, and the verse it is drilling.
   *
   * It carries the words and the reference because the screen that runs it
   * has to show both once a child finishes — and a reference typed into a
   * component is a reference that will one day disagree with the chapter it
   * belongs to. Same source, read twice.
   */
  | {
      kind: "practice";
      /**
       * The steps, in order. Usually one; Young Adult rebuilds the verse and
       * then writes the reference, which is two. See `practice` in the schema.
       */
      interactions: PlayInteraction[];
      text: string;
      reference: string;
    }
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
  | { kind: "decision"; statement: string; because?: string }
  | { kind: "song"; title?: string; lines: string[] }
  | { kind: "prayer"; text: string }
  | { kind: "celebration"; message: string };

/**
 * Every line of a prompt a child actually reads, whatever shape it is in.
 *
 * Most interactions have one `prompt` and callers used to reach for it
 * directly. `provision` broke that: it has no single question, because it is
 * two halves of a day with a question in each, and a top-level prompt would
 * have been a field invented to keep a `.prompt` working. `true-or-not` is
 * the mirror image — its prompt is optional and its real asking is one line
 * per statement.
 *
 * So the question "what does this interaction say to a child?" is answered
 * here, once, and the copy checks and the debug listing both ask it rather
 * than each knowing the shape of every interaction.
 */
export function promptsOf(interaction: PlayInteraction): string[] {
  switch (interaction.type) {
    case "provision":
      return interaction.phases.map((phase) => phase.prompt);
    case "true-or-not":
      return [
        ...(interaction.prompt ? [interaction.prompt] : []),
        ...interaction.statements.map((statement) => statement.ask),
      ];
    case "reveal":
      return interaction.prompt ? [interaction.prompt] : [];
    default:
      return [interaction.prompt];
  }
}

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

/**
 * Authored shape to played shape.
 *
 * Exported so that content produced outside a chapter file — the Memory Verse
 * agent's drafts, previewed in `/debug` before anyone approves them — can be
 * rendered through exactly the same conversion the real chapters go through.
 * A preview that built its own runtime objects would be a preview of something
 * other than what ships.
 */
export function toInteraction(
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

    case "write-reference":
      return {
        type: "write-reference",
        prompt: interaction.prompt,
        answer: interaction.answer,
        hint: interaction.hint,
        ...(interaction.shape !== undefined && { shape: interaction.shape }),
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

    // A scene, not a question: it carries its words and builds the rest.
    case "pouring":
      return {
        type: "pouring",
        prompt: interaction.prompt,
        then: interaction.then,
        ...(interaction.during !== undefined && { during: interaction.during }),
      };

    case "find-the-coin":
      return {
        type: "find-the-coin",
        prompt: interaction.prompt,
        ...(interaction.rounds !== undefined && { rounds: interaction.rounds }),
      };

    case "journey":
      return {
        type: "journey",
        prompt: interaction.prompt,
        hint: interaction.hint,
        then: interaction.then,
        choices: interaction.choices.map((choice) => ({
          label: choice.label,
          ...(choice.picture !== undefined && {
            art: toArt(choice.picture, resolve),
          }),
          ...(choice.correct !== undefined && { correct: choice.correct }),
        })),
      };

    case "provision":
      return {
        type: "provision",
        closing: interaction.closing,
        phases: interaction.phases.map((phase) => ({
          time: phase.time,
          falls: phase.falls,
          prompt: phase.prompt,
          hint: phase.hint,
          then: phase.then,
          options: phase.options.map((option) => ({
            label: option.label,
            ...(option.correct !== undefined && { correct: option.correct }),
          })),
        })),
      };

    case "true-or-not":
      return {
        type: "true-or-not",
        ...(interaction.prompt !== undefined && { prompt: interaction.prompt }),
        // `source` is dropped on purpose — see the type above.
        statements: interaction.statements.map((statement) => ({
          ask: statement.ask,
          answer: statement.answer,
          because: statement.because,
        })),
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
      ...(card.gate === true && { gate: true }),
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
        interactions: chapter.verse.practice.map((i) => toInteraction(i, resolve)),
        text: chapter.verse.text,
        reference: chapter.verse.reference,
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

  /*
    The lesson's own ending, before the app's. Decision, then song, then
    prayer — the order the curriculum uses, and not one this file is free to
    rearrange: a child says what they have decided, sings about it, and then
    prays. Celebration still comes last, because that one is Halo's.
  */
  if (chapter.decision) {
    cards.push({
      kind: "decision",
      statement: chapter.decision.statement,
      ...(chapter.decision.because !== undefined && {
        because: chapter.decision.because,
      }),
    });
  }

  if (chapter.song) {
    cards.push({
      kind: "song",
      ...(chapter.song.title !== undefined && { title: chapter.song.title }),
      lines: chapter.song.lines,
    });
  }

  if (chapter.prayer) {
    cards.push({ kind: "prayer", text: chapter.prayer.text });
  }

  cards.push({ kind: "celebration", message: chapter.celebration.message });

  return cards;
}
