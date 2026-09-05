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

export function haloStateFor(
  interaction: PlayInteraction,
  moment: InteractionMoment,
): HaloState {
  const { rung, misses, recovering, done, attending } = moment;

  if (!attending) return "idle";
  if (done) return "celebrating";

  // Recovery owns the beat it is on. Help never lands on the same moment as
  // the try that did not work — that ordering is the assistance system's,
  // and Halo must not visually undo it by jumping straight to hinting.
  if (recovering) return forgiving(interaction) ? "curious" : "recovering";

  // With the child: the ladder has reached company, or the answer itself.
  if (rung >= 3) return "helping";

  // Drawing the eye. A clue is on screen and worth looking toward.
  if (rung >= 2) return "hinting";

  // A word of help has arrived; Halo is alongside, considering it.
  if (rung >= 1) return "thinking";

  // The child has acted and nothing has been decided yet. Interest, not
  // judgement — this is the beat they get before any help arrives.
  if (misses > 0) return "curious";

  return "listening";
}
