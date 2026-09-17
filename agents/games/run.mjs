#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { classById } from "../shared/classes.mjs";
import { config } from "../shared/config.mjs";
import { store } from "../shared/state/store.mjs";
import { CATALOGUE, GENERAL } from "./catalogue.mjs";
import { BANDS, bandFor, suits } from "./bands.mjs";
import { planFor } from "./plan.mjs";
import { check } from "./gates.mjs";

/**
 * The Game Builder agent, in two halves with a person in the middle.
 *
 *   --plan        curriculum → what each question is for → a mechanic each
 *   (Claude writes the words into the plan's `content` blocks)
 *   --from-plan   gates → a draft `games[]` ready to paste into the chapter
 *
 * The seam is in the same place as the Memory Verse agent's, and for the same
 * reason. Choosing *how* to ask something is a job an algorithm can do well —
 * it is bookkeeping over skills, bands and variety, and it is exactly the job
 * a person does badly at eleven at night. Writing the actual question is not:
 * it needs somebody who has read the lesson and knows that "the water was
 * bad" and "nothing grows on the land" are one problem and not two.
 *
 * So this half decides the set and leaves the words blank, and the supervised
 * half fills them in and is checked. No AI API is called at any point, by
 * either half, and no key of any kind is required. What ships is static JSON
 * that the app already knows how to play.
 *
 *   node agents/games/run.mjs --class beginner --chapter 05 --plan
 *   node agents/games/run.mjs --class beginner --chapter 05 --from-plan
 *   node agents/games/run.mjs --check          # catalogue vs the app's registry
 *   node agents/games/run.mjs --bands          # the ladder, end to end
 */

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const amber = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

function options(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--plan") out.plan = true;
    else if (a === "--from-plan") out.fromPlan = true;
    else if (a === "--check") out.check = true;
    else if (a === "--bands") out.bands = true;
    else if (a.startsWith("--")) out[a.slice(2)] = argv[++i];
  }
  return out;
}

const pad = (n) => String(n).padStart(2, "0");

/* ────────────────────────────────────────────────────────────────────────
   --check : the catalogue and the running app must agree
   ──────────────────────────────────────────────────────────────────────── */

function checkRegistry() {
  const file = join(config.paths.root, "src", "interactions", "registry.tsx");
  if (!existsSync(file)) {
    console.log(red(`  cannot find ${file}`));
    process.exit(1);
  }
  const source = readFileSync(file, "utf8");

  // `canPlay` is the app's own list, and the only one that is authoritative.
  const playable = new Set(
    [...source.matchAll(/interaction\.type === "([a-z-]+)"/g)].map((m) => m[1]),
  );
  const known = new Set(CATALOGUE.map((m) => m.mechanic));

  const missing = [...playable].filter((m) => !known.has(m));
  const phantom = [...known].filter((m) => !playable.has(m));

  console.log(`\n${bold("Catalogue vs the app's registry")}\n`);
  console.log(dim(`  registry can play: ${[...playable].sort().join(", ")}`));
  console.log(dim(`  catalogue knows:   ${[...known].sort().join(", ")}\n`));

  for (const m of missing) {
    console.log(amber(`  ! the app can play "${m}" and the catalogue does not list it`));
  }
  for (const m of phantom) {
    console.log(red(`  ✗ the catalogue offers "${m}" and the app cannot play it`));
  }

  if (phantom.length) {
    console.log(
      red("\n  A plan that proposes an unplayable mechanic produces a chapter that does not build.\n"),
    );
    process.exit(1);
  }
  console.log(green(`  ${known.size} mechanics, all playable.\n`));
}

/* ────────────────────────────────────────────────────────────────────────
   --bands : the ladder, so it can be judged end to end
   ──────────────────────────────────────────────────────────────────────── */

function showBands() {
  console.log(`\n${bold("The difficulty ladder")}\n`);
  for (const [id, band] of Object.entries(BANDS)) {
    const fits = GENERAL.filter((m) => suits(band, m)).map((m) => m.mechanic);
    console.log(`${bold(id.padEnd(13))} ${dim(band.ages.padEnd(6))} ${band.skills.join(" · ")}`);
    console.log(dim(`  ${band.games[0]}–${band.games[1]} games · ${Math.ceil(band.games[1] * band.choosingShare)} may be choose-one-of-N · prompts ≤ ${band.maxPromptWords} words`));
    console.log(dim(`  mechanics: ${fits.join(", ") || "(none)"}`));
    console.log(dim(`  ${band.note}\n`));
  }
}

