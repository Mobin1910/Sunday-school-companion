import type { PlayInteraction } from "@/content";
import type { HaloState } from "@/halo/state";

/**
 * The one place that speaks both languages.
 *
 * Everything the companion needs to know is already inside
 * InteractionPlayer — the rung, whether Recovery is being spoken, whether
 * the child has arrived. This turns that into a HaloState, and it is the
 * only crossing point between the two systems.
 *
 * It runs *inside* InteractionPlayer, which is what keeps the constitution's
 * promise intact: `misses` is an argument here, never a return value. What
 * leaves this function is "recovering" — a description of the moment, not a
 * count of anything. A number that cannot escape cannot become a score.
 *
 * Halo does not decide any of this. The assistance system is authoritative;
 * this only translates what it decided.
 */
export type InteractionMoment = {
  /** 0 alone · 1 a word · 2 a clue · 3 together. */
  rung: number;
  /** How many tries did not work. Read here, never returned. */
  misses: number;
  /** Recovery is being spoken right now. */
  recovering: boolean;
  /**
   * This moment began with stillness rather than with a try that did not
   * work. A child who has done nothing has failed at nothing, so being met
   * here is an invitation, not a recovery, and Halo must not look like it
   * is consoling someone for a mistake they never made.
   */
  invited: boolean;
  /** Arrived. */
  done: boolean;
  /** The child is actually here, looking at this. */
  attending: boolean;
};

/**
 * Discovery has no wrong answer, so it has no recovery.
 *
 * This is the interaction-model awareness, and it belongs here rather than
 * in the visual: Halo should not be asking what kind of interaction it is
 * attached to. In a Reveal, every tap is a discovery, so Halo stays a
 * curious companion and never enters a state that implies a mistake was
 * made — because none was.
 */
function forgiving(interaction: PlayInteraction): boolean {
  return interaction.type === "reveal";
}

/**
 * Three things happen after a child acts, and they are not the same thing.
 *
 *   acknowledgement — "I saw what you did."          → curious
 *   recovery        — "It's okay, let's look again." → recovering
 *   assistance      — actual help, once warranted    → hinting, then helping
 *
 * They are kept apart deliberately. Collapsing them is how a companion turns
 * into an error handler: a child who taps the wrong thing should be noticed
 * first, met second, and helped only if help is warranted — and Halo should
 * not look like it already knows the answer at the moment of the tap.
 *
 * `thinking` is not part of that sequence at all. It means Halo is genuinely
 * considering, or inviting attention — never "you were wrong and I am about
 * to tell you". The only place the ladder produces it is stillness, where
 * nothing has gone wrong by definition.
 */
export function haloStateFor(
  interaction: PlayInteraction,
  moment: InteractionMoment,
): HaloState {
  const { rung, misses, recovering, invited, done, attending } = moment;

  if (!attending) return "idle";
  if (done) return "celebrating";

  // Being met. This beat is the assistance system's own — help never lands
  // on the same moment as the try that did not work, and Halo must not
  // visually undo that ordering by looking helpful too early.
  if (recovering) {
    if (forgiving(interaction)) return "curious";
    // Nothing went wrong; the child was simply still. Considering, not
    // consoling.
    return invited ? "thinking" : "recovering";
  }

  // Assistance, now that it is warranted. Stronger rungs narrow the field
  // and finally draw the eye to the answer, which is company rather than a
  // clue — so they read as helping rather than hinting.
  if (rung >= 2) return "helping";

  // A specific clue is on screen: at this rung the author's hint appears.
  if (rung >= 1) return "hinting";

  // Acknowledgement. The child acted and nothing has been decided — this is
  // the beat they get, and it must read as interest, never as a verdict.
  if (misses > 0) return "curious";

  return "listening";
}
