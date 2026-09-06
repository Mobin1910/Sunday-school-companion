import { notFound } from "next/navigation";

import CardScreen from "@/components/reader/CardScreen";
import ChapterReader from "@/components/reader/ChapterReader";
import { getChapters, nextChapter, storyCards } from "@/content";

/**
 * The story, read cover to celebration.
 *
 * Only the narrative arc is here. The memory verse and the activity are
 * their own sections off the Chapter Hub now — the story no longer swallows
 * the whole chapter on the way past.
 *
 * Where the story ends, the next chapter's Hub is offered, never the next
 * chapter's story: a chapter is always entered by seeing what is in it.
 */

export function generateStaticParams() {
  return getChapters().map(({ slug }) => ({ slug }));
}

export default async function ChapterStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapters = getChapters();
  const chapter = chapters.find((c) => c.slug === slug);

  if (!chapter) notFound();

  const pages = storyCards(chapter);
  const next = nextChapter(chapters, slug);

  return (
    <ChapterReader
      slug={slug}
      hubHref={`/chapter/${slug}`}
      chapterTitle={chapter.title}
      {...(next ? { nextChapterHref: `/chapter/${next.slug}` } : {})}
    >
      {pages.map((card, index) => (
        <CardScreen key={index} card={card} title={chapter.title} />
      ))}
    </ChapterReader>
  );
}
