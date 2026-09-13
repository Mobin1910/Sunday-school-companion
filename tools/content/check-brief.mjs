import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import {
  briefSchema,
  classesSchema,
  normaliseClassId,
} from "./brief-schema.mjs";

/**
 * Checks the editorial briefs — the only validation the authoring layer has.
 *
 * `npm run build` validates chapters, because the app cannot render one it
 * cannot load. Nothing validated briefs, because nothing reads them yet, and
 * a shape nobody checks is a shape that has already drifted by the time the
 * first tool needs it. This is that check, and it runs in a second.
 *
 * What it asks, beyond the schema:
 *
 *   Is the filename the class id inside it?   a brief that lies about itself
 *   Is that class in classes.json?            a brief for a class we removed
 *   Is any chapter number used twice?         class + chapter is the identity
 *   Does `produces` name a real chapter file? an editorial row pointing at air
 *   Does a shipped chapter have a brief?      a chapter nobody can trace back
 *   Is anything published while blocked?      the one rule that must not bend
 *
 * The last of those is the point of the whole thing. "Do not invent missing
 * curriculum — flag it" is only a principle if something refuses to publish
 * over a blocking flag, so that refusal lives here.
 *
 *   npm run content:check
 */

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const amber = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const CONTENT = "content";
const BRIEF_DIR = join(CONTENT, "brief");

const faults = [];
const warnings = [];
const seen = [];

function read(file, schema, label) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    faults.push(`${label}: not readable JSON — ${error.message}`);
    return null;
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const where = issue.path.length ? issue.path.join(".") : "(root)";
      faults.push(`${label} → ${where}: ${issue.message}`);
    }
    return null;
  }
  return result.data;
}

const classes = read(join(CONTENT, "classes.json"), classesSchema, "classes.json");
if (!classes) {
  console.log(red("\ncontent/classes.json is missing or invalid; cannot continue.\n"));
  process.exit(1);
}

const known = new Map(classes.classes.map((c) => [c.id, c]));

/** The chapter files that exist today, by slug. */
const chapterSlugs = new Set(
  existsSync(CONTENT)
    ? readdirSync(CONTENT)
        .filter((f) => f.endsWith(".story.json"))
        .map((f) => f.slice(0, -".story.json".length))
    : [],
);

const briefFiles = existsSync(BRIEF_DIR)
  ? readdirSync(BRIEF_DIR).filter((f) => f.endsWith(".json"))
  : [];

if (briefFiles.length === 0) {
  console.log(amber("\nNo briefs in content/brief/ yet.\n"));
}

/** Every slug any brief claims to have produced, for the reverse check. */
const produced = new Set();

for (const file of briefFiles) {
  const label = `brief/${file}`;
  const brief = read(join(BRIEF_DIR, file), briefSchema, label);
  if (!brief) continue;

  const fromName = file.slice(0, -".json".length);

  /*
    The filename is the identity, so it has to agree with the contents.
    A `6-7.json` that says `classId: "8-10"` is the kind of mistake that
    survives review and then silently writes one class's chapters over
    another's.
  */
  if (normaliseClassId(fromName) !== normaliseClassId(brief.classId)) {
    faults.push(
      `${label}: filename says class "${fromName}" but classId is "${brief.classId}"`,
    );
  }

  if (!known.has(brief.classId)) {
    faults.push(
      `${label}: class "${brief.classId}" is not in content/classes.json`,
    );
  }

  const numbers = new Set();
  for (const chapter of brief.chapters) {
    const at = `${label} → chapter ${chapter.chapter}`;

    // class + chapter is the canonical identity, so it has to be unique.
    if (numbers.has(chapter.chapter)) {
      faults.push(`${at}: chapter ${chapter.chapter} appears twice`);
    }
    numbers.add(chapter.chapter);

    const blocking = (chapter.flags ?? []).filter((f) => f.blocking);

    if (chapter.status === "published" && blocking.length > 0) {
      faults.push(
        `${at}: published with ${blocking.length} blocking flag(s) — ` +
          blocking.map((f) => `${f.kind}: ${f.message}`).join("; "),
      );
    }

    if (chapter.produces) {
      produced.add(chapter.produces);
      if (!chapterSlugs.has(chapter.produces)) {
        faults.push(
          `${at}: produces "${chapter.produces}" but content/${chapter.produces}.story.json does not exist`,
        );
      }
    } else if (chapter.status === "published") {
      warnings.push(
        `${at}: published but names no chapter file in \`produces\``,
      );
    }

    for (const flagged of (chapter.flags ?? []).filter((f) => !f.blocking)) {
      warnings.push(`${at}: ${flagged.kind} — ${flagged.message}`);
    }
  }

  seen.push(
    `${label}: ${brief.chapters.length} chapter(s) — ` +
      `${brief.chapters.filter((c) => c.status === "published").length} published, ` +
      `${brief.chapters.filter((c) => c.status === "ready-for-review").length} ready, ` +
      `${brief.chapters.filter((c) => c.status === "draft").length} draft`,
  );
}

/*
  And the other direction. A chapter that ships with no brief behind it is a
  lesson nobody can trace to a curriculum page, a contributor or an
  objective — which is exactly what this architecture exists to prevent.
  A warning rather than a fault: the two chapters that predate this system
  are legitimately in that position, and it is recorded rather than hidden.
*/
for (const slug of chapterSlugs) {
  if (!produced.has(slug)) {
    warnings.push(`content/${slug}.story.json has no brief pointing at it`);
  }
}

if (seen.length > 0) {
  console.log(green(`\n✓ ${seen.length} brief(s) read`));
  for (const line of seen) console.log(dim(`    ${line}`));
}

if (warnings.length > 0) {
  console.log(amber(`\n▲ ${warnings.length} thing(s) to know about`));
  for (const line of warnings) console.log(amber(`    ${line}`));
}

if (faults.length > 0) {
  console.log(red(`\n✗ ${faults.length} problem(s)`));
  for (const line of faults) console.log(red(`    ${line}`));
  console.log();
  process.exit(1);
}

console.log(green("\nEditorial briefs are consistent.\n"));
