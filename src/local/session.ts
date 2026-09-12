"use client";

import { useSyncExternalStore } from "react";

/**
 * What a child has finished *today, in this sitting*.
 *
 * Deliberately the shortest-lived thing in the product, and deliberately not
 * in `local/store.ts` with everything else. Every other record here is a
 * promise kept across weeks — a name, a place in a chapter, a streak. This
 * one is the opposite: it exists so that a child who has just worked through
 * a chapter can see that they did, and so that the same chapter is fresh
 * again the next time they open the app.
 *
 * `sessionStorage`, therefore, and never `localStorage`. A chapter marked
 * done forever would slowly turn a shelf of stories into a list of chores
 * with most of them crossed out, and a six-year-old who wants to read the
 * one about Simeon again should not be told they have already done it.
 *
 * It is not progress towards anything and it unlocks nothing. Nothing here
 * is counted, compared, or shown as a total — a chapter is either finished
 * in this sitting or it is not, and both are fine.
 */

const KEY = "ssc.session.chapters";

/** What a chapter needs before it counts as finished. */
export type ChapterProgress = {
  story?: true;
  /** Keyed by game id, so a chapter's own list decides what "all" means. */
  games?: Record<string, true>;
  verse?: true;
};

type Progress = Record<string, ChapterProgress>;

/*
  One subscriber list, because `sessionStorage` fires no event in the tab
  that wrote to it. Screens that show this have to be told, or a child would
  finish a verse, land on the shelf, and find nothing had changed until they
  reloaded.
*/
const listeners = new Set<() => void>();
let cached: Progress | null = null;

function read(): Progress {
  if (cached) return cached;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    cached = typeof parsed === "object" && parsed !== null ? (parsed as Progress) : {};
  } catch {
    // A private window, or storage turned off. The app still works; a child
    // simply does not see "Done" until they finish something in a tab that
    // can remember it.
    cached = {};
  }
  return cached;
}

function write(next: Progress): void {
  cached = next;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Kept in memory for this page at least. Nothing depends on it.
  }
  for (const listen of listeners) listen();
}

function change(slug: string, edit: (was: ChapterProgress) => ChapterProgress) {
  const all = read();
  write({ ...all, [slug]: edit(all[slug] ?? {}) });
}

export function finishedStory(slug: string): void {
  change(slug, (was) => ({ ...was, story: true }));
}

export function finishedGame(slug: string, id: string): void {
  change(slug, (was) => ({ ...was, games: { ...was.games, [id]: true } }));
}

export function finishedVerse(slug: string): void {
  change(slug, (was) => ({ ...was, verse: true }));
}

/**
 * Whether a chapter is finished, asked of the chapter rather than assumed.
 *
 * The list of games comes from the chapter's own content, so a chapter with
 * two games needs two and a chapter with five needs five — and a chapter
 * with none needs none, which is a chapter that is finished on its story and
 * its verse alone rather than one stuck at "0 of 0".
 *
 * Everything a chapter *has* must be done. Nothing infers completion from
 * where the child happens to be standing.
 */
export function chapterDone(
  progress: ChapterProgress | undefined,
  needs: { games: string[]; verse: boolean },
): boolean {
  if (!progress?.story) return false;
  if (needs.verse && !progress.verse) return false;
  return needs.games.every((id) => progress.games?.[id]);
}

/** How many of a chapter's games are done. For "2 of 3", and nothing else. */
export function gamesDone(
  progress: ChapterProgress | undefined,
  games: string[],
): number {
  return games.filter((id) => progress?.games?.[id]).length;
}

/**
 * The live view of it, for screens that have to change when it changes.
 *
 * The server snapshot is empty on purpose: nothing about this session exists
 * while a page is being prerendered, and claiming otherwise is how a "Done"
 * marker ends up baked into static HTML for every child who ever opens it.
 */
export function useSessionProgress(): Progress {
  return useSyncExternalStore(
    (listen) => {
      listeners.add(listen);
      return () => listeners.delete(listen);
    },
    read,
    () => EMPTY,
  );
}

const EMPTY: Progress = {};
