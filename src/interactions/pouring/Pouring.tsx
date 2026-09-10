"use client";

import { useEffect, useRef, useState } from "react";

import { stillnessWanted } from "@/local/motion";

import type { ModelProps, Pouring as Scene } from "../types";

/**
 * Pouring — turn the tap, fill the jar, and watch the water change.
 *
 * The only interaction in the product that is built rather than illustrated,
 * and the reason is a failure worth recording. The first version of this game
 * was six photographs of a jar; a child met it and started tapping around the
 * picture looking for whatever was supposed to respond. Artwork is a
 * wonderful thing to look at and a poor thing to operate, because nothing in
 * a painting tells you which part of it is a control.
 *
 * So there is no artwork here at all. A jar, a tap and a stream of water,
 * made of gradients and shadows, and — this is the whole design — never more
 * than one of them answering at a time. Before the jar is full only the
 * handle responds; after it, only the jar. A child cannot be looking in the
 * wrong place, because at any moment there is only one place.
 *
 * Nothing here can be done wrongly. A tap on the jar too early, on the handle
 * too late, or anywhere else at all does nothing whatsoever: no shake, no
 * sound, no "try again". The state simply has not moved, and the thing that
 * would move it is still glowing.
 *
 * The two gestures are deliberately different. Turning a tap is one touch,
 * because that is what turning a tap is. Turning water into wine is two,
 * because it should not be possible to do by brushing the screen — it is the
 * miracle, and a child should have to mean it.
 */

type Stage = "empty" | "filling" | "full" | "turning" | "done";

/** How long the jar takes to fill, and the water to turn. */
const FILLS_IN = 1800;
const TURNS_IN = 1300;

/**
 * How long a second tap still counts as part of the first.
 *
 * Wide, at the top of the range a phone would normally use. A six-year-old's
 * second tap is slower than an adult's, and the cost of being too generous
 * here is nothing at all — there is no other gesture it could be confused
 * with — while the cost of being too strict is a child tapping a jar over and
 * over and being told nothing.
 */
const DOUBLE_TAP = 450;

/**
 * How full the jar ends up.
 *
 * Not to the top, and not close to it. The jar narrows at the shoulders, so
 * liquid above about two thirds reaches the part of the silhouette that is
 * curving inwards and reads as spilling over the rim rather than sitting in
 * the belly. A jar filled to its lip is a jar about to be knocked over.
 */
const BRIM = 66;

export default function Pouring({
  interaction,
  locked,
  onArrive,
}: ModelProps<Scene>) {
  const [stage, setStage] = useState<Stage>("empty");
  const [level, setLevel] = useState(0);
  /** A single tap on a full jar. Acknowledged, and never a mistake. */
  const [nudge, setNudge] = useState(0);

  const lastTap = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const wait = (ms: number, then: () => void) => {
    timers.current.push(setTimeout(then, still() ? Math.min(ms, 220) : ms));
  };

  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
    },
    [],
  );

  /*
    Stillness shortens every beat rather than removing it.

    The stylesheet already flattens the animations to nothing, and if the
    timers stayed at full length a child who asked for calm would watch an
    already-full jar for the better part of two seconds while the app waited
    out an animation that was not playing. The state machine is the same; it
    simply stops dawdling.
  */
  function still() {
    return typeof document !== "undefined" && stillnessWanted();
  }

  function turnTheTap() {
    if (locked || stage !== "empty") return;
    setStage("filling");
    setLevel(BRIM);
    wait(FILLS_IN, () => setStage("full"));
  }

  function touchTheJar() {
    if (locked || stage !== "full") return;

    const now = Date.now();
    if (now - lastTap.current > DOUBLE_TAP) {
      // The first of two. Say so, quietly, and wait for the other.
      lastTap.current = now;
      setNudge((n) => n + 1);
      return;
    }

    lastTap.current = 0;
    setStage("turning");
    wait(TURNS_IN, () => {
      setStage("done");
      onArrive();
    });
  }

  const wine = stage === "turning" || stage === "done";
  const flowing = stage === "filling";

  const saying =
    stage === "empty" || stage === "filling"
      ? interaction.prompt
      : stage === "full"
        ? interaction.then
        : (interaction.during ?? interaction.then);

  return (
    <div className="pour" data-stage={stage}>
      {/*
        One line, and it changes rather than accumulating. A child reading
        two instructions has to work out which one is live.
      */}
      <p className="asking pour-say text-center leading-snug text-balance" aria-live="polite">
        {saying}
      </p>

      <div className="pour-scene">
        {/*
          The tap. Its body and spout are scenery — only the handle is a
          control, and it is a real button so a keyboard and a screen reader
          reach it the same way a finger does.
        */}
        <div className="pour-rig" aria-hidden={stage !== "empty"}>
          <button
            type="button"
            className="pour-handle"
            onPointerUp={turnTheTap}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                turnTheTap();
              }
            }}
            disabled={stage !== "empty" || locked}
            aria-label="Turn the tap"
          >
            <span className="pour-lever" aria-hidden />
          </button>

          <div className="pour-body" aria-hidden>
            <span className="pour-spout" />
          </div>
        </div>

        <div className={`pour-fall ${flowing ? "is-running" : ""}`} aria-hidden />

        {/*
          The jar. A button only once it is the thing that answers, so before
          then it is not focusable, not announced as a control, and not
          something a child can be waiting on.
        */}
        <button
          type="button"
          className="pour-jar"
          data-nudge={nudge}
          onPointerUp={touchTheJar}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              // A keyboard has no double tap. Two presses, or one — either
              // reaches the same place, because insisting on a rhythm is a
              // touch idea and does not travel.
              lastTap.current = Date.now();
              touchTheJar();
            }
          }}
          disabled={stage !== "full" || locked}
          aria-label={stage === "full" ? "Double-tap the jar" : "The jar"}
        >
          <span className="pour-liquid" style={{ height: `${level}%` }} aria-hidden>
            <span className="pour-surface" />
          </span>

          <span className="pour-glass" aria-hidden />
          <span className="pour-rim" aria-hidden />

          {/* One ripple per single tap, remounted so it plays again. */}
          {nudge > 0 && stage === "full" ? (
            <span key={nudge} className="pour-ripple" aria-hidden />
          ) : null}

          <span className="sr-only">
            {stage === "done"
              ? "The water has become wine."
              : stage === "full"
                ? "The jar is full of water."
                : "The jar is empty."}
          </span>
        </button>
      </div>

      <span className="sr-only" aria-live="polite">
        {wine ? "The water became wine." : stage === "full" ? "The jar is full." : ""}
      </span>
    </div>
  );
}
