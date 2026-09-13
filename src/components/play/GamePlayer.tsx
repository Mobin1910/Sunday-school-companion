"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { PlayInteraction } from "@/content";
import InteractionPlayer from "@/interactions/InteractionPlayer";
import { readRun, writeRun } from "@/local/run";
import { finishedGame } from "@/local/session";
import { streakNamed } from "@/local/streak";

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
 *
 * It also carries the run, on the same terms free play does: a question
 * answered first time extends it, a try that did not work ends it, and help
 * arriving on its own does not — a child who thought for a while has not
 * stumbled. Both feed the one games streak, because recalling a story is
 * recalling a story whether a chapter asked or the shuffle did. A child who
 * played three games well and was told they had done nothing today was being
 * asked to believe the app had not noticed.
 *
 * The run itself lives in `local/run.ts` rather than here, because a game
 * ends by leaving for the shelf and state in this component would not
 * survive the walk. See there. The mark that shows it is the screen's, not
 * the player's — the player counts, `RunMark` draws.
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

  /*
    Whether this question was reached with help. Per question, not per game:
    stumbling on the first of three ends the run, and getting the next two
    right begins a new one, exactly as it would in free play.
  */
  const stumbled = useRef(false);
  const streak = streakNamed("games");

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

          /*
            A question reached without help carries the run forward. One
            reached with help still counts as reached — it simply does not
            extend a streak that has already ended.
          */
          const grown = stumbled.current ? readRun("games") : readRun("games") + 1;
          writeRun("games", grown);
          streak.record(grown);

          waiting.current = setTimeout(() => {
            waiting.current = null;
            stumbled.current = false;
            if (!last) setAt((n) => n + 1);
            else router.replace(doneHref);
          }, AFTER_SOLVING);
        }}
        onMiss={() => {
          if (stumbled.current) return;
          stumbled.current = true;
          // The run that just ended is kept before it is let go of; nothing
          // about ending one is ever said to the child.
          streak.record(readRun("games"));
          writeRun("games", 0);
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
