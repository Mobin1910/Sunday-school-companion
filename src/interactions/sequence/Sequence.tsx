"use client";

import { useRef, useState } from "react";

import Picture from "@/components/Picture";

import { useShuffled } from "../shuffle";
import type { ModelProps, Ordering } from "../types";

/** How far a finger travels before a press becomes a drag. */
const DRAG_BEGINS = 8;

/**
 * Sequence — putting the story back in order.
 *
 * The child builds the story forwards, one step at a time: tap the moment
 * they think comes next, or carry it up to the row of slots and drop it
 * there. Both run through the same `place`, so neither is a special case
 * with its own rules — the same arrangement Pairing settled on.
 *
 * Tapping came first and stays first. It is what has to work when dragging
 * is hard: a small hand, a trackpad, a keyboard, a screen reader. Dragging
 * was added because a row of empty slots above a pile of pictures looks
 * exactly like something you drag into, and a child who tries it and finds
 * nothing happens has been told the interface is broken.
 *
 * A drag is only a drag once the finger has actually travelled. Below that
 * it is a tap, so a child who presses and hesitates has not accidentally
 * started something.
 *
 * A step dropped anywhere on the row is the same as tapping it, and the slot
 * it lands on does not matter. That is one rule rather than two — only the
 * step that comes next will stay — and it means a child who drops the right
 * picture on the wrong square is not punished for aiming.
 *
 * Only the step that comes next will stay. A step tapped out of turn settles
 * back exactly where it was — the same grammar Selection uses for a choice
 * that does not stay, and for the same reason: it is a fact about the story,
 * not a verdict on the child. Nothing reddens and nothing is taken away.
 *
 * Checking each tap rather than the whole arrangement at the end is what
 * makes it a story rather than a puzzle. A child who lays out four cards and
 * is then told the arrangement is wrong has learned nothing about which part
 * was wrong; a child who taps and sees it settle back knows immediately, and
 * still has every other step in front of them.
 *
 * The answer key is `position` on each step, so this file never once reads
 * the order the steps arrived in. They arrive shuffled, and the shuffling
 * cannot lie because it never touches the number.
 */
export default function Sequence({
  interaction,
  rung,
  locked,
  onMiss,
  onArrive,
}: ModelProps<Ordering>) {
  const steps = useShuffled(interaction.items);

  /** Positions already laid down, in the order the child laid them. */
  const [placed, setPlaced] = useState<number[]>([]);
  const [settling, setSettling] = useState<number | null>(null);

  /** The step under the finger, and where the finger is, while dragging. */
  const [held, setHeld] = useState<number | null>(null);
  const [carry, setCarry] = useState<{ x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);

  const from = useRef<{ x: number; y: number } | null>(null);
  const justDragged = useRef(false);

  const total = steps.length;
  const next = placed.length + 1;

  /*
    "Let's start together" — the first step, settled by the app.

    This is the only assistance in the product that acts for the child, and
    it is bounded to exactly one step and only while they have not begun.
    Beyond that the ladder points and never places: finishing a sequence for
    a child would take away the only thing they came here to do.
  */
  const settledForThem = rung >= 2 && placed.length === 0;
  const laid = settledForThem ? [1] : placed;
  const wanted = laid.length + 1;

  function place(position: number) {
    if (locked) return;

    if (position !== wanted) {
      setSettling(position);
      window.setTimeout(() => setSettling(null), 300);
      onMiss();
      return;
    }

    const now = [...laid, position];
    setPlaced(now);
    if (now.length === total) onArrive();
  }

  /* Carrying a step up to the row. */

  function grab(event: React.PointerEvent, position: number) {
    if (locked || laid.includes(position)) return;
    from.current = { x: event.clientX, y: event.clientY };
    setHeld(position);
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

    // What is under the finger, asked of the document rather than tracked
    // with enter and leave events, which pointer capture would swallow.
    const under = document.elementFromPoint(event.clientX, event.clientY);
    setOver(under?.closest("[data-step-row]") != null);
  }

  function release() {
    const dropped = over;
    const dragged = carry !== null;
    const carrying = held;

    from.current = null;
    setCarry(null);
    setOver(false);
    setHeld(null);

    // A press that never travelled is a tap, and the button's own click is
    // about to place it. Anything further here would place it twice.
    if (!dragged || carrying === null) return;

    /*
      A drag is finished by this handler, so the click the browser sends
      afterwards has to be swallowed — otherwise the step is placed once by
      the drop and once by the click, and the second one arrives after it is
      already down, which reads to a child as their own correct answer being
      refused.
    */
    justDragged.current = true;
    if (dropped) place(carrying);
  }

  const carried = steps.find((step) => step.position === held);

  return (
    <div className="flex w-full max-w-xl flex-col gap-3 px-2">
      <h2 className="asking text-center leading-snug text-balance">
        {interaction.prompt}
      </h2>

      {/*
        The story so far. It holds all of its slots from the first frame,
        filled and empty alike, so the row never grows under a child's hand
        and they can see how much story is left to lay down.
      */}
      <ol
        data-step-row
        className="flex justify-center gap-2"
        aria-label="The story so far"
      >
        {Array.from({ length: total }, (_, i) => {
          const position = i + 1;
          const step = steps.find((s) => s.position === position);
          const filled = laid.includes(position);

          return (
            <li
              key={position}
              className={[
                "step-slot",
                filled && "is-filled",
                // Every empty slot lights while something is being carried:
                // the row is the target, not one square of it.
                over && !filled && "is-over",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={!filled && position === wanted ? "step" : undefined}
            >
              {filled && step?.art ? (
                <Picture art={step.art} className="size-full object-cover" />
              ) : (
                <span className="text-lg text-ink-soft" aria-hidden>
                  {position}
                </span>
              )}
              <span className="sr-only">
                {filled ? `${position}. ${step?.label ?? "placed"}` : `${position}. empty`}
              </span>
            </li>
          );
        })}
      </ol>

      <ul className="grid grid-cols-2 gap-3">
        {steps.map((step) => {
          const done = laid.includes(step.position);
          const showing = rung >= 3 && step.position === wanted && !locked;

          return (
            <li key={step.position} className={done ? "invisible" : ""}>
              <button
                type="button"
                onClick={() => {
                  if (justDragged.current) {
                    justDragged.current = false;
                    return;
                  }
                  place(step.position);
                }}
                onPointerDown={(e) => grab(e, step.position)}
                onPointerMove={drag}
                onPointerUp={release}
                onPointerCancel={release}
                aria-hidden={done}
                tabIndex={done ? -1 : 0}
                className={[
                  "step-card flex w-full touch-none flex-col items-stretch overflow-hidden text-left",
                  settling === step.position && "settling",
                  showing && "noticing",
                  carry && held === step.position && "is-carrying",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {step.art ? (
                  <Picture art={step.art} className="step-art object-cover" />
                ) : null}
                <span className="px-2 py-1.5 text-sm leading-tight font-semibold text-balance">
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* The step under the finger. Follows it, and is not in anyone's way. */}
      {carry && carried ? (
        <div
          className="step-carried"
          style={{ left: `${carry.x}px`, top: `${carry.y}px` }}
          aria-hidden
        >
          {carried.art ? (
            <Picture art={carried.art} className="size-full object-cover" />
          ) : (
            <span className="px-2 text-sm leading-tight font-semibold">
              {carried.label}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
