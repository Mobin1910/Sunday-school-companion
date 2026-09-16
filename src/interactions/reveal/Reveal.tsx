"use client";

import { useEffect, useState } from "react";

import Picture from "@/components/Picture";

import type { Discovery, ModelProps } from "../types";

/**
 * Reveal — finding out, rather than answering.
 *
 * The one interaction with no wrong answer in it: every item is there to be
 * touched, in any order, and it ends when they all have been. `onMiss` is
 * never called from this file, which is the point — a discovery a child can
 * get wrong is a quiz wearing a costume.
 *
 * It is for the moments a chapter wants a child to look rather than choose:
 * "who else is hungry?", where each tap finds somebody and nothing counts.
 *
 * Nothing here is shuffled either. An item's meaning is what it shows, not
 * where it sits, so there is no order to disturb and no advantage to hide.
 *
 * Chapter 3 is its first user, and it is there for a reason worth writing
 * down. Question 3 of that chapter's review — "What did the woman do to find
 * the lost coin?" — has a list for an answer, and the two sources disagree
 * about the order of two items in that list. A sequence would have had to
 * invent an order and then mark a child against it. A reveal asks for the
 * same four things and has no opinion about which is touched first, which is
 * exactly as much as the curriculum actually says.
 */
export default function Reveal({
  interaction,
  rung,
  locked,
  onArrive,
}: ModelProps<Discovery>) {
  const [found, setFound] = useState<number[]>([]);
  const [just, setJust] = useState<number | null>(null);

  const total = interaction.items.length;
  const all = found.length === total;

  useEffect(() => {
    if (all) onArrive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  function touch(index: number) {
    if (locked || found.includes(index)) return;
    setFound((seen) => [...seen, index]);
    setJust(index);
    window.setTimeout(() => setJust((now) => (now === index ? null : now)), 700);
  }

  /*
    The ladder never narrows anything here, because there is nothing to
    narrow. At the top rung it points at one still waiting — which is what a
    child who has stopped is usually missing: not what to do, but which one
    they have not done.
  */
  /*
    How many to a row, so that no row ends with a single orphan.

    Three was hard-coded when the only shape this had to hold was six. Four
    items — what Chapter 3's list of what she did comes to — laid out three
    across is a row of three and a lonely fourth, which reads as one that did
    not fit rather than one more to find.
  */
  const columns = total % 3 === 0 ? 3 : total <= 4 ? 2 : 3;

  const pointingAt =
    rung >= 3 && !locked && !all
      ? interaction.items.findIndex((_, i) => !found.includes(i))
      : -1;

  return (
    <div className="flex w-full max-w-md flex-col gap-4 px-3">
      {interaction.prompt ? (
        <h2 className="asking text-center leading-snug text-balance">
          {interaction.prompt}
        </h2>
      ) : null}

      <ul className={`grid gap-2 ${columns === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {interaction.items.map((thing, index) => {
          const done = found.includes(index);

          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => touch(index)}
                aria-pressed={done}
                className={[
                  "step-card flex w-full flex-col items-stretch overflow-hidden text-left transition-opacity duration-500",
                  !done && "opacity-55",
                  done && "is-filled",
                  just === index && "blooming",
                  pointingAt === index && "noticing",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {thing.art ? (
                  <Picture art={thing.art} className="step-art object-cover" />
                ) : null}

                {/*
                  The words, out loud.

                  They used to be `sr-only`, which was survivable while every
                  item was a picture and the picture was the whole answer. It
                  stopped being survivable the moment a reveal had something
                  to say that nobody had drawn: an item with a label and no
                  artwork rendered as an empty box, and a child was being
                  asked to tap a thing that was not there. So the label is
                  shown wherever there is one, exactly as `Sequence` shows
                  its steps — same card, same class, same place.
                */}
                {thing.label ? (
                  <span
                    className={`px-2 py-1.5 leading-tight font-semibold text-balance ${
                      total > 4 ? "text-xs" : "text-sm"
                    }`}
                  >
                    {thing.label}
                  </span>
                ) : null}

                <span className="sr-only">
                  {thing.label ?? `Number ${index + 1}`}
                  {done ? ", found" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
