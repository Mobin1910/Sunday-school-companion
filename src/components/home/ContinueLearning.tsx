"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { ClassId } from "@/classes/registry";
import { useMyClass } from "@/components/class/InClass";
import { chapterHref } from "@/content/client";
import { nextStep, readPlace, type ChapterBrief, type NextStep } from "@/local/place";

/**
 * The way back into the journey.
 *
 * Where the child got to lives on the device, so this settles after mount.
 * Until then it shows the first chapter as a place to begin — which is the
 * true answer for a child who has never opened anything, and a sensible one
 * for everyone else for the moment it takes. There is no spinner and no
 * empty box: an unanswered question about progress should still leave a
 * story within reach.
 *
 * Every way this can go wrong lands somewhere real. A chapter that has been
 * removed, a page that no longer exists, a record written by a newer version
 * of the app — all of it resolves to a chapter that exists now, in
 * `nextStep`. This component never has to think about it.
 *
 * Nothing here is a measurement. "Continue" names a chapter; it does not say
 * how far through, how long ago, or how many are left.
 *
 * The chapters are this child's class's chapters, and the place is that
 * class's place. Home ships one short list per class and this picks the
 * child's, because there is no server to pick it — see `InClass`. A child who
 * switches class on Home sees this line change, in place, to the story they
 * left in the class they just moved to.
 *
 * Nothing at all is drawn while the class is unknown, and nothing is drawn
 * when there is none: Home already asks that question — the doorway sends a
 * child with no class to Halo — so a second asking here would be two screens
 * talking over each other.
 */
export default function ContinueLearning({
  by,
}: {
  by: Record<ClassId, ChapterBrief[]>;
}) {
  const mine = useMyClass(by);
  const chapters = mine.state === "chosen" ? mine.mine : EMPTY;
  const classId = mine.state === "chosen" ? mine.classId : null;

  const [step, setStep] = useState<NextStep | null>(() =>
    nextStep(null, chapters),
  );

  useEffect(
    () => setStep(classId ? nextStep(readPlace(classId), chapters) : null),
    [classId, chapters],
  );

  if (!classId) return null;

  /*
    A class nobody has written yet. Six of the seven are in exactly this
    state today, so it is the ordinary case rather than an error — and a
    child who has correctly said which class they are in should be told the
    truth about it, not shown an empty space or somebody else's chapters.
  */
  if (chapters.length === 0) {
    return (
      <section className="flex flex-col gap-2">
        <p className="text-lg text-ink-soft text-balance">
          Your class&rsquo;s stories are on their way.
        </p>
        <p className="text-base text-ink-soft text-balance">
          Halo is still drawing them. Everything else is here to explore in
          the meantime.
        </p>
      </section>
    );
  }

  if (!step) return null;

  const { chapter } = step;

  const heading = step.kind === "next" ? "Next up" : "Continue learning";
  const line =
    step.kind === "continue"
      ? "Carry on where you left off"
      : chapter.reference;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs tracking-[0.14em] text-ink-soft uppercase">
        {heading}
      </h2>

      {/*
        One surface, not a card of cards. It sits in the world rather than
        floating above it — a translucent pane the atmosphere shows through —
        because a solid panel here would read as a dashboard tile and take
        the dark away from Halo.
      */}
      <Link
        href={
          step.kind === "continue"
            ? chapterHref(classId, chapter.slug, "story")
            : chapterHref(classId, chapter.slug)
        }
        className="surface surface-lit flex items-center gap-4 px-5 py-4"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-2xl leading-snug text-balance">
            {chapter.title}
          </span>
          <span className="mt-0.5 block text-sm text-ink-soft">
            {line}
          </span>
        </span>

        <span className="cta shrink-0 px-4 py-2 text-base">
          {step.kind === "continue" ? "Continue" : "Start"}
        </span>
      </Link>
    </section>
  );
}

/** Stable between renders, so the effect below is not re-run for nothing. */
const EMPTY: ChapterBrief[] = [];
