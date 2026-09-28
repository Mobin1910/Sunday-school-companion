import { ACTIVE_IDLE_MS, ACTIVE_TICK_MS } from "./config";

/**
 * How much of the last five minutes was actually spent using this.
 *
 * The brief this was built to forbids the obvious implementation, and it is
 * worth being clear about why. A `setTimeout` for five minutes from page load
 * measures how long a tab has been open, which on a family tablet is a number
 * about the tablet rather than about anyone using it: a browser left on the
 * Chapters shelf overnight would earn the invitation, and a child who read for
 * four minutes and went to dinner would come back to it waiting.
 *
 * So this counts stretches instead. A stretch of active use is time during
 * which the document is visible, the window has focus, and somebody has
 * touched the thing within living memory. Everything else — hidden tabs,
 * blurred windows, a lit screen in an empty room — accrues nothing.
 *
 * ## Pure on purpose
 *
 * The arithmetic is a set of functions over a small state, and the browser
 * events that drive them live in `manager.ts`. That split is the only reason
 * "hidden time does not count" is a test rather than something to be verified
 * by leaving a tab open for five minutes and hoping.
 */

export type Clock = {
  /**
   * When the running stretch was last credited, or `null` when paused.
   *
   * It is a *credited-to* mark rather than a start time, so each tick settles
   * its own interval and no elapsed time can be counted twice.
   */
  creditedTo: number | null;
  /** When the person last did something. */
  touchedAt: number;
};

/** Paused, and untouched. What every device starts at. */
export function idle(now: number): Clock {
  return { creditedTo: null, touchedAt: now };
}

/**
 * The app became visible and focused.
 *
 * Arriving counts as an interaction. Bringing a tab to the front *is* the
 * person doing something, and without this a return from the home screen would
 * begin a stretch that the idle rule immediately disqualifies.
 */
export function resume(now: number): Clock {
  return { creditedTo: now, touchedAt: now };
}

/** A tap, a key, a scroll, a navigation. Cheap, because this runs a lot. */
export function touch(clock: Clock, now: number): Clock {
  return clock.creditedTo === null ? clock : { ...clock, touchedAt: now };
}

/**
 * What the stretch has earned since it was last credited.
 *
 * Two guards, for two different lies a clock can tell.
 *
 * The idle rule handles a person who has stopped: no interaction inside
 * `ACTIVE_IDLE_MS` means the stretch earns nothing, and the mark is moved
 * forward so the dead interval is not back-credited when they return. The
 * window is generous — a story panel can hold a child without a single tap —
 * because the case it exists for is the room with nobody in it, not the child
 * who is reading slowly.
 *
 * The ceiling handles a machine that was asleep. A suspended laptop fires no
 * timers but does not always report itself hidden, so the first tick after a
 * lid opens can carry hours of wall-clock time. The idle rule catches almost
 * all of those; the ceiling makes the arithmetic incapable of crediting more
 * than one tick's worth however far the clock jumped.
 */
export function credit(clock: Clock, now: number): { clock: Clock; gained: number } {
  if (clock.creditedTo === null) return { clock, gained: 0 };

  const elapsed = Math.max(0, now - clock.creditedTo);

  if (now - clock.touchedAt > ACTIVE_IDLE_MS) {
    return { clock: { ...clock, creditedTo: now }, gained: 0 };
  }

  return {
    clock: { ...clock, creditedTo: now },
    gained: Math.min(elapsed, ACTIVE_TICK_MS * 2),
  };
}

/** Hidden, blurred, or no longer worth counting. Settles what is owed first. */
export function pause(clock: Clock, now: number): { clock: Clock; gained: number } {
  const settled = credit(clock, now);
  return { clock: { ...settled.clock, creditedTo: null }, gained: settled.gained };
}
