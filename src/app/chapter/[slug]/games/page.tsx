import Link from "next/link";
import { notFound } from "next/navigation";

import NotReadyYet from "@/components/chapter/NotReadyYet";
import SectionScreen from "@/components/chapter/SectionScreen";
import { gamesOf, getChapters } from "@/content";
import { canPlay } from "@/interactions/registry";

/**
 * A chapter's games, as a shelf.
 *
 * A chapter used to have one, so this screen used to *be* that one game.
 * With three, the choosing becomes part of the experience and needs its own
 * room — a child arriving at "Games" should see what is on offer and pick,
 * not be dropped into whichever one happened to be written first.
 *
 * One game may be marked as the one the chapter leads with, and it is drawn
 * larger wherever it sits in the list. That is the chapter saying "start
 * here" rather than the app ranking anything: there is no difficulty, no
 * order to work through, and nothing is locked behind anything else. A child
 * may play the last one first and has lost nothing.
 *
 * The objective is on the card, quietly and in the grown-up's register. It
 * is here because it is the one thing a teacher needs in order to know what
 * a game is for, and it is small and grey because it is not addressed to the
 * child. This is not a curriculum dashboard and must not become one.
 */

export function generateStaticParams() {
  return getChapters()
    .filter((chapter) => gamesOf(chapter).length > 0)
    .map(({ slug }) => ({ slug }));
}

export default async function ChapterGamesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getChapters().find((c) => c.slug === slug);

  if (!chapter) notFound();

  const games = gamesOf(chapter).filter((game) =>
    game.interactions.every(canPlay),
  );

  return (
    <SectionScreen
      title="Games"
      chapterTitle={chapter.title}
      hubHref={`/chapter/${slug}`}
    >
      {games.length === 0 ? (
        <NotReadyYet what="These games" />
      ) : (
        <ul className="flex w-full flex-col gap-4">
          {games.map((game) => (
            <li key={game.id}>
              <Link
                href={`/chapter/${slug}/games/${game.id}`}
                className={`surface flex flex-col ${
                  game.featured ? "gap-2 px-6 py-7" : "gap-1 px-5 py-5"
                }`}
              >
                <span
                  className={
                    game.featured
                      ? "text-2xl leading-snug"
                      : "text-xl leading-snug"
                  }
                >
                  {game.title}
                </span>
                <span className="text-sm text-ink-soft">{game.objective}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionScreen>
  );
}
