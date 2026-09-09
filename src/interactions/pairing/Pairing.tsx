"use client";

import { useMemo, useState } from "react";

import Picture from "@/components/Picture";

import { useShuffled } from "../shuffle";
import type { ModelProps, Pairing as PairingInteraction } from "../types";

/**
 * Pairing — finding which two belong together.
 *
 * Two columns, and one gesture: tap something on the left, then tap what
 * goes with it. Not lines dragged between columns — a drawn line is a fine
 * thing on a desk and a poor thing on a phone, where the two ends are a
 * thumb's width apart and the line has to be dragged accurately between
 * them. Tap-then-tap is the same gesture the other two games use.
 *
 * A pair that does not belong together settles back, both halves at once,
 * and the child is looking at exactly what they were looking at before. A
 * pair that does belong together stays joined and steps out of the way —
 * quietly, so that what is left is the part still to do rather than a score
 * of what has been done.
 *
 * The answer key is the shape of the content: `from` and `to` live inside
 * one object, so this file compares which pair each half came from and
 * nothing else. Both columns are shuffled, independently, and neither
 * shuffle can affect what belongs to what.
 */
export default function Pairing({
  interaction,
  rung,
  locked,
  onMiss,
  onArrive,
}: ModelProps<PairingInteraction>) {
  /*
    Each half remembers the pair it came from, and then the two columns are
    shuffled separately. Built once per interaction so the shuffler is handed
    the same array every render and never re-rolls under the child.
  */
  const [fromSide, toSide] = useMemo(
    () => [
      interaction.pairs.map((pair, index) => ({ pair: index, item: pair.from })),
      interaction.pairs.map((pair, index) => ({ pair: index, item: pair.to })),
    ],
    [interaction.pairs],
  );

  const lefts = useShuffled(fromSide);
  const rights = useShuffled(toSide);

  const [joined, setJoined] = useState<number[]>([]);
  const [held, setHeld] = useState<number | null>(null);
  const [settling, setSettling] = useState<number | null>(null);

  const solved = (pair: number) => joined.includes(pair);

  /*
    Where the ladder points.

    It never joins a pair for the child. At the "narrow the field" rung it
    answers the question they have already asked by picking something up —
    *this* is the one it goes with — and at the last rung it also says where
    to start, for a child who has not picked anything up at all. Both are
    pointing; the tap that joins them is still theirs.
  */
  const pointingAt =
    rung >= 2 && held !== null && !locked
      ? held
      : rung >= 3 && held === null && !locked
        ? (lefts.find((left) => !solved(left.pair))?.pair ?? null)
        : null;

  function take(pair: number) {
    if (locked || solved(pair)) return;
    setHeld((current) => (current === pair ? null : pair));
  }

  function offer(pair: number) {
    if (locked || solved(pair) || held === null) return;

    if (held === pair) {
      const now = [...joined, pair];
      setJoined(now);
      setHeld(null);
      if (now.length === interaction.pairs.length) onArrive();
      return;
    }

    // Both halves settle, because both were part of the guess.
    setSettling(pair);
    window.setTimeout(() => setSettling(null), 300);
    setHeld(null);
    onMiss();
  }

  const cell = (
    entry: { pair: number; item: { art?: { name: string; src: string | null }; label?: string } },
    side: "from" | "to",
  ) => {
    const done = solved(entry.pair);
    const holding = side === "from" && held === entry.pair;
    const pointed =
      side === "to" ? pointingAt === entry.pair : rung >= 3 && held === null && pointingAt === entry.pair;

    return (
      <li key={`${side}-${entry.pair}`}>
        <button
          type="button"
          onClick={() => (side === "from" ? take(entry.pair) : offer(entry.pair))}
          aria-pressed={side === "from" ? holding : undefined}
          disabled={done || locked}
          className={[
            "pair-cell flex min-h-16 w-full items-center gap-2 px-3 py-2 text-left text-base leading-tight",
            done && "is-joined",
            holding && "is-held",
            settling === entry.pair && "settling",
            done && "blooming",
            pointed && !done && "noticing",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {entry.item.art ? (
            <Picture
              art={entry.item.art}
              className="size-10 shrink-0 rounded-lg object-cover"
            />
          ) : null}
          <span className="min-w-0 flex-1 text-balance">{entry.item.label}</span>
        </button>
      </li>
    );
  };

  return (
    <div className="flex w-full max-w-xl flex-col gap-4 px-4">
      <h2 className="text-center text-2xl leading-snug text-balance">
        {interaction.prompt}
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <ul className="flex flex-col gap-2">
          {lefts.map((entry) => cell(entry, "from"))}
        </ul>
        <ul className="flex flex-col gap-2">
          {rights.map((entry) => cell(entry, "to"))}
        </ul>
      </div>
    </div>
  );
}
