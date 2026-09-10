"use client";

import { useMemo, useState } from "react";

import { useShuffled } from "../shuffle";
import type { ArrangeWords, ModelProps } from "../types";

/**
 * Arrange-words — putting a verse back together.
 *
 * The fifth presentation, and the one a memory verse needs: a child who has
 * read a verse a few times can usually feel which piece comes next before
 * they can recite it, and this is the interaction that asks them for exactly
 * that. It is why the verse page has had a practice slot since it was built
 * and nothing to put in it.
 *
 * It is Sequence's grammar, deliberately. Tap the piece you think comes next;
 * a piece tapped out of turn settles back where it was. No dragging — the
 * argument in Sequence holds here and holds harder, because these are words
 * and the child using a screen reader is exactly the child this drill is for.
 * Nothing reddens, nothing shakes, and a piece is never taken away.
 *
 * What is different is what gets built. Sequence fills numbered slots, which
 * is right for moments in a story and wrong for a sentence: the verse is not
 * four things in an order, it is one thing said in four breaths. So the line
 * assembles as words, left to right, and the pieces still to come are a quiet
 * rule rather than empty boxes. A child sees the verse arriving.
 *
 * On the answer key: this is the one interaction whose order comes from the
 * order the pieces are written in, and the schema note in `sequence` explains
 * why that is normally unsafe — tidying a file must not change what is true.
 * It is safe here for a reason that does not generalise. The written order of
 * a verse *is* the verse; reordering these lines does not re-key a puzzle, it
 * quotes scripture wrongly, which is a content error a positions field would
 * not have caught either. checks.ts reads the pieces back against the verse
 * text for that reason.
 */
export default function Words({
  interaction,
  rung,
  locked,
  onMiss,
  onArrive,
}: ModelProps<ArrangeWords>) {
  /*
    Each piece carries where it belongs before anything is shuffled, so this
    file never reads the order the pieces arrived in — the same discipline
    every other model keeps, even though here the source order is the truth.
  */
  const pieces = useMemo(
    () => interaction.words.map((text, at) => ({ text, at })),
    [interaction.words],
  );

  const offered = useShuffled(pieces);

  /** How many pieces the child has laid down, in order. */
  const [laid, setLaid] = useState(0);
  const [settling, setSettling] = useState<number | null>(null);

  /*
    "Let's start together" — the opening piece, laid by the app.

    Bounded exactly as Sequence bounds it: one piece, and only while the child
    has not begun. The rungs above this one point and never place, because
    finishing the verse for them is the one thing that would empty this out.
  */
  const started = rung >= 2 && laid === 0 ? 1 : laid;
  const wanted = started;
  const total = pieces.length;

  function place(at: number) {
    if (locked) return;

    if (at !== wanted) {
      setSettling(at);
      window.setTimeout(() => setSettling(null), 300);
      onMiss();
      return;
    }

    const now = started + 1;
    setLaid(now);
    if (now === total) onArrive();
  }

  const said = pieces.slice(0, started);
  const rest = pieces.slice(started);

  return (
    <div className="flex w-full max-w-sm flex-col gap-5 px-4">
      <h2 className="asking text-center leading-snug text-balance">
        {interaction.prompt}
      </h2>

      {/*
        The verse, arriving. It holds its full height from the first frame —
        the pieces still to come are drawn as a rule of the width they will
        need — so the line never jumps down the screen as it fills and the
        buttons below never move under a child's finger.
      */}
      <p
        className="min-h-[clamp(4rem,11vh,6rem)] text-center text-[clamp(1.15rem,2.9vh,1.5rem)] leading-relaxed text-balance text-joy"
        aria-live="polite"
      >
        {said.map((piece) => (
          <span key={piece.at} className="blooming">
            {piece.text}{" "}
          </span>
        ))}

        {rest.map((piece) => (
          <span key={piece.at} aria-hidden className="text-ink-soft/35">
            {piece.text.replace(/\S/g, "·")}{" "}
          </span>
        ))}

        <span className="sr-only">
          {started === total
            ? "The verse is complete."
            : `${started} of ${total} parts placed.`}
        </span>
      </p>

      <ul className="flex flex-col gap-3">
        {offered.map((piece) => {
          const done = piece.at < started;
          const showing = rung >= 3 && piece.at === wanted && !locked;

          return (
            <li
              key={piece.at}
              /*
                A piece that has been said leaves the list rather than sitting
                there greyed out. It is already on the line above, and a
                child reading two copies of the same words has to work out
                which one counts.
              */
              className={
                done
                  ? "max-h-0 overflow-hidden opacity-0 transition-all duration-500"
                  : "max-h-24 transition-all duration-500"
              }
            >
              <button
                type="button"
                onClick={() => place(piece.at)}
                aria-hidden={done}
                tabIndex={done ? -1 : 0}
                className={[
                  "surface flex min-h-[clamp(2.75rem,6.6vh,4rem)] w-full items-center justify-center px-4 text-center text-[clamp(1rem,2.5vh,1.25rem)] leading-snug text-balance",
                  done && "pointer-events-none",
                  settling === piece.at && "settling",
                  showing && "noticing",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {piece.text}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
