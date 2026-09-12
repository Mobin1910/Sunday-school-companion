"use client";

import Link from "next/link";

import Picture from "@/components/Picture";
import type { Card } from "@/content";
import { chapterDone, useSessionProgress } from "@/local/session";

/**
 * One chapter on the shelf.
 *
 * A row rather than a tile, so a shelf of twenty is a list a child can run
 * down rather than a wall they have to scan. The cover is still the label —
 * a six-year-old who cannot yet read the title should be able to find the
 * story they were told on Sunday by its picture — but it now sits at the end
 * of the row and bleeds off the edge of the card, fading into it rather than
 * stopping at a border. That is what keeps the artwork feeling like a window
 * into the chapter instead of a thumbnail pasted onto a panel.
 *
 * The number is the chapter's place on this shelf, not an identifier: it is
 * where the list puts it, and it is here because "Chapter 2" is how a child
 * and a teacher both talk about a lesson. The Bible reference is not here —
 * it belongs on the Hub, where a child has already chosen this chapter and a
 * grown-up might want to look it up.
 *
 * It leads to the chapter's Hub, never straight into the story — every
 * chapter begins by showing what is inside it.
 *
 * A chapter worked all the way through in this sitting says so, and says it
 * quietly. Three deliberate restraints, because a shelf is exactly where
 * this could go wrong:
 *
 *   It is dimmed, not crossed out or greyed to unreadable. The picture is
 *   still the way a child finds the story.
 *
 *   It is still a link, and nothing about it is disabled. Reading the one
 *   about Simeon a second time is a good afternoon, not a mistake.
 *
 *   It lasts one sitting. A permanent tick would turn a shelf of stories
 *   into a list of chores with most of them already struck through, which
 *   is the opposite of what a shelf is for. See `local/session.ts`.
 */
export default function ChapterCard({
  slug,
  number,
  title,
  cover,
  needs,
}: {
  slug: string;
  number: number;
  title: string;
  cover: Extract<Card, { kind: "cover" }> | undefined;
  /**
   * What this chapter asks for before it counts as done — its own playable
   * games, and whether it has a verse at all. Worked out on the server from
   * the chapter's content, because which games exist is a content question
   * and this component must never guess it.
   */
  needs: { games: string[]; verse: boolean };
}) {
  const done = chapterDone(useSessionProgress()[slug], needs);

  return (
    <Link
      href={`/chapter/${slug}`}
      className={`surface relative flex min-h-30 items-center overflow-hidden ${
        done ? "chapter-done" : ""
      }`}
    >
      {cover ? (
        <div className="absolute inset-y-0 right-0 w-[46%]" aria-hidden>
          <Picture art={cover.art} alt="" className="size-full object-cover" />
          {/* The artwork arrives out of the card rather than being stuck on it. */}
          <div className="shelf-fade absolute inset-0" />
        </div>
      ) : null}

      <div className="relative flex flex-col gap-1 py-5 pr-2 pl-5">
        <span className="flex items-center gap-2 text-xs tracking-[0.08em] text-ink-soft">
          Chapter {String(number).padStart(2, "0")}
          {done ? <span className="done-pill">Done</span> : null}
        </span>
        <h2 className="max-w-[9.5em] text-xl leading-snug text-balance">
          {title}
        </h2>
      </div>
    </Link>
  );
}
