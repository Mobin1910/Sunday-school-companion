"use client";

import InteractionPlayer from "@/interactions/InteractionPlayer";
import type { PlayInteraction } from "@/content";

/**
 * A gentle "did you notice?".
 *
 * The card hands the interaction to the player and then stays out of the way.
 * It deliberately learns nothing about what happens inside — not whether the
 * child needed help, not how many tries it took. Arriving does not turn the
 * page either: the child turns pages in this product, and finishing an
 * interaction is not a reason to take that away.
 */
export default function QuizCard({
  interaction,
  active = true,
}: {
  interaction: PlayInteraction;
  active?: boolean;
}) {
  return (
    <InteractionPlayer
      interaction={interaction}
      active={active}
      onComplete={() => {
        // Nothing to do yet. The player locks itself, the celebration is
        // already on screen, and the way forward was always open.
      }}
    />
  );
}
