"use client";

import { useMemo, useRef, useState } from "react";

import Picture from "@/components/Picture";

import { useShuffled } from "../shuffle";
import type { ModelProps, Pairing as PairingInteraction } from "../types";

/**
 * Pairing — finding which two belong together.
 *
 * Two ways to play it, and a child does not have to know there are two. Drag
 * a card across to its partner, or tap one and then tap the other; both run
 * through the same `join`, so neither is a special case with its own rules.
 * Dragging is what a child reaches for first, because that is what the two
 * columns look like they want. Tapping is what has to work when dragging is
 * hard — a small hand, a trackpad, a keyboard, a screen reader — and it is
 * also the gesture the other two games use.
 *
 * A drag is only a drag once the finger has actually travelled. Below that
 * it is a tap, and it picks the card up in the tap-then-tap sense. So the
 * child who presses and hesitates has not accidentally started something.
 *
 * A pair that does not belong together settles back, and the child is
 * looking at exactly what they were looking at before. A pair that does
 * belong together stays joined and steps out of the way — quietly, so what
 * is left is the part still to do rather than a score of what has been done.
 *
 * The answer key is the shape of the content: `from` and `to` live inside
 * one object, so this file compares which pair each half came from and
 * nothing else. Both columns are shuffled, independently, and neither
 * shuffle can affect what belongs to what.
 */
const DRAG_BEGINS = 8;

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
  /** Where the carried card is, while it is being dragged. */
  const [carry, setCarry] = useState<{ x: number; y: number } | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const from = useRef<{ x: number; y: number } | null>(null);

  const solved = (pair: number) => joined.includes(pair);

  /*
    Where the ladder points.

    It never joins a pair for the child. At the "narrow the field" rung it
    answers the question they have already asked by picking something up —
    *this* is the one it goes with — and at the last rung it also says where
    to start, for a child who has not picked anything up at all. Both are
    pointing; the action that joins them is still theirs.
  */
  const pointingAt =
    rung >= 2 && held !== null && !locked
      ? held
      : rung >= 3 && held === null && !locked
        ? (lefts.find((left) => !solved(left.pair))?.pair ?? null)
        : null;

  function join(pair: number) {
    if (locked || held === null || solved(pair)) return;

    if (held === pair) {
      const now = [...joined, pair];
      setJoined(now);
      setHeld(null);
      if (now.length === interaction.pairs.length) onArrive();
      return;
    }

    setSettling(pair);
    window.setTimeout(() => setSettling(null), 300);
    setHeld(null);
    onMiss();
  }

  /* Dragging, from the left column. */

  function grab(event: React.PointerEvent, pair: number) {
    if (locked || solved(pair)) return;
    from.current = { x: event.clientX, y: event.clientY };
    setHeld(pair);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: React.PointerEvent) {
    const start = from.current;
    if (start === null) return;

    const travelled = Math.hypot(
      event.clientX - start.x,
      event.clientY - start.y,
    );
    if (!carry && travelled < DRAG_BEGINS) return;

    setCarry({ x: event.clientX, y: event.clientY });

    // What is under the finger, asked of the document rather than tracked by
    // enter and leave events, which pointer capture would otherwise swallow.
    const under = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest("[data-pair-to]");
    const target = under?.getAttribute("data-pair-to");
    setOver(target === null || target === undefined ? null : Number(target));
  }

  function release() {
    const dropped = over;
    const dragged = carry !== null;

    from.current = null;
    setCarry(null);
    setOver(null);

    // A press that never travelled is a tap: the card stays picked up, and
    // the child's next tap says where it goes.
    if (!dragged) return;
    if (dropped === null) {
      setHeld(null);
      return;
    }
    join(dropped);
  }

  const carried = held !== null ? interaction.pairs[held]?.from : undefined;

  return (
    <div className="flex w-full max-w-xl flex-col gap-3 px-4">
      <h2 className="text-center text-2xl leading-snug text-balance">
        {interaction.prompt}
      </h2>

      {/*
        How to play it, said once and plainly.

        Both ways are named, shortest first, because a child who reads only
        the first half still knows enough to start. It stays on screen for
        the whole game rather than appearing after a struggle — an
        instruction that arrives only once you are stuck is a correction.
      */}
      <p className="text-center text-base text-ink-soft">
        Drag a card to its partner, or tap one and then the other.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <ul className="flex flex-col gap-2">
          {lefts.map((entry) => {
            const done = solved(entry.pair);
            const holding = held === entry.pair;

            return (
              <li key={`from-${entry.pair}`}>
                <button
                  type="button"
                  onPointerDown={(e) => grab(e, entry.pair)}
                  onPointerMove={drag}
                  onPointerUp={release}
                  onPointerCancel={release}
                  aria-pressed={holding}
                  disabled={done || locked}
                  className={[
                    "pair-cell flex min-h-16 w-full touch-none items-center gap-2 px-3 py-2 text-left text-base leading-tight",
                    done && "is-joined blooming",
                    holding && "is-held",
                    carry && holding && "is-carrying",
                    rung >= 3 && held === null && pointingAt === entry.pair && "noticing",
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
                  <span className="min-w-0 flex-1 text-balance">
                    {entry.item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <ul className="flex flex-col gap-2">
          {rights.map((entry) => {
            const done = solved(entry.pair);

            return (
              <li key={`to-${entry.pair}`}>
                <button
                  type="button"
                  data-pair-to={entry.pair}
                  onClick={() => join(entry.pair)}
                  disabled={done || locked}
                  className={[
                    "pair-cell flex min-h-16 w-full items-center gap-2 px-3 py-2 text-left text-base leading-tight",
                    done && "is-joined blooming",
                    over === entry.pair && !done && "is-over",
                    settling === entry.pair && "settling",
                    pointingAt === entry.pair && !done && "noticing",
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
                  <span className="min-w-0 flex-1 text-balance">
                    {entry.item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* The card under the finger. Follows it, and is not in anyone's way. */}
      {carry && carried ? (
        <div
          className="pair-carried"
          style={{ left: `${carry.x}px`, top: `${carry.y}px` }}
          aria-hidden
        >
          {carried.label}
        </div>
      ) : null}
    </div>
  );
}
