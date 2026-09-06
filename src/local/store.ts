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

export type Key =
  | "child"
  | "welcomed"
  | "settings"
  | "place"
  | "games.streak"
  | "verse.streak";

const ALL: readonly Key[] = [
  "child",
  "welcomed",
  "settings",
  "place",
  "games.streak",
  "verse.streak",
];

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
 * Enumerated rather than done by scanning for the prefix, so a key someone
 * adds without thinking about deletion shows up as a compile error in `ALL`
 * rather than as data that quietly survives "clear progress".
 */
export function forgetEverything(): void {
  ALL.forEach(forget);
}
