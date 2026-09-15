import ChapterShelf, {
  type ShelfChapter,
} from "@/components/chapter/ChapterShelf";
import { byClass, coverOf, gamesOf, verseOf } from "@/content";
import { canPlay } from "@/interactions/registry";

/**
 * The shelf.
 *
 * One column of rows, in the order the chapters load, each carrying its own
 * cover. A list rather than a grid: a shelf a child runs down beats a wall
 * they have to scan, it stays one column at every width, and it does not get
 * worse as chapters are added — the twentieth chapter is one more row, not a
 * second screenful of tiles.
 *
 * It is one class's shelf, always. `Beginner / Chapter 01` and
 * `Primary / Chapter 01` are different lessons that share a number, so a
 * shelf holding both would be the single most confusing screen in the
 * product — two rows called Chapter 01, and no way to tell which Sunday
 * either of them came from. The class is chosen once and this screen obeys
 * it; the numbers a child reads are their own class's, counted from one.
 *
 * The number a chapter shows is its place here, and nothing more. Order comes
 * from the content layer, so this screen never decides it.
 *
 * What each chapter asks for before it counts as done is worked out here,
 * from the chapter itself: the games it has that can actually be played, and
 * whether it has a verse. A chapter with no games needs none, so it is never
 * stuck at "0 of 0" — and a game written but not yet playable cannot hold a
 * chapter open, because a child has no way to play it. Whether any of that
 * has happened is the browser's business; see `ChapterCard`.
 */
export default function ChaptersPage() {
  const shelves = byClass<ShelfChapter[]>((chapters) =>
    chapters.map((chapter) => ({
      slug: chapter.slug,
      chapter: chapter.chapter,
      title: chapter.title,
      cover: coverOf(chapter),
      needs: {
        games: gamesOf(chapter)
          .filter((game) => game.interactions.every(canPlay))
          .map((game) => game.id),
        verse: verseOf(chapter) !== undefined,
      },
    })),
  );

  return <ChapterShelf by={shelves} />;
}
