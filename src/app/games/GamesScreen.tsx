"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import HaloPresence from "@/halo/HaloPresence";
import InteractionPlayer from "@/interactions/InteractionPlayer";
import type { GameQuestion } from "@/content/games";
import { readStreak, recordRun, type StreakRecord } from "@/games/streak";

/**
 * Games: a few minutes of play across every chapter.
 *
 * The landing and the session are one component and one route, so a run is
 * never lost to a navigation. Everything a child plays here is an ordinary
 * `InteractionPlayer` — the assistance ladder, Recovery and Halo all behave
 * exactly as they do inside a chapter, because it is the same component and
 * not a second copy of one.
 *
 * The streak is momentum, not a score. It is not shown during play: a number
 * ticking up beside a question turns "let's see what we remember" into "let's
 * see how high you can get", which is the thing this must not become. It is
 * on the landing, before and after, and nowhere else.
 */
export default function GamesScreen({ pool }: { pool: GameQuestion[] }) {
  const [record, setRecord] = useState<StreakRecord | null>(null);
  const [playing, setPlaying] = useState(false);
  const [run, setRun] = useState(0);
  const [current, setCurrent] = useState<GameQuestion | null>(null);
  const [stumbled, setStumbled] = useState(false);
  /** Remounts the player for each question so it starts genuinely fresh. */
  const [round, setRound] = useState(0);

  // Read after mount: localStorage does not exist while prerendering, and a
  // child in a private window must get a working game, not a broken one.
  useEffect(() => setRecord(readStreak()), []);

  const pick = useCallback(
    (avoid: string | null) => {
      const choices = pool.filter((q) => q.id !== avoid);
      const from = choices.length > 0 ? choices : pool;
      return from[Math.floor(Math.random() * from.length)] ?? null;
    },
    [pool],
  );

  const start = () => {
    setRun(0);
    setStumbled(false);
    setCurrent(pick(null));
    setRound((r) => r + 1);
    setPlaying(true);
  };

  const next = () => {
    setStumbled(false);
    setCurrent(pick(current?.id ?? null));
    setRound((r) => r + 1);
  };

  const onArrived = () => {
    // A question reached without stumbling carries the run forward. One
    // reached with help still counts as reached — it simply does not extend
    // a streak that has already ended.
    setRun((r) => {
      const grown = stumbled ? r : r + 1;
      setRecord(recordRun(grown));
      return grown;
    });
    window.setTimeout(next, 1600);
  };

  const onStumble = () => {
    if (stumbled) return;
    setStumbled(true);
    setRun((r) => {
      setRecord(recordRun(r));
      return 0;
    });
  };

  const leave = () => {
    setRecord(recordRun(run));
    setPlaying(false);
    setRun(0);
    setCurrent(null);
  };

  if (pool.length === 0) {
    return <Empty />;
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
              className="flex min-h-14 items-center justify-center rounded-card bg-ground-raised px-6 text-lg text-ink"
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
      <header className="flex items-center gap-4">
        <HaloPresence state="listening" placement="beside" size="standard" />
        <div>
          <h1 className="text-3xl leading-tight">Games</h1>
          <p className="mt-1 text-lg text-ink-soft text-balance">
            Let&rsquo;s see what we remember together.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Now" value={run} lit={run > 0} />
        <Stat label="Today" value={record?.todayBest ?? 0} />
        <Stat label="Best" value={record?.best ?? 0} />
      </div>

      <button
        type="button"
        onClick={start}
        className="flex min-h-20 items-center justify-center rounded-card bg-touchable px-6 text-2xl text-ground-raised"
      >
        Start game
      </button>

      <p className="text-center text-base text-ink-soft text-balance">
        Questions from every story you have, shuffled.
      </p>
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
      className={`flex flex-col items-center justify-center gap-1 rounded-card py-5 ${
        lit ? "bg-joy/10 text-joy" : "bg-ground-raised text-ink"
      }`}
    >
      <span className="text-3xl leading-none">{value}</span>
      <span className="text-sm text-ink-soft">{label}</span>
    </div>
  );
}

function Empty() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-6 py-16 text-center">
      <HaloPresence state="idle" size="large" />
      <p className="max-w-sm text-2xl leading-relaxed text-balance">
        No games yet.
      </p>
      <p className="max-w-sm text-lg text-ink-soft text-balance">
        They arrive with the stories.
      </p>
    </div>
  );
}
