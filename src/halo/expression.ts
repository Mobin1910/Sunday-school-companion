import type { HaloState } from "./state";

/**
 * How each state looks.
 *
 * This is the table a designer edits. Adding a state means adding a row;
 * changing how "helping" feels means changing numbers here and nothing
 * else. No component reads a state name and branches on it — `Halo.tsx`
 * only reads this spec, so the visual and the vocabulary can move
 * independently.
 *
 * Every field lands on a CSS custom property, which is why states can
 * cross-fade into one another for free: the browser interpolates the
 * properties, so `idle → thinking → helping` needs no transition code and
 * no keyframes between states. Only the ambient loops (breathing, drift)
 * are keyframes, because those are the only motion that repeats.
 */
export type HaloExpression = {
  /** Overall presence. 1 is resting size. */
  scale: number;
  /**
   * Blob shape, as the four corner radii of a superellipse in percent.
   * Asymmetry is what stops it reading as a circle — an orb is the thing
   * we are most trying not to be.
   */
  shape: [number, number, number, number];
  /** Wider than tall (>1) or taller than wide (<1). Squash and stretch. */
  squish: number;
  /** Outer glow, 0–1. Presence in the room. */
  glow: number;
  /** Internal light, 0–1. How lit from within Halo is. */
  light: number;
  /** How present the cross is inside the light, 0–1. Never a logo. */
  cross: number;
  /** Where Halo looks, in units of its own radius. Negative x is left. */
  gaze: { x: number; y: number };
  /** Eye openness, 0 (closed) to 1 (wide). */
  openness: number;
  /** The breathing loop. Longer is calmer. */
  breath: { duration: number; depth: number };
  /** How far Halo drifts as it breathes, in px. */
  drift: number;
  /** Which token carries the light. */
  tone: "calm" | "warm" | "joy";
  /** How long it takes to become this, in ms. */
  transition: number;
};

/**
 * The resting expression. Every state below is written as a departure from
 * it, so a new state only has to say what is different.
 */
const RESTING: HaloExpression = {
  scale: 1,
  shape: [64, 36, 58, 42],
  squish: 1,
  glow: 0.35,
  light: 0.5,
  cross: 0.2,
  gaze: { x: 0, y: 0 },
  openness: 1,
  breath: { duration: 5200, depth: 0.02 },
  drift: 3,
  tone: "calm",
  transition: 700,
};

const from = (changes: Partial<HaloExpression>): HaloExpression => ({
  ...RESTING,
  ...changes,
});

export const EXPRESSIONS: Record<HaloState, HaloExpression> = {
  /** Barely there. Slow, dim, unhurried — nothing is being asked. */
  idle: from({
    glow: 0.22,
    light: 0.38,
    breath: { duration: 6000, depth: 0.018 },
  }),

  /** Awake and turned toward the child. Brighter, a fraction taller. */
  listening: from({
    scale: 1.02,
    squish: 1.03,
    glow: 0.42,
    light: 0.6,
    breath: { duration: 4200, depth: 0.024 },
    transition: 500,
  }),

  /**
   * Something just happened and Halo is interested in it. This is the beat
   * a child gets after acting, before any help — the whole point of it is
   * that it reads as interest and never as a verdict.
   */
  curious: from({
    scale: 1.04,
    shape: [46, 54, 68, 32],
    squish: 0.97,
    glow: 0.5,
    light: 0.66,
    gaze: { x: 0.16, y: -0.12 },
    openness: 1,
    breath: { duration: 3400, depth: 0.03 },
    drift: 5,
    tone: "warm",
    transition: 420,
  }),

  /**
   * Genuinely considering, and inviting a child to consider with it.
   *
   * Not "processing", and never "you were wrong and I am about to say so" —
   * it is reached when nothing has gone wrong at all, from stillness. So it
   * stays on the calm tone rather than the warm one that carries help, and
   * it is brighter and slightly larger than rest: an opening, not a retreat.
   * Eyes narrow a little, the way anyone's do while they look at something
   * properly.
   */
  thinking: from({
    scale: 1.03,
    shape: [56, 44, 48, 52],
    squish: 0.98,
    glow: 0.46,
    light: 0.62,
    gaze: { x: -0.1, y: -0.16 },
    openness: 0.72,
    breath: { duration: 3600, depth: 0.028 },
    drift: 4,
    transition: 560,
  }),

  /**
   * With the child. The warmest, steadiest state — company rather than
   * correction, so it is bigger and calmer rather than busier.
   */
  helping: from({
    scale: 1.06,
    shape: [62, 38, 54, 46],
    squish: 1.02,
    glow: 0.62,
    light: 0.82,
    cross: 0.36,
    gaze: { x: 0, y: 0.08 },
    breath: { duration: 3800, depth: 0.028 },
    tone: "warm",
    transition: 600,
  }),

  /**
   * Pointing without pointing. Halo leans and looks toward the thing worth
   * noticing; the surface decides what that direction means.
   */
  hinting: from({
    scale: 1.03,
    shape: [72, 28, 62, 38],
    squish: 0.94,
    glow: 0.56,
    light: 0.74,
    gaze: { x: 0.34, y: 0.06 },
    breath: { duration: 2600, depth: 0.034 },
    drift: 6,
    tone: "warm",
    transition: 460,
  }),

  /**
   * Meeting a child after a try that did not work.
   *
   * Softer and dimmer, never sharper. It settles downward and inward — the
   * grammar the design system already gives Recovery — where celebration
   * rises and opens. Nothing reddens, nothing shakes, nothing flashes.
   */
  recovering: from({
    scale: 0.97,
    shape: [50, 50, 42, 58],
    squish: 1.06,
    glow: 0.3,
    light: 0.46,
    gaze: { x: 0, y: 0.2 },
    openness: 0.78,
    breath: { duration: 4600, depth: 0.02 },
    drift: 2,
    tone: "warm",
    transition: 620,
  }),

  /** Arrived. Up and outward, brightest, and the cross at its clearest. */
  celebrating: from({
    scale: 1.12,
    shape: [54, 46, 56, 44],
    squish: 0.96,
    glow: 0.85,
    light: 1,
    cross: 0.5,
    gaze: { x: 0, y: -0.1 },
    breath: { duration: 2400, depth: 0.045 },
    drift: 7,
    tone: "joy",
    transition: 420,
  }),

  /** Between places. Small and quiet so it never competes with the move. */
  transitioning: from({
    scale: 0.92,
    glow: 0.2,
    light: 0.4,
    openness: 0.5,
    breath: { duration: 5200, depth: 0.012 },
    drift: 1,
    transition: 260,
  }),
};

export function expressionFor(state: HaloState): HaloExpression {
  return EXPRESSIONS[state];
}
