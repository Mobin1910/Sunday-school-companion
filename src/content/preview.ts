import { interactionSchema } from "./schema";
import { toInteraction, type PlayInteraction } from "./cards";

/**
 * Turning agent output into something the real player can run.
 *
 * The Memory Verse agent writes drafts in the *authoring* shape — the same
 * shape a chapter file is written in — because that is what a human will
 * eventually paste into `content/<class>/<slug>.story.json`. The player runs
 * the *played* shape. This is the one step between them, and it deliberately
 * uses the real schema and the real converter rather than a preview-shaped
 * approximation of either.
 *
 * Two things fall out of that, and both are the point:
 *
 *   A draft that would not validate as chapter content throws here, in a
 *   preview, rather than being discovered when somebody pastes it in and the
 *   build fails.
 *
 *   What a reviewer plays is what a child would play. Not something that
 *   looks like it.
 *
 * Nothing the agent generates carries a picture — the ladder is typography and
 * interaction only — so the asset resolver is one that refuses. If it is ever
 * called, a draft has grown artwork it was never supposed to have, and saying
 * so loudly is better than silently rendering a gap.
 */
export function playableFromDraft(authored: unknown): PlayInteraction {
  const parsed = interactionSchema.parse(authored);

  return toInteraction(parsed, () => {
    throw new Error(
      "a memory-verse draft asked for artwork; the ladder does not generate any",
    );
  });
}
