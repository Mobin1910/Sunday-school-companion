"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import RunMark from "@/components/play/RunMark";
import type { PoolQuestion } from "@/content/pools";
import HaloPresence from "@/halo/HaloPresence";
import InteractionPlayer from "@/interactions/InteractionPlayer";
import { useRun, writeRun } from "@/local/run";
import { streakNamed, type StreakName, type StreakRecord } from "@/local/streak";

/**
 * A few minutes of play across every chapter.
 *
 * Games and Memory Verse are the same experience over different content, so
 * they are the same component over different pools. Everything a child plays
 * here is an ordinary `InteractionPlayer` — the assistance ladder, Recovery
 * and Halo all behave exactly as they do inside a chapter, because it is the
 * same component and not a second copy of one.
 *
 * The landing and the session are one component and one route, so a run is
 * never lost to a navigation.
 *
 * The pool is shuffled once, when a run starts, and then walked in order.
 * Drawing at random each time meant a child could meet the same question
 * three times in ten while another never came up at all, which reads as the
 * app not having very much in it. A shuffle that holds for the visit means
 * everything is seen once before anything is seen twice, and the order is
 * different the next time they come.
 *
 * The streak is momentum, not a score. During play it is a mark in the
 * corner rather than a row of three: the question is what a child is looking
 * at, and the run is something they can glance at. The full three — now,
 * today, best — stay on the landing, before and after, where there is
 * nothing to distract from.
 *
 * The run lives in `local/run.ts` rather than here, because this is not the
 * only place a games run can grow: a chapter's own games feed the same
 * streak. One rule holds everywhere — a run ends when a try does not work,
 * and at no other time. Not on Finish, not on a navigation. A child who got
 * three right in a chapter and tapped through to here was being shown "Now:
 * 0" while the mark on the screen they had just left said 3, and there is no
 * reading of that which is true.
 *
 * The two streaks never meet. Which store this screen writes to is a prop,
 * and each caller passes its own — see `local/streak.ts` for why sharing one
 * would be dishonest.
 */
