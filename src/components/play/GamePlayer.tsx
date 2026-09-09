"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
 * and what to do when one is answered.
 *
 * Answering moves on by itself, after a pause. The pause is the celebration:
 * Halo's face, the burst and the words all happen, and then the next
 * question arrives. A child who has just got it right has finished with the
 * screen, and making them find a button to say so reads as the app not
 * having noticed.
 *
 * That is true between questions and between games, and it stops being true
 * at the end of the last one. Moving a child on is kind while there is a
 * next thing they were already doing; carrying them out of the games
 * altogether is a decision being made for them. So the end is a screen with
 * ways onward on it — `ending` — and no timer runs after it appears.
 *
 * The player is remounted for each question, keyed by index, so a question
 * begins genuinely fresh — no rung carried over, no stillness clock already
 * running. `PracticeScreen` does the same thing for the same reason.
 */
const AFTER_SOLVING = 1600;

export default function GamePlayer({
  interactions,
  nextHref,
  ending,
}: {
  interactions: PlayInteraction[];
  /**
   * The next game, where this one has a next game. Followed once the last
   * question has been answered and celebrated.
   */
  nextHref?: string;
  /**
   * What the last game leaves behind when there is no next one. Shown in
   * place of the player after the same pause, rather than followed.
   */
  ending?: React.ReactNode;
}) {
  const router = useRouter();
  const [at, setAt] = useState(0);
  const [over, setOver] = useState(false);
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A game left before the pause is up must not drag the next screen along
  // behind it.
  useEffect(
    () => () => {
      if (waiting.current) clearTimeout(waiting.current);
    },
    [],
  );

  if (over && ending) return <>{ending}</>;

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
          waiting.current = setTimeout(() => {
            waiting.current = null;
            if (!last) setAt((n) => n + 1);
            else if (nextHref) router.push(nextHref);
            else if (ending) setOver(true);
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
