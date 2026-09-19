#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { children, childNamed, download, libraryRoot } from "../../agents/shared/drive/client.mjs";
import { CHAPTER_SUBFOLDERS, chapterNumber, classById, driveFolderFor } from "../../agents/shared/classes.mjs";

/**
 * A chapter's artwork, out of Drive and into `public/art/`.
 *
 *   node tools/art/fetch-chapter.mjs --class beginner --chapter 03 --slug the-lost-coin
 *
 * Read-only against Drive: it downloads from `04 - Story Artwork` and writes
 * nothing back. The teacher's files are never moved, renamed or touched.
 *
 * `--from-dir` reads a local folder instead of Drive:
 *
 *   node tools/art/fetch-chapter.mjs --class beginner --slug manna --from-dir ./downloaded
 *
 * Same rules, same checks, same output — only where the bytes come from
 * changes. It exists because Drive can be reached two ways: these agents'
 * OAuth refresh token, and a connected Drive integration that hands the files
 * over already downloaded. The second must not mean re-implementing panel
 * matching in a throwaway script, because the panel matching *is* the job.
 *
 * Two things here are not conveniences, they are the job.
 *
 * **Panels are matched by the number in the filename, never by sort order.**
 * Chapter 3 arrived as `panel 1.png`, `Panel 3.png`, `Panel 10` (no
 * extension), `panel 11.png` — mixed case, mixed spacing, one missing
 * suffix. Sorted as text, "Panel 10" lands second and the whole story is
 * silently out of order from panel 2 onward, which no test catches because
 * every file is present and every file is a valid image. So the number is
 * parsed, every panel must appear exactly once, and anything ambiguous stops
 * the run.
 *
 * **Nothing is resized, cropped or padded.** The artwork is authored at the
 * ratio the reader displays, so the only transformation is PNG to WebP at the
 * same pixel dimensions. Any file that is not the expected size is reported
 * and still converted, because a wrong-sized panel is a fact about the
 * artwork for a person to decide about — not something a script should
 * quietly stretch away.
 */

const EXPECTED = { width: 941, height: 1672 };

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const amber = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

/** Flags that stand alone rather than taking the next word as a value. */
const BARE = new Set(["partial"]);

function options(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const name = argv[i].slice(2);
    out[name] = BARE.has(name) ? true : argv[++i];
  }
  return out;
}

/**
 * Which panel a file is, from its name. `undefined` when it is not a panel.
 *
 * Deliberately narrow: a number that follows the word "panel". A file called
 * `2 shepherds.png` is not panel 2, and guessing that it is would be how a
 * chapter ends up telling its story in the wrong order.
 */
function panelNumber(name) {
  const hit = /(?:^|[^a-z])panel[\s._-]*(\d{1,2})(?:\D|$)/i.exec(name);
  return hit ? Number(hit[1]) : undefined;
}

/**
 * A wide version of the cover, for the surfaces that crop one.
 *
 * The chapter hub and the shelf card both show the cover in a landscape box
 * and `object-cover` it, so a 9:16 portrait loses most of itself to the crop.
 * Where an artist supplies a wide master it goes here, beside the portrait
 * rather than instead of it: the story reader still opens on the tall one,
 * which is the one with the chapter's title painted into it.
 *
 * Checked before `isCover`, because "landscape cover.png" contains the word
 * "cover" and would otherwise be a second cover — which is exactly what it
 * was, and it stopped this script dead with "Expected exactly one cover,
 * found 2" the first time a chapter had both.
 */
const isLandscapeCover = (name) =>
  /(?:^|[^a-z])(landscape|wide)(?:\W|_)*cover(?:\D|$)/i.test(name) ||
  /(?:^|[^a-z])cover(?:\W|_)*(landscape|wide)(?:\D|$)/i.test(name);

const isCover = (name) => /(?:^|[^a-z])cover(?:\D|$)/i.test(name);

