import { read, write } from "./store";

/**
 * Where the child was.
 *
 * Deliberately semantic rather than a URL. A stored address is a promise
 * about routing that content changes quietly break; a stored *place* — this
 * chapter, this section, this far through it — can be checked against the
 * content that actually exists now and repaired or discarded honestly. The
 * app ships new chapters and edits old ones, and a child returning after
 * that should meet a sensible screen, never a dead link or a page that is no
 * longer there.
 *
 * It is one record, not a history. There is no list of chapters visited, no
 * count of times opened and no per-page timing: this exists to answer "where
 * were we?" and nothing else. `at` is here only so that a later feature can
 * tell stale progress from fresh, and is never shown to a child.
 */

export type Section = "story" | "games" | "verse" | "watch";

export type Place = {
  v: 1;
  slug: string;
  section: Section;
  /** How far into the section, in that section's own units. */
  page: number;
  /** How many there were when this was saved. Content may have changed. */
  pages: number;
  /** The end was reached. Returning should offer what comes next. */
  done: boolean;
  at: number;
};

/**
 * The little a screen needs to know about a chapter to offer it.
 *
 * Home is a server component and this check happens in the browser, so the
 * chapter list has to cross that boundary; this is the smallest shape that
 * can validate a stored place and label a link.
 */
export type ChapterBrief = {
  slug: string;
  title: string;
  reference: string;
  /** Pages in the story reader, which is what `page` counts. */
  storyPages: number;
};

const SECTIONS: readonly Section[] = ["story", "games", "verse", "watch"];

function repair(raw: unknown): Place | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Partial<Place>;

  if (r.v !== 1) return null;
  if (typeof r.slug !== "string" || r.slug === "") return null;
  if (!SECTIONS.includes(r.section as Section)) return null;

  const page = Number(r.page);
  const pages = Number(r.pages);
  if (!Number.isFinite(page) || page < 0) return null;

  return {
    v: 1,
    slug: r.slug,
    section: r.section as Section,
    page: Math.floor(page),
    pages: Number.isFinite(pages) && pages > 0 ? Math.floor(pages) : 0,
    done: r.done === true,
    at: Number.isFinite(Number(r.at)) ? Number(r.at) : 0,
  };
}

export function readPlace(): Place | null {
  return read("place", repair, null);
}

export function rememberPlace(
  place: Omit<Place, "v" | "at">,
  now = Date.now(),
): void {
  write("place", { v: 1, ...place, at: now });
}

/**
 * What Home should offer, given what was remembered and what exists now.
 *
 * Every failure mode lands on the same honest answer — start at the
 * beginning of something real — rather than on an error or an empty space.
 * A chapter that has been removed, a page that no longer exists, a record
 * from a future version of the app and a child who has never opened
 * anything all arrive here and all leave with a chapter to open.
 */
export type NextStep =
  | { kind: "continue"; chapter: ChapterBrief; page: number }
  | { kind: "next"; chapter: ChapterBrief }
  | { kind: "start"; chapter: ChapterBrief };

export function nextStep(
  place: Place | null,
  chapters: ChapterBrief[],
): NextStep | null {
  const first = chapters[0];
  if (!first) return null;

  const fallback: NextStep = { kind: "start", chapter: first };
  if (!place) return fallback;

  const at = chapters.findIndex((c) => c.slug === place.slug);
  // The chapter is gone. Its progress goes with it rather than becoming a
  // link to nothing.
  if (at === -1) return fallback;

  const chapter = chapters[at]!;

  if (place.done) {
    const after = chapters[at + 1];
    // Finished the last chapter there is: offer it again rather than
    // inventing a chapter or showing a dead end.
    return after ? { kind: "next", chapter: after } : { kind: "start", chapter };
  }

  // Only the story has pages to return to. Everything else is one screen,
  // so "continue" means "open it again", which is what page 0 does.
  const limit = place.section === "story" ? chapter.storyPages : 1;
  const page = place.page < limit ? place.page : 0;

  return page > 0
    ? { kind: "continue", chapter, page }
    : { kind: "start", chapter };
}

/**
 * Where in the story to open, for a chapter being opened now.
 *
 * Returns 0 — the beginning — for everything except an unfinished story in
 * this exact chapter. A finished chapter starts at its first page, because
 * dropping a child back onto the celebration of a story they came back to
 * re-read would be worse than a moment's scrolling.
 */
export function resumeAt(slug: string, pages: number): number {
  const place = readPlace();
  if (!place || place.slug !== slug || place.section !== "story") return 0;
  if (place.done) return 0;
  return place.page > 0 && place.page < pages ? place.page : 0;
}
