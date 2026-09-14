import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { config } from "../config.mjs";

/**
 * What the agent remembers between runs.
 *
 * Two things are stored, and they are stored for different reasons.
 *
 * **The extraction cache** exists because Gemini costs quota and the free tier
 * is small. A successful read of a chapter's curriculum is written down and
 * re-used, so running the agent twice on an unchanged chapter costs one
 * request, not two. The key includes a fingerprint of the source files, so
 * *changed* curriculum is read again — the cache can go stale in only one
 * direction, and it is the safe one.
 *
 * **The run record** exists because things fail in the middle. A download that
 * dies, a quota wall, an extraction that needs a human — each leaves a note
 * saying where the run stopped and why, so the next run resumes instead of
 * beginning again. This is also what makes "come back tomorrow when the quota
 * resets" a real instruction rather than a shrug.
 *
 * Everything lives under `agents/.state/`, which is git-ignored: it holds
 * extracted curriculum text, which is a teacher's material and does not belong
 * in the repository or in the deployed app.
 */

function file(...parts) {
  return join(config.paths.state, ...parts);
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(path) {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

/**
 * A fingerprint of the source material.
 *
 * Name, size and Drive's own checksum where it has one. If any file changes,
 * is added or is removed, this changes and the cached extraction is ignored.
 */
export function fingerprint(files) {
  const hash = createHash("sha256");
  for (const f of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    hash.update(`${f.name}\u001f${f.size ?? ""}\u001f${f.md5Checksum ?? ""}\u001f`);
  }
  return hash.digest("hex").slice(0, 16);
}

const slug = (classId, chapter) => `${classId}-chapter-${chapter}`;

export const store = {
  readExtraction(classId, chapter, print) {
    const found = readJson(file("extractions", `${slug(classId, chapter)}.json`));
    if (!found) return undefined;
    if (print && found.fingerprint !== print) return undefined;
    return found;
  },

  writeExtraction(classId, chapter, record) {
    writeJson(file("extractions", `${slug(classId, chapter)}.json`), record);
  },

  readRun(classId, chapter) {
    return readJson(file("runs", `${slug(classId, chapter)}.json`));
  },

  writeRun(classId, chapter, record) {
    writeJson(file("runs", `${slug(classId, chapter)}.json`), {
      ...record,
      at: new Date().toISOString(),
    });
  },

  draftPath(classId, chapter, name) {
    return join(config.paths.drafts, classId, `chapter-${chapter}`, name);
  },

  writeDraft(classId, chapter, name, body) {
    const path = this.draftPath(classId, chapter, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body, "utf8");
    return path;
  },
};
