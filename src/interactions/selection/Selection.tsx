"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

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
  const options = useShuffled(interaction.options);

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
                  "surface flex min-h-20 w-full items-center gap-4 p-3 pr-5 text-left text-xl transition-opacity duration-500",
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

/**
 * The options, in an order decided once when the question begins.
 *
 * A fixed order teaches the wrong lesson. If the answer is reliably second,
 * a child learns *tap the second one* rather than *think about the answer* —
 * and a per-question fixed order teaches it just as well, one question at a
 * time, because the same question comes back with the same layout. So the
 * order is genuinely random, and rolled again every time the question is
 * presented.
 *
 * It is decided **once**, and nothing after that may disturb it. A wrong tap,
 * Recovery, a hint, the assistance ladder climbing and any re-render all
 * leave it exactly as it was: a child looking again at the same three choices
 * must be able to reason about the same three choices. Reordering under them
 * would turn a second try into a fresh puzzle.
 *
 * The order is settled by an effect rather than during render because a
 * prerendered page has already been drawn by the time this runs: React must
 * see the same order it shipped in the HTML until hydration is over, or the
 * whole tree is thrown away and redrawn. `hydrating` is what makes that safe
 * without also making it slow — a question mounted by a tap (which is how
 * Games opens every one of them) was never in any HTML, so it can be shuffled
 * for its very first frame.
 */
function useShuffled<T>(items: T[]): T[] {
  const hydrating = useSyncExternalStore(
    () => () => {},
    () => false,
    () => true,
  );

  const [rolled, setRolled] = useState(() => (hydrating ? null : roll(items)));

  // Rolls only for a question it has not already rolled for. Without that
  // check this would fire a second time on the very first pass and reorder
  // the choices a frame after the child first saw them.
  useEffect(() => {
    setRolled((current) => (current?.of === items ? current : roll(items)));
  }, [items]);

  const order = rolled?.of === items ? rolled.order : null;

  return useMemo(
    () => (order ? order.map((i) => items[i]!) : items),
    [items, order],
  );
}

/** An order, tagged with the options it belongs to. */
function roll<T>(of: T[]) {
  return { of, order: shuffledIndices(of.length) };
}

/** Fisher–Yates, unbiased, over the positions rather than the options. */
function shuffledIndices(count: number): number[] {
  const out = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
