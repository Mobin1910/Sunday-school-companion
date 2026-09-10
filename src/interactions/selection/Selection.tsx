"use client";

import { useEffect, useState } from "react";

import Picture from "@/components/Picture";

import { useShuffled } from "../shuffle";
import type { ModelProps, MultipleChoice } from "../types";

/**
 * Selection — choosing the one that's right.
 *
 * The most examination-shaped of the four models, so it needs the most care to
 * feel like a teacher rather than a test. A choice that does not stay settles
 * quietly back where it came from: a fact about the world, not about the child.
 * Nothing shakes, and nothing reddens — the colour a wrong tap wears is
 * orange, it lasts about a second, and it leaves the card looking exactly as
 * it did before, so there is never a record on the screen of what was tried.
 * The right one keeps its green, because arriving is worth looking at.
 *
 * Its ladder takes the fear out of choosing. A wrong option withdraws — which
 * must feel like tidying rather than confiscation, and so never happens as a
 * reaction to a tap, only when the rung climbs a beat later. The last rung
 * draws the eye to the right answer and stops there, because the child still
 * taps it and the arriving is still theirs.
 *
 * There is one presentation today. It lives in this file rather than a folder
 * of one, and moves out when a second one exists.
 */
export default function Selection({
  interaction,
  rung,
  locked,
  onMiss,
  onArrive,
}: ModelProps<MultipleChoice>) {
  const options = useShuffled(interaction.options);

  const [tried, setTried] = useState<number[]>([]);
  const [settling, setSettling] = useState<number | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  /** The card wearing the orange, and only for as long as it wears it. */
  const [nudged, setNudged] = useState<number | null>(null);

  const withdrawn = rung >= 2 ? withdraw(options, tried) : null;

  // It fades first, then the space closes up behind it. Leaving a hole where
  // an option used to be reads as losing something; closing the gap reads as
  // tidying, which is what this is. The collapse lands a beat after the fade
  // and long after any tap, so nothing moves under a child's finger.
  const [tidied, setTidied] = useState(false);

  useEffect(() => {
    if (withdrawn === null) return;
    const timer = window.setTimeout(() => setTidied(true), 500);
    return () => window.clearTimeout(timer);
  }, [withdrawn]);

  function choose(index: number) {
    if (locked) return;

    if (options[index]?.correct) {
      setChosen(index);
      onArrive();
      return;
    }

    setTried((seen) => (seen.includes(index) ? seen : [...seen, index]));
    setSettling(index);
    window.setTimeout(() => setSettling(null), 300);

    // The colour outlasts the movement — the card has finished settling back
    // long before the orange has finished going, so the two do not read as
    // one event that happened and was over before it was noticed.
    setNudged(index);
    window.setTimeout(
      () => setNudged((now) => (now === index ? null : now)),
      1000,
    );

    onMiss();
  }

  /*
    Two across, when every choice has a picture to be recognised by.

    A picture is what a child who cannot yet read the words is choosing from,
    so illustrated options are laid out as a field to be scanned rather than
    a list to be read down — and four of them side by side fit on one screen
    without pushing the question off the top of it. A choice that is only
    words stays a column, where the reading is the work.

    This decides the *shape* of the field and nothing else. The card itself
    is the same warm one either way: a question in the middle of a story and
    a question in a game were two different-looking things for no reason
    anybody could have given a child, and the one that looked like part of
    the story is the one worth keeping.
  */
  const illustrated = options.length >= 4 && options.every((o) => o.art);

  return (
    <div
      className={`flex w-full flex-col gap-5 ${illustrated ? "max-w-xl px-1" : "max-w-sm px-6"}`}
    >
      <h2 className="asking text-center leading-snug text-balance">
        {interaction.prompt}
      </h2>

      <ul className={illustrated ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
        {options.map((option, index) => {
          const gone = index === withdrawn;
          const showing = rung >= 3 && option.correct && chosen === null;

          return (
            <li
              key={index}
              className={[
                // A column closes the gap by collapsing the row. A grid has
                // no row of its own to collapse, so the tidied option leaves
                // the layout instead and the rest close up around it — the
                // same idea, said in the only way a grid can say it.
                illustrated
                  ? gone && tidied
                    ? "hidden"
                    : ""
                  : gone && tidied
                    ? "max-h-0 overflow-hidden transition-[max-height] duration-500"
                    : "max-h-40 transition-[max-height] duration-500",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <button
                type="button"
                onClick={() => choose(index)}
                aria-hidden={gone}
                tabIndex={gone ? -1 : 0}
                className={[
                  "flex w-full items-center text-left transition-opacity duration-500",
                  // One card, everywhere. What the layout changes is how
                  // many sit in a row and how much room the word gets — not
                  // what a choice looks like.
                  "option-card font-semibold",
                  illustrated
                    ? "h-full min-h-24 gap-2 p-2 pr-3 leading-tight"
                    : "min-h-[clamp(3.25rem,7.4vh,5rem)] gap-4 px-4 py-3 text-[clamp(1.05rem,2.6vh,1.25rem)] leading-snug",
                  gone && "pointer-events-none opacity-0",
                  settling === index && "settling",
                  chosen === index && "blooming is-right",
                  nudged === index && "is-again",
                  showing && "noticing",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {option.art ? (
                  <Picture
                    art={option.art}
                    className={
                      illustrated
                        ? "option-art object-contain"
                        : "size-16 shrink-0 rounded-xl object-cover"
                    }
                  />
                ) : null}
                <span className="min-w-0 flex-1 text-balance">{option.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Which option quietly leaves at the "narrow the field" rung.
 *
 * Prefers one the child has already ruled out themselves — that confirms what
 * they worked out, rather than taking a decision away from them.
 */
function withdraw(
  options: MultipleChoice["options"],
  tried: number[],
): number | null {
  const alreadyRuledOut = tried.find((index) => !options[index]?.correct);
  if (alreadyRuledOut !== undefined) return alreadyRuledOut;

  const anyWrong = options.findIndex((option) => !option.correct);
  return anyWrong === -1 ? null : anyWrong;
}
