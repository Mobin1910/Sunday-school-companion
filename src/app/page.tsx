import Link from "next/link";

import ChapterCard from "@/components/chapter/ChapterCard";
import GlobalScreen from "@/components/nav/GlobalScreen";
import { coverOf, getChapters } from "@/content";

/**
 * Home.
 *
 * A door, not a dashboard. It says what this is, and it puts one chapter
 * within reach — the most recent one written — because a child arriving
 * should be one tap from a story rather than one tap from a menu.
 *
 * Nothing here counts anything. There is no streak, no progress ring and no
 * "you have 3 chapters left"; those turn returning into an obligation.
 */
export default function HomePage() {
  const chapters = getChapters();
  const latest = chapters[chapters.length - 1];

  return (
    <GlobalScreen active="home">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
        <header>
          <h1 className="text-4xl leading-tight text-balance">
            Sunday School Companion
          </h1>
          <p className="mt-2 text-lg text-ink-soft text-balance">
            Bible stories to read again at home.
          </p>
        </header>

        {latest ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm tracking-wide text-ink-soft uppercase">
              Start here
            </h2>
            <ChapterCard
              slug={latest.slug}
              title={latest.title}
              reference={latest.reference}
              cover={coverOf(latest)}
            />
          </section>
        ) : (
          <p className="text-lg text-ink-soft">
            Stories are on their way.
          </p>
        )}

        {chapters.length > 1 ? (
          <Link
            href="/chapters"
            className="flex min-h-16 items-center justify-center rounded-card bg-touchable px-6 text-xl text-ground-raised"
          >
            All chapters
          </Link>
        ) : null}
      </div>
    </GlobalScreen>
  );
}
