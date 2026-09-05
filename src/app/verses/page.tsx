import Link from "next/link";

import GlobalScreen from "@/components/nav/GlobalScreen";
import { getChapters, verseOf } from "@/content";

/**
 * The verses.
 *
 * Eventually this is the child's own collection — the verses they have met,
 * gathering up as they read. That needs the progress work in Milestone 9, so
 * today it shows every verse there is, which is honest and useful rather
 * than a locked cabinet with nothing in it.
 *
 * Nothing here is marked learned or unlearned. A verse a child half-knows is
 * not a failed verse, and this screen will never be the place that says so.
 */
export default function VersesPage() {
  const verses = getChapters().flatMap((chapter) => {
    const verse = verseOf(chapter);
    return verse ? [{ chapter, verse }] : [];
  });

  return (
    <GlobalScreen active="verses">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <header>
          <h1 className="text-3xl">Verses</h1>
          <p className="mt-2 text-lg text-ink-soft text-balance">
            Words worth keeping.
          </p>
        </header>

        {verses.length === 0 ? (
          <p className="text-lg text-ink-soft text-balance">
            Verses appear here as the stories arrive.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {verses.map(({ chapter, verse }) => (
              <li key={chapter.slug}>
                <Link
                  href={`/chapter/${chapter.slug}/verse`}
                  className="flex flex-col gap-3 rounded-card bg-ground-raised px-5 py-5"
                >
                  <p className="text-2xl leading-relaxed text-balance">
                    {verse.text}
                  </p>
                  <p className="text-base text-ink-soft">
                    {verse.reference} · {chapter.title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlobalScreen>
  );
}
