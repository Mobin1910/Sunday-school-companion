#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";

import {
  CHAPTER_SUBFOLDERS,
  chapterNumber,
  classById,
  driveFolderFor,
} from "../shared/classes.mjs";
import { ConfigError, config } from "../shared/config.mjs";
import {
  DriveAuthError,
  DriveError,
  childNamed,
  children,
  download,
  libraryRoot,
  upload,
} from "../shared/drive/client.mjs";
import {
  GeminiProvider,
  ProviderError,
  QuotaExhausted,
  mimeFor,
} from "../shared/providers/gemini.mjs";
import { provenanceFor } from "../shared/provenance/record.mjs";
import { fingerprint, store } from "../shared/state/store.mjs";
import { extractVerse, judge } from "./extract.mjs";
import { ladderFor } from "./ladder.mjs";

/**
 * The Memory Verse agent.
 *
 *   Drive → download → Gemini (once) → verse → local generation → draft
 *
 * One chapter per run, and one class named on the command line, because a
 * chapter's curriculum belongs to a class and `Beginner / Chapter 01` is not
 * the same content as `Primary / Chapter 01`. What comes out is a *draft*: it
 * is written to `06 - Memory Verse` in Drive and to `agents/.drafts/` on disk,
 * it is marked unapproved, and nothing about it touches the deployed app.
 * Publishing is a human act and stays one.
 *
 *   node agents/memory-verse/run.mjs --class beginner --chapter 01
 *   node agents/memory-verse/run.mjs --class beginner --chapter 01 --source-dir ./pages
 *   node agents/memory-verse/run.mjs --class beginner --chapter 01 --dry-run
 */

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const amber = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

function options(argv) {
  const out = { dryRun: false, noUpload: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--no-upload") out.noUpload = true;
    else if (arg === "--all-ready") out.allReady = true;
    else if (arg.startsWith("--")) out[arg.slice(2)] = argv[++i];
  }
  return out;
}

/** Files a run will actually send, with the unsupported ones named and skipped. */
function usable(entries) {
  const sent = [];
  const ignored = [];
  for (const entry of entries) {
    const mimeType = mimeFor(entry.name);
    if (mimeType) sent.push({ ...entry, mimeType });
    else ignored.push(entry.name);
  }
  return { sent, ignored };
}

/** The curriculum, from Drive. Read-only — nothing is moved, renamed or removed. */
async function fromDrive(entry, chapter) {
  const root = await libraryRoot();
  const classFolderName = driveFolderFor(entry);

  const classFolder = await childNamed(root.id, classFolderName);
  if (!classFolder) throw new DriveError(`No "${classFolderName}" in the library.`);

  const chapterFolder = await childNamed(classFolder.id, `Chapter ${chapter}`);
  if (!chapterFolder) {
    throw new DriveError(`No "Chapter ${chapter}" in ${classFolderName}.`);
  }

  const sourceFolder = await childNamed(
    chapterFolder.id,
    CHAPTER_SUBFOLDERS.curriculumSource,
  );
  if (!sourceFolder) {
    throw new DriveError(
      `No "${CHAPTER_SUBFOLDERS.curriculumSource}" in ${classFolderName} / Chapter ${chapter}.`,
    );
  }

  const draftFolder = await childNamed(chapterFolder.id, CHAPTER_SUBFOLDERS.memoryVerse);

  return {
    kind: "drive",
    folderId: sourceFolder.id,
    draftFolderId: draftFolder?.id,
    path: `${root.name} / ${classFolderName} / Chapter ${chapter} / ${CHAPTER_SUBFOLDERS.curriculumSource}`,
    entries: (await children(sourceFolder.id)).filter(
      (f) => f.mimeType !== "application/vnd.google-apps.folder",
    ),
    async bytes(file) {
      return download(file.id);
    },
  };
}

