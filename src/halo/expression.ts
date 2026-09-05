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
 * no keyframes between states. Only the ambient loops (breathing, the
 * ring's drift) are keyframes, because those are the only motion that
 * repeats.
 */
export type HaloExpression = {
  /** Overall presence. 1 is resting size. */
  scale: number;
  /**
   * Blob shape, as the four corner radii of a superellipse in percent.
   * Asymmetry is what stops it reading as a circle — an orb is the thing
   * we are most trying not to be. The bottom stays the flattest: Halo is
   * grounded, resting on something, never floating like a bubble.
   */
  shape: [number, number, number, number];
  /** Wider than tall (>1) or taller than wide (<1). Squash and stretch. */
  squish: number;
  /** Body tilt in degrees. Leaning is how Halo turns toward something. */
  lean: number;
  /** Outer bloom, 0–1. How much light Halo puts into the room. */
  glow: number;
  /** Internal light, 0–1. How lit from within the body is. */
  light: number;
  /**
   * Where the colour sits, 0–1. Low is cool — cyan and electric blue lead.
   * High brings the peach and pink forward. Warmth is how Halo shows care
   * without changing hue family or borrowing the UI's palette.
   */
  warmth: number;
  /** Where Halo looks, in units of its own radius. Negative x is left. */
  gaze: { x: number; y: number };
  /** Eye openness, 0 (a closed slit) to 1 (full ovals). */
  openness: number;
  /** Eye tilt in degrees. A few degrees is a whole mood. */
  eyeTilt: number;
  /**
   * 0 is a plain capsule; 1 is the upward arc the reference uses for happy
   * and celebrating. Cross-fades between the two forms, so the eyes stay
   * two minimal white shapes and never grow pupils, lashes or brows.
   */
  eyeCurve: number;
  /** The ring: how high it floats, how much it glows, how wide it sits. */
  ring: { lift: number; glow: number; scale: number; tilt: number };
  /** The breathing loop. Longer is calmer. */
  breath: { duration: number; depth: number };
  /** How far Halo drifts as it breathes, in px. */
  drift: number;
  /** How long it takes to become this, in ms. */
  transition: number;
};

/**
 * The resting expression. Every state below is written as a departure from
 * it, so a new state only has to say what is different.
 */
const RESTING: HaloExpression = {
  scale: 1,
  shape: [64, 38, 34, 62],
  squish: 1,
  lean: 0,
  glow: 0.5,
  light: 0.62,
  warmth: 0.4,
  gaze: { x: 0, y: 0 },
  openness: 1,
  eyeTilt: 0,
  eyeCurve: 0,
  ring: { lift: 1, glow: 0.7, scale: 1, tilt: 0 },
  breath: { duration: 5200, depth: 0.018 },
  drift: 3,
  transition: 700,
};

const from = (changes: Partial<HaloExpression>): HaloExpression => ({
  ...RESTING,
  ...changes,
  ...(changes.ring ? { ring: { ...RESTING.ring, ...changes.ring } } : {}),
});

export const EXPRESSIONS: Record<HaloState, HaloExpression> = {
  /** Resting. Cool, slow and unhurried — nothing is being asked. */
  idle: from({
    glow: 0.4,
    light: 0.54,
    warmth: 0.3,
    ring: { lift: 1, glow: 0.6, scale: 1, tilt: 0 },
    breath: { duration: 6000, depth: 0.016 },
  }),

  /** Awake and turned toward the child. Brighter, a fraction taller. */
  listening: from({
    scale: 1.02,
    squish: 1.02,
    glow: 0.56,
    light: 0.7,
    warmth: 0.42,
    ring: { lift: 1.05, glow: 0.78, scale: 1.02, tilt: 0 },
    breath: { duration: 4200, depth: 0.022 },
    transition: 500,
  }),

  /**
   * Something just happened and Halo is interested in it. The body leans,
   * the eyes go with it, and the ring follows a beat behind — the whole
   * companion turning, rather than a face changing expression.
   */
  curious: from({
    scale: 1.03,
    shape: [54, 48, 32, 68],
    squish: 0.98,
    lean: -5,
    glow: 0.62,
    light: 0.76,
    warmth: 0.5,
    gaze: { x: 0.26, y: -0.14 },
    ring: { lift: 1.1, glow: 0.8, scale: 1.04, tilt: -4 },
    breath: { duration: 3400, depth: 0.026 },
    drift: 5,
    transition: 420,
  }),

  /**
   * Genuinely considering, and inviting a child to consider with it.
   *
   * Not "processing", and never "you were wrong and I am about to say so" —
   * it is reached when nothing has gone wrong at all, from stillness. Cool
   * and a little brighter than rest: an opening, not a retreat. The eyes
   * narrow the way anyone's do while looking at something properly.
   */
  thinking: from({
    scale: 1.02,
    shape: [60, 42, 30, 64],
    lean: 3,
    glow: 0.52,
    light: 0.68,
    warmth: 0.26,
    gaze: { x: -0.12, y: -0.34 },
    openness: 0.82,
    eyeTilt: -4,
    ring: { lift: 1.14, glow: 0.72, scale: 1.02, tilt: 5 },
    breath: { duration: 3600, depth: 0.024 },
    drift: 4,
    transition: 560,
  }),

  /**
   * With the child. The warmest, steadiest state — company rather than
   * correction, so it is bigger and calmer rather than busier, and the ring
   * is at its most present short of celebrating.
   */
  helping: from({
    scale: 1.06,
    shape: [62, 40, 36, 60],
    squish: 1.02,
    glow: 0.78,
    light: 0.9,
    warmth: 0.66,
    gaze: { x: 0, y: 0.06 },
    ring: { lift: 1.12, glow: 0.95, scale: 1.06, tilt: 0 },
    breath: { duration: 3800, depth: 0.024 },
    transition: 600,
  }),

  /**
   * Pointing without pointing. Halo leans and looks toward the thing worth
   * noticing, and the ring leans with it; the surface decides what that
   * direction means.
   */
  hinting: from({
    scale: 1.03,
    shape: [70, 32, 32, 66],
    squish: 0.96,
    lean: -8,
    glow: 0.7,
    light: 0.82,
    warmth: 0.58,
    gaze: { x: 0.4, y: 0.04 },
    openness: 0.6,
    eyeTilt: -10,
    ring: { lift: 1.08, glow: 0.88, scale: 1.03, tilt: -7 },
    breath: { duration: 2800, depth: 0.03 },
    drift: 6,
    transition: 460,
  }),

  /**
   * Meeting a child after a try that did not work.
   *
   * Softer and dimmer, never sharper. It settles downward and inward — the
   * grammar the design system already gives Recovery — where celebration
   * rises and opens. The glow eases off and the ring comes closer, which
   * reads as leaning in rather than as being dimmed for a mistake.
   */
  recovering: from({
    scale: 0.98,
    shape: [56, 46, 28, 70],
    squish: 1.05,
    glow: 0.42,
    light: 0.58,
    warmth: 0.6,
    gaze: { x: 0, y: 0.2 },
    openness: 0.42,
    eyeTilt: 9,
    ring: { lift: 0.86, glow: 0.6, scale: 0.97, tilt: 0 },
    breath: { duration: 4600, depth: 0.018 },
    drift: 2,
    transition: 620,
  }),

  /** Arrived. Up and outward, brightest, ring at its widest and warmest. */
  celebrating: from({
    scale: 1.1,
    shape: [58, 44, 40, 58],
    squish: 0.97,
    glow: 1,
    light: 1,
    warmth: 0.72,
    gaze: { x: 0, y: -0.04 },
    openness: 0.72,
    eyeTilt: 0,
    eyeCurve: 1,
    ring: { lift: 1.3, glow: 1, scale: 1.16, tilt: 0 },
    breath: { duration: 2400, depth: 0.038 },
    drift: 6,
    transition: 420,
  }),

  /**
   * "You did it!" — joyful and proud, and distinct from celebrating.
   *
   * Celebrating is Halo sharing the child's moment at full brightness.
   * Happy is Halo pleased *with* them: the same curved eyes, a little less
   * of everything else, so a chapter can be warm without every warm beat
   * looking like an ending.
   */
  happy: from({
    scale: 1.05,
    shape: [58, 44, 38, 60],
    squish: 1.02,
    glow: 0.8,
    light: 0.9,
    warmth: 0.66,
    gaze: { x: 0, y: -0.02 },
    openness: 0.74,
    eyeCurve: 1,
    ring: { lift: 1.18, glow: 0.92, scale: 1.08, tilt: 0 },
    breath: { duration: 3000, depth: 0.03 },
    drift: 5,
    transition: 440,
  }),

  /** Between places. Small and quiet so it never competes with the move. */
  transitioning: from({
    scale: 0.94,
    glow: 0.32,
    light: 0.48,
    warmth: 0.34,
    openness: 0.6,
    ring: { lift: 0.94, glow: 0.45, scale: 0.96, tilt: 0 },
    breath: { duration: 5200, depth: 0.012 },
    drift: 1,
    transition: 260,
  }),
};

export function expressionFor(state: HaloState): HaloExpression {
  return EXPRESSIONS[state];
}