async function main() {
  const opts = options(process.argv.slice(2));
  const entry = classById(opts.class ?? "");
  if (!entry) {
    console.log(red("--class must be one of the seven classes."));
    process.exit(2);
  }

  const chapter = chapterNumber(opts.chapter ?? "");
  const slug = opts.slug;
  if (!slug) {
    console.log(red("--slug is required — the chapter's folder under public/art/<class>/."));
    process.exit(2);
  }

  /*
    Where the bytes come from. Each entry is a name and a way to read it, so
    everything below this point is identical for Drive and for a folder on
    disk — including which file is which panel, which is the part that has
    actually gone wrong before.
  */
  let files;
  let where;

  if (opts["from-dir"]) {
    const dir = resolve(opts["from-dir"]);
    files = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && /\.(png|jpe?g|webp)$/i.test(e.name))
      .map((e) => ({ name: e.name, read: () => readFileSync(join(dir, e.name)) }));
    where = dir;
  } else {
    const root = await libraryRoot();
    const classFolder = await childNamed(root.id, driveFolderFor(entry));
    if (!classFolder) throw new Error(`No "${driveFolderFor(entry)}" in the library.`);

    const chapterFolder = await childNamed(classFolder.id, `Chapter ${chapter}`);
    if (!chapterFolder) throw new Error(`No "Chapter ${chapter}" in ${driveFolderFor(entry)}.`);

    const artFolder = await childNamed(chapterFolder.id, CHAPTER_SUBFOLDERS.storyArtwork);
    if (!artFolder) throw new Error(`No "${CHAPTER_SUBFOLDERS.storyArtwork}" in Chapter ${chapter}.`);

    files = (await children(artFolder.id))
      .filter((f) => f.mimeType !== "application/vnd.google-apps.folder")
      .map((f) => ({ name: f.name, read: () => download(f.id) }));
    where = CHAPTER_SUBFOLDERS.storyArtwork;
  }

  console.log(`\n${entry.display} / Chapter ${chapter} → public/art/${entry.id}/${slug}\n`);
  console.log(dim(`  ${files.length} file(s) in ${where}`));

  /* ── work out what each file is, and refuse anything ambiguous ──────── */

  const panels = new Map();
  const covers = [];
  const landscapes = [];
  const unknown = [];

  for (const file of files) {
    if (isLandscapeCover(file.name)) {
      landscapes.push(file);
      continue;
    }
    if (isCover(file.name)) {
      covers.push(file);
      continue;
    }
    const n = panelNumber(file.name);
    if (n === undefined) {
      unknown.push(file.name);
      continue;
    }
    if (panels.has(n)) {
      console.log(red(`\n  Two files claim panel ${n}: "${panels.get(n).name}" and "${file.name}".`));
      process.exit(1);
    }
    panels.set(n, file);
  }

  for (const name of unknown) console.log(amber(`  ignored (not a panel or cover): ${name}`));

  /*
    A folder that is one more file rather than a whole chapter.

    The two guards below are what catch a botched import: a chapter with no
    cover, or with panel 7 missing because it never finished uploading. They
    are worth keeping and they are exactly wrong for the case where an artist
    sends a single extra file for a chapter that is already in — which has now
    happened twice, first with Primary Chapter 3's landscape cover and then
    with five Beginner chapters' at once.

    So the guards stay on by default and `--partial` turns them off. It is a
    flag rather than a guess because "this folder has no panels in it" and
    "this import lost its panels" look identical from here, and only the
    person running it knows which one they meant. Everything else is
    unchanged: same naming rules, same native-size conversion, same report.
  */
  const partial = opts.partial === true;

  if (!partial && covers.length !== 1) {
    console.log(red(`\n  Expected exactly one cover, found ${covers.length}.`));
    console.log(dim("  If this folder is an addition to a chapter already imported,"));
    console.log(dim("  pass --partial and only the files present will be written."));
    process.exit(1);
  }

  if (covers.length > 1) {
    console.log(red(`\n  Expected at most one cover, found ${covers.length}.`));
    process.exit(1);
  }

  if (landscapes.length > 1) {
    console.log(red(`\n  Expected at most one landscape cover, found ${landscapes.length}.`));
    process.exit(1);
  }

  /*
    Two panels that are the same file.

    A gap in the numbering is caught below; this is the other half of the
    same mistake and it was not caught at all. Beginner Chapter 6 arrived
    with `Panel 3.png` a byte-for-byte copy of `Panel 2.png` — the real panel
    3 had simply not uploaded — and nothing here would have noticed, because
    every number was present and every file was a valid image. It would have
    shipped as a chapter that says the same thing twice and never says the
    thing it lost.

    Checked on content, not on size: two different panels can happen to be
    the same number of bytes, and two copies of one panel always hash alike.
    It stops the run even under `--partial`, because a duplicate is never
    what anybody meant.
  */
  {
    const byHash = new Map();
    for (const [n, file] of panels) {
      const digest = createHash("sha256").update(await file.read()).digest("hex");
      if (byHash.has(digest)) {
        const other = byHash.get(digest);
        console.log(
          red(
            `\n  Panels ${other.n} and ${n} are the same file:\n` +
              `    "${other.file.name}" and "${file.name}" are byte for byte identical.`,
          ),
        );
        console.log(dim("  One of them did not upload. Re-export it and run this again."));
        process.exit(1);
      }
      byHash.set(digest, { n, file });
    }
  }

  const numbers = [...panels.keys()].sort((a, b) => a - b);
  if (!partial && numbers.length) {
    const missing = [];
    for (let n = 1; n <= Math.max(...numbers); n++) if (!panels.has(n)) missing.push(n);
    if (missing.length) {
      console.log(red(`\n  Missing panel(s): ${missing.join(", ")}`));
      process.exit(1);
    }
  }

  if (!partial && !numbers.length) {
    console.log(red("\n  No panels found. Pass --partial if that is deliberate."));
    process.exit(1);
  }

  /* ── download, convert, and measure ─────────────────────────────────── */

  const { default: sharp } = await import("sharp");
  const dir = join(process.cwd(), "public", "art", entry.id, slug);
  mkdirSync(dir, { recursive: true });

  const odd = [];
  const jobs = [
    ...(covers.length ? [{ file: covers[0], out: "cover.webp" }] : []),
    ...(landscapes.length ? [{ file: landscapes[0], out: "cover-landscape.webp" }] : []),
    ...numbers.map((n) => ({
      file: panels.get(n),
      out: `panel-${String(n).padStart(2, "0")}.webp`,
    })),
  ];

  for (const { file, out } of jobs) {
    const bytes = await file.read();
    const image = sharp(bytes);
    const { width, height } = await image.metadata();

    // Same pixels, different container. No resize, no crop, no padding.
    const webp = await image.webp({ quality: 90, effort: 5 }).toBuffer();
    writeFileSync(join(dir, out), webp);

    const size = `${width}×${height}`;
    /*
      A landscape cover is the same canvas turned on its side, so it is
      correct at exactly the transposed size and wrong at any other. Judging
      it against the portrait dimensions reported it as odd every single run,
      which is a warning that means "this file is the shape it is supposed to
      be" — the fastest way to teach someone to stop reading warnings.
    */
    const wanted =
      out === "cover-landscape.webp"
        ? { width: EXPECTED.height, height: EXPECTED.width }
        : EXPECTED;
    const right = width === wanted.width && height === wanted.height;
    if (!right) odd.push(`${file.name} is ${size}, expected ${wanted.width}×${wanted.height}`);

    console.log(
      `  ${right ? green("✓") : amber("!")} ${file.name.padEnd(20)} → ${out.padEnd(15)} ${size}  ${(webp.length / 1024).toFixed(0)} KB`,
    );
  }

  console.log(`\n${green(`${jobs.length} file(s) written to public/art/${entry.id}/${slug}`)}`);

  if (odd.length) {
    console.log(
      amber(
        `\n  ${odd.length} file(s) are not the size they should be:\n` +
          odd.map((o) => `    ${o}`).join("\n") +
          "\n  Converted without distortion. Decide whether the artwork or the\n" +
          "  expectation is wrong; this script will not resize either.",
      ),
    );
  }

  console.log(dim("\n  Nothing in Drive was changed.\n"));
}

main().catch((error) => {
  console.error(red(`\n${error.stack ?? error.message}\n`));
  process.exit(1);
});
