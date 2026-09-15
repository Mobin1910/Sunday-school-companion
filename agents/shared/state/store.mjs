import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { config } from "../config.mjs";

/**
 * What the agent remembers between runs.
 *
 * Two things are stored, and they are stored for different reasons.
 *
 * **The extraction request** is the seam between the agent's two halves.
 * `--fetch` writes it with empty fields; a Claude session looking at the
 * downloaded pages fills them in; `--from-extraction` reads it back. It is a
 * file rather than a function call because the reader is a person-shaped
 * thing and not a subprocess.
 *
 * It carries a fingerprint of the source files, so that a chapter whose pages
 * changed after they were read can be told from one whose pages did not — the
 * staleness can only go in the safe direction.
 *
 * **The run record** exists because things fail in the middle. A download that
 * dies, a quota wall, an extraction that needs a human — each leaves a note
 * saying where the run stopped and why, so the next run resumes instead of
 * beginning again. This is also what makes "come back tomorrow when the quota
 * resets" a real instruction rather than a shrug.
 *
 * Everything lives under `agents/.state/`, which is git-ignored: it holds
 * downloaded curriculum pages and the text read off them, which are a
 * teacher's material and belong in neither the repository nor the app.
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
  /** A path under `.state/`, without writing anything. */
  stateFile(...parts) {
    return file(...parts);
  },

  /** Any JSON under `.state/`, or undefined if it is absent or unparseable. */
  readJsonAt(path) {
    return readJson(path);
  },

  /** Write a file under `.state/`, creating the directories it needs. */
  writeStateFile(dir, name, body) {
    const path = file(dir, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body, "utf8");
    return path;
  },

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
