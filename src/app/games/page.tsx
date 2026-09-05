import Link from "next/link";

import GlobalScreen from "@/components/nav/GlobalScreen";
import { activityOf, getChapters } from "@/content";

/**
 * Games, across every chapter.
 *
 * Named for what a child would call it. It is still not an arcade: no
 * levels, no locks, no scores, no "Game 1 / Game 2", and every entry is
 * named after the story it belongs to, because that is what a child is
 * actually returning to. Games here are a way of knowing a story better,
 * which is why they live beside the stories rather than in a separate
 * playground.
 *
 * A chapter appears when it has an activity written. Whether that activity
 * can be played yet is the chapter's own screen to say; this only offers
 * the door.
 */
export default function GamesPage() {
  const chapters = getChapters().filter(
    (chapter) => activityOf(chapter) !== undefined,
  );

  return (
    <GlobalScreen active="games">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <header>
          <h1 className="text-3xl">Games</h1>
          <p className="mt-2 text-lg text-ink-soft text-balance">
            Ways to play with the stories you know.
          </p>
        </header>

        {chapters.length === 0 ? (
          <p className="text-lg text-ink-soft text-balance">
            No games yet. They arrive with the stories.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {chapters.map((chapter) => (
              <li key={chapter.slug}>
                <Link
                  href={`/chapter/${chapter.slug}/games`}
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
