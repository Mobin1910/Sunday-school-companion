#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import {
  CHAPTER_SUBFOLDERS,
  chapterNumber,
  classById,
  driveFolderFor,
} from "../shared/classes.mjs";
import { config } from "../shared/config.mjs";
import {
  DriveAuthError,
  DriveError,
  childNamed,
  children,
  download,
  libraryRoot,
  upload,
} from "../shared/drive/client.mjs";
import { teacherVerse } from "../shared/drive/sheet.mjs";
import { mimeFor, supportedExtensions } from "../shared/files.mjs";
import { provenanceFor } from "../shared/provenance/record.mjs";
import { fingerprint, store } from "../shared/state/store.mjs";
import { asClaim, crossCheck, judge, readable } from "./gates.mjs";
import { ladderFor } from "./ladder.mjs";

/**
 * The Memory Verse agent, in two halves with a person in the middle.
 *
 *   --fetch            Drive → pages on disk + the teacher's Sheet row
 *   (Claude looks)     reads the pages, writes what it sees
 *   --from-extraction  gates → cross-check → ladder → draft
 *
 * The split exists because of what sits between the halves. Reading a
 * photograph of a printed page is the one step that needs judgement, and the
 * thing doing it is a Claude session, which is not a subprocess this script
 * can call. So the seam between them is a file on disk, and the workflow is
 * supervised rather than unattended.
 *
 * That is a real cost — this cannot run on a cron — and it buys something
 * worth more at this stage. Nothing is extracted without a reader that can be
 * asked "are you sure?", and nothing reaches a child that a person has not
 * looked at. No AI API is called at any point, by either half, and no API key
 * of any kind is required.
 *
 * What comes out is a *draft*: written to `06 - Memory Verse` and to
 * `agents/.drafts/`, marked unapproved, touching neither `07 - Approved
 * Assets` nor `content/` nor the deployed app. Publishing is a human act and
 * stays one.
 *
 *   node agents/memory-verse/run.mjs --class beginner --chapter 01 --fetch
 *   node agents/memory-verse/run.mjs --class beginner --chapter 01 --from-extraction
 *
 * `--source-dir <path>` replaces Drive with a folder on this machine, for
 * working without credentials. `--no-upload` keeps a Drive-sourced draft on
 * disk only.
 */

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const amber = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

function options(argv) {
  const out = { fetch: false, fromExtraction: false, noUpload: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--fetch") out.fetch = true;
    else if (arg === "--from-extraction") out.fromExtraction = true;
    else if (arg === "--no-upload") out.noUpload = true;
    else if (arg === "--all-ready") out.allReady = true;
    else if (arg.startsWith("--")) out[arg.slice(2)] = argv[++i];
  }
  return out;
}

/** Files a run will actually use, with the unsupported ones named and skipped. */
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

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/* ────────────────────────────────────────────────────────────────────────
   Step 1 — fetch
   ──────────────────────────────────────────────────────────────────────── */

/** Where a chapter's pages are downloaded to. Git-ignored, under .state/. */
function pagesDir(classId, chapter) {
  return join(config.paths.pages, classId, chapter);
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
    draftFolderId: draftFolder?.id ?? null,
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
    draftFolderId: null,
    path: dir,
    entries,
    async bytes(file) {
      return readFileSync(file.path);
    },
  };
}

