import { notFound } from "next/navigation";

import NotReadyYet from "@/components/chapter/NotReadyYet";
import SectionScreen from "@/components/chapter/SectionScreen";
import GamePlayer from "@/components/play/GamePlayer";
import { gameOf, gamesOf, getChapters } from "@/content";
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

  return (
    <SectionScreen
      title={game.title}
      chapterTitle="Games"
      hubHref={`/chapter/${slug}/games`}
      onward="All games"
    >
      {game.interactions.every(canPlay) ? (
        <GamePlayer interactions={game.interactions} />
      ) : (
        <NotReadyYet what="This game" />
      )}
    </SectionScreen>
  );
}
