import Link from "next/link";
import { notFound } from "next/navigation";

import NotReadyYet from "@/components/chapter/NotReadyYet";
import SectionScreen from "@/components/chapter/SectionScreen";
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

/** Only chapters that have a verse. See the practice route for why. */
export function generateStaticParams() {
  return getChapters()
    .filter((chapter) => verseOf(chapter) !== undefined)
    .map(({ slug }) => ({ slug }));
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

      {/*
        The drill is a door rather than the rest of this page. It ran
        underneath the verse until the verse card — the tallest thing in the
        product that is not a picture — put every piece a child was meant to
        tap below the fold. It brings its own Halo when it opens, so nothing
        is placed here that would make a second one.
      */}
      {practice ? (
        canPlay(practice.interaction) ? (
          <Link
            href={`/chapter/${slug}/verse/practice`}
            className="cta min-h-16 w-full max-w-sm px-6 text-xl"
          >
            Practise it
          </Link>
        ) : (
          <NotReadyYet what="Practising this verse" />
        )
      ) : null}
    </SectionScreen>
  );
}
