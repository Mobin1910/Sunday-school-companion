"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { PlayInteraction } from "@/content";
import InteractionPlayer from "@/interactions/InteractionPlayer";
import { finishedGame } from "@/local/session";

/**
 * One game, played through.
 *
 * This is a caller, not an engine. Every question here is an ordinary
 * `InteractionPlayer` — the assistance ladder, Recovery, Halo and arriving
 * all behave exactly as they do inside a chapter, because it is the same
 * component and not a second copy of one. What this adds is the only thing
 * the player does not do: knowing that a game can be more than one question,
 * and what to do when one is answered.
 *
 * Answering moves on by itself, after a pause. The pause is the celebration:
 * Halo's face, the burst and the words all happen, and then the next
 * question arrives. A child who has just got it right has finished with the
 * screen, and making them find a button to say so reads as the app not
 * having noticed.
 *
 * That is true between the questions inside one game. It is deliberately
 * not true across games any more. A game used to run straight into the next
 * one, which made three games one long corridor: a child could not see how
 * many there were, could not tell which they had done, and had no way out
 * that was not the back button. Finishing now returns to the shelf they
 * chose from — the same place, one game fuller — and choosing again is
 * theirs. See `GamesMenu`, which is what they land on.
 *
 * `replace` rather than `push`, so the finished game does not sit behind the
 * shelf in history. Backing out of the shelf should leave the games, not
 * re-open a game that has just been played.
 *
 * The player is remounted for each question, keyed by index, so a question
 * begins genuinely fresh — no rung carried over, no stillness clock already
 * running. `PracticeScreen` does the same thing for the same reason.
 */
const AFTER_SOLVING = 1600;

export default function GamePlayer({
  interactions,
  slug,
  gameId,
  doneHref,
}: {
  interactions: PlayInteraction[];
  /**
   * Which chapter and which game, so that finishing counts towards this
   * chapter's shelf. Nothing about a child is recorded — only that this
   * game, in this chapter, was played in this sitting.
   */
  slug: string;
  gameId: string;
  /** Where finishing leads. The chapter's games shelf, always. */
  doneHref: string;
}) {
  const router = useRouter();
  const [at, setAt] = useState(0);
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A game left before the pause is up must not drag the next screen along
  // behind it.
  useEffect(
    () => () => {
      if (waiting.current) clearTimeout(waiting.current);
    },
    [],
  );

  const interaction = interactions[at];
  if (!interaction) return null;

  const last = at === interactions.length - 1;

  return (
    <div className="flex w-full flex-col items-center">
      <InteractionPlayer
        key={at}
        interaction={interaction}
        onComplete={() => {
          if (waiting.current) return;
          /*
            Written down before the pause, not after it. A child who taps
            away during the celebration still played the game, and a shelf
            that forgot it because they did not wait would be the app
            quietly disagreeing with what just happened on screen.
          */
          if (last) finishedGame(slug, gameId);

          waiting.current = setTimeout(() => {
            waiting.current = null;
            if (!last) setAt((n) => n + 1);
            else router.replace(doneHref);
          }, AFTER_SOLVING);
        }}
      />

      {interactions.length > 1 ? (
        <p className="sr-only" aria-live="polite">
          Question {at + 1} of {interactions.length}
        </p>
      ) : null}
    </div>
  );
}
