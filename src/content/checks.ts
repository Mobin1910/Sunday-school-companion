import { drawnPictures } from "./art";
import type { Art, Card, PlayInteraction, PlayItem } from "./cards";
import type { LoadedChapter } from "./load";

/**
 * Checks that depend on how finished a chapter is.
 *
 * Structure is absolute and lives in schema.ts. These are different: a chapter
 * being written has pictures that do not exist yet and a placeholder
 * translation, and neither should stop you working. The same problems in a
 * chapter that ships are real.
 *
 * So: a chapter listed in library.json is held to these as errors. A draft
 * gets warnings.
 */

export type Advisory = {
  level: "error" | "warning";
  where: string;
  message: string;
};

const LIMITS = {
  storyWords: 15,
  storySentences: 2,
  sentenceWords: 10,
  promptWords: 10,
  labelWords: 5,
  celebrationWords: 15,
};

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** One shape for comparing two spellings of the same sentence. */
const tidy = (text: string) => text.replace(/\s+/g, " ").trim();

const sentences = (text: string) =>
  text.split(/[.!?]+/).filter((part) => part.trim().length > 0).length;

function itemsOf(interaction: PlayInteraction): PlayItem[] {
  switch (interaction.type) {
    case "multiple-choice":
      return interaction.options;
    case "sequence":
    case "reveal":
      return interaction.items;
    case "match":
      return interaction.pairs.flatMap((pair) => [pair.from, pair.to]);
    case "arrange-words":
    case "pouring":
      return [];
  }
}

/** Every interaction a card carries, however many that is. */
function interactionsOf(card: Card): PlayInteraction[] {
  switch (card.kind) {
    case "story":
      return card.interaction ? [card.interaction] : [];
    case "game":
      return card.interactions;
    case "quiz":
    case "practice":
      return [card.interaction];
    default:
      return [];
  }
}

function artOf(card: Card): Art[] {
  const fromInteraction = (interaction: PlayInteraction): Art[] => [
    ...("art" in interaction && interaction.art ? [interaction.art] : []),
    ...itemsOf(interaction)
      .map((item) => item.art)
      .filter((art) => art !== undefined),
  ];

  switch (card.kind) {
    case "cover":
      return [card.art];
    case "story":
      return [
        card.art,
        ...(card.interaction ? fromInteraction(card.interaction) : []),
      ];
    case "game":
    case "quiz":
    case "practice":
      return interactionsOf(card).flatMap(fromInteraction);
    // The ending draws no picture: it is Halo celebrating with the child.
    case "verse":
    case "celebration":
      return [];
    case "video":
      return card.art ? [card.art] : [];
  }
}

function copyAdvisories(cards: Card[]): { where: string; message: string }[] {
  const found: { where: string; message: string }[] = [];

  const tooLong = (where: string, text: string, limit: number, unit: string) => {
    const count = words(text);
    if (count > limit) {
      found.push({
        where,
        message: `${count} words, limit is ${limit} — ${unit}: "${text}"`,
      });
    }
  };

  cards.forEach((card, index) => {
    const at = `card ${index} (${card.kind})`;

    if (card.kind === "story" && card.text) {
      tooLong(at, card.text, LIMITS.storyWords, "story text");

      if (sentences(card.text) > LIMITS.storySentences) {
        found.push({
          where: at,
          message: `${sentences(card.text)} sentences, limit is ${LIMITS.storySentences}`,
        });
      }

      for (const sentence of card.text.split(/(?<=[.!?])\s+/)) {
        if (words(sentence) > LIMITS.sentenceWords) {
          found.push({
            where: at,
            message: `a sentence runs to ${words(sentence)} words, limit is ${LIMITS.sentenceWords}`,
          });
        }
      }
    }

    if (card.kind === "celebration") {
      tooLong(at, card.message, LIMITS.celebrationWords, "celebration");
    }

    for (const interaction of interactionsOf(card)) {
      if (interaction.prompt) {
        tooLong(at, interaction.prompt, LIMITS.promptWords, "prompt");
      }
      for (const item of itemsOf(interaction)) {
        if (item.label) {
          tooLong(at, item.label, LIMITS.labelWords, "label");
        }
      }
    }
  });

  return found;
}

