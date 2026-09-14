"use client";

import Link from "next/link";

import { type ClassId } from "@/classes/registry";
import { ChooseClassFirst, useMyClass } from "@/components/class/InClass";
import { chapterHref } from "@/content/client";
import type { PoolQuestion } from "@/content/pools";
import type { StreakName } from "@/local/streak";

import PracticeScreen from "./PracticeScreen";

/**
 * Games and Memory Verse, scoped to the class the child is in.
 *
 * The pools are built on the server, one per class, and this picks the
 * child's — the same arrangement every destination uses, for the same reason:
 * a static export has no server at the moment a child opens the app, and
 * which class they are in lives on their device. See `InClass`.
 *
 * Why it is scoped at all: "questions from every story you have" is a promise
 * the note on that screen makes, and a Beginner child meeting a Junior
 * question would be asked about a story nobody has ever told them. That is
 * not a hard question; it is an unanswerable one. The same goes for a verse —
 * the words a six-year-old is asked to hold are not the ones a fifteen-year-old
 * is, and a shuffled list of all seven classes' verses is a list nobody was
 * given.
 *
 * Memory Verse also shows the verses themselves, below the drill, and those
 * are the same class's. They are passed as data rather than as finished
 * markup because the link on each one needs the class, which is only known
 * here.
 */

/** A verse as the shelf beneath the drill shows it. */
export type VerseOnShelf = {
  slug: string;
  chapterTitle: string;
  text: string;
  reference: string;
};

export default function ClassPractice({
  pools,
  verses,
  streak,
  title,
  blurb,
  startLabel,
  note,
  empty,
}: {
  pools: Record<ClassId, PoolQuestion[]>;
  /** Memory Verse only: the verses to read, whether or not any are drilled. */
  verses?: Record<ClassId, VerseOnShelf[]>;
  streak: StreakName;
  title: string;
  blurb: string;
  startLabel: string;
  note: string;
  empty: { title: string; blurb: string };
}) {
  const mine = useMyClass(pools);

  if (mine.state === "unsettled") return null;
  if (mine.state === "unchosen") return <ChooseClassFirst />;

  const { classId, mine: pool } = mine;
  const shelf = verses?.[classId] ?? [];

  return (
    <PracticeScreen
      pool={pool}
      classId={classId}
      streak={streak}
      title={title}
      blurb={blurb}
      startLabel={startLabel}
      note={note}
      empty={empty}
    >
      {shelf.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm tracking-wide text-ink-soft uppercase">
            Every verse
          </h2>

          <ul className="flex flex-col gap-4">
            {shelf.map((verse) => (
              <li key={verse.slug}>
                <Link
                  href={chapterHref(classId, verse.slug, "verse")}
                  className="surface flex flex-col gap-3 px-5 py-5"
                >
                  <p className="text-2xl leading-relaxed text-balance">
                    {verse.text}
                  </p>
                  <p className="text-base text-ink-soft">
                    {verse.reference} · {verse.chapterTitle}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PracticeScreen>
  );
}
