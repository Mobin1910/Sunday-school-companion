"use client";

import { displayName, type ClassId } from "@/classes/registry";
import { ChooseClassFirst, useMyClass } from "@/components/class/InClass";
import type { Card } from "@/content/client";

import ChapterCard from "./ChapterCard";

/**
 * One class's chapters, drawn.
 *
 * Split out from the route because the route is a server component and which
 * class to draw is a fact about the device. Everything about the content is
 * still resolved on the server — the covers, the game ids, whether there is
 * a verse — and only the handful of fields a row draws crosses over, for each
 * class, so the browser can pick one. See `InClass`.
 *
 * The class is named above the shelf, quietly. It is the one screen where a
 * child might genuinely wonder whether they are looking at the right
 * chapters, because the numbers run from one in every class: "Chapter 01"
 * under a Beginner heading and "Chapter 01" under a Primary one are the whole
 * ambiguity that this line resolves.
 */

export type ShelfChapter = {
  slug: string;
  title: string;
  cover: Extract<Card, { kind: "cover" }> | undefined;
  needs: { games: string[]; verse: boolean };
};

export default function ChapterShelf({
  by,
}: {
  by: Record<ClassId, ShelfChapter[]>;
}) {
  const mine = useMyClass(by);

  // A blank frame while a single key is read, rather than the wrong shelf.
  if (mine.state === "unsettled") return null;
  if (mine.state === "unchosen") return <ChooseClassFirst />;

  const { classId, mine: chapters } = mine;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <p className="text-xs tracking-[0.14em] text-ink-soft uppercase">
          {displayName(classId)}
        </p>
        <h1 className="text-3xl">Chapters</h1>
      </div>

      {chapters.length === 0 ? (
        /*
          A class with nothing written yet, which is six of the seven today.
          It says whose shelf is empty, so a child who has chosen the wrong
          class can see that they have — an unqualified "stories are on their
          way" would leave them waiting for chapters that are already there
          under another name.
        */
        <div className="flex flex-col gap-2">
          <p className="text-lg text-ink-soft text-balance">
            {displayName(classId)} stories are on their way.
          </p>
          <p className="text-base text-ink-soft text-balance">
            If you are in a different class, you can change it on the Home
            screen or in Settings.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {chapters.map((chapter, index) => (
            <li key={chapter.slug}>
              <ChapterCard
                classId={classId}
                slug={chapter.slug}
                number={index + 1}
                title={chapter.title}
                cover={chapter.cover}
                needs={chapter.needs}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
