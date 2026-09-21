#!/usr/bin/env node
/**
 * The ladder and the gates, exercised on one fixture.
 *
 * `agents/memory-verse/selftest.mjs` runs one verse through seven classes so
 * that the difficulty progression can be judged end to end — the thing that
 * is easy to get wrong and impossible to see one rung at a time. This does
 * the same with one chapter's questions: the same six questions planned for
 * every class, so that "it gets harder" is something you can read rather than
 * something the band notes assert.
 *
 * No network, no AI, no key. Exits non-zero on the first thing that is wrong.
 */

import { BANDS } from "./bands.mjs";
import { GENERAL } from "./catalogue.mjs";
import { classify, planFor } from "./plan.mjs";
import { check } from "./gates.mjs";

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

/* Chapter 5's real questions — a fixture with a known shape, not an invention. */
const QUESTIONS = [
  { n: 1, question: "Who is the prophet mentioned in this lesson?" },
  { n: 2, question: "What was problem that people of Jericho were facing?" },
  { n: 3, question: "What did prophet Elisha do to purify water?" },
  { n: 4, question: "What are the properties of salt?" },
  { n: 5, question: "For what purposes is salt used?" },
  { n: 6, question: "What happened to the water when salt was put in the spring?" },
];

/*
  Questions whose shape the classifier once missed. Primary's Zacchaeus
  chapter sent all three of its questions to `unsure`, and an unsure question
  becomes a multiple-choice — so a gap in the table quietly turns into the
  one outcome this agent exists to prevent.
*/
const CLASSIFIES = [
  ["Which tree did Zacchaeus climb to see Jesus?", "identity"],
  ["What were the shortcomings of Zacchaeus?", "attributes"],
  ["Why was it difficult for Zacchaeus to mee Jesus?", "cause"],
  ["What are the properties of salt?", "attributes"],
  ["Who is the prophet mentioned in this lesson?", "identity"],
  ["What happened to the water when salt was put in the spring?", "outcome"],

  /* Beginner Chapter 6 — every one of these fell through to `unsure`. */
  ["Who created everything?", "identity"],
  ["What gives us light in the day?", "identity"],
  ["What else can we see in the sky at night?", "identity"],
  ["Name two flowers you like", "personal"],
  ["Name two animals you like", "personal"],
  ["How do we give thanks to creator God?", "ways"],

  /* Primary Chapters 1 and 2 — two `unsure`, and one confidently wrong. */
  ["To which place did the angel tell Joseph to go?", "place"],
  ["When did the family of Jesus come back to Nazareth?", "time"],
  ["What did the parents see when they found Jesus?", "scene"],
  ["What was Jesus' reply when His parents asked Him about making them anxious?", "saying"],

  /* The rules the new ones must not have swallowed. */
  ["What did the woman do to find the lost coin?", "process"],
  ["What happened when Moses prayed?", "outcome"],
  ["Where did Jesus go?", "place"],
  ["What did prophet Elisha do to purify water?", "process"],
  ["How many coins did she have?", "quantity"],
];

let failures = 0;
const fail = (m) => {
  console.log(red(`  ✗ ${m}`));
  failures += 1;
};
const pass = (m) => console.log(green(`  ✓ ${m}`));

console.log("\nGame Builder selftest\n");

/* ── 0. the classifier reads each question's shape ───────────────────── */
for (const [question, want] of CLASSIFIES) {
  const got = classify(question).asks;
  if (got !== want) fail(`"${question}" classified as ${got}, expected ${want}`);
}
if (CLASSIFIES.every(([question, want]) => classify(question).asks === want)) {
  pass(`the classifier reads all ${CLASSIFIES.length} question shapes`);
}

/* ── 1. every class plans without error, and covers every question ───── */
const plans = {};
for (const classId of Object.keys(BANDS)) {
  const plan = planFor({ classId, questions: QUESTIONS });
  if (plan.error) {
    fail(`${classId}: ${plan.error}`);
    continue;
  }
  plans[classId] = plan;

  const covered = new Set(plan.assignments.flatMap((a) => a.answers));
  const missing = QUESTIONS.map((q) => q.n).filter((n) => !covered.has(n));
  if (missing.length) fail(`${classId} leaves Q${missing.join(", Q")} uncovered`);
}
if (Object.keys(plans).length === Object.keys(BANDS).length) {
  pass(`all ${Object.keys(BANDS).length} classes plan, and every question is covered`);
}

