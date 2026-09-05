import { notFound } from "next/navigation";

import HaloPresence from "@/halo/HaloPresence";
import NotReadyYet from "@/components/chapter/NotReadyYet";
import SectionScreen from "@/components/chapter/SectionScreen";
import QuizCard from "@/components/reader/QuizCard";
import VerseCard from "@/components/reader/VerseCard";
import { getChapters, verseOf, versePracticeOf } from "@/content";
import { canPlay } from "@/interactions/registry";

/**
 * A chapter's memory verse, and the practice that goes with it.
 *
 * The verse is always here and always readable — it needs no interaction to
 * be worth opening. The drill beneath it is separate, and its absence takes
 * nothing away from the verse itself.
 */

export function generateStaticParams() {
  return getChapters().map(({ slug }) => ({ slug }));
}

export default async function ChapterVersePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getChapters().find((c) => c.slug === slug);

  if (!chapter) notFound();

  const verse = verseOf(chapter);
  if (!verse) notFound();

  const practice = versePracticeOf(chapter);

  return (
    <SectionScreen
      title="Memory Verse"
      chapterTitle={chapter.title}
      hubHref={`/chapter/${slug}`}
    >
      <VerseCard text={verse.text} reference={verse.reference} />

      {/* Practising the verse brings its own Halo, driven by the assistance
          ladder. Nothing is placed here that would make a second one. */}
      {practice ? (
        canPlay(practice.interaction) ? (
          <QuizCard interaction={practice.interaction} />
        ) : (
          <NotReadyYet what="Practising this verse" />
        )
      ) : null}
    </SectionScreen>
  );
}