/* ────────────────────────────────────────────────────────────────────────
   --plan : read the chapter's curriculum, decide the set
   ──────────────────────────────────────────────────────────────────────── */

/** The chapter file for a class and chapter number, whatever it is called. */
function chapterFile(classId, chapter) {
  const dir = join(config.paths.root, "content", classId);
  if (!existsSync(dir)) return null;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".story.json")) continue;
    const data = JSON.parse(readFileSync(join(dir, name), "utf8"));
    if (pad(data.chapter) === pad(chapter)) return { path: join(dir, name), name, data };
  }
  return null;
}

function doPlan(entry, chapter, opts) {
  const found = chapterFile(entry.id, chapter);

  let questions;
  let source;

  if (opts["questions-from"]) {
    const raw = JSON.parse(readFileSync(opts["questions-from"], "utf8"));
    questions = raw.questions ?? raw;
    source = opts["questions-from"];
  } else if (found?.data?.curriculum?.questions) {
    questions = found.data.curriculum.questions;
    source = found.name;
  } else {
    console.log(
      red(
        `\n  No curriculum questions for ${entry.display} / Chapter ${chapter}.\n` +
          `  Either the chapter file has no \`curriculum\` block yet, or pass\n` +
          `  --questions-from <file.json> with { "questions": [{ n, question, objective? }] }.\n`,
      ),
    );
    process.exit(2);
  }

  console.log(`\n${bold(`Game Builder — ${entry.display} / Chapter ${chapter}`)}\n`);
  console.log(dim(`  questions from: ${source}`));

  const plan = planFor({ classId: entry.id, questions });
  if (plan.error) {
    console.log(red(`\n  ${plan.error}\n`));
    process.exit(1);
  }

  console.log(dim(`  band: ${plan.band.ages} · ${plan.band.skills.join(" · ")}`));
  console.log(dim(`  ${questions.length} question(s) → ${plan.assignments.length} game(s)\n`));

  for (const [i, a] of plan.assignments.entries()) {
    console.log(`  ${bold(`${i + 1}. ${a.mechanics.join(" + ")}`)}  ${dim(`asks: ${a.asks.join(", ")} · exercises: ${a.skill}`)}`);
    console.log(dim(`     covers Q${a.answers.join(", Q")}`));
    for (const q of a.questions) console.log(dim(`       “${q}”`));
    for (const st of a.strands) console.log(dim(`     ${st.mechanic}: ${st.shape}`));
    console.log();
  }

  if (plan.unsure.length) {
    console.log(amber(`  unsure what Q${plan.unsure.join(", Q")} ${plan.unsure.length > 1 ? "are" : "is"} asking — check the mechanic by hand\n`));
  }

  /* The file the supervised step fills in. */
  const request = {
    kind: "game-build-plan",
    version: 1,
    class: { id: entry.id, display: entry.display },
    chapter: pad(chapter),
    band: plan.band,
    source,
    plannedAt: new Date().toISOString(),
    /*
      Carried in the plan, not just read from the chapter. A chapter file may
      not exist yet — this one did not — and a coverage gate with nothing to
      compare against reports "0 of 0" and passes, which is the most
      dangerous shape a check can take.
    */
    questions,
    instructions: INSTRUCTIONS,
    bespokeSuggestion: plan.bespokeSuggestion,
    unsure: plan.unsure,
    games: plan.assignments.map((a, i) => ({
      id: "",
      title: "",
      objective: a.objective || "",
      answers: a.answers,
      mechanics: a.mechanics,
      asks: a.asks,
      skill: a.skill,
      needs: a.strands.map((st) => `${st.mechanic}: ${st.shape}`),
      art: a.strands.map((st) => `${st.mechanic}: ${st.art}`),
      covers: a.questions,
      /* Left empty on purpose — this is the supervised half. */
      interactions: [],
    })),
  };

  const path = store.writeStateFile(
    "game-plans",
    `${entry.id}-chapter-${pad(chapter)}.plan.json`,
    `${JSON.stringify(request, null, 2)}\n`,
  );

  console.log(green(`  plan written`));
  console.log(dim(`    ${path}\n`));
  console.log(bold("Next — the supervised step:"));
  console.log("  1. Read the lesson. Write each game's id, title and interactions");
  console.log("     into the plan, using the `needs` line as the shape.");
  console.log("  2. Then run:");
  console.log(
    dim(`       npm run agent:games -- --class ${entry.id} --chapter ${pad(chapter)} --from-plan`),
  );
  console.log(dim("\n  No AI API was called. Nothing in Drive was touched.\n"));
}

