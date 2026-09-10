import Link from "next/link";
import { notFound } from "next/navigation";

import Picture from "@/components/Picture";
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
 * The objective is not on the card. It is written in the grown-up's register
 * — the one thing a teacher needs in order to know what a game is for — and
 * printing it under every title turned a shelf a child chooses from into a
 * table of contents. It stays in the content, and it is what a screen reader
 * announces, so nothing is lost except two lines of grey text a six-year-old
 * was never going to read. This is not a curriculum dashboard.
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
        /*
          A shelf of pictures with names on them, rather than a column of
          paragraphs.

          It was a title and its objective on a plain card, which is two
          blocks of text on a dark screen and reads as a table of contents —
          and a six-year-old choosing what to play is not reading a table of
          contents. The picture is what they choose from, so the picture is
          the card: the game's own artwork fills it, the ground rises across
          the lower half so the name is legible on any illustration, and the
          name sits on top of it.

          The objective goes. It is written in the grown-up's register and
          was never addressed to the child — see the note in the schema — so
          on the child's screen it was doing nothing but taking the room a
          picture wanted. It stays in the content, where a teacher reads it.
        */
        <ul className="flex w-full flex-col gap-4">
          {games.map((game) => (
            <li key={game.id}>
              <Link
                href={`/chapter/${slug}/games/${game.id}`}
                aria-label={`${game.title}. ${game.objective}`}
                className={`surface relative flex items-end overflow-hidden ${
                  game.featured ? "min-h-44" : "min-h-32"
                }`}
              >
                {game.art ? (
                  <Picture
                    art={game.art}
                    className="game-art absolute inset-0 size-full object-cover"
                  />
                ) : null}

                {/* Only where there is a picture to be legible against. */}
                {game.art ? (
                  <div className="game-scrim absolute inset-0" aria-hidden />
                ) : null}

                <span
                  className={`relative px-5 pb-4 leading-snug text-balance ${
                    game.featured ? "text-2xl" : "text-xl"
                  }`}
                >
                  {game.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionScreen>
  );
}
