"use client";

import { useEffect, useRef, useState } from "react";

import Picture from "@/components/Picture";

import type { Journey as Model, ModelProps } from "../types";

/**
 * Choosing who leads, and then watching the people go.
 *
 * "Whom did God send to deliver his people?" has one right answer and it is
 * a name, which is exactly the shape that becomes a quiz if you let it. What
 * stops it here is that the answer *causes* something: pick Moses and the
 * column of Israelites, which has been standing still at the edge of the
 * screen, starts walking. The child has not recalled a fact, they have
 * started the journey.
 *
 * The walking is CSS and the people are shapes — robes, staffs, a child among
 * them. No artwork was drawn for this, and none needed to be: the story's own
 * panels are photographs of a moment, and what this needs is a thing that
 * moves. Silhouettes at this size read better than a cropped panel would.
 *
 * Help changes the task, never the child: a choice that did not work steps
 * aside rather than being marked, so the second try is a smaller question.
 */
const WALKING = 2200;

export default function Journey({
  interaction,
  rung,
  locked,
  onMiss,
  onArrive,
}: ModelProps<Model>) {
  /** Choices that have been tried and stepped aside. */
  const [aside, setAside] = useState<number[]>([]);
  const [going, setGoing] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  function choose(index: number) {
    const choice = interaction.choices[index];
    if (!choice || locked || going || aside.includes(index)) return;

    if (!choice.correct) {
      onMiss();
      setAside((was) => [...was, index]);
      return;
    }

    setGoing(true);
    timer.current = window.setTimeout(onArrive, WALKING);
  }

  /*
    At the top rung the one God sent is lit. Still tapped by the child —
    the ladder makes the task smaller and never makes the choice for them.
  */
  const pointingAt =
    rung >= 3 && !going && !locked
      ? interaction.choices.findIndex((c) => c.correct)
      : -1;

  return (
    <div className="flex w-full max-w-md flex-col gap-4 px-3">
      <h2 className="asking text-center leading-snug text-balance">
        {going ? interaction.then : interaction.prompt}
      </h2>

      {/*
        The road. A band of desert with the people on it, walking once
        somebody has been sent to lead them.
      */}
      <div className="journey-road" data-going={going ? "" : undefined}>
        <div className="journey-sun" aria-hidden />
        <div className="journey-people" aria-hidden>
          {/* A leader with a staff, then the people behind him. */}
          <span className="journey-walker journey-leader">
            <span className="journey-staff" />
          </span>
          <span className="journey-walker" />
          <span className="journey-walker journey-child" />
          <span className="journey-walker" />
          <span className="journey-walker journey-child" />
          <span className="journey-walker" />
        </div>
      </div>

      {going ? null : (
        <ul className="grid grid-cols-2 gap-3">
          {interaction.choices.map((choice, index) => {
            const stepped = aside.includes(index);
            return (
              <li key={choice.label}>
                <button
                  type="button"
                  className={[
                    "journey-choice",
                    stepped && "is-aside",
                    pointingAt === index && "noticing",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => choose(index)}
                  disabled={locked || stepped}
                  aria-label={
                    stepped ? `${choice.label}, not this one` : choice.label
                  }
                >
                  {choice.art ? (
                    <Picture art={choice.art} className="step-art object-cover" />
                  ) : null}
                  <span className="px-2 py-1.5 text-sm leading-tight font-semibold text-balance">
                    {choice.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/*
        Only spoken once, and only while the people are walking. The reader
        announces the change; the picture is doing the telling.
      */}
      {going ? (
        <p className="sr-only" aria-live="polite">
          {interaction.then}
        </p>
      ) : null}
    </div>
  );
}
