"use client";

import { useEffect, useState } from "react";

import ClassSelector from "@/components/class/ClassSelector";
import { arrivalTaken, claimArrival } from "@/halo/arrival";
import HaloPresence from "@/halo/HaloPresence";
import { readName } from "@/local/child";

/**
 * The class question, asked on its own.
 *
 * For a child who has already met Halo but has never been asked which class
 * they are in — which is everyone who used this app before classes existed.
 * Home cannot be drawn without the answer, so it is asked before Home rather
 * than on it.
 *
 * A screen of its own rather than a starting step inside `Welcome`, and that
 * is a hydration decision as much as a design one. Which screen `/` is has to
 * be settled before anything paints, and the mechanism for that is the
 * pre-paint script and one attribute — see `DOORWAY_SCRIPT`. A *step* inside
 * a component cannot be chosen that way: the static HTML is built with the
 * first beat in it, and a client that opened on a different one would either
 * disagree with the markup it is hydrating or flash the first beat on its way
 * past. A third branch has neither problem, because it is the same kind of
 * answer as the other two.
 *
 * It wears the welcome's own chrome and asks in the welcome's own words, so a
 * child meets one question in one voice however they arrive at it. The
 * selector is the same component Home, Settings and onboarding use.
 */
export default function AskClass({ onDone }: { onDone: () => void }) {
  /*
    The name arrives after mount, the way Home's greeting does and for the
    same reason: this screen is prerendered and the name lives on the device,
    so reading it during the first render would put one child's name into the
    static HTML every child hydrates against. The question is warm without it
    and the name simply joins it a frame later.
  */
  const [name, setName] = useState("");
  useEffect(() => setName(readName()), []);

  const [arriving] = useState(() => !arrivalTaken());
  useEffect(() => {
    claimArrival();
  }, []);

  return (
    <div className="welcome" data-step="3">
      <div className="welcome-stage">
        {arriving ? <div className="home-arrival" aria-hidden /> : null}
        <HaloPresence
          state="curious"
          placement="hero"
          className={arriving ? "halo-arriving" : ""}
        />
      </div>

      <div className="welcome-words">
        <h1 className="welcome-title">
          What class are you in{name ? `, ${name}` : ""}?
        </h1>
        <p className="welcome-copy">
          Every class has its own stories. Tell me yours and I&rsquo;ll bring
          the right ones.
        </p>

        <ClassSelector onChosen={onDone} />
      </div>

      {/*
        No button. Tapping a class is the answer and the way on, so a second
        control would only offer a way past a question that has no default.
        The space is held rather than collapsed, so nothing above it moves.
      */}
      <div className="welcome-act">
        <span aria-hidden />
      </div>
    </div>
  );
}