/** The curriculum, from a folder on this machine. For working without Drive. */
function fromDirectory(dir) {
  const entries = readdirSync(dir)
    .filter((name) => !name.startsWith("."))
    .map((name) => {
      const path = join(dir, name);
      const stat = statSync(path);
      return stat.isFile() ? { name, path, size: stat.size } : undefined;
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    kind: "local",
    localPath: dir,
    path: dir,
    entries,
    async bytes(file) {
      return readFileSync(file.path);
    },
  };
}

async function main() {
  const opts = options(process.argv.slice(2));

  if (opts.allReady) {
    console.log(
      amber("--all-ready is not implemented yet.\n") +
        "  One chapter at a time until the ladder has been reviewed.",
    );
    process.exit(2);
  }

  const entry = classById(opts.class ?? "");
  if (!entry) {
    console.log(
      red(`--class is required, and must be one of the seven.\n`) +
        `  ${["nursery", "beginner", "primary", "junior", "intermediate", "senior", "young-adult"].join(", ")}`,
    );
    process.exit(2);
  }

  const chapter = chapterNumber(opts.chapter ?? "");
  const where = `${entry.display} / Chapter ${chapter}`;
  console.log(`\nMemory Verse agent — ${where}\n`);

  /* ── 1. the curriculum ─────────────────────────────────────────────── */

  let source;
  try {
    source = opts["source-dir"]
      ? fromDirectory(opts["source-dir"])
      : await fromDrive(entry, chapter);
  } catch (error) {
    if (error instanceof DriveAuthError) {
      stop("drive-auth", `${error.message}`, { classId: entry.id, chapter });
    }
    stop("drive", error.message, { classId: entry.id, chapter });
    return;
  }

  console.log(dim(`  source: ${source.path}`));

  const { sent, ignored } = usable(source.entries);
  for (const name of ignored) {
    console.log(amber(`  ignored (unsupported): ${name}`));
  }

  if (sent.length === 0) {
    stop(
      "no-source",
      `There is no curriculum to read in ${source.path}.\n` +
        `  Supported: ${[...new Set([...mimeTypes()])].join(", ")}\n` +
        "  Ask the teacher to upload the curriculum pages, then run this again.",
      { classId: entry.id, chapter },
    );
    return;
  }

  console.log(dim(`  ${sent.length} page(s): ${sent.map((f) => f.name).join(", ")}`));

  /* ── 2. the verse: cache first, Gemini only if we must ──────────────── */

  const print = fingerprint(sent);
  let extraction = store.readExtraction(entry.id, chapter, print);
  let cached = Boolean(extraction);

  if (cached) {
    console.log(green(`  extraction: cached (no Gemini request)`));
  } else if (opts.dryRun) {
    stop(
      "dry-run",
      "Nothing is cached for these pages and --dry-run will not call Gemini.",
      { classId: entry.id, chapter },
    );
    return;
  } else {
    /*
      Asked for before a byte is downloaded.

      The provider would raise the same thing a moment later, but by then the
      pages have been pulled out of Drive for a request that was never going
      to be made. Checking here costs nothing and means a machine that has
      not been set up yet is told so immediately.
    */
    if (!config.gemini.key) {
      stop(
        "config",
        "GEMINI_API_KEY is not set, and nothing is cached for these pages.\n" +
          "  Put it in .env.local (git-ignored):\n" +
          "    GEMINI_API_KEY=...\n" +
          "  Get a free-tier key at https://aistudio.google.com/apikey — create it\n" +
          "  in a project with no billing account attached. See agents/README.md.",
        { classId: entry.id, chapter },
      );
      return;
    }

    let files;
    try {
      files = await Promise.all(
        sent.map(async (file) => ({ ...file, bytes: await source.bytes(file) })),
      );
    } catch (error) {
      stop("download", error.message, { classId: entry.id, chapter });
      return;
    }

    try {
      console.log(dim(`  asking ${GeminiProvider.model} to read the pages…`));
      const read = await extractVerse(files);
      extraction = { ...read, fingerprint: print };
      store.writeExtraction(entry.id, chapter, extraction);
    } catch (error) {
      if (error instanceof QuotaExhausted) {
        stop(
          "quota",
          `${error.message}\n` +
            (error.retryAfterSeconds
              ? `  Google asked for ${Math.ceil(error.retryAfterSeconds)}s.\n`
              : "") +
            "  Nothing has been lost. Run the same command again when the free\n" +
            "  tier resets; the pages will be read then.",
          { classId: entry.id, chapter },
        );
        return;
      }
      if (error instanceof ConfigError) {
        stop("config", error.message, { classId: entry.id, chapter });
        return;
      }
      if (error instanceof ProviderError) {
        stop("provider", error.message, { classId: entry.id, chapter });
        return;
      }
      throw error;
    }
  }

  /* ── 3. is it good enough to use? ───────────────────────────────────── */

  const verdict = judge(extraction.result);

  if (!verdict.ok) {
    const files = extraction.result?.sourceFiles?.length
      ? extraction.result.sourceFiles
      : sent.map((f) => f.name);

    const note =
      `HUMAN REVIEW REQUIRED\n\n` +
      `Chapter: ${where}\n\n` +
      `Reason:\n${verdict.reason}\n\n` +
      `Source:\n${files.join("\n")}\n\n` +
      `What the extractor returned:\n${JSON.stringify(extraction.result, null, 2)}\n`;

    const path = store.writeDraft(entry.id, chapter, "REVIEW-REQUIRED.txt", note);

    console.log(`\n${amber("HUMAN REVIEW REQUIRED")}\n`);
    console.log(`  ${verdict.reason}`);
    console.log(dim(`\n  written to ${path}`));
    console.log(dim("  No practice was generated. Nothing was guessed.\n"));

    store.writeRun(entry.id, chapter, {
      stage: "review",
      resumable: true,
      reason: verdict.reason,
    });
    process.exit(3);
  }

  console.log(green(`  verse:     “${verdict.verse.text}”`));
  console.log(green(`  reference: ${verdict.verse.reference}`));

  /* ── 4. the seven variants, generated here and not asked for ────────── */

  const { practice, skipped } = ladderFor(verdict.verse);

  for (const [classId, why] of Object.entries(skipped)) {
    console.log(amber(`  ${classId}: not generated — ${why}`));
  }

  const draft = {
    kind: "memory-verse-draft",
    version: 1,
    verse: {
      text: verdict.verse.text,
      reference: verdict.verse.reference,
      /*
        Deliberately not filled in. The translation is a fact about the
        curriculum that the pages rarely state, and guessing it is the same
        class of mistake as guessing the verse. A reviewer supplies it.
      */
      translation: "PLACEHOLDER — confirm the translation before approving",
    },
    practice,
    notGenerated: skipped,
    provenance: provenanceFor({
      classId: entry.id,
      className: entry.display,
      chapter,
      source,
      files: sent,
      model: extraction.model,
      confidence: extraction.result.confidence,
      extractedAt: extraction.at,
      cached,
      review: { status: "draft", required: false },
    }),
  };

  const body = `${JSON.stringify(draft, null, 2)}\n`;
  const name = `memory-verse-draft-${entry.id}-chapter-${chapter}.json`;
  const localPath = store.writeDraft(entry.id, chapter, name, body);
  store.writeDraft(entry.id, chapter, "README.md", readme(draft, where));

  console.log(`\n  draft written`);
  console.log(dim(`    ${localPath}`));

  /* ── 5. the draft goes to Drive, and only to 06 - Memory Verse ──────── */

  if (source.kind === "drive" && !opts.noUpload && !opts.dryRun) {
    if (!source.draftFolderId) {
      console.log(amber(`    could not find "${CHAPTER_SUBFOLDERS.memoryVerse}" — not uploaded`));
    } else {
      try {
        const put = await upload({
          parentId: source.draftFolderId,
          name,
          mimeType: "application/json",
          body,
        });
        console.log(dim(`    ${CHAPTER_SUBFOLDERS.memoryVerse} / ${put.name}`));
      } catch (error) {
        console.log(amber(`    upload failed, draft is still on disk: ${error.message}`));
      }
    }
  }

  store.writeRun(entry.id, chapter, { stage: "draft", resumable: false, draft: localPath });

  console.log(`\n${green("Draft, not approved.")}`);
  console.log(dim("  Nothing has been published. Review it, then copy the verse and the"));
  console.log(dim(`  class's practice into content/<class>/<slug>.story.json by hand.\n`));
}

function mimeTypes() {
  return [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
}

function readme(draft, where) {
  return `# Memory Verse draft — ${where}

**This is a draft. It has not been approved and nothing has been published.**

Verse, as extracted from the curriculum:

> ${draft.verse.text}
>
> — ${draft.verse.reference}

Read by ${draft.provenance.extraction.model} on ${draft.provenance.extraction.at}
from ${draft.provenance.source.files.length} page(s) in
\`${draft.provenance.source.driveFolderPath ?? draft.provenance.source.localPath}\`.

## Before approving

1. Check the verse word for word against the curriculum page. The extractor is
   told never to paraphrase, but a photograph of printed text is still a
   photograph being read by a machine.
2. Check the reference, including the honorific ("St Luke" vs "Luke").
3. Fill in \`verse.translation\` — the agent does not guess it.
4. Play each class's practice and judge the difficulty, not just the output.

## Then

Copy the verse and the class's \`practice\` array into the matching
\`content/<class>/<slug>.story.json\`. The build validates that any
arrange-words drill spells the verse exactly, so a mistake there fails the
build rather than reaching a child.
`;
}

/** Stop, say why, and leave enough behind to resume. */
function stop(stage, message, { classId, chapter }) {
  store.writeRun(classId, chapter, { stage, resumable: true, reason: message });
  console.log(`\n${red(`Stopped: ${stage}`)}\n`);
  console.log(`  ${message}\n`);
  process.exit(1);
}

main().catch((error) => {
  console.error(red(`\nUnexpected failure: ${error.stack ?? error.message}\n`));
  process.exit(1);
});
