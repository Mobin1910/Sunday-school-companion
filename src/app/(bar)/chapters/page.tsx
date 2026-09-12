import ChapterCard from "@/components/chapter/ChapterCard";
import { coverOf, gamesOf, getChapters, verseOf } from "@/content";
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
  const chapters = getChapters();

  return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <h1 className="text-3xl">Chapters</h1>

        {chapters.length === 0 ? (
          <p className="text-lg text-ink-soft">Stories are on their way.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {chapters.map((chapter, index) => (
              <li key={chapter.slug}>
                <ChapterCard
                  slug={chapter.slug}
                  number={index + 1}
                  title={chapter.title}
                  cover={coverOf(chapter)}
                  needs={{
                    games: gamesOf(chapter)
                      .filter((game) => game.interactions.every(canPlay))
                      .map((game) => game.id),
                    verse: verseOf(chapter) !== undefined,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
  );
}
