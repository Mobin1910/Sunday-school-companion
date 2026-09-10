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
 * This has no user in the chapters as they stand today. It is kept because
 * it is one of the presentations the schema declares, and a declared
 * presentation with no implementation is a door in the content model that
 * opens onto "not yet".
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

      <ul className="grid grid-cols-3 gap-2">
        {interaction.items.map((thing, index) => {
          const done = found.includes(index);

          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => touch(index)}
                aria-pressed={done}
                className={[
                  "step-card block w-full overflow-hidden transition-opacity duration-500",
                  !done && "opacity-55",
                  done && "is-filled",
                  just === index && "blooming",
                  pointingAt === index && "noticing",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {thing.art ? (
                  <Picture art={thing.art} className="jar-art w-full object-cover" />
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
