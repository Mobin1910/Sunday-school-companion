"use client";

import { useState } from "react";

import { displayName } from "@/classes/registry";
import { useResolvedClass } from "@/local/class";

import ClassSelector from "./ClassSelector";

/**
 * The class a child is in, shown where they can see it and change it.
 *
 * Used by Home and by Settings, which want the same two things: the answer,
 * legibly, and a way to change it that is reachable without being loud. It is
 * one line until it is asked to open, because on Home this is a caption under
 * the greeting rather than a control — a child who is in the right class
 * should be able to ignore it entirely.
 *
 * Changing it is a two-tap gesture with no confirmation dialog, and it does
 * not need one: nothing is lost. Every chapter, place and streak is stored
 * under its own class, so switching to Primary and back to Beginner returns
 * a child to exactly where they were. That is the promise the wording keeps,
 * and it is the reason the button says "Change" rather than warning anyone.
 *
 * Nothing renders until the device has answered. `settled` is the difference
 * between "no class" and "we have not looked yet", and drawing "Choose your
 * class" for the frame it takes to read localStorage would flash a question
 * at every child who has already answered it.
 */
export default function ClassRow({ label = "Class" }: { label?: string }) {
  const { id, settled } = useResolvedClass();
  const [open, setOpen] = useState(false);

  if (!settled) return null;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-base">
          <span className="text-ink-soft">{label}</span>{" "}
          <span className="font-semibold">
            {id ? displayName(id) : "Not chosen yet"}
          </span>
        </p>

        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          className="shrink-0 rounded-full px-3 py-2 text-base text-touchable underline underline-offset-4"
        >
          {open ? "Done" : id ? "Change" : "Choose"}
        </button>
      </div>

      {open ? (
        <div className="flex flex-col gap-2">
          <ClassSelector chosen={id} onChosen={() => setOpen(false)} />

          {/*
            Said once, where the worry actually is. A child moving between
            classes — or trying another one out — should be told plainly that
            nothing they have done goes away, because the alternative is a
            child who never touches this.
          */}
          <p className="text-sm text-ink-soft">
            Your stories and streaks are kept for every class. Nothing is lost
            when you switch.
          </p>
        </div>
      ) : null}
    </div>
  );
}
