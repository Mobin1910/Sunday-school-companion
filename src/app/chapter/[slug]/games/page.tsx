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
 * Two across, and square. A story panel is portrait, so a wide card could
 * only ever show a band across its middle — the one stripe of an
 * illustration with no faces in it. A square keeps two thirds of the panel's
 * height, which is enough to hold whoever is in it, and two squares to a row
 * put every game a chapter has on one screen without a scroll.
 *
 * One game may be marked as the one the chapter leads with. It used to be
 * drawn larger; on a grid of squares it catches more light instead, which is
 * what `surface-lit` already means everywhere else in the product. Either
 * way it is the chapter saying "start here" rather than the app ranking
 * anything: there is no difficulty, no order to work through, and nothing is
 * locked behind anything else. A child may play the last one first and has
 * lost nothing — which is also why the numbers on these cards are only
 * counting, and never a route to walk in order.
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
        <ul className="grid w-full grid-cols-2 gap-3">
          {games.map((game, index) => (
            <li key={game.id}>
              <Link
                href={`/chapter/${slug}/games/${game.id}`}
                aria-label={`Game ${index + 1}. ${game.title}. ${game.objective}`}
                className={`surface relative flex aspect-square items-end overflow-hidden ${
                  game.featured ? "surface-lit" : ""
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

                <span className="relative px-3 pb-3">
                  {/*
                    The number is what a child reads, and the name is for
                    whoever is choosing with them. "Game 2" is a thing you can
                    point at before you can read "What Do You Remember?", and
                    it says the one true thing about a shelf where nothing is
                    locked and nothing is in order: there are three of them.
                  */}
                  <span className="block text-lg leading-tight font-semibold">
                    Game {index + 1}
                  </span>
                  <span className="mt-0.5 block text-sm leading-tight text-balance text-ink-soft">
                    {game.title}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionScreen>
  );
}
