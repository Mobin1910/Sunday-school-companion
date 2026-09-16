"use client";

import { useState } from "react";

import type { ModelProps, TrueOrNot as Model } from "../types";

/**
 * The curriculum's right/wrong statements, asked one at a time.
 *
 * The Beginners book prints five sentences to be marked right or wrong. This
 * is that exercise for a five-year-old, and three decisions separate it from
 * the worksheet it came from.
 *
 * **It asks rather than asserts.** "God was angry, and thus did not feed
 * them" is a sentence a child has to hold in their head, decide is false, and
 * then mark — three jobs. "Did God stop feeding them?" is one, and it is the
 * one the book was actually testing.
 *
 * **The reason is the point, not the verdict.** Whichever way a child
 * answers, the next thing on the screen is what actually happened. There is
 * no "correct", no "incorrect", and no tick — a child who had it the other
 * way round is told the story, not their result. That is why `because` is
 * required in the schema: a statement nobody can explain is a statement not
 * worth asking about.
 *
 * **Nothing is counted.** `onMiss` is still reported, because the assistance
 * ladder upstream is what decides whether Halo leans in, and a child who is
 * guessing should be met. But there is no score on this screen, no tally of
 * how many of the five went which way, and answering "no" to the first does
 * not make the second harder or easier.
 *
 * A statement answered the other way round is simply asked again, after the
 * reason has been read — because the reason is what makes the second answer
 * possible, and asking again without it would be a coin toss.
 */
export default function TrueOrNot({
  interaction,
  locked,
  onMiss,
  onArrive,
}: ModelProps<Model>) {
  const total = interaction.statements.length;

  const [at, setAt] = useState(0);
  /** What the child just said, or null while they are deciding. */
  const [said, setSaid] = useState<boolean | null>(null);
  /**
   * Whether the reason for *this* statement has already been read once.
   *
   * It is what makes the second ask a different question from the first.
   * Without it a child who answered the other way round was handed back the
   * identical screen — same sentence, same two buttons, nothing changed — and
   * "try again" with nothing made easier is just the same wall a second time.
   * With it, the reason stays on the screen above the buttons, and since every
   * reason opens with the word the answer is, the second ask is one a child
   * can actually get. Help changes the task, never the child.
   */
  const [looked, setLooked] = useState(false);
  /**
   * How many times this statement has been looked at again.
   *
   * The reason alone is a good first rung — every one of them opens with the
   * word the answer is — but it is the *only* rung, and a child who is
   * tapping rather than reading can sit on one statement indefinitely. So
   * from the second look the answer that is not the answer steps aside, the
   * way a cloth withdraws in the Lost Coin's search and a choice steps aside
   * in `journey`. The question becomes a one-answer question and the child
   * still taps it. The task gets smaller; the child is never told off.
   */
  const [looks, setLooks] = useState(0);

  const statement = interaction.statements[at];
  if (!statement) return null;

  /*
    Whether their answer matched the statement. Held so the reason can be
    worded for the child who agreed *and* the child who did not, without
    either of them being told they were right or wrong.
  */
  const agreed = said !== null && said === statement.answer;

  /*
    From the second look, only the answer is still answerable. `aside` is the
    same affordance the other built interactions use — the option does not
    disappear and is not marked wrong, it simply steps out of the way.
  */
  const narrowed = looks >= 2;
  const stepsAside = (value: boolean) => narrowed && value !== statement.answer;

  function answer(value: boolean) {
    if (locked || said !== null) return;
    setSaid(value);
    if (value !== statement!.answer) onMiss();
  }

  function onward() {
    if (!agreed) {
      // Read the reason, then try the same one again — with the reason still
      // in front of them. Never a penalty: nothing is counted, and the ask
      // that follows is an easier one than the ask that came before it.
      setLooked(true);
      setLooks((n) => n + 1);
      setSaid(null);
      return;
    }
    if (at + 1 < total) {
      setAt(at + 1);
      setSaid(null);
      setLooked(false);
      setLooks(0);
    } else {
      onArrive();
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-5 px-3">
      {interaction.prompt && said === null && !looked ? (
        <p className="text-center text-base text-ink-soft">{interaction.prompt}</p>
      ) : null}

      <h2 className="asking text-center leading-snug text-balance">
        {statement.ask}
      </h2>

      {/*
        On the second ask, the reason comes with the question rather than
        after it. This is the whole of the help this interaction offers, and
        it is enough: every reason begins with the word the answer is.
      */}
      {said === null && looked ? (
        <p className="truth-because">{statement.because}</p>
      ) : null}

      {said === null ? (
        /*
          Two targets, each half the width and tall enough for a small thumb.
          Words as well as shapes: a tick and a cross would be the vocabulary
          of marking, which is the thing this screen is deliberately not.
        */
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className={`truth-card truth-yes${stepsAside(true) ? " is-aside" : ""}`}
            onClick={() => answer(true)}
            disabled={locked || stepsAside(true)}
          >
            Yes
          </button>
          <button
            type="button"
            className={`truth-card truth-no${stepsAside(false) ? " is-aside" : ""}`}
            onClick={() => answer(false)}
            disabled={locked || stepsAside(false)}
          >
            No
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/*
            The reason. Not "correct" and not "incorrect" — what happened,
            said the same way to both children, and the only difference is
            whether the next tap moves on or asks again.
          */}
          <p className="truth-because" aria-live="polite">
            {statement.because}
          </p>

          <button type="button" className="cta min-h-14 w-full px-6 text-lg" onClick={onward}>
            {agreed ? (at + 1 < total ? "Next" : "Finish") : "Let's look again"}
          </button>
        </div>
      )}

      {/*
        Which one of the five, said quietly and only to a screen reader —
        a child can see how many cards are left without being given a score.
      */}
      <p className="sr-only" aria-live="polite">
        Statement {at + 1} of {total}
      </p>
    </div>
  );
}
