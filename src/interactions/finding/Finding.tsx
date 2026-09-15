"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Finding as Model, ModelProps } from "../types";

/**
 * Searching for the lost coin.
 *
 * The woman in the parable sweeps a dark house by lamplight until she finds
 * one coin out of ten. So this is a search and not a memory test, and the
 * difference between those two is the whole design.
 *
 * A memory test would shuffle fast enough that following the coin is the
 * skill. That game has a loser. This one shows the coin, moves the cloths
 * slowly enough to be followed on purpose, and then helps — more and more —
 * until the child finds it. A six-year-old who watches carefully wins on the
 * first try; one who looks away wins on the third, with Halo beside them.
 * Nobody loses, because losing is not a thing the parable contains.
 *
 * **Help changes the task, never the child.** That is the rule this model
 * exists to demonstrate, and it is why there is no hint *string*. Words
 * cannot make a search easier — they can only say "try harder", which is a
 * verdict wearing a helpful voice. Here, help is mechanical:
 *
 *   miss 1   the cloth the coin is under begins to stir, very slightly
 *   miss 2   cloths that are certainly empty withdraw from the floor
 *   miss 3   only two cloths are left, and one of them is stirring
 *
 * By the third miss the task is nearly done for the child, and the child is
 * still the one who does it. Tapping is always theirs.
 *
 * Nothing is counted where a child can see it. There is no score, no timer,
 * no "attempt 2 of 3" — the misses only ever change how much help arrives.
 */

/** How many cloths each round is played with. Round two adds two more. */
const CLOTHS = [6, 8] as const;

const TIMING = {
  /** How long the coin is plainly visible before it is covered. */
  reveal: 1600,
  /** The cloth settling over it. Slow enough to read as covering. */
  cover: 700,
  /** One pass of the cloths moving. Deliberately followable. */
  shuffle: 900,
  /** Between passes, so the eye can catch up. */
  between: 260,
  /** How long a wrong cloth stays lifted before it settles back. */
  peek: 900,
  /** Stillness before Halo offers to look with them. */
  stillness: 7000,
  /** The found coin, before the round is called done. */
  savour: 1500,
} as const;

/** How many passes the cloths make. Two is followable; five is a blur. */
const PASSES = 2;

type Phase = "showing" | "covering" | "shuffling" | "asking" | "found";

