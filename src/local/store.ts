/**
 * Everything this product remembers, and the only place it is remembered.
 *
 * All of it is `localStorage`, all of it is on this device, and none of it
 * ever leaves. There is no account, no sync, no identifier and no request:
 * a child's name is a word this app says back to them, not a record of who
 * they are. Nothing here is asked for permission either — plain
 * `localStorage` prompts for nothing, and a product that interrupts a
 * six-year-old with a browser dialog to remember their name has already got
 * it wrong. `navigator.storage.persist()` is deliberately not called; it
 * would change nothing about how this works and can only add a prompt.
 *
 * Every access is wrapped, because private browsing throws on the property
 * itself and quota errors throw on write. The rule throughout is that
 * storage failing means *this device has no memory*, never that something is
 * broken: a child in a private window gets a product that forgets, and every
 * screen must be written so that forgetting is an ordinary state.
 */

/** One namespace, so "clear everything" can be exact rather than hopeful. */
const PREFIX = "ssc.";

/**
 * Every key, and which of them are per-class.
 *
 * The templated ones carry a class id because a Beginner child and a Primary
 * child on the same device have separate everything: separate place in a
 * story, separate streaks, separate sense of what they have finished.
 * Switching class changes which keys are read, and touches none of the
 * others — which is the whole of how progress survives a switch and back.
 *
 * `class` itself is not scoped. It is the thing doing the scoping.
 */
export type Key =
  | "child"
  | "welcomed"
  | "settings"
  | "class"
  | `place.${string}`
  | `games.streak.${string}`
  | `verse.streak.${string}`;

/**
 * Reads a value, repaired into a shape the caller can trust.
 *
 * `repair` is given whatever was on disk — which may be from an older
 * version of the app, hand-edited, or truncated — and must return something
 * valid or the fallback. Nothing downstream is allowed to assume stored data
 * is well-formed, because stored data outlives the code that wrote it.
 */
export function read<T>(key: Key, repair: (raw: unknown) => T | null, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return repair(JSON.parse(raw)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function write(key: Key, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // No memory on this device. Every caller is written to survive that.
  }
}

export function forget(key: Key): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to do, and nothing that needs saying.
  }
}

/**
 * Clears everything this app has stored, and nothing else.
 *
 * It scans for the prefix rather than working through a list. It used to be
 * a list, which was the safer design while every key was a fixed name — a
 * key added without thinking about deletion showed up as a compile error
 * rather than as data that quietly survived "clear progress". Per-class keys
 * ended that: `place.beginner` and `place.primary` cannot both be in a list
 * written before anyone chose a class, and a list that silently missed them
 * would leave a child's old progress behind after they asked for it to go.
 *
 * The namespace is what keeps the scan honest. Everything this product
 * writes begins `ssc.` and nothing else in `localStorage` does, so this
 * cannot reach another app's data on a shared origin.
 *
 * It clears the chosen class too, and that is deliberate rather than
 * overlooked. This is the full reset behind a confirmation — it forgets the
 * child's name and that they were ever welcomed — so the next thing they see
 * is onboarding, which asks for the class again. Keeping a class through a
 * reset that forgets who they are would be the odd half-measure.
 */
export function forgetEverything(): void {
  try {
    const ours = Object.keys(window.localStorage).filter((k) =>
      k.startsWith(PREFIX),
    );
    for (const key of ours) window.localStorage.removeItem(key);
  } catch {
    // No memory on this device. There was nothing to clear.
  }
}
