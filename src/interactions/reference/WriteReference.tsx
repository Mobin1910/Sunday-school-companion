"use client";

import { useEffect, useRef, useState } from "react";

import type { ModelProps, WriteReference as Model } from "../types";
import { sameReference } from "./match";

/**
 * Writing where the verse comes from.
 *
 * The last rung of the whole ladder, and the only interaction in the product
 * a child answers with a keyboard. Everything below it — recognising a phrase,
 * ordering phrases, choosing the next word, rebuilding the verse from tiles —
 * puts the answer somewhere on the screen. This does not. There is nothing to
 * spot, which is the entire point of it existing for Young Adult and for
 * nobody else.
 *
 * It keeps the same manners as every other model:
 *
 *   Nothing reddens. A reference that is not right settles back and the field
 *   keeps what was typed, because retyping "St Luke" from scratch to fix a
 *   number is a punishment for a near miss.
 *
 *   Nothing is counted. `onMiss` says a try did not work and says nothing
 *   else, exactly as Selection and Words do.
 *
 *   The answer is never filled in. Rung 3 — "together" — shows the book and
 *   the chapter and stops, leaving the verse numbers to the child. A rung
 *   that types the answer into the box has ended the practice rather than
 *   helped it, and the child still has to perform the act.
 *
 * The check is `sameReference`, which forgives case, spacing, "St", and how a
 * range is punctuated — and forgives nothing about which passage it is.
 */
export default function WriteReference({
  interaction,
  rung,
  locked,
  onMiss,
  onArrive,
}: ModelProps<Model>) {
  const [draft, setDraft] = useState("");
  const [settling, setSettling] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  /*
    Rung 3 opens the book and the chapter, never the verses.

    Derived from the answer rather than written by an author, so it cannot
    disagree with it — and cut at the last colon, so "St Luke 2:30,31" gives
    up "St Luke 2:" and keeps "30,31" for the child to remember.
  */
  const opened = interaction.answer.slice(
    0,
    interaction.answer.lastIndexOf(":") + 1,
  );

  useEffect(() => {
    if (!locked) field.current?.focus({ preventScroll: true });
  }, [locked]);

  function submit() {
    if (locked) return;

    const given = draft.trim();
    if (given === "") {
      field.current?.focus();
      return;
    }

    if (!sameReference(given, interaction.answer)) {
      setSettling(true);
      window.setTimeout(() => setSettling(false), 300);
      onMiss();
      return;
    }

    onArrive();
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-5 px-4">
      <h2 className="asking text-center leading-snug text-balance">
        {interaction.prompt}
      </h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="verse-reference" className="sr-only">
          {interaction.prompt}
        </label>

        <input
          ref={field}
          id="verse-reference"
          className={`min-h-16 rounded-card border border-edge bg-ground-raised px-4 text-center text-xl text-ink ${
            settling ? "settling" : ""
          }`}
          value={locked ? interaction.answer : draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder={interaction.shape ?? "Book chapter:verse"}
          readOnly={locked}
          autoComplete="off"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          inputMode="text"
        />

        {/*
          The opening, once help has climbed that far. It sits under the field
          as a quiet caption rather than being typed into it, so the child is
          still the one who answers.
        */}
        <p className="min-h-6 text-center text-sm text-ink-soft" aria-live="polite">
          {rung >= 3 && !locked && opened !== "" ? `It starts ${opened}` : " "}
        </p>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={locked}
        className="cta min-h-16 w-full px-6 text-xl"
      >
        {locked ? "That's it" : "Check"}
      </button>
    </div>
  );
}
