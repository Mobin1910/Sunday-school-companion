"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PlayInteraction } from "@/content";

import { renderModel } from "./registry";
import { TIMING } from "./timing";
import { say } from "./voice";

/**
 * Plays one interaction, and knows nothing else.
 *
 * Two props. There is no way to tell this component which section it is in,
 * which is how the promise that it behaves identically everywhere is kept.
 *
 * `onComplete` takes no arguments and never will. How many tries a child
 * needed, and how much help they were given, live here and only here — a
 * number that cannot escape cannot become a score.
 */
export default function InteractionPlayer({
  interaction,
  onComplete,
}: {
  interaction: PlayInteraction;
  onComplete: () => void;
}) {
  /** 0 alone · 1 a word · 2 a clue · 3 together */
  const [rung, setRung] = useState(0);
  const [misses, setMisses] = useState(0);
  const [saying, setSaying] = useState<string | null>(null);
  const [arrived, setArrived] = useState<string | null>(null);

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
    (withWords: boolean, pool: Parameters<typeof say>[0]) => {
      if (done) return;

      const speak = setTimeout(() => {
        if (withWords) setSaying(say(pool));
      }, TIMING.beforeRecovery);

      const help = setTimeout(
        () => {
          setSaying(null);
          setRung((r) => Math.min(3, r + 1));
        },
        TIMING.beforeRecovery + (withWords ? TIMING.recoveryBeforeHelp : 0),
      );

      climbing.current.push(speak, help);
    },
    [done],
  );

  const handleMiss = useCallback(() => {
    setMisses((count) => {
      const next = count + 1;

      // The first miss passes in silence. A teacher usually says nothing the
      // first time, and silence treats a mistake as unremarkable.
      if (next >= TIMING.missesBeforeWords) {
        climb(true, next === TIMING.missesBeforeWords ? "noticing" : "joining");
      }

      return next;
    });
  }, [climb]);

  const handleArrive = useCallback(() => {
    clearTimers();
    setSaying(null);
    setArrived(
      say(rung > 0 ? "partnership" : misses > 0 ? "persistence" : "capability"),
    );
    onComplete();
  }, [misses, rung, onComplete]);

  // Stillness calls for help as loudly as a wrong answer. A child who does not
  // know what to do usually does nothing at all.
  useEffect(() => {
    if (done || rung >= 3) return;


    const wait =
      rung === 0 && misses === 0
        ? TIMING.stillnessBeforeFirstHelp
        : TIMING.stillnessBetweenRungs;

    if (!onScreen) return;

    const timer = setTimeout(() => {
      climb(true, rung === 0 && misses === 0 ? "beginning" : "joining");
    }, wait);

    return () => clearTimeout(timer);
  }, [rung, misses, done, onScreen, climb]);

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

  return (
    <div ref={root} className="flex w-full flex-col items-center gap-6">
      {renderModel({
        interaction,
        rung,
        locked: done,
        onMiss: handleMiss,
        onArrive: handleArrive,
      })}

      <Voice
        line={arrived ?? saying}
        celebrating={done}
        hint={rung >= 1 && !done ? hintOf(interaction) : undefined}
      />
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