export default function Finding({
  interaction,
  locked,
  active,
  onMiss,
  onArrive,
}: ModelProps<Model>) {
  const rounds = interaction.rounds ?? 1;

  const [round, setRound] = useState(0);
  const count = CLOTHS[Math.min(round, CLOTHS.length - 1)] ?? 6;

  const [phase, setPhase] = useState<Phase>("showing");
  /*
    Deliberately not random at first.

    This component is server-rendered into the static export, so anything
    random in initial state renders one way on the server and another in the
    browser, and React throws a hydration mismatch. The coin is placed, and
    the cloths shuffled, in the effect below — after mount, where randomness
    is safe and where the child is looking anyway.
  */
  /** Which cloth hides the coin. Never revealed except by lifting it. */
  const [coin, setCoin] = useState(0);
  /** The order cloths sit in, so shuffling is a reorder and not a redraw. */
  const [order, setOrder] = useState<number[]>(() => [0, 1, 2, 3, 4, 5]);
  /** The one a child has lifted and found empty, until it settles back. */
  const [lifted, setLifted] = useState<number | null>(null);
  /** Cloths that have withdrawn to make the search smaller. */
  const [gone, setGone] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);

  const timers = useRef<number[]>([]);
  const after = useCallback((ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  }, []);

  const clear = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);

  /*
    Show, cover, move, ask.

    Each step is its own beat with its own duration, because the point is that
    a child can follow the coin if they watch. One effect owns the whole
    sequence for a round and clears every timer it made when it is torn down,
    so a re-render — React's development double-invoke, most of all — can
    never leave two chains running the same round half a second apart.
  */
  useEffect(() => {
    /*
      Nothing happens on a page nobody has turned to yet. The reader keeps the
      next page mounted so it can be revealed mid-drag, and without this the
      coin would be shown, hidden and shuffled to an empty room — so a child
      arriving would find a search already in progress, with the one thing
      they needed to see over and done with.
    */
    if (locked || !active) return;

    const made: number[] = [];
    const at = (ms: number, run: () => void) => {
      made.push(window.setTimeout(run, ms));
    };

    // The coin is placed here rather than in initial state; see above.
    setCoin(Math.floor(Math.random() * count));
    setOrder([...Array(count).keys()]);
    setLifted(null);
    setGone([]);
    setMisses(0);
    setPhase("showing");

    at(TIMING.reveal, () => setPhase("covering"));
    at(TIMING.reveal + TIMING.cover, () => setPhase("shuffling"));

    for (let pass = 0; pass < PASSES; pass++) {
      at(
        TIMING.reveal + TIMING.cover + pass * (TIMING.shuffle + TIMING.between),
        () => {
          setOrder((was) => {
            /*
              A rotation with one swap, not a full randomisation. Every cloth
              travels a short, continuous distance an eye can follow, which is
              exactly what a child is being invited to do. Fisher–Yates
              teleports them and makes watching pointless.
            */
            const next = [...was.slice(1), was[0]!];
            const a = Math.floor(Math.random() * next.length);
            const b = (a + 1) % next.length;
            [next[a], next[b]] = [next[b]!, next[a]!];
            return next;
          });
        },
      );
    }

    at(
      TIMING.reveal + TIMING.cover + PASSES * (TIMING.shuffle + TIMING.between),
      () => setPhase("asking"),
    );

    return () => made.forEach(window.clearTimeout);
  }, [round, count, locked, active]);

  /*
    Stillness asks for help as loudly as a wrong answer does, and for the
    same reason: a child who does not know what to do usually does nothing.
    The help is the same help — the task gets smaller.
  */
  useEffect(() => {
    if (phase !== "asking" || locked || !active) return;
    const timer = window.setTimeout(() => help(misses + 1), TIMING.stillness);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, misses, locked, active]);

  /**
   * Make the search smaller.
   *
   * Never says which cloth is right; only removes ones that are wrong, and
   * lets the right one move. The child still performs the finding.
   */
  const help = (level: number) => {
    setMisses(level);

    if (level >= 2) {
      // Withdraw empty cloths, leaving fewer to search. At level 3 only two
      // remain — still a choice, and one a child makes themselves.
      setGone((was) => {
        const keep = level >= 3 ? 2 : Math.max(3, count - 2);
        const empties = order.filter((c) => c !== coin && !was.includes(c));
        const withdraw = empties.slice(0, Math.max(0, count - was.length - keep));
        return [...was, ...withdraw];
      });
    }
  };

  function choose(cloth: number) {
    if (phase !== "asking" || locked || !active || gone.includes(cloth)) return;

    if (cloth === coin) {
      clear();
      setPhase("found");
      after(TIMING.savour, () => {
        if (round + 1 < rounds) setRound(round + 1);
        else onArrive();
      });
      return;
    }

    setLifted(cloth);
    onMiss();
    after(TIMING.peek, () => setLifted(null));
    help(misses + 1);
  }

  /** The cloth covering the coin stirs from the first miss onward. */
  const stirring = misses >= 1 && phase === "asking";

  const asking =
    phase === "showing" || phase === "covering"
      ? "Here it is — watch where it goes."
      : phase === "shuffling"
        ? "Where is it now?"
        : phase === "found"
          ? "You found it!"
          : misses >= 2
            ? "Fewer places to look now."
            : misses >= 1
              ? "Look closely…"
              : interaction.prompt;

  return (
    <div className="finding">
      <h2 className="asking text-center leading-snug text-balance">{asking}</h2>

      {/*
        The floor. A warm pool of lamplight on a dark house, which is both the
        parable's own image and the reason the cloths read as cloth: they are
        lit from one side by something the child can see.
      */}
      <div
        className="finding-floor"
        data-phase={phase}
        style={{ "--cloths": count } as React.CSSProperties}
      >
        <div className="finding-lamp" aria-hidden />

        <ul className="finding-cloths">
          {order.map((cloth, at) => {
            const away = gone.includes(cloth);
            const open =
              (phase === "showing" && cloth === coin) ||
              (lifted === cloth) ||
              (phase === "found" && cloth === coin);

            return (
              <li
                key={cloth}
                className="finding-slot"
                style={{ "--at": at } as React.CSSProperties}
              >
                <button
                  type="button"
                  className="finding-cloth"
                  data-open={open ? "" : undefined}
                  data-away={away ? "" : undefined}
                  data-stirring={stirring && cloth === coin ? "" : undefined}
                  data-found={phase === "found" && cloth === coin ? "" : undefined}
                  disabled={phase !== "asking" || locked || !active || away}
                  onClick={() => choose(cloth)}
                  aria-label={
                    away
                      ? "This cloth has been moved away"
                      : open && cloth === coin
                        ? "The lost coin"
                        : `Look under cloth ${at + 1}`
                  }
                >
                  {/* The coin, under the cloth. Drawn, never photographed. */}
                  <span className="finding-coin" aria-hidden>
                    <span className="finding-coin-face" />
                  </span>

                  {/* The cloth itself: three folds and a shadow, in CSS. */}
                  <span className="finding-fabric" aria-hidden>
                    <span className="finding-fold" />
                    <span className="finding-fold" />
                    <span className="finding-fold" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/*
        Which round, said once and quietly, so a child knows there is an end.
        Not a score and not a count of tries — only two rounds exist, and the
        second is the last.
      */}
      {rounds > 1 ? (
        <p className="finding-round" aria-live="polite">
          {round === 0 ? "First search" : "Last search"}
        </p>
      ) : null}
    </div>
  );
}