export function checkChapter(chapter: LoadedChapter): Advisory[] {
  const level = chapter.shipping ? "error" : "warning";
  const advisories: Advisory[] = [];

  const referenced = new Map(
    chapter.cards.flatMap(artOf).map((art) => [art.name, art]),
  );

  // Reported as one line rather than one per picture. A chapter written before
  // it is drawn is missing everything, and twenty identical warnings bury the
  // one thing you actually need to read.
  const missing = [...referenced.values()]
    .filter((art) => art.src === null)
    .map((art) => art.name);

  if (missing.length > 0) {
    advisories.push({
      level,
      where: chapter.file,
      message: `${missing.length} of ${referenced.size} pictures not drawn yet: ${missing.join(", ")}`,
    });
  }

  for (const name of drawnPictures(chapter.slug)) {
    if (!referenced.has(name)) {
      advisories.push({
        level,
        where: `public/art/${chapter.slug}`,
        message: `${name} is drawn but no card uses it`,
      });
    }
  }

  /*
    The pieces of a verse drill have to add back up to the verse.

    Arrange-words is the one interaction whose answer is the order its pieces
    are written in, so a piece edited on its own — a word fixed, a comma
    moved, a chunk split — quietly teaches a child a verse the chapter does
    not contain. Nothing else would catch it: every piece is still a valid
    string and the drill still plays perfectly. Reading them back against the
    verse text is the only check there is, and it costs one join.

    Whitespace is normalised on both sides, because how the chunks are broken
    up is a decision about breathing and must stay free.
  */
  const verse = chapter.cards.find((card) => card.kind === "verse");
  const practice = chapter.cards.find((card) => card.kind === "practice");

  if (
    verse?.kind === "verse" &&
    practice?.kind === "practice" &&
    practice.interaction.type === "arrange-words"
  ) {
    const said = practice.interaction.words.join(" ");
    if (tidy(said) !== tidy(verse.text)) {
      advisories.push({
        level,
        where: chapter.file,
        message: `the verse drill does not spell out the verse\n      verse:  "${verse.text}"\n      pieces: "${said}"`,
      });
    }
  }

  /*
    A verse has to be a verse, and it has to say where it comes from.

    The schema asks for strings and an empty string is a string, so a verse
    could ship with no words in it or — the one that actually happened — with
    the reference left off. A child who assembles a memory verse and is never
    told where in the Bible it lives has learned a sentence, which is most of
    the way to the point and not the point. Both are checked here rather than
    in the schema because a chapter being written is allowed to have neither
    yet; a chapter that ships is not.
  */
  if (verse?.kind === "verse") {
    if (tidy(verse.text) === "") {
      advisories.push({
        level,
        where: chapter.file,
        message: "the memory verse has no words",
      });
    }

    if (tidy(verse.reference) === "") {
      advisories.push({
        level,
        where: chapter.file,
        message:
          "the memory verse has no reference — a verse a child cannot look up",
      });
    }

    if (verse.translation === "PLACEHOLDER") {
      advisories.push({
        level,
        where: chapter.file,
        message: "the memory verse still has a placeholder translation",
      });
    }
  }

  /*
    And a verse worth learning is worth practising. Not an error anywhere:
    plenty of verses are simply read, and a chapter is not broken for
    offering one. It is said once so that a drill left off by accident is
    visible rather than silent.
  */
  if (verse?.kind === "verse" && practice === undefined) {
    advisories.push({
      level: "warning",
      where: chapter.file,
      message: "the memory verse has no practice written for it",
    });
  }

  for (const { where, message } of copyAdvisories(chapter.cards)) {
    advisories.push({ level, where: `${chapter.file} → ${where}`, message });
  }

  return advisories;
}
