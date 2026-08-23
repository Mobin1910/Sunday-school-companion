"use client";

import { useEffect, useMemo, useState } from "react";

import Picture from "@/components/Picture";

import type { ModelProps, MultipleChoice } from "../types";

/**
 * Selection — choosing the one that's right.
 *
 * The most examination-shaped of the four models, so it needs the most care to
 * feel like a teacher rather than a test. A choice that does not stay settles
 * quietly back where it came from: a fact about the world, not about the child.
 * Nothing reddens, nothing shakes, nothing is marked.
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
  // Shuffled so that the answer is not simply wherever the author wrote it.
  // Seeded from the prompt so the server and the browser agree, which keeps
  // the order stable instead of flickering after the page loads.
  const options = useMemo(
    () => shuffle(interaction.options, interaction.prompt),
    [interaction.options, interaction.prompt],
  );

  const [tried, setTried] = useState<number[]>([]);
  const [settling, setSettling] = useState<number | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);

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
    onMiss();
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-5 px-6">
      <h2 className="text-center text-2xl leading-snug text-balance">
        {interaction.prompt}
      </h2>

      <ul className="flex flex-col gap-3">
        {options.map((option, index) => {
          const gone = index === withdrawn;
          const showing = rung >= 3 && option.correct && chosen === null;

          return (
            <li
              key={index}
              className={
                gone && tidied
                  ? "max-h-0 overflow-hidden transition-[max-height] duration-500"
                  : "max-h-40 transition-[max-height] duration-500"
              }
            >
              <button
                type="button"
                onClick={() => choose(index)}
                aria-hidden={gone}
                tabIndex={gone ? -1 : 0}
                className={[
                  "flex min-h-20 w-full items-center gap-4 rounded-card bg-ground-raised p-3 pr-5 text-left text-xl transition-opacity duration-500",
                  gone && "pointer-events-none opacity-0",
                  settling === index && "settling",
                  chosen === index && "blooming",
                  showing && "noticing",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {option.art ? (
                  <Picture
                    art={option.art}
                    className="size-16 shrink-0 rounded-xl object-cover"
                  />
                ) : null}
                <span className="min-w-0 flex-1">{option.label}</span>
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

function shuffle<T>(items: T[], seed: string): T[] {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    state = Math.imul(state ^ seed.charCodeAt(i), 16777619) >>> 0;
  }

  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };

  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
