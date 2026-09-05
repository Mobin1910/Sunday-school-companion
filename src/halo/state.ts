/**
 * Halo's vocabulary.
 *
 * This module is the whole public surface of the companion: a screen says
 * *what is happening*, and Halo decides how that looks. Nothing here knows
 * about chapters, interactions, correctness or content, and nothing here
 * ever will — that direction of dependency is what keeps Halo a companion
 * rather than a second copy of the assistance system.
 *
 * The states are named after the child's experience, not after events in
 * the code. "recovering" is a child being met after a try that did not
 * work; it is not "wrong answer". A state that named an outcome would make
 * Halo a grading system wearing a friendly face.
 */

/**
 * Acknowledgement, recovery and assistance are three different things, and
 * the states keep them apart:
 *
 *   curious     — "I saw what you did."
 *   recovering  — "It's okay, let's take another look."
 *   hinting     — a specific clue is being surfaced.
 *   helping     — active assistance is being given.
 *
 * Collapsing any of those into the others is how a companion becomes an
 * error handler. In particular `thinking` is *not* a stop on that path: it
 * means Halo is genuinely considering, and it is reached when nothing has
 * gone wrong. It must never become shorthand for "you were wrong and I am
 * about to tell you the answer".
 */
export type HaloState =
  /** Nobody is being asked for anything. Halo rests. */
  | "idle"
  /** Attending. A child has been asked something and has not yet acted. */
  | "listening"
  /** Acknowledgement: "I saw what you did." Interest, never a verdict. */
  | "curious"
  /**
   * Genuinely considering, and inviting a child to look with it. Not a
   * consequence of being wrong — reached from stillness, where nothing has
   * gone wrong at all.
   */
  | "thinking"
  /** Active assistance is being given. The ladder has climbed to company. */
  | "helping"
  /** A specific clue is being surfaced, and Halo looks toward it. */
  | "hinting"
  /** "It's okay, let's take another look." Warm, and never corrective. */
  | "recovering"
  /** The child arrived. */
  | "celebrating"
  /** Moving between places. Briefly, and out of the way. */
  | "transitioning";

/**
 * How much room Halo takes.
 *
 * Size is a presentation decision made by the surface Halo appears on, not
 * something Halo infers. A companion beside a quiz and a companion in a
 * celebration are the same companion at two sizes.
 */
export type HaloSize = "compact" | "standard" | "large" | "hero";

/** Where Halo is put. Kept apart from what Halo is; see HaloPresence. */
export type HaloPlacement = "inline" | "beside" | "corner" | "hero";

export const HALO_STATES: readonly HaloState[] = [
  "idle",
  "listening",
  "curious",
  "thinking",
  "helping",
  "hinting",
  "recovering",
  "celebrating",
  "transitioning",
] as const;

export const HALO_SIZES: readonly HaloSize[] = [
  "compact",
  "standard",
  "large",
  "hero",
] as const;

/** Rendered diameter, in pixels. */
export const SIZE_PX: Record<HaloSize, number> = {
  compact: 40,
  standard: 72,
  large: 120,
  hero: 200,
};

/**
 * What a screen reader is told.
 *
 * Halo is decoration in most moments and would be noise read aloud, so most
 * states are silent. The two that carry meaning a child would otherwise
 * miss — being helped, and arriving — say so. Nothing here reports a
 * mistake, because a screen reader announcing every wrong tap would be the
 * tally this product refuses to keep.
 */
export const ANNOUNCEMENT: Partial<Record<HaloState, string>> = {
  helping: "Halo is helping",
  celebrating: "Halo is celebrating with you",
};
