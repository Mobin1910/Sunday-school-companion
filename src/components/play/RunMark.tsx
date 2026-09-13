"use client";

import { useRun } from "@/local/run";
import type { StreakName } from "@/local/streak";

/**
 * The run, as a mark rather than a number on a scoreboard.
 *
 * One component for the one thing the product counts out loud, so free play
 * and a chapter's own games and verse cannot drift into showing it three
 * different ways. Which run it draws is a prop, because the two streaks
 * never meet — see `local/streak.ts`.
 *
 * Never at zero, and that is the whole of what keeps it momentum. A child who
 * has just started, or who has just stumbled, is not looking at a nought —
 * the mark arrives when something has gone right and leaves when the run
 * ends. A number that is always on screen is a mark out of ten; a number that
 * appears because you did something is a streak.
 *
 * It is small, it is not announced to a screen reader, and it sits in the
 * chrome rather than near the question. Nothing about a game changes when it
 * is there.
 */
export default function RunMark({ streak }: { streak: StreakName }) {
  const run = useRun(streak);
  if (run <= 0) return null;

  return (
    <span className="run-mark" aria-hidden>
      <FlameIcon />
      {run}
    </span>
  );
}

function FlameIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3c.6 3 3 4 4.4 6.2A6.6 6.6 0 0 1 12 20.5 6.6 6.6 0 0 1 7.6 9.2C8.4 8 9 7.3 9.3 6.4c.9 1 1.3 1.8 1.4 2.7C11.4 7.6 11.8 5.4 12 3z" />
    </svg>
  );
}
