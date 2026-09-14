import { readFileSync } from "node:fs";
import { join } from "node:path";

import { config } from "./config.mjs";

/**
 * The seven classes, read from the same file the app reads.
 *
 * `content/classes.json` is the single registry — `src/classes/registry.ts`
 * imports it too — so an agent and the application can never disagree about
 * what a class is called or what its id is. There is no second list here, and
 * the old placeholder age-range names ("6–7 Years") exist nowhere.
 */

const data = JSON.parse(
  readFileSync(join(config.paths.root, "content", "classes.json"), "utf8"),
);

export const CLASSES = [...data.classes].sort((a, b) => a.order - b.order);

export function classById(id) {
  return CLASSES.find((c) => c.id === String(id).toLowerCase().trim());
}

/**
 * The Drive folder a class lives in: "02 - Beginner".
 *
 * Built from `order` and `display`, which is exactly how `create-library.gs`
 * named them, so the numbering cannot drift between the script that made the
 * folders and the agent that reads them.
 */
export function driveFolderFor(entry) {
  return `${String(entry.order).padStart(2, "0")} - ${entry.display}`;
}

/** "01" from 1, "1", "01", or "chapter 1". */
export function chapterNumber(input) {
  const found = /\d+/.exec(String(input));
  if (!found) throw new Error(`not a chapter number: ${input}`);
  const n = Number(found[0]);
  if (n < 1 || n > 20) throw new Error(`chapter out of range 1–20: ${n}`);
  return String(n).padStart(2, "0");
}

export const CHAPTER_SUBFOLDERS = {
  curriculumSource: "01 - Curriculum Source",
  teacherMaterials: "02 - Teacher Materials",
  workingContent: "03 - Working Content",
  storyArtwork: "04 - Story Artwork",
  games: "05 - Games",
  memoryVerse: "06 - Memory Verse",
  approvedAssets: "07 - Approved Assets",
};
