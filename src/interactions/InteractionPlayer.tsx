"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PlayInteraction } from "@/content";
import HaloPresence from "@/halo/HaloPresence";

import { haloStateFor } from "./halo";
import { renderModel } from "./registry";
import { TIMING } from "./timing";
import { say } from "./voice";

/**
 * Plays one interaction, and knows nothing else.
 *
 * There is no way to tell this component which section it is in, which is
 * how the promise that it behaves identically everywhere is kept. `active`
 * doesn't break that: it says whether anyone is looking yet, not what this
 * is or where it lives. It exists because the page-turn reader keeps the
 * next page mounted, ready to be revealed mid-drag, and `onScreen` below —
 * a plain viewport IntersectionObserver — cannot tell "mounted underneath
 * the current page" from "actually being read": both are geometrically on
 * screen. `active` is the difference. It defaults to true, so every caller
 * that doesn't need this distinction is unaffected.
 *
 * `onComplete` takes no arguments and never will. How many tries a child
 * needed, and how much help they were given, live here and only here — a
 * number that cannot escape cannot become a score.
 *
 * `onMiss` is the one thing that leaves besides completion, and it carries
 * nothing: it fires to say "that try did not work", not how many times.
 * Games needs it to end a run, and the fact is already public — the child
 * is watching Halo receive it. A caller that counted these events would be
 * building the tally this product refuses to keep, so callers hold a run,
 * not a record; see `src/games/streak.ts`.
 *
 * Halo is driven from here rather than by the models, because this is where
 * the assistance ladder actually lives. What crosses to the companion is a
 * HaloState — "recovering", "helping" — derived by `haloStateFor` from the
 * state below. The counts stay in this file, which is the whole point of
 * deriving rather than passing.
 */
export default function InteractionPlayer({
  interaction,
  onComplete,
  onMiss,
  active = true,
}: {
  interaction: PlayInteraction;
  onComplete: () => void;
  /** A try did not work. No count, and never a reason to interrupt. */
  onMiss?: () => void;
  active?: boolean;
}) {
  /** 0 alone · 1 a word · 2 a clue · 3 together */
  const [rung, setRung] = useState(0);
  const [misses, setMisses] = useState(0);
  const [saying, setSaying] = useState<string | null>(null);
  const [arrived, setArrived] = useState<string | null>(null);
  /**
   * Whether the words on screen were brought by stillness rather than by a
   * try that did not work. The ladder treats both the same — it climbs
   * either way — but they are not the same experience, and Halo reads them
   * differently: one is an invitation, the other is being met.
   */
  const [invited, setInvited] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const climbing = useRef<ReturnType<typeof setTimeout>[]>([]);

  /**
   * Every card of a chapter is mounted at once, so this must not start
   * counting until the child actually arrives. Held as state rather than a
   * ref so that arriving restarts the wait — a child who reads slowly should
   * still be met with help, and one who wanders off should come back to a
   * fresh clock rather than to the answer.
   */
  const [onScreen, setOnScreen] = useState(false);

  const done = arrived !== null;

  const clearTimers = () => {
    climbing.current.forEach(clearTimeout);
    climbing.current = [];
  };

  useEffect(() => clearTimers, []);

  /**
   * Recovery, then a rung. Never the other way round, and never both at once —
   * help that lands on the same beat as the mistake reads as a verdict.
   */
  const climb = useCallback(
    (
      withWords: boolean,
      pool: Parameters<typeof say>[0],
      fromStillness = false,
    ) => {
      if (done) return;

      const speak = setTimeout(() => {
        if (withWords) {
          setSaying(say(pool));
          setInvited(fromStillness);
        }
      }, TIMING.beforeRecovery);

      const help = setTimeout(
        () => {
          setSaying(null);
          setInvited(false);
          setRung((r) => Math.min(3, r + 1));
        },
        TIMING.beforeRecovery + (withWords ? TIMING.recoveryBeforeHelp : 0),
      );

      climbing.current.push(speak, help);
    },
    [done],
  );

  const handleMiss = useCallback(() => {
    onMiss?.();

    setMisses((count) => {
      const next = count + 1;

      // The first miss passes in silence. A teacher usually says nothing the
      // first time, and silence treats a mistake as unremarkable.
      if (next >= TIMING.missesBeforeWords) {
        climb(true, next === TIMING.missesBeforeWords ? "noticing" : "joining");
      }

      return next;
    });
  }, [climb, onMiss]);

  const handleArrive = useCallback(() => {
    clearTimers();
    setSaying(null);
    setInvited(false);
    setArrived(
      say(rung > 0 ? "partnership" : misses > 0 ? "persistence" : "capability"),
    );
    onComplete();
  }, [misses, rung, onComplete]);

  // Stillness calls for help as loudly as a wrong answer. A child who does not
  // know what to do usually does nothing at all.
  useEffect(() => {
    if (done || rung >= 3) return;
    if (!onScreen || !active) return;

    const wait =
      rung === 0 && misses === 0
        ? TIMING.stillnessBeforeFirstHelp
        : TIMING.stillnessBetweenRungs;

    const timer = setTimeout(() => {
      climb(true, rung === 0 && misses === 0 ? "beginning" : "joining", true);
    }, wait);

    return () => clearTimeout(timer);
  }, [rung, misses, done, onScreen, active, climb]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry?.isIntersecting ?? false),
      { threshold: 0.5 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const halo = haloStateFor(interaction, {
    rung,
    misses,
    recovering: saying !== null,
    invited,
    done,
    attending: onScreen && active,
  });

  return (
    <div ref={root} className="flex w-full flex-col items-center gap-6">
      {renderModel({
        interaction,
        rung,
        locked: done,
        onMiss: handleMiss,
        onArrive: handleArrive,
      })}

      {/* Beside what it is saying, so the companion and the words read as
          one voice rather than two things happening at once. */}
      <div className="flex items-center gap-4">
        <HaloPresence state={halo} placement="beside" />

        <Voice
          line={arrived ?? saying}
          celebrating={done}
          hint={rung >= 1 && !done ? hintOf(interaction) : undefined}
        />
      </div>
    </div>
  );
}

function hintOf(interaction: PlayInteraction): string | undefined {
  return "hint" in interaction ? interaction.hint : undefined;
}

/**
 * One place for everything the app says, so that Recovery, the hint and the
 * celebration never stack up on a child at once. They happen in sequence, so
 * they share a line.
 *
 * The height is held steady whether or not anything is being said — nothing
 * below should jump when a word arrives.
 */
function Voice({
  line,
  hint,
  celebrating,
}: {
  line: string | null;
  hint?: string | undefined;
  celebrating: boolean;
}) {
  const showing = line ?? hint ?? null;

  return (
    <p
      aria-live="polite"
      className={`voice min-h-14 max-w-sm px-6 text-center text-xl leading-relaxed text-balance ${
        celebrating ? "text-joy" : "text-ink-soft"
      }`}
      key={showing}
    >
      {showing}
    </p>
  );
}
