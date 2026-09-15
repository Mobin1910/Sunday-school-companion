import { chapterKey, everyChapter, type Card } from "@/content";

import DebugClass from "./DebugClass";

/**
 * Milestone 2 scaffold.
 *
 * Shows what every chapter file becomes once it is validated and flattened.
 * This exists to make the pipeline visible while there is nothing to play yet,
 * and it is not part of the product a child sees.
 *
 * Every class at once, which is the one place in the app that is true. A
 * child's screens are scoped to their class; this is the pipeline's view, and
 * its whole job is to show what is there — so a chapter is named by both
 * halves of its identity, `beginner/wedding-at-cana`, never by its slug.
 */

function summarise(card: Card): string {
  switch (card.kind) {
    case "cover":
      return card.art.name;
    case "story":
      return card.text ?? `(wordless) ${card.art.name}`;
    case "game":
      return card.interactions
        .map((i) => `${i.type} — ${i.prompt ?? "no prompt"}`)
        .join(" · ");
    case "quiz":
      return `${card.interaction.type} — ${card.interaction.prompt ?? "no prompt"}`;
    case "practice":
      return card.interactions
        .map((i) => `${i.type} — ${i.prompt ?? "no prompt"}`)
        .join(" · ");
    case "verse":
      return `${card.text} (${card.reference})`;
    case "video":
      return `${card.title} — youtube:${card.youtubeId}`;
    case "decision":
      return `“${card.statement}”`;
    case "song":
      return card.lines.join(" / ");
    case "prayer":
      return card.text;
    case "celebration":
      return card.message;
  }
}

export default function DebugPage() {
  const chapters = everyChapter();

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl">Content</h1>
      <p className="mt-3 text-lg text-ink-soft">
        {chapters.length} chapter{chapters.length === 1 ? "" : "s"} found in
        content/
      </p>

      <DebugClass />

      {chapters.map((chapter) => (
        <section
          key={chapterKey(chapter.classId, chapter.slug)}
          className="mt-10"
        >
          <h2 className="text-2xl">{chapter.title}</h2>
          <p className="mt-1 text-base text-ink-soft">
            {chapterKey(chapter.classId, chapter.slug)} · {chapter.reference} ·{" "}
            {chapter.cards.length} cards ·{" "}
            {chapter.shipping ? "ships" : "draft"}
          </p>

          <ol className="mt-4 border-t border-edge">
            {chapter.cards.map((card, index) => (
              <li
                key={index}
                className="flex gap-3 border-b border-edge py-3 text-base"
              >
                <span className="w-6 shrink-0 text-ink-soft tabular-nums">
                  {index + 1}
                </span>
                <span className="w-24 shrink-0 text-ink-soft">{card.kind}</span>
                <span className="min-w-0 flex-1">{summarise(card)}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
