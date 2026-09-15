import { notFound } from "next/navigation";

import CardScreen from "@/components/reader/CardScreen";
import ChapterReader from "@/components/reader/ChapterReader";
import {
  chapterHref,
  chapterParams,
  chapterWithin,
  gamesOf,
  getChapters,
  nextChapter,
  storyCards,
} from "@/content";
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
  return chapterParams();
}

export default async function ChapterStoryPage({
  params,
}: {
  params: Promise<{ class: string; slug: string }>;
}) {
  const { class: classId, slug } = await params;
  const chapter = chapterWithin(classId, slug);

  if (!chapter) notFound();

  /*
    The next chapter is the next one *in this class*. Nothing in the reader
    may reach across classes: a Beginner child finishing their last chapter
    has finished, and must not be handed the first Primary lesson because it
    happened to be the next thing the loader found.
  */
  const chapters = getChapters(chapter.classId);

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
      classId={chapter.classId}
      slug={slug}
      hubHref={chapterHref(chapter.classId, slug)}
      chapterTitle={chapter.title}
      {...(playable
        ? { gamesHref: chapterHref(chapter.classId, slug, "games") }
        : {})}
      {...(next
        ? { nextChapterHref: chapterHref(next.classId, next.slug) }
        : {})}
      /* The picture on each page, for the back of the sheet when it turns. */
      backs={pages.map((card) => ("art" in card && card.art ? card.art.src : null))}
      /*
        Pages the story waits on. Read off the cards here, because the reader
        is handed rendered pages and cannot see what is inside them.
      */
      gates={pages.flatMap((card, index) =>
        card.kind === "story" && card.gate === true ? [index] : [],
      )}
    >
      {pages.map((card, index) => (
        <CardScreen key={index} card={card} title={chapter.title} />
      ))}
    </ChapterReader>
  );
}
