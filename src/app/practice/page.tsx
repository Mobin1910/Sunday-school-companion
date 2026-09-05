import Link from "next/link";

import GlobalScreen from "@/components/nav/GlobalScreen";
import { activityOf, getChapters } from "@/content";

/**
 * Practice, across every chapter.
 *
 * Deliberately not an arcade. There are no levels, no "Game 1 / Game 2", no
 * locks and no scores — each entry is named after the story it belongs to,
 * because that is what a child is actually returning to.
 *
 * A chapter appears here when it has an activity written. Whether that
 * activity can be played yet is the chapter's own practice screen to say;
 * this only offers the door.
 */
export default function PracticePage() {
  const chapters = getChapters().filter(
    (chapter) => activityOf(chapter) !== undefined,
  );

  return (
    <GlobalScreen active="practice">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <header>
          <h1 className="text-3xl">Practice</h1>
          <p className="mt-2 text-lg text-ink-soft text-balance">
            Things to do with the stories you know.
          </p>
        </header>

        {chapters.length === 0 ? (
          <p className="text-lg text-ink-soft text-balance">
            Nothing to practise yet. It arrives with the stories.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {chapters.map((chapter) => (
              <li key={chapter.slug}>
                <Link
                  href={`/chapter/${chapter.slug}/practice`}
                  className="flex min-h-16 items-center rounded-card bg-ground-raised px-5 py-4 text-xl"
                >
                  {chapter.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlobalScreen>
  );
}
