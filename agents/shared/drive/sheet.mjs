import { accessToken } from "./client.mjs";
import { config } from "../config.mjs";

/**
 * The editorial Sheet, read for one thing only: what the teacher typed.
 *
 * The Contributor Guide asks teachers to upload the curriculum pages *and* to
 * type the memory verse into the Sheet. That redundancy looked like duplicated
 * effort and is in fact the most valuable thing in the workflow: it means
 * every verse has two independent sources — a photograph of the book, and a
 * person who held the book and typed. Neither is authoritative on its own.
 * Agreement between them is a much stronger guarantee than either could give,
 * and it costs one HTTP request.
 *
 * Read-only, always. Nothing here writes a cell. The Sheet belongs to the
 * teachers and an agent editing it would be editing the evidence.
 *
 * The Sheets API is used rather than exporting the file through Drive, because
 * a Drive export gives up the first tab only and the classes are one tab each.
 * The `drive` scope the agent already holds is accepted by the Sheets API, so
 * this needs no new authorisation.
 */

export class SheetError extends Error {}

async function sheets(path, params = {}) {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${await accessToken()}` },
  });

  if (!response.ok) {
    throw new SheetError(
      `Sheets ${path} failed (${response.status}): ${await response.text()}`,
    );
  }
  return response.json();
}

const fold = (s) =>
  String(s ?? "")
    .normalize("NFKD")
    .replace(/[‐-―−]/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Which tab holds a class.
 *
 * Matched on the folded display name, so "Young Adult" finds "Young Adults"
 * and spacing or dashes do not matter. What it will *not* do is fall back to
 * the first tab, or to the nearest-looking one, when a class has no tab at
 * all: picking a plausible tab is how a Beginner draft ends up carrying a
 * Primary verse, and the two are different content, not two views of one.
 *
 * It returns the tab names it did find, because when this fails the useful
 * thing to say is not "not found" but "here is what the Sheet actually has".
 */
export function tabFor(titles, entry) {
  const wanted = [entry.display, entry.id].map(fold);

  const hit = titles.find((title) => {
    const folded = fold(title);
    return wanted.some((w) => folded === w || folded === `${w}s`);
  });

  return hit;
}

const HEADERS = {
  chapter: ["chapter"],
  verse: ["memoryverse"],
  reference: ["memoryversereference"],
  title: ["title"],
  status: ["status"],
  contributor: ["contributor"],
};

/** Which column is which, by reading the header row rather than counting. */
function columns(header) {
  const found = {};
  header.forEach((cell, index) => {
    const folded = fold(cell);
    for (const [key, names] of Object.entries(HEADERS)) {
      // Matched whole, not by prefix: "memoryverse" is a prefix of
      // "memoryversereference", and a prefix match would file the reference
      // column under the verse column and lose one of the two.
      if (names.includes(folded)) found[key] = index;
    }
  });
  return found;
}

/**
 * What the teacher typed for one chapter, or why there is nothing.
 *
 * Never throws for "the Sheet does not say" — an absent row, an absent tab and
 * an absent Sheet are all ordinary states of a curriculum that is still being
 * written, and none of them should stop a run. They come back as a reason,
 * which the draft then records, so that "nobody confirmed this verse" is
 * written down rather than merely true.
 */
export async function teacherVerse(entry, chapter) {
  if (!config.sheetId) {
    return {
      available: false,
      reason:
        "SSC_SHEET_ID is not set, so the teacher's own entry was not read. " +
        "The verse below was confirmed by nobody but the page.",
    };
  }

  let meta;
  try {
    meta = await sheets(config.sheetId, { fields: "properties.title,sheets.properties.title" });
  } catch (error) {
    return { available: false, reason: `the Sheet could not be read: ${error.message}` };
  }

  const titles = (meta.sheets ?? []).map((s) => s.properties?.title).filter(Boolean);
  const tab = tabFor(titles, entry);

  if (!tab) {
    return {
      available: false,
      reason:
        `the Sheet has no tab for ${entry.display}. Its tabs are: ${titles.join(", ")}.`,
      tabs: titles,
    };
  }

  let values;
  try {
    const got = await sheets(`${config.sheetId}/values/${encodeURIComponent(tab)}`, {
      majorDimension: "ROWS",
    });
    values = got.values ?? [];
  } catch (error) {
    return { available: false, reason: `tab "${tab}" could not be read: ${error.message}` };
  }

  // The header is not always the first row — these tabs open with a title and
  // some blank lines — so it is found by looking for the row that names the
  // chapter column rather than by assuming a position.
  const headerAt = values.findIndex((row) => columns(row).chapter !== undefined);
  if (headerAt === -1) {
    return { available: false, reason: `tab "${tab}" has no Chapter column`, tab };
  }

  const at = columns(values[headerAt]);
  const wanted = String(Number(chapter));

  const row = values.slice(headerAt + 1).find((r) => {
    const cell = String(r[at.chapter] ?? "").trim();
    return cell !== "" && String(Number(cell)) === wanted;
  });

  if (!row) {
    return {
      available: false,
      reason: `tab "${tab}" has no row for chapter ${chapter}`,
      tab,
    };
  }

  const cell = (key) => (at[key] === undefined ? "" : String(row[at[key]] ?? "").trim());

  return {
    available: true,
    tab,
    sheetId: config.sheetId,
    text: cell("verse"),
    reference: cell("reference"),
    title: cell("title"),
    status: cell("status"),
    contributor: cell("contributor"),
  };
}
