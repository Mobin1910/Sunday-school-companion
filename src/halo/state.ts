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

export type HaloState =
  /** Nobody is being asked for anything. Halo rests. */
  | "idle"
  /** Attending. A child has been asked something and has not yet acted. */
  | "listening"
  /** Interested in what the child just did. No judgement in it. */
  | "curious"
  /** Considering, alongside the child rather than ahead of them. */
  | "thinking"
  /** With the child. The ladder has climbed to company. */
  | "helping"
  /** Drawing the eye toward something worth noticing. */
  | "hinting"
  /** Meeting a child after a try that did not work. Warm, never corrective. */
  | "recovering"
  /** Something was arrived at. */
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
