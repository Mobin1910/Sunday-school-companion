import { forget, read, write } from "./store";

/**
 * The child's name, as they gave it.
 *
 * It exists so the app can say it back — "Good to see you, Sarah!" — and for
 * nothing else. It is not an identifier, not a login, not a profile and not
 * a key to anything. It never leaves the device, it is never sent anywhere,
 * and there is no second field waiting to be added beside it.
 *
 * Absence is a first-class state, not a gap to be filled. A child who has
 * not given a name is greeted warmly without one, and the app never invents,
 * guesses or nudges for it.
 */

/** Long enough for a real name, short enough that it cannot become a note. */
const LIMIT = 24;

/**
 * What we will keep of what was typed.
 *
 * Trimmed, capped, and stripped of the control characters a paste can carry.
 * Everything else is left exactly as the child wrote it — capitalisation,
 * accents, spaces, apostrophes — because correcting a child's own name is
 * the one thing a name field must never do.
 */
export function tidyName(input: string): string {
  return input
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .trim()
    .slice(0, LIMIT);
}

export function readName(): string {
  return read(
    "child",
    (raw) => {
      if (typeof raw !== "object" || raw === null) return null;
      const name = (raw as { name?: unknown }).name;
      return typeof name === "string" ? tidyName(name) : null;
    },
    "",
  );
}

/** Saving an empty name is how a child takes it back. */
export function saveName(input: string): string {
  const name = tidyName(input);
  if (name === "") {
    forget("child");
    return "";
  }

  write("child", { name });
  return name;
}

/**
 * The greeting, with the name folded in when there is one.
 *
 * Here rather than in a component because more than one voice will want it:
 * Home says it on arrival, and Halo's own lines will want the same name in
 * the same shape rather than assembling a second version of it.
 */
export function greeting(name: string): string {
  return name ? `Good to see you, ${name}!` : "Good to see you!";
}
