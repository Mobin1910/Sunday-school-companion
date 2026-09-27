"use client";

import Link from "next/link";

import Picture from "@/components/Picture";
import type { ClassId } from "@/classes/registry";
import { chapterHref, type Card } from "@/content/client";
import { chapterDone, progressOf, useSessionProgress } from "@/local/session";

/**
 * One chapter on the shelf.
 *
 * A row rather than a tile, so a shelf of twenty is a list a child can run
 * down rather than a wall they have to scan. The cover is the label — a
 * six-year-old who cannot yet read the title should be able to find the story
 * they were told on Sunday by its picture.
 *
 * **The picture is the card.** It was a strip down the right-hand 46%, faded
 * into the card colour from the left so the artwork "arrived out of" the
 * surface rather than being pasted onto it. That fade was the problem: on a
 * row 120px tall, a 46% strip already showed only a sliver of a wide painting,
 * and then a gradient washed the left half of that sliver away. Roughly a
 * fifth of each cover survived to be looked at.
 *
 * So the artwork now fills the card and the heading is drawn over it. That is
 * what the landscape masters were drawn for: `schema.ts` requires them to
 * carry no lettering of their own precisely because "the hub and the shelf row
 * both draw their own heading over or beside this". Over, here.
 *
 * Nothing is laid across the picture except a scrim along the bottom edge,
 * and that is there to make one line of text legible rather than to blend the
 * artwork into anything. The top two-thirds of every cover is untouched.
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
  classId,
  slug,
  number,
  title,
  cover,
  needs,
}: {
  classId: ClassId;
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
  const done = chapterDone(
    progressOf(useSessionProgress(), classId, slug),
    needs,
  );

  return (
    <Link
      href={chapterHref(classId, slug)}
      className={`shelf-card surface relative flex flex-col justify-end overflow-hidden ${
        cover ? "aspect-2/1" : "min-h-30"
      } ${done ? "chapter-done" : ""}`}
    >
      {cover ? (
        <div className="absolute inset-0" aria-hidden>
          {/*
            The wide master where the chapter has one, and the portrait where
            it does not. A 9:16 portrait in a 2:1 box is a hard crop — it
            keeps a band across its middle — which is the cost of a chapter
            whose cover has not been drawn wide, and is why `landscape` exists.
          */}
          <Picture
            art={cover.wide ?? cover.art}
            alt=""
            className="size-full object-cover"
          />
          {/*
            Legibility for one line of text, and nothing else. It reaches
            barely past halfway and is only near-opaque in the last few
            percent, so the part of a cover an artist composed — the faces,
            the sky, the thing happening — is never under it.
          */}
          <div className="shelf-scrim absolute inset-0" />
        </div>
      ) : null}

      <div className="relative flex flex-col gap-1 px-5 pt-5 pb-4">
        <span className="flex items-center gap-2 text-xs tracking-[0.08em] text-ink-soft">
          Chapter {String(number).padStart(2, "0")}
          {done ? <span className="done-pill">Done</span> : null}
        </span>
        <h2 className="max-w-[12em] text-xl leading-snug text-balance">
          {title}
        </h2>
      </div>
    </Link>
  );
}
