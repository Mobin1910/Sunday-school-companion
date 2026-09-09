"use client";

import { useEffect, useState } from "react";

import type { HaloState } from "./state";

/**
 * A mood that drifts, for the screens where Halo is waiting rather than
 * answering.
 *
 * Most of the product hands Halo a state because something happened: a try
 * that did not work, a rung climbed, an arrival. Those are not moods and
 * this is not for them. This is for the two places where Halo is simply
 * present — Home, and the beats of the welcome where the child is reading —
 * and where one expression held forever reads as a paused video.
 *
 * What it will *not* do is invent a reaction. The caller passes the moods
 * that are honest on its screen, and the list is the whole of the argument:
 * a state that means "you got that wrong" has no business appearing where
 * nothing was asked, however alive it might make the face look.
 *
 * Two things keep it from reading as a slideshow. The dwell times are uneven,
 * so there is no beat to notice, and the next mood is never the current one,
 * so it never changes into itself and stalls for a double turn.
 */
export function useDriftingMood({
  moods,
  start,
  enabled = true,
  resetOn,
  firstAfter = 2600,
}: {
  /** The moods that are honest on this screen. Must be a stable reference. */
  moods: readonly HaloState[];
  /** Where the drift begins, and returns to whenever `resetOn` changes. */
  start: HaloState;
  enabled?: boolean;
  /**
   * Changing this puts Halo back to `start` and begins again — for a screen
   * with beats, so each beat opens on its own intended expression before it
   * starts to wander.
   */
  resetOn?: string | number;
  /** How long the first mood is held. Longer where something is arriving. */
  firstAfter?: number;
}): HaloState {
  const [mood, setMood] = useState<HaloState>(start);

  // A beat changed: open on what that beat means, before drifting again.
  useEffect(() => setMood(start), [resetOn, start]);

  useEffect(() => {
    if (!enabled || stillnessWanted()) return;

    let step = 0;
    let timer: ReturnType<typeof setTimeout>;

    const drift = () => {
      setMood((now) => {
        const others = moods.filter((state) => state !== now);
        return others[Math.floor(Math.random() * others.length)] ?? now;
      });
      timer = setTimeout(drift, DWELL[step++ % DWELL.length]!);
    };

    timer = setTimeout(drift, firstAfter);
    return () => clearTimeout(timer);
  }, [moods, enabled, resetOn, firstAfter]);

  return enabled ? mood : start;
}

/** How long a mood is held. Uneven, so it never reads as a carousel. */
const DWELL = [7200, 9400, 6100, 11300, 8300];

/**
 * Whether this device has asked for things to hold still.
 *
 * Both routes the stylesheet honours: the browser setting, and the child's
 * own choice in Settings, which can override it in either direction. A Halo
 * that kept changing face would be the one thing still moving after
 * everything else had been asked to stop.
 */
function stillnessWanted(): boolean {
  const chosen = document.documentElement.dataset.motion;
  if (chosen === "reduce") return true;
  if (chosen === "full") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
