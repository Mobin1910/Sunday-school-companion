/**
 * How a lesson ends: a decision, a song, and a prayer.
 *
 * The three quietest pages in a chapter, and they share this file because
 * they share a job — none of them asks the child for anything. After twelve
 * panels and a search, the last thing the chapter should do is stop asking.
 *
 * So there is no interaction here, no button, no check. A child reads them,
 * or says them, or sings them with whoever is beside them, and turns the
 * page. The most a page does is name what it is.
 */

/**
 * "I belong to God."
 *
 * The child's own words, and the only page in the product written in first
 * person. It is set as a statement rather than a question with a yes: an
 * affirmation a child can read and mean is not improved by making them tap
 * to confirm it, and a tap would turn the point of the chapter into one more
 * thing that can be got wrong.
 */
export function DecisionCard({
  statement,
  because,
}: {
  statement: string;
  because?: string;
}) {
  return (
    <div className="breathe flex max-w-sm flex-col items-center gap-5 px-6 text-center">
      <p className="text-sm tracking-[0.18em] text-ink-soft uppercase">
        My decision
      </p>
      <p className="text-[clamp(1.75rem,7vw,2.5rem)] leading-tight text-balance text-joy">
        {statement}
      </p>
      {because ? (
        <p className="text-lg leading-relaxed text-balance text-ink-soft">
          {because}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The song, exactly as the curriculum prints it.
 *
 * Lines are laid out one per row and never justified or run together: these
 * are sung, and the line breaks are where a breath goes. Nothing here is
 * translated — a child who does not read Malayalam is not the audience for
 * this page on their own, and the page is honest about being something to do
 * with a grown-up rather than something to decode.
 */
export function SongCard({ title, lines }: { title?: string; lines: string[] }) {
  return (
    <div className="breathe flex max-w-sm flex-col items-center gap-5 px-6 text-center">
      <p className="text-sm tracking-[0.18em] text-ink-soft uppercase">
        {title ?? "Learn to sing"}
      </p>
      <p className="flex flex-col gap-2 text-[clamp(1.25rem,5vw,1.6rem)] leading-relaxed text-balance">
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </p>
    </div>
  );
}

/**
 * The prayer the chapter closes with, word for word.
 *
 * Not paraphrased and not shortened, because a prayer a teacher reads aloud
 * from a book should be the one the child hears from the screen.
 */
export function PrayerCard({ text }: { text: string }) {
  return (
    <div className="breathe flex max-w-sm flex-col items-center gap-5 px-6 text-center">
      <p className="text-sm tracking-[0.18em] text-ink-soft uppercase">
        Let us pray
      </p>
      <p className="text-[clamp(1.25rem,5vw,1.6rem)] leading-relaxed text-balance">
        {text}
      </p>
    </div>
  );
}
