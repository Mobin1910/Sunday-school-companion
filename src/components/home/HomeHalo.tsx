"use client";

import { useEffect, useState } from "react";

import { arrivalTaken, claimArrival } from "@/halo/arrival";
import HaloPresence from "@/halo/HaloPresence";

/**
 * Halo arriving into Home.
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

  return (
    <div className="home-sky flex justify-center">
      {arriving ? <div className="home-arrival" aria-hidden /> : null}

      {/*
        Halo rests here. Home asks nothing of the child, so it would be
        dishonest for the companion to be attending to an answer that was
        never requested — and `idle` is not a dim state any more. It is Halo
        at home in its own light.
      */}
      <HaloPresence
        state="idle"
        placement="hero"
        className={arriving ? "halo-arriving" : ""}
      />
    </div>
  );
}
