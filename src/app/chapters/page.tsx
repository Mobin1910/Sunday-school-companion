import ChapterCard from "@/components/chapter/ChapterCard";
import GlobalScreen from "@/components/nav/GlobalScreen";
import { coverOf, getChapters } from "@/content";

/**
 * The shelf.
 *
 * Covers, at a size a child can aim at, in the order the chapters load. One
 * column on a phone and two on a tablet, because a shelf that needs
 * horizontal scrolling hides half of itself from the child who most needs to
 * browse by picture.
 */
export default function ChaptersPage() {
  const chapters = getChapters();

  return (
    <GlobalScreen active="chapters">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <h1 className="text-3xl">Chapters</h1>

        {chapters.length === 0 ? (
          <p className="text-lg text-ink-soft">Stories are on their way.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {chapters.map((chapter) => (
              <li key={chapter.slug}>
                <ChapterCard
                  slug={chapter.slug}
                  title={chapter.title}
                  reference={chapter.reference}
                  cover={coverOf(chapter)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlobalScreen>
  );
}
