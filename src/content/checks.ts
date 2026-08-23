import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { Card } from "./cards";
import type { LoadedChapter } from "./load";
import type { Interaction, Item } from "./schema";

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

const PICTURE_EXTENSIONS = ["avif", "webp", "png", "jpg", "svg"];

const LIMITS = {
  storyWords: 15,
  storySentences: 2,
  sentenceWords: 10,
  promptWords: 10,
  labelWords: 5,
  celebrationWords: 15,
};

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const sentences = (text: string) =>
  text.split(/[.!?]+/).filter((part) => part.trim().length > 0).length;

function itemsOf(interaction: Interaction): Item[] {
  switch (interaction.type) {
    case "multiple-choice":
      return interaction.options;
    case "sequence":
    case "reveal":
      return interaction.items;
    case "match":
      return interaction.pairs.flatMap((pair) => [pair.from, pair.to]);
    case "arrange-words":
      return [];
  }
}

function picturesOf(card: Card): string[] {
  const fromInteraction = (interaction: Interaction) => [
    ...("picture" in interaction && interaction.picture
      ? [interaction.picture]
      : []),
    ...itemsOf(interaction)
      .map((item) => item.picture)
      .filter((name) => name !== undefined),
  ];

  switch (card.kind) {
    case "cover":
      return [card.picture];
    case "story":
      return [
        card.picture,
        ...(card.interaction ? fromInteraction(card.interaction) : []),
      ];
    case "activity":
    case "quiz":
    case "practice":
      return fromInteraction(card.interaction);
    case "verse":
    case "celebration":
      return card.picture ? [card.picture] : [];
  }
}

function pictureExists(slug: string, name: string): boolean {
  return PICTURE_EXTENSIONS.some((extension) =>
    existsSync(join(process.cwd(), "public", "art", slug, `${name}.${extension}`)),
  );
}

function drawnPictures(slug: string): string[] {
  const dir = join(process.cwd(), "public", "art", slug);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((file) => PICTURE_EXTENSIONS.some((ext) => file.endsWith(`.${ext}`)))
    .map((file) => file.slice(0, file.lastIndexOf(".")));
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

    const interaction =
      "interaction" in card ? card.interaction : undefined;

    if (interaction) {
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

  const referenced = new Set(chapter.cards.flatMap(picturesOf));

  // Reported as one line rather than one per picture. A chapter written before
  // it is drawn is missing everything, and twenty identical warnings bury the
  // one thing you actually need to read.
  const missing = [...referenced].filter(
    (name) => !pictureExists(chapter.slug, name),
  );

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

  for (const card of chapter.cards) {
    if (card.kind === "verse" && card.translation === "PLACEHOLDER") {
      advisories.push({
        level,
        where: chapter.file,
        message: "the memory verse still has a placeholder translation",
      });
    }
  }

  for (const { where, message } of copyAdvisories(chapter.cards)) {
    advisories.push({ level, where: `${chapter.file} → ${where}`, message });
  }

  return advisories;
}
