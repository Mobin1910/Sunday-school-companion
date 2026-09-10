"use client";

import { useEffect, useRef, useState } from "react";

import Picture from "@/components/Picture";

import type { Discovery, ModelProps } from "../types";

/**
 * Reveal — doing the thing, rather than answering about it.
 *
 * The last of the five presentations, and the only one with no wrong answer
 * in it: every item is there to be touched, touching them can be done in any
 * order, and the interaction ends when they all have been. `onMiss` is never
 * called from this file. That is not an oversight — a discovery a child can
 * get wrong is a quiz wearing a costume.
 *
 * What it is for at Cana is the whole argument for building it. A child can
 * be asked "what did Jesus tell the servants to do?" and pick the right word
 * out of three; or they can fill the jars. The second one is the story
 * happening under their hand, and it needs no new engine to do it — the same
 * player, the same Halo, the same ladder, the same celebration.
 *
 * Two beats, and the second is the point. Each tap fills one jar, which is
 * the part the child does; when the last one is full there is a pause, and
 * then every jar turns at once, which is the part they did not do and could
 * not have. Making that a separate beat is the difference between watching
 * water become wine and watching a puzzle report that it is finished.
 *
 * The pause is deliberately longer than a transition. It is the moment
 * between the servants finishing and anyone noticing, and without it the
 * change lands inside the same glance as the last tap and reads as the tap's
 * own animation.
 *
 * Nothing here is shuffled. Six identical jars have no order to disturb, and
 * an item's meaning is what it shows rather than where it sits.
 */

/** Long enough that the change is its own event, not the tap's echo. */
const BEFORE_IT_TURNS = 900;

export default function Reveal({
  interaction,
  rung,
  locked,
  onArrive,
}: ModelProps<Discovery>) {
  const [found, setFound] = useState<number[]>([]);
  const [turned, setTurned] = useState(false);
  const [just, setJust] = useState<number | null>(null);
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = interaction.items.length;
  const all = found.length === total;

  /*
    The second beat. It runs on its own once the last one is filled, so the
    child is not asked to press anything to see what happened — they have
    already done their part, and being made to confirm it would take the
    moment and turn it into a step.
  */
  useEffect(() => {
    if (!all || turned) return;

    if (!interaction.becomes) {
      onArrive();
      setTurned(true);
      return;
    }

    waiting.current = setTimeout(() => {
      setTurned(true);
      onArrive();
    }, BEFORE_IT_TURNS);

    return () => {
      if (waiting.current) clearTimeout(waiting.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, turned]);

  function touch(index: number) {
    if (locked || found.includes(index)) return;
    setFound((seen) => [...seen, index]);
    setJust(index);
    window.setTimeout(() => setJust((now) => (now === index ? null : now)), 700);
  }

  /*
    The ladder never narrows anything here, because there is nothing to
    narrow. All it does at the top rung is point at one that is still
    waiting — which is what a child who has stopped is usually missing: not
    what to do, but which one they have not done.
  */
  const pointingAt =
    rung >= 3 && !locked && !all
      ? interaction.items.findIndex((_, i) => !found.includes(i))
      : -1;

  return (
    <div className="flex w-full max-w-md flex-col gap-4 px-3">
      {interaction.prompt ? (
        <h2 className="asking text-center leading-snug text-balance">
          {interaction.prompt}
        </h2>
      ) : null}

      {/*
        Three across. Six jars want two rows of three rather than three of
        two — it is the arrangement they stand in in the artwork, and it
        leaves each one big enough to be a target for a small thumb.
      */}
      <ul className="grid grid-cols-3 gap-2">
        {interaction.items.map((thing, index) => {
          const done = found.includes(index);
          const showing = turned && interaction.becomes;
          const art = showing
            ? interaction.becomes
            : done
              ? thing.art
              : (interaction.covered ?? thing.art);

          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => touch(index)}
                aria-pressed={done}
                className={[
                  "step-card block w-full overflow-hidden",
                  done && "is-filled",
                  just === index && "blooming",
                  showing && "is-turned",
                  pointingAt === index && "noticing",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {art ? (
                  <Picture art={art} className="jar-art w-full object-cover" />
                ) : null}

                <span className="sr-only">
                  {thing.label ?? `Number ${index + 1}`}
                  {showing ? ", changed" : done ? ", done" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
