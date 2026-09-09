import { notFound } from "next/navigation";

import NotReadyYet from "@/components/chapter/NotReadyYet";
import SectionScreen from "@/components/chapter/SectionScreen";
import GamePlayer from "@/components/play/GamePlayer";
import GamesEnd from "@/components/play/GamesEnd";
import { gameOf, gamesOf, getChapters, verseOf } from "@/content";
import { canPlay } from "@/interactions/registry";

/**
 * One game, played.
 *
 * A route per game rather than a switcher inside one screen, so that a child
 * who backs out of a game lands on the shelf they chose it from rather than
 * somewhere in the middle of it, and so that a game is a place that can be
 * returned to.
 *
 * The objective is not repeated here. It belongs to the shelf, where a
 * grown-up is choosing; a child who has started playing is not the person it
 * was written for, and putting it over the game would turn a game into an
 * exercise.
 *
 * Halo is not placed here either: a playable game brings its own, driven by
 * the assistance ladder inside InteractionPlayer.
 */

export function generateStaticParams() {
  return getChapters().flatMap((chapter) =>
    gamesOf(chapter).map((game) => ({ slug: chapter.slug, game: game.id })),
  );
}

export default async function ChapterGamePage({
  params,
}: {
  params: Promise<{ slug: string; game: string }>;
}) {
  const { slug, game: id } = await params;
  const chapter = getChapters().find((c) => c.slug === slug);

  if (!chapter) notFound();

  const game = gameOf(chapter, id);
  if (!game) notFound();

  /*
    Where finishing this one leads. Worked out here rather than in the
    player, because the chapter's list of games is content — and so is
    whether the chapter has a verse to offer at the end of them — and the
    player has no business knowing about chapters at all.

    A game with another after it moves straight on. The last one does not
    move anywhere: it hands over a screen with the ways onward on it, and
    the memory verse is the one it leads with.
  */
  const playable = gamesOf(chapter).filter((g) => g.interactions.every(canPlay));
  const after = playable[playable.findIndex((g) => g.id === id) + 1];
  const verse = verseOf(chapter);

  return (
    <SectionScreen
      title={game.title}
      chapterTitle="Games"
      hubHref={`/chapter/${slug}/games`}
      fit
    >
      {game.interactions.every(canPlay) ? (
        <GamePlayer
          interactions={game.interactions}
          {...(after
            ? { nextHref: `/chapter/${slug}/games/${after.id}` }
            : {
                ending: (
                  <GamesEnd
                    {...(verse ? { verseHref: `/chapter/${slug}/verse` } : {})}
                    {...(playable.length > 1
                      ? { shelfHref: `/chapter/${slug}/games` }
                      : {})}
                    hubHref={`/chapter/${slug}`}
                  />
                ),
              })}
        />
      ) : (
        <NotReadyYet what="This game" />
      )}
    </SectionScreen>
  );
}
