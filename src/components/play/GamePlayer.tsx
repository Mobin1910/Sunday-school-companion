"use client";

import { useState } from "react";

import type { PlayInteraction } from "@/content";
import InteractionPlayer from "@/interactions/InteractionPlayer";

/**
 * One game, played through.
 *
 * This is a caller, not an engine. Every question here is an ordinary
 * `InteractionPlayer` — the assistance ladder, Recovery, Halo and arriving
 * all behave exactly as they do inside a chapter, because it is the same
 * component and not a second copy of one. What this adds is the only thing
 * the player does not do: knowing that a game can be more than one question,
 * and what to put on screen between them.
 *
 * The player is remounted for each question, keyed by index, so a question
 * begins genuinely fresh — no rung carried over, no stillness clock already
 * running. `PracticeScreen` does the same thing for the same reason.
 *
 * Arriving does not advance on its own. A child who has just got something
 * right should get to sit in that for as long as they like, and then move
 * when they choose to; a game that snatches the screen away at the moment of
 * success teaches them to brace instead of to enjoy it.
 */
export default function GamePlayer({
  interactions,
  onFinished,
}: {
  interactions: PlayInteraction[];
  /** Called once, when the last question has been arrived at. */
  onFinished?: () => void;
}) {
  const [at, setAt] = useState(0);
  const [arrived, setArrived] = useState(false);

  const last = at === interactions.length - 1;
  const interaction = interactions[at];

  if (!interaction) return null;

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <InteractionPlayer
        key={at}
        interaction={interaction}
        onComplete={() => {
          setArrived(true);
          if (last) onFinished?.();
        }}
      />

      {/* Only ever shown once there is somewhere to go, and only once the
          child has got there themselves. */}
      {arrived && !last ? (
        <button
          type="button"
          onClick={() => {
            setArrived(false);
            setAt((n) => n + 1);
          }}
          className="cta min-h-14 px-8 text-lg"
        >
          Next
        </button>
      ) : null}

      {interactions.length > 1 ? (
        <p className="sr-only" aria-live="polite">
          Question {at + 1} of {interactions.length}
        </p>
      ) : null}
    </div>
  );
}