async function doFetch(entry, chapter, opts) {
  /* ── the pages ─────────────────────────────────────────────────────── */

  let source;
  try {
    source = opts["source-dir"]
      ? fromDirectory(opts["source-dir"])
      : await fromDrive(entry, chapter);
  } catch (error) {
    if (error instanceof DriveAuthError) {
      stop("drive-auth", error.message, { classId: entry.id, chapter });
    }
    stop("drive", error.message, { classId: entry.id, chapter });
    return;
  }

  console.log(dim(`  source: ${source.path}`));

  const { sent, ignored } = usable(source.entries);
  for (const name of ignored) {
    console.log(amber(`  ignored (unsupported): ${name}`));
  }

  /*
    An empty source folder is not a failure of this tool.

    It is the ordinary state of every chapter until a teacher gets to it, and
    it will be the state of most of them for months. So it stops cleanly, says
    whose move it is, and writes a resumable run record rather than an error.
  */
  if (sent.length === 0) {
    stop(
      "no-source",
      `There is no curriculum to read in ${source.path} yet.\n` +
        `  Supported: ${supportedExtensions().join(", ")}\n` +
        "  This is the expected state until a teacher uploads the pages.\n" +
        "  Run this again once they have.",
      { classId: entry.id, chapter },
    );
    return;
  }

  const dir = pagesDir(entry.id, chapter);
  mkdirSync(dir, { recursive: true });

  const downloaded = [];
  for (const file of sent) {
    let bytes;
    try {
      bytes = await source.bytes(file);
    } catch (error) {
      stop("download", `${file.name}: ${error.message}`, { classId: entry.id, chapter });
      return;
    }
    const at = join(dir, file.name);
    writeFileSync(at, bytes);
    downloaded.push({ ...file, path: at, sha256: sha256(bytes), size: bytes.length });
    console.log(dim(`  ${file.name} → ${at} (${(bytes.length / 1024).toFixed(0)} KB)`));
  }

  /* ── the teacher's own entry, if the Sheet has one ──────────────────── */

  let teacher = { available: false, reason: "not read" };
  if (opts["source-dir"] && !config.sheetId) {
    teacher.reason = "running from a local folder with no Sheet configured";
  } else {
    try {
      teacher = await teacherVerse(entry, chapter);
    } catch (error) {
      teacher = { available: false, reason: `the Sheet could not be read: ${error.message}` };
    }
  }

  if (teacher.available) {
    console.log(green(`  teacher's Sheet entry found in tab "${teacher.tab}"`));
    console.log(dim(`    verse:     ${teacher.text || "(blank)"}`));
    console.log(dim(`    reference: ${teacher.reference || "(blank)"}`));
  } else {
    console.log(amber(`  no teacher entry: ${teacher.reason}`));
  }

  /* ── the request Claude fills in ────────────────────────────────────── */

  const request = {
    kind: "memory-verse-extraction-request",
    version: 1,
    class: { id: entry.id, display: entry.display },
    chapter,
    source: {
      kind: source.kind,
      driveFolderId: source.folderId ?? null,
      driveFolderPath: source.kind === "drive" ? source.path : null,
      localPath: source.kind === "local" ? source.path : null,
      draftFolderId: source.draftFolderId ?? null,
      pagesDir: dir,
      fingerprint: fingerprint(downloaded),
      files: downloaded.map((f) => ({
        name: f.name,
        path: f.path,
        id: f.id ?? null,
        mimeType: f.mimeType,
        size: f.size,
        md5Checksum: f.md5Checksum ?? null,
        sha256: f.sha256,
      })),
    },
    teacher,
    fetchedAt: new Date().toISOString(),
    /*
      Circumstances worth recording that are not doubts about the verse. Empty
      from a clean fetch; a page that would not download, or a reading taken
      some way other than looking at the files, belongs here.
    */
    caveats: [],
    instructions: INSTRUCTIONS,
    /*
      Empty, and left empty by this command. Filling these in is the
      supervised step: a Claude session opens the files listed above, looks at
      them, and writes down what it can actually see on the page.
    */
    extraction: {
      verseText: "",
      reference: "",
      sourceFile: "",
      confidence: "",
      ambiguities: [],
    },
  };

  const requestPath = store.writeStateFile(
    "extractions",
    `${entry.id}-chapter-${chapter}.request.json`,
    `${JSON.stringify(request, null, 2)}\n`,
  );

  store.writeRun(entry.id, chapter, {
    stage: "fetched",
    resumable: true,
    pages: downloaded.length,
    request: requestPath,
  });

  console.log(`\n${green(`${downloaded.length} page(s) ready to read.`)}`);
  console.log(dim(`  request: ${requestPath}`));
  console.log(`\n${bold("Next — the supervised step:")}`);
  console.log("  1. Open each page listed in the request and look at it.");
  console.log("  2. Write what you see into the file's `extraction` block:");
  console.log(dim("       verseText, reference, sourceFile, confidence, ambiguities"));
  console.log("  3. Then run:");
  console.log(
    dim(
      `       npm run agent:memory-verse -- --class ${entry.id} --chapter ${chapter} --from-extraction`,
    ),
  );
  console.log(dim("\n  No AI API was called. Nothing in Drive was changed.\n"));
}

/** The rules the supervised reader works under, carried in the request itself. */
const INSTRUCTIONS = [
  "Look at every page listed in source.files before answering.",
  "Preserve the exact wording visible on the page, character for character.",
  "Preserve the reference exactly as printed, including any honorific such as 'St'.",
  "Do NOT correct, complete, modernise or re-punctuate the verse using Bible knowledge.",
  "Do NOT substitute a translation you recognise as more standard.",
  "Do NOT infer a word that is obscured — say it is obscured.",
  "Do NOT choose between multiple candidate verses — list them in ambiguities and stop.",
  "sourceFile must name the page the verse was actually read from.",
  "confidence is 'high' only when the verse and reference are plainly legible.",
  "Anything at all uncertain goes in ambiguities. A non-empty ambiguities list stops the run.",
];

/* ────────────────────────────────────────────────────────────────────────
   Step 3 — generate
   ──────────────────────────────────────────────────────────────────────── */