const INSTRUCTIONS = [
  "Write the words from the lesson, not from memory of the Bible story.",
  "A question the lesson does not answer is a question to flag, not to fill in.",
  "Wrong options are other things in this story, never other plausible answers.",
  "Never state something false without the reason following it.",
  "Prompts and labels stay inside the band's budget; the gates check both.",
  "If a mechanic fights the content, change the mechanic and say why in the note.",
];

/* ────────────────────────────────────────────────────────────────────────
   --from-plan : check the filled-in plan, write the draft
   ──────────────────────────────────────────────────────────────────────── */

function doFromPlan(entry, chapter) {
  const path = join(
    config.paths.state,
    "game-plans",
    `${entry.id}-chapter-${pad(chapter)}.plan.json`,
  );
  if (!existsSync(path)) {
    console.log(red(`\n  No plan at ${path}\n  Run --plan first.\n`));
    process.exit(2);
  }

  const plan = JSON.parse(readFileSync(path, "utf8"));
  const games = (plan.games ?? []).filter((g) => (g.interactions ?? []).length > 0);

  console.log(`\n${bold(`Game Builder — ${entry.display} / Chapter ${chapter}`)}\n`);

  const empty = (plan.games ?? []).length - games.length;
  if (empty > 0) {
    console.log(red(`  ${empty} game(s) in the plan have no interactions written yet.\n`));
    process.exit(1);
  }

  const found = chapterFile(entry.id, chapter);
  const questions = found?.data?.curriculum?.questions ?? plan.questions ?? [];

  if (!questions.length) {
    console.log(
      red(
        "  The plan records no questions and the chapter has no curriculum block.\n" +
          "  Coverage cannot be checked, so nothing is written — a gate that passes\n" +
          "  with nothing to check is worse than no gate.\n",
      ),
    );
    process.exit(1);
  }
  console.log(dim(`  checking coverage against ${found ? found.name : "the plan's own questions"}`));

  const verdict = check({ classId: entry.id, questions, games });

  for (const [k, v] of Object.entries(verdict.summary)) {
    console.log(dim(`  ${k.padEnd(15)} ${Array.isArray(v) ? v.join(", ") : v}`));
  }
  console.log();

  for (const n of verdict.notes) console.log(amber(`  · ${n}`));
  for (const p of verdict.problems) console.log(red(`  ✗ ${p}`));

  if (verdict.problems.length) {
    console.log(red(`\n  ${verdict.problems.length} problem(s). Nothing written.\n`));
    process.exit(1);
  }

  /* What goes into the chapter: the shape `content/<class>/<slug>.story.json`
     expects, and nothing the agent knows that the chapter does not need. */
  const draft = games.map((g) => ({
    id: g.id,
    ...(g.picture ? { picture: g.picture } : {}),
    title: g.title,
    objective: g.objective,
    ...(g.featured ? { featured: true } : {}),
    answers: g.answers,
    ...(g.note ? { note: g.note } : {}),
    interactions: g.interactions,
  }));

  const out = store.writeDraft(
    entry.id,
    pad(chapter),
    `game-draft-${entry.id}-chapter-${pad(chapter)}.json`,
    `${JSON.stringify({ kind: "game-draft", version: 1, class: plan.class, chapter: plan.chapter, band: plan.band, summary: verdict.summary, games: draft }, null, 2)}\n`,
  );

  console.log(green(`\n  draft written`));
  console.log(dim(`    ${out}\n`));
  console.log(green("Draft, not approved."));
  console.log(dim("  Nothing has been published. Review it, then copy `games` into"));
  console.log(dim(`  content/${entry.id}/<slug>.story.json by hand.\n`));
}

/* ──────────────────────────────────────────────────────────────────────── */

function main() {
  const opts = options(process.argv.slice(2));

  if (opts.check) return checkRegistry();
  if (opts.bands) return showBands();

  const entry = classById(opts.class ?? "");
  if (!entry) {
    console.log(red("  --class must be one of the seven classes."));
    process.exit(2);
  }
  if (!opts.chapter) {
    console.log(red("  --chapter is required."));
    process.exit(2);
  }
  if (opts.plan === opts.fromPlan) {
    console.log(red("  Pass exactly one of --plan or --from-plan."));
    process.exit(2);
  }

  if (opts.plan) doPlan(entry, pad(opts.chapter), opts);
  else doFromPlan(entry, pad(opts.chapter));
}

main();
