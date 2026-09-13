"use client";

import { useSyncExternalStore } from "react";

import type { StreakName } from "./streak";

/**
 * The run a child is on, while they are on it.
 *
 * Free play keeps its run in component state, because it has a Start and a
 * Finish and never leaves the screen in between. A chapter's games are the
 * opposite shape: every game is its own route, and finishing one returns to
 * the shelf. A run held in component state would therefore end every time a
 * child got something right — three games played perfectly would read as
 * three runs of one rather than one run of six, which is not a streak, it is
 * a rounding error.
 *
 * So it lives here, for the sitting, and survives the walk back to the shelf
 * and into the next game. `sessionStorage` for the same reason everything
 * else in this session does: a run is momentum inside one afternoon, and a
 * number waiting on the device a week later is not momentum, it is a record
 * the child has to live up to.
 *
 * It is the *live* number only. What is kept — today's best, the best ever —
 * belongs to `local/streak.ts` and is written there, by whoever is playing.
 * Nothing here is a score, nothing is compared to anyone, and this number
 * only ever goes up by one or back to nothing.
 *
 * One run per streak, and the two never meet, for exactly the reason the two
 * streaks never meet: recalling a story and holding particular words are
 * different kinds of practice, and a verse that went wrong has no business
 * ending a run of games.
 */

const KEY = (name: StreakName) => `ssc.session.run.${name}`;

/*
  A subscriber list, because `sessionStorage` fires no event in the tab that
  wrote to it — and here two components genuinely need to agree: the player
  that counts the run and the mark in the corner that shows it. They are
  deliberately not parent and child. The mark belongs to the screen's header,
  the counting belongs to the player, and a store between them is cheaper
  than threading state through the frame every chapter section shares.
*/
const listeners = new Set<() => void>();
const cached: Partial<Record<StreakName, number>> = {};

export function readRun(name: StreakName): number {
  const held = cached[name];
  if (held !== undefined) return held;

  let run = 0;
  try {
    const raw = window.sessionStorage.getItem(KEY(name));
    const parsed = raw === null ? 0 : Number(raw);
    run = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    // A private window, or storage turned off. The run simply starts again;
    // nothing else in the product depends on it.
    run = 0;
  }
  cached[name] = run;
  return run;
}

export function writeRun(name: StreakName, run: number): void {
  cached[name] = run;
  try {
    window.sessionStorage.setItem(KEY(name), String(run));
  } catch {
    // Kept in memory for this page at least.
  }
  for (const listen of listeners) listen();
}

/**
 * The live view of it.
 *
 * The server snapshot is zero on purpose: there is no run while a page is
 * being prerendered, and a mark baked into static HTML would greet every
 * child with somebody else's streak.
 */
export function useRun(name: StreakName): number {
  return useSyncExternalStore(
    (listen) => {
      listeners.add(listen);
      return () => listeners.delete(listen);
    },
    () => readRun(name),
    () => 0,
  );
}
