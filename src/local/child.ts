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

/**
 * Whether this child has been met.
 *
 * Kept apart from the name on purpose. A child may reach the end of the
 * welcome without giving a name — or clear their name later — and neither
 * should mean being introduced to Halo all over again. "Have we met?" and
 * "what shall I call you?" are two questions, so they are two facts.
 *
 * It is also the reason this is a flag rather than a check for stored data:
 * a returning child with nothing else saved has still been welcomed.
 */
export function readWelcomed(): boolean {
  return read("welcomed", (raw) => (raw === true ? true : null), false);
}

export function markWelcomed(): void {
  write("welcomed", true);
}

/**
 * What the document is told before anything is painted.
 *
 * Run as a blocking script in `layout.tsx` so the first frame is already the
 * right screen. Without it a returning child would see the welcome for a
 * moment, or a new one would see a Home built around a name they have not
 * given — either way the first impression would be of the app changing its
 * mind. The stylesheet does the hiding; this only says which.
 *
 * Written as a string because it has to run before React exists. Nothing it
 * touches leaves the device, and it makes no request.
 */
export const DOORWAY_SCRIPT = `try{document.documentElement.dataset.welcomed=localStorage.getItem("ssc.welcomed")==="true"?"yes":"no"}catch(e){}`;
