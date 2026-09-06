"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
 */
export default function ContinueLearning({
  chapters,
}: {
  chapters: ChapterBrief[];
}) {
  const [step, setStep] = useState<NextStep | null>(() =>
    nextStep(null, chapters),
  );

  useEffect(() => setStep(nextStep(readPlace(), chapters)), [chapters]);

  if (!step) return null;

  const { chapter } = step;

  const heading = step.kind === "next" ? "Next up" : "Continue learning";
  const line =
    step.kind === "continue"
      ? "Carry on where you left off"
      : chapter.reference;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs tracking-[0.14em] text-night-ink-soft uppercase">
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
            ? `/chapter/${chapter.slug}/story`
            : `/chapter/${chapter.slug}`
        }
        className="flex items-center gap-4 rounded-card border border-night-edge bg-night-raised/50 px-5 py-4"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-2xl leading-snug text-balance">
            {chapter.title}
          </span>
          <span className="mt-0.5 block text-sm text-night-ink-soft">
            {line}
          </span>
        </span>

        <span className="shrink-0 rounded-full bg-night-ink/95 px-4 py-2 text-base text-night">
          {step.kind === "continue" ? "Continue" : "Start"}
        </span>
      </Link>
    </section>
  );
}
