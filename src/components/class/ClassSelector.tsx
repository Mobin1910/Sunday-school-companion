"use client";

import { CLASSES, type ClassId } from "@/classes/registry";
import { chooseClass } from "@/local/class";

/**
 * Choosing a class, in the one place the product knows how to draw it.
 *
 * Three screens ask this question — onboarding asks it first, Home lets a
 * child see and change the answer, and Settings keeps it where a grown-up
 * expects to find it — and they must ask it identically. A child who chose
 * "Junior" from a friendly grid on Sunday and then meets a dropdown on
 * Wednesday has been asked a subtly different question; worse, three
 * implementations are three chances for one of them to forget that choosing
 * is a write everything else has to hear about.
 *
 * All seven are always offered, including the six with nothing written yet.
 * A child in Junior is in Junior whether or not anyone has finished writing
 * Junior, and a picker that hid the class would leave them unable to say so
 * — they would have to claim to be something they are not in order to get
 * past this screen. A class with no chapters lands on an honest empty state
 * instead, which is a much smaller problem than a wrong answer stored
 * forever. See `live` in the registry, which is an editorial flag and
 * deliberately does not reach this component.
 *
 * The names carry no ages. Which age sits in which class is a fact about a
 * congregation, so nothing here reads "Beginner (5–7)" — a child knows what
 * they are called on Sunday, and a grown-up is usually standing next to them.
 *
 * Switching is not destructive and this component is why it can say so
 * plainly: it writes the class and nothing else. No progress is cleared, no
 * place is forgotten and no streak is reset, because every one of those is
 * stored under its own class already. Coming back is coming back to exactly
 * what was left.
 */
export default function ClassSelector({
  chosen,
  onChosen,
  autoFocus = false,
}: {
  /** The class already chosen, marked as the current answer. */
  chosen?: ClassId | null;
  /** Called after the choice has been written, for a screen that moves on. */
  onChosen?: (id: ClassId) => void;
  /**
   * Onboarding only, where this is the whole of the beat and the child has
   * just pressed a button that no longer exists.
   */
  autoFocus?: boolean;
}) {
  return (
    <ul className="grid w-full grid-cols-2 gap-2">
      {CLASSES.map(({ id, display }, index) => {
        const current = chosen === id;

        return (
          <li key={id} className="flex">
            <button
              type="button"
              autoFocus={autoFocus && index === 0}
              aria-pressed={current}
              onClick={() => {
                chooseClass(id);
                onChosen?.(id);
              }}
              className={`surface flex min-h-14 flex-1 items-center justify-center gap-2 px-3 py-3 text-center text-lg leading-snug ${
                current ? "surface-lit" : ""
              }`}
            >
              {display}
              {current ? <TickIcon /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function TickIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}
