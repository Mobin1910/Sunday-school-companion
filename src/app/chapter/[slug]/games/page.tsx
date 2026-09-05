import { notFound } from "next/navigation";

import NotReadyYet from "@/components/chapter/NotReadyYet";
import SectionScreen from "@/components/chapter/SectionScreen";
import QuizCard from "@/components/reader/QuizCard";
import { activityOf, getChapters } from "@/content";
import { canPlay } from "@/interactions/registry";

/**
 * A chapter's games.
 *
 * One activity today, so this is one screen rather than a shuffle. When a
 * chapter carries several, this becomes the place that moves between them,
 * and the shape above it does not have to change — which is the reason the
 * section exists as its own route rather than as a card inside the story.
 *
 * `activity` remains the authored term in chapter files. A game is what a
 * child plays; an activity is what an author writes.
 */

export function generateStaticParams() {
  return getChapters()
    .filter((chapter) => activityOf(chapter) !== undefined)
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

  const activity = activityOf(chapter);
  if (!activity) notFound();

  return (
    <SectionScreen
      title="Games"
      chapterTitle={chapter.title}
      hubHref={`/chapter/${slug}`}
    >
      {/* Halo is not placed here: a playable game brings its own, driven by
          the assistance ladder inside InteractionPlayer. */}
      {canPlay(activity.interaction) ? (
        <QuizCard interaction={activity.interaction} />
      ) : (
        <NotReadyYet what="This game" />
      )}
    </SectionScreen>
  );
}
