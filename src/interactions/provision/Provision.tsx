"use client";

import { useEffect, useRef, useState } from "react";

import type { ModelProps, Provision as Model } from "../types";

/**
 * Morning, and then evening.
 *
 * The chapter's own game, and the one built rather than illustrated — the
 * third in the product, after Cana's jars and the Lost Coin's cloths.
 *
 * "How did God take care of his people?" is a question a child can answer
 * with a word. What they will actually remember is an empty desert floor at
 * sunrise filling with manna under their hand, and then the sky going orange
 * and the quails arriving. Two halves of one day, the same God at both ends
 * of it, which is the shape of the answer and not merely its content.
 *
 * Nothing is timed and nothing is lost. A choice that did not work leaves the
 * ground empty and the question standing, and the help that follows makes the
 * question smaller — the option that is not the answer steps out of the way.
 * The sky is the only clock, and it only ever moves forward.
 */

/** How long the ground takes to fill, before the phase is called done. */
const FILLING = 1800;
/** The sky turning from morning to evening, between the two halves. */
const DUSK = 1200;

export default function Provision({
  interaction,
  rung,
  locked,
  onMiss,
  onArrive,
}: ModelProps<Model>) {
  const [at, setAt] = useState(0);
  /** Options tried that were not what God sent. */
  const [aside, setAside] = useState<number[]>([]);
  /** The ground is filling, or has filled, for this phase. */
  const [filled, setFilled] = useState(false);
  /** The sky has begun turning towards the next phase. */
  const [turning, setTurning] = useState(false);

  const timers = useRef<number[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout);
    },
    [],
  );

  const phase = interaction.phases[at];
  if (!phase) return null;

  const last = at === interaction.phases.length - 1;

  function after(ms: number, run: () => void) {
    timers.current.push(window.setTimeout(run, ms));
  }

  function choose(index: number) {
    const option = phase!.options[index];
    if (!option || locked || filled || aside.includes(index)) return;

    if (!option.correct) {
      onMiss();
      setAside((was) => [...was, index]);
      return;
    }

    setFilled(true);
    after(FILLING, () => {
      if (last) {
        onArrive();
        return;
      }
      // The sky turns, and then the next half of the day begins.
      setTurning(true);
      after(DUSK, () => {
        setAt((n) => n + 1);
        setAside([]);
        setFilled(false);
        setTurning(false);
      });
    });
  }

  const pointingAt =
    rung >= 3 && !filled && !locked
      ? phase.options.findIndex((o) => o.correct)
      : -1;

  /*
    Enough of them to read as "the ground was filled" rather than "some
    things appeared". Positions are deterministic — a hash of the index —
    so the server and the browser draw the same desert and React does not
    throw a hydration mismatch over scattered food.
  */
  const scatter = Array.from({ length: 18 }, (_, i) => ({
    left: (i * 37) % 97,
    top: (i * 53) % 88,
    delay: (i % 6) * 90,
  }));

  return (
    <div className="flex w-full max-w-md flex-col gap-4 px-3">
      <h2 className="asking text-center leading-snug text-balance">
        {filled ? phase.then : phase.prompt}
      </h2>

      {/*
        The desert floor, and the sky over it. `data-time` is the only thing
        that changes the light — one attribute, two skies, and the turn
        between them is a transition rather than a second component.
      */}
      <div
        className="provision-scene"
        data-time={phase.time}
        data-turning={turning ? "" : undefined}
        data-filled={filled ? "" : undefined}
      >
        <div className="provision-sky" aria-hidden />
        <div className="provision-sun" aria-hidden />
        <div className="provision-hills" aria-hidden />

        <div className="provision-ground" aria-hidden>
          {scatter.map((bit, i) => (
            <span
              key={i}
              className={phase.falls === "manna" ? "provision-manna" : "provision-quail"}
              style={
                {
                  "--left": `${bit.left}%`,
                  "--top": `${bit.top}%`,
                  "--delay": `${bit.delay}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>

      {filled ? null : (
        <ul className="flex flex-col gap-3">
          {phase.options.map((option, index) => {
            const stepped = aside.includes(index);
            return (
              <li key={option.label}>
                <button
                  type="button"
                  className={[
                    "option-card w-full",
                    stepped && "is-aside",
                    pointingAt === index && "noticing",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => choose(index)}
                  disabled={locked || stepped}
                  aria-label={stepped ? `${option.label}, not this one` : option.label}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/*
        The closing line, once both halves of the day have been provided for.
        Said on the screen at the end of the evening, which is the moment it
        is actually true.
      */}
      {filled && last ? (
        <p className="provision-closing" aria-live="polite">
          {interaction.closing}
        </p>
      ) : null}
    </div>
  );
}
