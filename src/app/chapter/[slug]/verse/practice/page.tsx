import { notFound } from "next/navigation";

import SectionScreen from "@/components/chapter/SectionScreen";
import QuizCard from "@/components/reader/QuizCard";
import { getChapters, versePracticeOf } from "@/content";
import { canPlay } from "@/interactions/registry";

/**
 * Practising the verse, on a screen of its own.
 *
 * It sat under the verse on the verse page, which is where it reads best in
 * a file and worst on a phone: the verse card is the tallest thing in the
 * product that is not a picture, so on a 390px screen every piece a child was
 * meant to tap was below the fold, and on a 320px one it was two folds down.
 * A drill whose pieces cannot be seen from where it begins is not a drill.
 *
 * So it becomes a door, exactly as a game is — the same `fit` screen, the
 * same one-fold promise, the same player. The verse page keeps the verse,
 * which is the thing that was always worth opening on its own, and offers
 * this underneath it.
 *
 * The route exists only for chapters that have a practice which can actually
 * be played, so the door is never one a child opens onto "not yet".
 */

export function generateStaticParams() {
  return getChapters()
    .filter((chapter) => {
      const practice = versePracticeOf(chapter);
      return practice !== undefined && canPlay(practice.interaction);
    })
    .map(({ slug }) => ({ slug }));
}

export default async function VersePracticePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getChapters().find((c) => c.slug === slug);

  if (!chapter) notFound();

  const practice = versePracticeOf(chapter);
  if (!practice || !canPlay(practice.interaction)) notFound();

  return (
    <SectionScreen
      title="Practise"
      chapterTitle="Memory Verse"
      hubHref={`/chapter/${slug}/verse`}
      fit
    >
      <QuizCard interaction={practice.interaction} />
    </SectionScreen>
  );
}
