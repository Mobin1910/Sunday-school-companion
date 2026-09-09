import { notFound } from "next/navigation";

import CardScreen from "@/components/reader/CardScreen";
import ChapterReader from "@/components/reader/ChapterReader";
import { gamesOf, getChapters, nextChapter, storyCards } from "@/content";
import { canPlay } from "@/interactions/registry";

/**
 * The story, read cover to celebration.
 *
 * Only the narrative arc is here. The memory verse and the activity are
 * their own sections off the Chapter Hub now — the story no longer swallows
 * the whole chapter on the way past.
 *
 * Where the story ends, the chapter's own games are offered first and the
 * next chapter after them — and the next chapter means its Hub, never its
 * story: a chapter is always entered by seeing what is in it.
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

  /*
    Offered at the end, and only when there is something behind the door: a
    chapter whose games are written but not yet playable has no games as far
    as a child is concerned, and the shelf would greet them with an empty
    room. Same test the games shelf itself uses.
  */
  const playable = gamesOf(chapter).some((game) =>
    game.interactions.every(canPlay),
  );

  return (
    <ChapterReader
      slug={slug}
      hubHref={`/chapter/${slug}`}
      chapterTitle={chapter.title}
      {...(playable ? { gamesHref: `/chapter/${slug}/games` } : {})}
      {...(next ? { nextChapterHref: `/chapter/${next.slug}` } : {})}
      /* The picture on each page, for the back of the sheet when it turns. */
      backs={pages.map((card) => ("art" in card && card.art ? card.art.src : null))}
    >
      {pages.map((card, index) => (
        <CardScreen key={index} card={card} title={chapter.title} />
      ))}
    </ChapterReader>
  );
}
