"use client";

import { useState } from "react";

import Picture from "@/components/Picture";

import { useShuffled } from "../shuffle";
import type { ModelProps, Ordering } from "../types";

/**
 * Sequence — putting the story back in order.
 *
 * The child builds the story forwards, one step at a time, by tapping the
 * moment they think comes next. That is the whole interaction, and it is
 * deliberately not drag-and-drop: dragging asks a six-year-old to hold a
 * finger down, track a moving target and let go in the right place, and it
 * is close to unusable with a screen reader or a keyboard. Tapping is one
 * gesture they already know, and it is the same gesture Selection uses, so
 * nothing new has to be learned to play a different game.
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

  return (
    <div className="flex w-full max-w-xl flex-col gap-4 px-4">
      <h2 className="text-center text-2xl leading-snug text-balance">
        {interaction.prompt}
      </h2>

      {/*
        The story so far. It holds all of its slots from the first frame,
        filled and empty alike, so the row never grows under a child's hand
        and they can see how much story is left to lay down.
      */}
      <ol className="flex justify-center gap-2" aria-label="The story so far">
        {Array.from({ length: total }, (_, i) => {
          const position = i + 1;
          const step = steps.find((s) => s.position === position);
          const filled = laid.includes(position);

          return (
            <li
              key={position}
              className={`step-slot ${filled ? "is-filled" : ""}`}
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
                onClick={() => place(step.position)}
                aria-hidden={done}
                tabIndex={done ? -1 : 0}
                className={[
                  "step-card flex w-full flex-col items-stretch overflow-hidden text-left",
                  settling === step.position && "settling",
                  showing && "noticing",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {step.art ? (
                  <Picture art={step.art} className="step-art object-cover" />
                ) : null}
                <span className="px-3 py-2 text-base leading-tight font-semibold text-balance">
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