export default function PracticeScreen({
  pool,
  streak: name,
  title,
  blurb,
  startLabel,
  note,
  empty,
  children,
}: {
  pool: PoolQuestion[];
  /** Which store this screen's runs go into. See `local/streak.ts`. */
  streak: StreakName;
  title: string;
  blurb: string;
  startLabel: string;
  /** The line under the start button, saying what is in the pool. */
  note: string;
  empty: { title: string; blurb: string };
  /** Anything the landing shows below the start button. */
  children?: React.ReactNode;
}) {
  const streak = streakNamed(name);

  const [record, setRecord] = useState<StreakRecord | null>(null);
  const [playing, setPlaying] = useState(false);
  const run = useRun(name);
  const [stumbled, setStumbled] = useState(false);
  /** Remounts the player for each question so it starts genuinely fresh. */
  const [round, setRound] = useState(0);

  /*
    The order for this visit, and where in it the child is.

    Held together because they are one fact: an order nobody is walking is
    not an order. Reshuffled when a run starts, and again on the lap — so
    every question is met once before any is met twice, and the second lap
    is not a rerun of the first.
  */
  const [order, setOrder] = useState<PoolQuestion[]>([]);
  const [at, setAt] = useState(0);
  const current = order[at] ?? null;

  // Read after mount: localStorage does not exist while prerendering, and a
  // child in a private window must get a working game, not a broken one.
  useEffect(() => setRecord(streak.read()), [streak]);

  /*
    Shuffled in the browser, on a tap, and never while rendering. A pool
    shuffled during a prerender would be baked into the HTML — the same
    "random" order for every child who ever opened the app — and a pool
    shuffled during a render would disagree with itself on hydration.
  */
  const shuffled = useCallback(
    (avoid?: string) => {
      const deck = [...pool];
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j]!, deck[i]!];
      }
      // Never open a lap on the question that closed the last one.
      if (deck.length > 1 && deck[0]!.id === avoid) {
        [deck[0], deck[1]] = [deck[1]!, deck[0]!];
      }
      return deck;
    },
    [pool],
  );

  const start = () => {
    // The run is not reset here. A child arriving with one already going has
    // one already going; starting a session is not a thing that went wrong.
    setStumbled(false);
    setOrder(shuffled());
    setAt(0);
    setRound((r) => r + 1);
    setPlaying(true);
  };

  const next = () => {
    setStumbled(false);
    setRound((r) => r + 1);

    if (at + 1 < order.length) {
      setAt(at + 1);
      return;
    }

    // The lap is over. A fresh order rather than the same one again.
    setOrder(shuffled(current?.id));
    setAt(0);
  };

  const onArrived = () => {
    // A question reached without stumbling carries the run forward. One
    // reached with help still counts as reached — it simply does not extend
    // a streak that has already ended.
    const grown = stumbled ? run : run + 1;
    writeRun(name, grown);
    setRecord(streak.record(grown));
    window.setTimeout(next, 1600);
  };

  const onStumble = () => {
    if (stumbled) return;
    setStumbled(true);
    setRecord(streak.record(run));
    writeRun(name, 0);
  };

  const leave = () => {
    // Kept, not ended. Leaving the screen is not a mistake, and the run is
    // the child's until something actually does not work.
    setRecord(streak.record(run));
    setPlaying(false);
    setOrder([]);
    setAt(0);
  };

  /*
    The screen still says what it is when there is nothing to play. A child
    who arrives at Memory Verse and finds no drill written yet should still
    be looking at a screen called Memory Verse, with the verses on it — an
    absence is not a reason to stop naming where they are.
  */
  const header = (
    <header className="flex items-center gap-4">
      <HaloPresence state="listening" placement="beside" size="standard" />
      <div>
        <h1 className="text-3xl leading-tight">{title}</h1>
        <p className="mt-1 text-lg text-ink-soft text-balance">{blurb}</p>
      </div>
    </header>
  );

  // Nothing to play, which is not the same as nothing to show: the verses
  // are worth reading whether or not a drill has been written for them yet.
  if (pool.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
        {header}

        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="max-w-sm text-xl leading-relaxed text-balance">
            {empty.title}
          </p>
          <p className="max-w-sm text-lg text-ink-soft text-balance">
            {empty.blurb}
          </p>
        </div>

        {children}
      </div>
    );
  }

  if (playing && current) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={leave}
            className="-ml-2 min-h-12 rounded-full px-2 text-base text-ink-soft"
          >
            Finish
          </button>

          {/*
            The run, in the corner, and only once there is one.

            Zero is not shown. A child who has just started, or who has just
            stumbled, is not looking at a nought — the mark appears when
            something has gone right and goes when the run ends, which is
            the only way a streak can be momentum rather than a mark out of
            ten. It is small, it is not announced, and it is nowhere near
            the question.
          */}
          <RunMark streak={name} />
        </div>

        <InteractionPlayer
          key={round}
          interaction={current.interaction}
          onComplete={onArrived}
          onMiss={onStumble}
        />

        {/*
          Offered only once a try has not worked, and never instead of the
          help already arriving. Nothing here interrupts: the question stays
          playable above, and these are simply two doors that have opened.
        */}
        {stumbled ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={next}
              className="btn-quiet min-h-14 px-6 text-lg"
            >
              Try another
            </button>
            <Link
              href={`/chapter/${current.chapterSlug}`}
              className="flex min-h-14 items-center justify-center rounded-card px-6 text-lg text-ink-soft"
            >
              Go to {current.chapterTitle}
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      {header}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Now" value={run} lit={run > 0} />
        <Stat label="Today" value={record?.todayBest ?? 0} />
        <Stat label="Best" value={record?.best ?? 0} />
      </div>

      <button
        type="button"
        onClick={start}
        className="cta min-h-20 px-6 text-2xl"
      >
        {startLabel}
      </button>

      <p className="text-center text-base text-ink-soft text-balance">{note}</p>

      {children}
    </div>
  );
}

/**
 * A number with a word under it. Not a trophy.
 *
 * Zero is shown plainly rather than hidden or dressed up — a child who has
 * not played yet has not failed at anything, and an empty slot that looks
 * like a missing achievement would say otherwise.
 */
function Stat({
  label,
  value,
  lit = false,
}: {
  label: string;
  value: number;
  lit?: boolean;
}) {
  return (
    <div
      className={`surface flex flex-col items-center justify-center gap-1 py-5 ${
        lit ? "border-joy/40 text-joy" : "text-ink"
      }`}
    >
      <span className="text-3xl leading-none">{value}</span>
      <span className="text-sm text-ink-soft">{label}</span>
    </div>
  );
}
