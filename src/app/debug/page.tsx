import { getChapters, type Card } from "@/content";

/**
 * Milestone 2 scaffold.
 *
 * Shows what every chapter file becomes once it is validated and flattened.
 * This exists to make the pipeline visible while there is nothing to play yet,
 * and it is not part of the product a child sees.
 */

function summarise(card: Card): string {
  switch (card.kind) {
    case "cover":
      return card.picture;
    case "story":
      return card.text ?? `(wordless) ${card.picture}`;
    case "activity":
    case "quiz":
    case "practice":
      return `${card.interaction.type} — ${card.interaction.prompt ?? "no prompt"}`;
    case "verse":
      return `${card.text} (${card.reference})`;
    case "celebration":
      return card.message;
  }
}

export default function DebugPage() {
  const chapters = getChapters();

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl">Content</h1>
      <p className="mt-3 text-lg text-ink-soft">
        {chapters.length} chapter{chapters.length === 1 ? "" : "s"} found in
        content/
      </p>

      {chapters.map((chapter) => (
        <section key={chapter.slug} className="mt-10">
          <h2 className="text-2xl">{chapter.title}</h2>
          <p className="mt-1 text-base text-ink-soft">
            {chapter.reference} · {chapter.cards.length} cards ·{" "}
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