/* ── 2. no class is handed a mechanic its band forbids ───────────────── */
for (const [classId, plan] of Object.entries(plans)) {
  for (const a of plan.assignments) {
    for (const mech of a.mechanics) {
      if (BANDS[classId].forbid.includes(mech)) {
        fail(`${classId} was assigned "${mech}", which its band forbids`);
      }
      if (!GENERAL.some((m) => m.mechanic === mech)) {
        fail(`${classId} was assigned "${mech}", which is bespoke or unknown`);
      }
    }
  }
}
pass("no band was handed a forbidden or bespoke mechanic");

/* ── 3. variety: no plan is one mechanic repeated ────────────────────── */
for (const [classId, plan] of Object.entries(plans)) {
  const kinds = new Set(plan.assignments.flatMap((a) => a.mechanics));
  if (plan.assignments.length >= 3 && kinds.size < 2) {
    fail(`${classId} planned ${plan.assignments.length} games with ${kinds.size} mechanic(s)`);
  }
}
pass("every plan uses more than one mechanic");

/* ── 4. the choosing cap actually binds ──────────────────────────────── */
const CHOOSING = new Set(["multiple-choice", "journey"]);
for (const [classId, plan] of Object.entries(plans)) {
  const n = plan.assignments.filter((a) => CHOOSING.has(a.mechanics[0])).length;
  const cap = Math.floor(BANDS[classId].games[1] * BANDS[classId].choosingShare);
  if (n > cap && plan.assignments.length > cap) {
    fail(`${classId}: ${n} choose-one-of-N games planned, cap is ${cap}`);
  }
}
pass("the choose-one-of-N cap holds in every band");

/* ── 4b. the plan honours the band's own game count ──────────────────── */
for (const [classId, plan] of Object.entries(plans)) {
  const [, ceiling] = BANDS[classId].games;
  if (plan.assignments.length > ceiling) {
    fail(`${classId} planned ${plan.assignments.length} games; its band tops out at ${ceiling}`);
  }
}
pass("no plan exceeds its band's game count");

/* ── 5. the gates catch what they are for ────────────────────────────── */
const bad = check({
  classId: "beginner",
  questions: QUESTIONS,
  games: [
    {
      id: "a", objective: "x", answers: [1],
      interactions: [{ type: "multiple-choice", prompt: "Who is the prophet mentioned in this lesson, the one who helped?", options: [{ label: "Elisha", correct: true }, { label: "b" }, { label: "c" }, { label: "d" }] }],
    },
    { id: "b", objective: "x", answers: [2], interactions: [{ type: "multiple-choice", prompt: "Short?", options: [{ label: "y", correct: true }, { label: "n" }] }] },
    { id: "c", objective: "", answers: [3], interactions: [{ type: "multiple-choice", prompt: "Short?", options: [{ label: "y", correct: true }, { label: "n" }] }] },
  ],
});
const wanted = ["not answered", "distinct mechanic", "choose-one-of-N", "no learning objective", "options at once", "prompt is"];
for (const w of wanted) {
  if (!bad.problems.some((p) => p.includes(w))) fail(`the gates missed: ${w}`);
}
if (wanted.every((w) => bad.problems.some((p) => p.includes(w)))) {
  pass(`the gates caught all ${wanted.length} planted faults`);
}

/* ── 6. a good set passes cleanly ────────────────────────────────────── */
const good = check({
  classId: "beginner",
  questions: [{ n: 1 }, { n: 2 }],
  games: [
    { id: "a", objective: "Know who", answers: [1], interactions: [{ type: "match", prompt: "Who did what?", pairs: [{ from: { label: "Elisha" }, to: { label: "The prophet" } }, { from: { label: "Jericho" }, to: { label: "The city" } }] }] },
    { id: "b", objective: "Know the order", answers: [2], interactions: [{ type: "sequence", prompt: "Put it in order", items: [{ label: "One", position: 1 }, { label: "Two", position: 2 }, { label: "Three", position: 3 }] }] },
    { id: "c", objective: "Find out", answers: [1, 2], interactions: [{ type: "reveal", prompt: "What was wrong?", items: [{ label: "Bad water" }, { label: "No crops" }] }] },
  ],
});
if (good.problems.length) {
  for (const p of good.problems) fail(`a sound set was rejected: ${p}`);
} else {
  pass("a sound set passes with no problems");
}

/* ── the ladder, printed, so it can be judged ────────────────────────── */
console.log(dim("\n  the same six questions, planned for each class:\n"));
for (const [classId, plan] of Object.entries(plans)) {
  const kinds = plan.assignments.map((a) => a.mechanics.join("+"));
  console.log(dim(`    ${classId.padEnd(13)} ${kinds.length} games · ${kinds.join(", ")}`));
}

console.log(
  failures ? red(`\n${failures} failure(s)\n`) : green("\nall checks passed\n"),
);
process.exit(failures ? 1 : 0);