async function doGenerate(entry, chapter, opts) {
  const where = `${entry.display} / Chapter ${chapter}`;

  const requestPath = store.stateFile(
    "extractions",
    `${entry.id}-chapter-${chapter}.request.json`,
  );
  const request = store.readJsonAt(requestPath);

  if (!request) {
    stop(
      "no-request",
      `Nothing has been fetched for ${where}.\n` +
        `  Run --fetch first:\n` +
        `    npm run agent:memory-verse -- --class ${entry.id} --chapter ${chapter} --fetch`,
      { classId: entry.id, chapter },
    );
    return;
  }

  const extraction = request.extraction ?? {};

  /* ── 1. is the file filled in at all? ───────────────────────────────── */

  const complete = readable(extraction);
  if (!complete.ok) {
    stop("extraction", `${complete.reason}\n\n  ${requestPath}`, {
      classId: entry.id,
      chapter,
    });
    return;
  }

  console.log(dim(`  read from: ${extraction.sourceFile}`));
  console.log(dim(`  confidence: ${extraction.confidence}`));

  /* ── 2. the existing gates, on the supervised reading ───────────────── */

  const claim = asClaim(extraction);
  const verdict = judge(claim);

  if (!verdict.ok) {
    review(entry, chapter, where, {
      reason: verdict.reason,
      request,
      extraction,
      crossCheck: null,
    });
    return;
  }

  /* ── 3. the second opinion ──────────────────────────────────────────── */

  const agreement = crossCheck(verdict.verse, request.teacher);

  if (agreement.status === "disagrees") {
    review(entry, chapter, where, {
      reason:
        "the curriculum page and the teacher's Sheet entry do not agree.\n" +
        "  This is never resolved automatically — a person decides which is right.",
      request,
      extraction,
      crossCheck: agreement,
    });
    return;
  }

  if (agreement.status === "agrees") {
    console.log(green("  the teacher's Sheet entry agrees with the page"));
  } else {
    console.log(amber(`  no second opinion: ${agreement.reason}`));
  }

  console.log(green(`  verse:     “${verdict.verse.text}”`));
  console.log(green(`  reference: ${verdict.verse.reference}`));

  /* ── 4. the seven variants, generated here and not asked for ────────── */

  const { practice, skipped } = ladderFor(verdict.verse);

  for (const [classId, why] of Object.entries(skipped)) {
    console.log(amber(`  ${classId}: not generated — ${why}`));
  }

  /*
    Everything true about how this draft came to exist that a reviewer would
    want to know and the verse itself cannot tell them.
  */
  const caveats = [...(request.caveats ?? [])];
  if (agreement.status !== "agrees") {
    caveats.push(`No second opinion: ${agreement.reason}`);
  }

  for (const caveat of caveats) {
    console.log(amber(`  caveat: ${caveat}`));
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
      source: { ...request.source, kind: request.source.kind },
      files: request.source.files,
      extraction: {
        text: verdict.verse.text,
        reference: verdict.verse.reference,
        sourceFile: extraction.sourceFile,
        confidence: extraction.confidence,
        ambiguities: extraction.ambiguities ?? [],
        extractedBy: extraction.extractedBy,
        method: extraction.method,
        at: request.fetchedAt,
      },
      teacher: request.teacher,
      crossCheck: agreement,
      validation: {
        passed: true,
        gates: ["readable", "judge", "crossCheck"],
        reason: null,
      },
      caveats,
      /*
        A caveat does not stop the run, but it does mean nobody may skim this
        one. `required` is the difference between a draft a reviewer may glance
        at and one they have to sit down with, and it is set by the
        circumstances rather than by whoever is in a hurry.
      */
      review: caveats.length
        ? { status: "draft", required: true, reason: caveats.join("; ") }
        : { status: "draft", required: false },
    }),
  };

  const body = `${JSON.stringify(draft, null, 2)}\n`;
  const name = `memory-verse-draft-${entry.id}-chapter-${chapter}.json`;
  const localPath = store.writeDraft(entry.id, chapter, name, body);
  store.writeDraft(entry.id, chapter, "README.md", readme(draft, where));

  console.log(`\n  draft written`);
  console.log(dim(`    ${localPath}`));

  /* ── 5. the draft goes to Drive, and only to 06 - Memory Verse ──────── */

  if (request.source.kind === "drive" && !opts.noUpload) {
    if (!request.source.draftFolderId) {
      console.log(amber(`    could not find "${CHAPTER_SUBFOLDERS.memoryVerse}" — not uploaded`));
    } else {
      try {
        const put = await upload({
          parentId: request.source.draftFolderId,
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

/**
 * Stop and hand it to a person, with both readings in front of them.
 *
 * The one thing this must never do is pick. A conflict between the page and
 * the teacher is information — it usually means the book and the person read
 * two different things, and which of those the children should learn is an
 * editorial decision that belongs to whoever owns the curriculum. Resolving it
 * silently would destroy the very signal that the two-source check exists to
 * produce.
 */
function review(entry, chapter, where, { reason, request, extraction, crossCheck: agreement }) {
  const lines = [
    "HUMAN REVIEW REQUIRED",
    "",
    `Chapter: ${where}`,
    `Fetched: ${request.fetchedAt}`,
    "",
    "Reason:",
    reason,
    "",
  ];

  if (agreement?.status === "disagrees") {
    lines.push("The two sources disagree:", "");
    for (const d of agreement.differences) {
      lines.push(
        `  ${d.field}`,
        `    curriculum page : ${d.page}`,
        `    teacher's Sheet : ${d.teacher}`,
        "",
      );
    }
    lines.push(
      "Neither has been chosen. Decide which is right, correct the other at",
      "source, and run --from-extraction again.",
      "",
    );
  }

  lines.push(
    "What was read from the page:",
    JSON.stringify(extraction, null, 2),
    "",
    "What the teacher's Sheet says:",
    JSON.stringify(request.teacher, null, 2),
    "",
    "Pages:",
    ...request.source.files.map((f) => `  ${f.name}  (sha256 ${f.sha256?.slice(0, 16)}…)`),
    "",
  );

  const path = store.writeDraft(entry.id, chapter, "REVIEW-REQUIRED.txt", `${lines.join("\n")}\n`);

  console.log(`\n${amber("HUMAN REVIEW REQUIRED")}\n`);
  console.log(`  ${reason}`);
  if (agreement?.status === "disagrees") {
    for (const d of agreement.differences) {
      console.log(`\n  ${d.field}`);
      console.log(dim(`    curriculum page : ${d.page}`));
      console.log(dim(`    teacher's Sheet : ${d.teacher}`));
    }
  }
  console.log(dim(`\n  written to ${path}`));
  console.log(dim("  No practice was generated. Nothing was guessed.\n"));

  store.writeRun(entry.id, chapter, { stage: "review", resumable: true, reason });
  process.exit(3);
}

/* ────────────────────────────────────────────────────────────────────── */

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

  if (opts.fetch === opts.fromExtraction) {
    console.log(
      red("Say which half to run: --fetch or --from-extraction.\n") +
        "\n  1. download the pages and the teacher's Sheet row:\n" +
        dim(`       --class ${entry.id} --chapter ${chapter} --fetch\n`) +
        "\n  2. look at the pages, fill in the extraction block, then:\n" +
        dim(`       --class ${entry.id} --chapter ${chapter} --from-extraction\n`),
    );
    process.exit(2);
  }

  console.log(`\nMemory Verse agent — ${entry.display} / Chapter ${chapter}\n`);

  if (opts.fetch) await doFetch(entry, chapter, opts);
  else await doGenerate(entry, chapter, opts);
}

function readme(draft, where) {
  const p = draft.provenance;
  const agreed = p.crossCheck.status;

  return `# Memory Verse draft — ${where}

**This is a draft. It has not been approved and nothing has been published.**

Verse, as read from the curriculum:

> ${draft.verse.text}
>
> — ${draft.verse.reference}

Read by **${p.extraction.extractedBy}** from \`${p.extraction.sourceFile}\`
on ${p.extraction.at}, confidence **${p.extraction.confidence}**,
out of ${p.source.files.length} page(s) in
\`${p.source.driveFolderPath ?? p.source.localPath}\`.

Method: ${p.extraction.method}
${
  p.caveats.length
    ? `\n## Read this before using it\n\n${p.caveats.map((c) => `- ${c}`).join("\n")}\n`
    : ""
}

## Second opinion

${
  agreed === "agrees"
    ? `The teacher's own entry in the Sheet (tab "${p.teacher.tab}") says the same
thing. Two independent sources agree on this verse.`
    : `**None.** ${p.crossCheck.reason}

This verse was read once, by one reader, and confirmed by nobody. That is a
weaker guarantee than the workflow is designed to give — check it against the
page yourself with more than usual care.`
}

## Before approving

1. Check the verse word for word against the curriculum page. The reader is
   told never to paraphrase, but a photograph of printed text is still a
   photograph being read.
2. Check the reference, including the honorific ("St Luke" vs "Luke").
3. Fill in \`verse.translation\` — the agent does not guess it.
4. Play each class's practice and judge the difficulty, not just the output.

## Then

Copy the verse and the class's \`practice\` array into the matching
\`content/<class>/<slug>.story.json\`. The build validates that any
arrange-words drill spells the verse exactly, and that a written-reference
drill matches the verse's own reference, so a mistake there fails the build
rather than reaching a child.
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
