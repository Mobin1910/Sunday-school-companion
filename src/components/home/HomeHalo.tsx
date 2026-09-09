"use client";

import { useEffect, useState } from "react";

import { arrivalTaken, claimArrival } from "@/halo/arrival";
import HaloPresence from "@/halo/HaloPresence";
import { useDriftingMood } from "@/halo/mood";
import type { HaloState } from "@/halo/state";

/**
 * Halo arriving into Home, and living there.
 *
 * The staging is entirely CSS — see `.halo-arriving` in globals.css — so this
 * component's only job is to decide *whether* to stage it. If its JavaScript
 * never arrives, the arrival still plays and Halo still ends up in the right
 * place, because nothing here is what puts it there.
 *
 * It plays once per visit to the app, not once per visit to this screen. Home
 * is where a child comes back to between a chapter and a game, and a small
 * magical moment stops being one on the fourth time in five minutes.
 *
 * The claim is shared with the welcome — see `halo/arrival.ts` — so a child
 * who has just watched Halo descend into their first screen does not watch
 * it descend again the moment they reach Home.
 */

/**
 * The moods Halo may be in while nobody is asking anything.
 *
 * Home was one state, `idle`, and the reason was a good one: Home asks the
 * child nothing, so a companion visibly attending to an answer nobody
 * requested is telling a small lie. That rules out most of the vocabulary
 * and it does not rule out having any moods at all — being alive is not the
 * same as responding to something.
 *
 * So: the four that mean *here*, and none of the ones that mean *because of
 * you*. `curious` is interest and never a verdict, `thinking` is genuinely
 * considering and is reached from stillness where nothing has gone wrong,
 * `happy` is warm without being an ending, and `idle` is Halo at home in its
 * own light.
 *
 * Deliberately absent, each for the same reason: `listening` says a child has
 * been asked something and has not yet answered; `recovering`, `hinting` and
 * `helping` all say a try did not work; `celebrating` says they arrived at
 * something. On a screen with no question, every one of those is a face
 * reacting to an event that never happened.
 */
const AT_HOME: readonly HaloState[] = ["idle", "curious", "thinking", "happy"];

export default function HomeHalo() {
  /*
    Read before the flag is set, so a development double-render and the real
    first render agree — and so the prerendered HTML, where this module is
    also fresh, agrees with both.
  */
  const [arriving] = useState(() => !arrivalTaken());

  useEffect(() => {
    claimArrival();
  }, []);

  /*
    The moods, drifting. The first one is held until the arrival has landed —
    changing expression halfway down would fight the one moment on this
    screen that is choreographed.
  */
  const mood = useDriftingMood({
    moods: AT_HOME,
    start: "idle",
    firstAfter: arriving ? 4200 : 2600,
  });

  return (
    /*
      The one part of Home that gives way. Everything else on the screen
      takes the height it needs; this takes what is left, and `.home-sky`
      sizes Halo from it — see globals.css.
    */
    <div className="home-sky flex min-h-0 flex-1 justify-center">
      {arriving ? <div className="home-arrival" aria-hidden /> : null}

      <HaloPresence
        state={mood}
        placement="hero"
        className={arriving ? "halo-arriving" : ""}
      />
    </div>
  );
}
