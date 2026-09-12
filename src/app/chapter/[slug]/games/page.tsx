import { notFound } from "next/navigation";

import GamesMenu from "@/components/chapter/GamesMenu";
import NotReadyYet from "@/components/chapter/NotReadyYet";
import SectionScreen from "@/components/chapter/SectionScreen";
import { gamesOf, getChapters, verseOf } from "@/content";
import { canPlay } from "@/interactions/registry";

/**
 * A chapter's games, as a shelf.
 *
 * A chapter used to have one, so this screen used to *be* that one game.
 * With three, the choosing becomes part of the experience and needs its own
 * room — a child arriving at "Games" should see what is on offer and pick,
 * not be dropped into whichever one happened to be written first.
 *
 * It is also where the chapter journey turns. The story ends by offering
 * this; every game ends by coming back to it; and when there is nothing left
 * on the shelf it is this screen that offers the memory verse. That is why
 * it is the one screen in a chapter that knows what has been played — the
 * shelf itself is the progress, so nothing else has to keep a tally.
 *
 * The shelf is a client component because what it knows lives in the
 * browser. Everything about the chapter is still resolved here, on the
 * server, and only the handful of fields a card actually draws is sent — so
 * the content layer stays out of the bundle exactly as it does everywhere
 * else.
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

  /*
    Only the games a child can actually open. A game written but not yet
    playable is not a game as far as this shelf is concerned — and, more to
    the point, it must not be counted towards "all games complete", because
    a chapter could then never finish.
  */
  const games = gamesOf(chapter).filter((game) =>
    game.interactions.every(canPlay),
  );

  const verse = verseOf(chapter);

  return (
    <SectionScreen
      title="Let's Play!"
      chapterTitle={chapter.title}
      hubHref={`/chapter/${slug}`}
      /*
        The shelf offers its own way onward once it is empty, so the link at
        the bottom stops competing with it and says what it is: the way back
        up. See `quietOnward`.
      */
      quietOnward
    >
      {games.length === 0 ? (
        <NotReadyYet what="These games" />
      ) : (
        <GamesMenu
          slug={slug}
          games={games.map((game) => ({
            id: game.id,
            title: game.title,
            objective: game.objective,
            ...(game.featured !== undefined && { featured: game.featured }),
            ...(game.art !== undefined && { art: game.art }),
          }))}
          {...(verse ? { verseHref: `/chapter/${slug}/verse` } : {})}
        />
      )}
    </SectionScreen>
  );
}
