"use client";

import { useSyncExternalStore } from "react";

import { isClassId, type ClassId } from "@/classes/registry";
import { read, write } from "./store";

/**
 * Which Sunday School class this child is in.
 *
 * The single most load-bearing piece of state in the product. It is not a
 * preference and not a filter the child toggles for fun — it decides which
 * curriculum exists at all. Every chapter, game, verse and piece of progress
 * is scoped by it, so a Beginner child and a Primary child using the same
 * device have two entirely separate Sunday School Companions.
 *
 * It lives in `localStorage` alongside the name, because it is the same kind
 * of fact: something the child told us once that should still be true in a
 * fortnight. There is no account and no backend; this is the whole of who
 * the app thinks it is talking to.
 *
 * Absence is a real state and means "we have not asked yet", which is what
 * onboarding is for. Nothing guesses a class, and nothing defaults to
 * Beginner just because Beginner is the class with content — a child who has
 * not chosen must be asked rather than assumed.
 */

/*
  One subscriber list, because `localStorage` fires no event in the tab that
  wrote to it. Three places change the class — onboarding, Home and Settings
  — and everything that renders class-dependent content has to hear about it
  the moment it happens, or a child changes class in Settings and walks back
  to a Chapters screen still showing the old one.
*/
const listeners = new Set<() => void>();
let cached: ClassId | null | undefined;

export function readClass(): ClassId | null {
  if (cached !== undefined) return cached;
  cached = read(
    "class",
    (raw) => (isClassId(raw) ? raw : null),
    null as ClassId | null,
  );
  return cached;
}

export function chooseClass(id: ClassId): void {
  cached = id;
  write("class", id);
  for (const listen of listeners) listen();
}

/** For the debug switcher and for tests. Never reached from the child's UI. */
export function forgetClass(): void {
  cached = null;
  write("class", null);
  for (const listen of listeners) listen();
}

/**
 * The live view.
 *
 * The server snapshot is `null` on purpose. A class baked into static HTML
 * would be one child's class served to every child who ever opened the app,
 * and — worse — it would be the wrong one for a moment on every load, which
 * is exactly the route flash this architecture exists to prevent. Screens
 * that render class-dependent content wait for this rather than guessing;
 * see `useResolvedClass`.
 */
export function useClass(): ClassId | null {
  return useSyncExternalStore(
    (listen) => {
      listeners.add(listen);
      return () => listeners.delete(listen);
    },
    readClass,
    () => null,
  );
}

/**
 * The class, and whether we have actually looked yet.
 *
 * `null` means two different things during a render — "not chosen" and "not
 * read from the device yet" — and a screen that cannot tell them apart will
 * either flash an empty state at a child who has a class, or flash one
 * class's content at a child who has another. `settled` is the difference.
 */
export function useResolvedClass(): { id: ClassId | null; settled: boolean } {
  const id = useSyncExternalStore(
    (listen) => {
      listeners.add(listen);
      return () => listeners.delete(listen);
    },
    () => readClass(),
    () => undefined as ClassId | null | undefined,
  );

  return id === undefined ? { id: null, settled: false } : { id, settled: true };
}
