import { notFound } from "next/navigation";

import HaloPresence from "@/halo/HaloPresence";
import NotReadyYet from "@/components/chapter/NotReadyYet";
import SectionScreen from "@/components/chapter/SectionScreen";
import QuizCard from "@/components/reader/QuizCard";
import { activityOf, getChapters } from "@/content";
import { canPlay } from "@/interactions/registry";

/**
 * A chapter's practice.
 *
 * One activity today, so this is one screen rather than a deck. When a
 * chapter carries several, this becomes a list and the shape above it does
 * not have to change.
 */

/**
 * Only chapters that actually have an activity get this route.
 *
 * Emitting it for every chapter built pages that resolve to "not found" —
 * unreachable from the Hub, which filters absent sections out, but real
 * URLs all the same, and a URL that exists only to fail is a dead end
 * waiting for a stale link to find it.
 */
export function generateStaticParams() {
  return getChapters()
    .filter((chapter) => activityOf(chapter) !== undefined)
    .map(({ slug }) => ({ slug }));
}

export default async function ChapterPracticePage({
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
      title="Practice"
      chapterTitle={chapter.title}
      hubHref={`/chapter/${slug}`}
    >
      {/* Halo is not placed here: a playable activity brings its own,
          driven by the assistance ladder inside InteractionPlayer. */}
      {canPlay(activity.interaction) ? (
        <QuizCard interaction={activity.interaction} />
      ) : (
        <NotReadyYet what="This activity" />
      )}
    </SectionScreen>
  );
}
