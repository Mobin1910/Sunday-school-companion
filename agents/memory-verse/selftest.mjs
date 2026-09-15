#!/usr/bin/env node
import { asClaim, crossCheck, judge, readable, referenceSpelling, spelling } from "./gates.mjs";
import { ladderFor, practiceFor } from "./ladder.mjs";
import { phrases, tidy, words } from "./tokenize.mjs";

/**
 * What has to be true of the agent, checked without a network.
 *
 * None of this touches Drive or Gemini. Everything here is the deterministic
 * half of the pipeline — the half that decides what a child actually does —
 * and it is the half worth having tests for, because it runs on every chapter
 * forever and a mistake in it is a mistake in every verse.
 *
 *   npm run agent:test
 */

let failures = 0;

function check(what, condition, detail) {
  if (condition) return;
  failures++;
  console.log(`  \x1b[31m✗\x1b[0m ${what}${detail ? `\n      ${detail}` : ""}`);
}

const VERSES = [
  {
    name: "the canonical Beginner Chapter 01 verse",
    text: "For my eyes have seen your salvation, which you have prepared in the presence of all peoples",
    reference: "St Luke 2:30,31",
  },
  { name: "a long verse with several clauses",
    text: "Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight",
    reference: "Proverbs 3:5-6" },
  { name: "a verse with no internal punctuation",
    text: "In the beginning God created the heavens and the earth",
    reference: "Genesis 1:1" },
  { name: "a verse with an apostrophe and a hyphen",
    text: "The LORD's loving-kindness never ceases for his mercies never come to an end",
    reference: "Lamentations 3:22" },
  { name: "a very short verse", text: "Jesus wept", reference: "John 11:35" },
];

console.log("\nTokenizer");
for (const verse of VERSES) {
  check(
    `${verse.name}: words rejoin to the verse`,
    words(verse.text).join(" ") === tidy(verse.text),
  );
  check(
    `${verse.name}: phrases rejoin to the verse`,
    phrases(verse.text).join(" ") === tidy(verse.text),
    `got: ${phrases(verse.text).join(" | ")}`,
  );
  check(
    `${verse.name}: no empty pieces`,
    phrases(verse.text).every((p) => p.trim() !== ""),
  );
}

console.log("Ladder");
for (const verse of VERSES) {
  const { practice, skipped } = ladderFor(verse);
  const built = Object.keys(practice);

  // Every arrangement must spell the verse — the rule checks.ts enforces.
  for (const [classId, steps] of Object.entries(practice)) {
    for (const step of steps) {
      if (step.type === "arrange-words") {
        check(
          `${verse.name}: ${classId} arrangement spells the verse`,
          step.words.join(" ") === tidy(verse.text),
        );
      }
      if (step.type === "multiple-choice") {
        check(
          `${verse.name}: ${classId} has exactly one correct option`,
          step.options.filter((o) => o.correct).length === 1,
        );
        check(
          `${verse.name}: ${classId} options are distinct`,
          new Set(step.options.map((o) => o.label.toLowerCase())).size ===
            step.options.length,
          JSON.stringify(step.options.map((o) => o.label)),
        );
        check(
          `${verse.name}: ${classId} has 2–4 options`,
          step.options.length >= 2 && step.options.length <= 4,
        );
        check(`${verse.name}: ${classId} has a hint`, typeof step.hint === "string" && step.hint.length > 0);
      }
    }
  }

  if (words(verse.text).length >= 8) {
    check(
      `${verse.name}: all seven classes were built`,
      built.length === 7,
      `missing: ${Object.keys(skipped).join(", ")}`,
    );

    /*
      The claim the ladder actually makes.

      Counting placements is the wrong measure and it was the first thing this
      test got wrong: Primary places three phrases and Junior places one word,
      so by quantity Junior looks easier — while being the rung where the verse
      stops being visible to reason about. Difficulty here is *retrieval*, so
      what is asserted is structure: how much of the verse is on the screen,
      how big the pieces are, and whether the answer can be seen at all.
    */
    const nursery = practice.nursery ?? [];
    const beginner = practice.beginner ?? [];
    const primary = practice.primary ?? [];
    const junior = practice.junior ?? [];
    const intermediate = practice.intermediate ?? [];
    const senior = practice.senior ?? [];
    const ya = practice["young-adult"] ?? [];

    const right = (step) => step.options.find((o) => o.correct).label;

    // 1 · The two easiest rungs recognise, and both show the child where they are.
    check(
      `${verse.name}: Nursery recognises rather than recalls`,
      nursery[0]?.type === "multiple-choice" && nursery.length === 1,
    );
    check(
      `${verse.name}: Nursery is offered a chunk, not a word`,
      right(nursery[0]).split(" ").length >= 2,
      `got "${right(nursery[0])}"`,
    );
    check(
      `${verse.name}: Beginner is offered a single word — finer than Nursery`,
      right(beginner[0]).split(" ").length === 1,
      `got "${right(beginner[0])}"`,
    );

    // 2 · Beginner can read around the gap. Junior cannot. That is the step
    //     from recognition into recall, and it is the one that matters most.
    check(
      `${verse.name}: Beginner shows context on both sides of the gap`,
      /______\s+\S/.test(beginner[0].prompt),
      `prompt: ${beginner[0].prompt}`,
    );
    check(
      `${verse.name}: Junior shows nothing after the gap`,
      /______\s*$/.test(junior[0].prompt),
      `prompt: ${junior[0].prompt}`,
    );
    check(
      `${verse.name}: Junior's distractors are not printed in its own prompt`,
      junior[0].options
        .filter((o) => !o.correct)
        .every((o) => !junior[0].prompt.includes(o.label)),
      JSON.stringify(junior[0].options.map((o) => o.label)),
    );

    // 3 · Producing the whole verse, in pieces that get smaller.
    check(
      `${verse.name}: Primary orders phrases`,
      primary[0]?.type === "arrange-words" &&
        primary[0].words.every((w) => w.split(" ").length > 1),
    );
    check(
      `${verse.name}: Intermediate orders single words`,
      intermediate[0]?.type === "arrange-words" &&
        intermediate[0].words.every((w) => !w.includes(" ")),
    );
    check(
      `${verse.name}: Intermediate has more pieces to place than Primary`,
      intermediate[0].words.length > primary[0].words.length,
      `primary=${primary[0].words.length} intermediate=${intermediate[0].words.length}`,
    );

    // 4 · The reference: absent, then recognised, then recalled.
    check(
      `${verse.name}: Intermediate is not asked for the reference`,
      intermediate.length === 1,
    );
    check(
      `${verse.name}: Senior rebuilds the verse and then recognises the reference`,
      senior.length === 2 &&
        senior[0].type === "arrange-words" &&
        senior[1].type === "multiple-choice" &&
        senior[1].options.some((o) => o.correct && o.label === verse.reference),
    );
    check(
      `${verse.name}: Young Adult writes the reference with nothing to choose from`,
      ya.length === 2 &&
        ya[1].type === "write-reference" &&
        ya[1].options === undefined,
    );
    check(
      `${verse.name}: Young Adult rebuilds the whole verse word by word`,
      ya[0]?.type === "arrange-words" &&
        ya[0].words.length === words(verse.text).length,
    );
    check(
      `${verse.name}: Young Adult's answer is the curriculum's reference exactly`,
      ya[1].answer === verse.reference,
    );

    // 5 · Senior's decoys have to be plausible and none of them may be right.
    const decoys = senior[1].options.filter((o) => !o.correct).map((o) => o.label);
    check(
      `${verse.name}: Senior's wrong references are not the right one`,
      decoys.every((d) => d !== verse.reference),
      JSON.stringify(decoys),
    );
    check(
      `${verse.name}: Senior's wrong references look like references`,
      decoys.every((d) => /\d/.test(d)),
      JSON.stringify(decoys),
    );

  } else {
    check(
      `${verse.name}: short verse degrades honestly rather than shipping nonsense`,
      Object.keys(skipped).length > 0,
    );
  }
}

console.log("Review gate");
const gate = [
  ["a clean high-confidence read is used", { memoryVerse: { text: "a b c d", reference: "Luke 2:30" }, confidence: "high", reviewRequired: false }, true],
  ["a low-confidence read is stopped", { memoryVerse: { text: "a b c d", reference: "Luke 2:30" }, confidence: "low", reviewRequired: false }, false],
  ["the extractor asking for review is obeyed", { memoryVerse: { text: "a b c d", reference: "Luke 2:30" }, confidence: "high", reviewRequired: true, reviewReason: "two verses" }, false],
  ["two candidates stop the run", { memoryVerse: { text: "a b c d", reference: "Luke 2:30" }, confidence: "high", reviewRequired: false, candidates: [{ text: "x" }, { text: "y" }] }, false],
  ["a missing reference stops the run", { memoryVerse: { text: "a b c d", reference: "" }, confidence: "high", reviewRequired: false }, false],
  ["a reference with no numbers stops the run", { memoryVerse: { text: "a b c d", reference: "Luke" }, confidence: "high", reviewRequired: false }, false],
  ["a one-word verse stops the run", { memoryVerse: { text: "Jesus", reference: "John 11:35" }, confidence: "high", reviewRequired: false }, false],
];
for (const [what, input, expected] of gate) {
  check(what, judge(input).ok === expected);
}

console.log("One class at a time");

/*
  The mistake this guards against: a Beginner chapter's verse producing
  practice for all seven classes. A chapter's curriculum belongs to one class,
  and the other six have their own books and their own chapter 3.
*/
{
  const verse = {
    text: "For the Son of Man came to seek and to save the lost.",
    reference: "St. Luke 19:10",
  };

  const one = practiceFor("beginner", verse);
  check("a class asks for its own practice and gets steps", Array.isArray(one.steps));
  check("and nothing is keyed by class", one.steps !== undefined && one.steps[0].type !== undefined);

  // Each class gets a different shape of question from the same verse.
  const shapes = ["nursery", "beginner", "primary", "junior", "intermediate", "senior", "young-adult"]
    .map((id) => practiceFor(id, verse).steps?.map((s) => s.type).join("+"));
  check("every class builds something", shapes.every(Boolean));
  check("the rungs are not all the same shape", new Set(shapes).size > 1);

  check(
    "an unknown class builds nothing rather than guessing",
    practiceFor("reception", verse).skipped !== undefined,
  );

  // ladderFor is the comparison tool and still covers all seven.
  const all = ladderFor(verse);
  check("ladderFor still spans the classes", Object.keys(all.practice).length === 7);
  check(
    "and agrees with practiceFor on each one",
    Object.entries(all.practice).every(
      ([id, steps]) =>
        JSON.stringify(steps) === JSON.stringify(practiceFor(id, verse).steps),
    ),
  );
}

console.log("Supervised extraction");

const filled = {
  verseText: "For my eyes have seen your salvation",
  reference: "St Luke 2:30,31",
  sourceFile: "page-01.png",
  confidence: "high",
  ambiguities: [],
};

const shapes = [
  ["a filled-in extraction is readable", filled, true],
  ["the untouched template is not", { ...filled, verseText: "", reference: "" }, false],
  ["a confidence outside the three is not", { ...filled, confidence: "pretty sure" }, false],
  ["a blank sourceFile is not", { ...filled, sourceFile: "" }, false],
  ["ambiguities as a string is not", { ...filled, ambiguities: "none" }, false],
];
for (const [what, input, expected] of shapes) {
  check(what, readable(input).ok === expected);
}

// The translation into the original gates is what makes an ambiguity stop a
// run, so it is worth asserting rather than assuming.
check(
  "an ambiguity becomes reviewRequired",
  asClaim({ ...filled, ambiguities: ["the second line is obscured"] }).reviewRequired === true,
);
check("no ambiguity does not", asClaim(filled).reviewRequired === false);
check("and a clean one passes the gates", judge(asClaim(filled)).ok === true);
check(
  "an ambiguous one does not",
  judge(asClaim({ ...filled, ambiguities: ["two candidates"] })).ok === false,
);

console.log("Two sources");

const VERSE = "For my eyes have seen your salvation, which you have prepared in the presence of all peoples";
const page = { text: VERSE, reference: "St Luke 2:30,31" };

const pairs = [
  ["identical", { text: VERSE, reference: "St Luke 2:30,31" }, "agrees"],
  ["different case", { text: VERSE.toLowerCase(), reference: "st luke 2:30,31" }, "agrees"],
  ["extra whitespace", { text: `   ${VERSE}   `, reference: " St Luke  2:30,31 " }, "agrees"],
  ["a trailing full stop", { text: `${VERSE}.`, reference: "St Luke 2:30,31." }, "agrees"],
  ["an em dash for a comma", { text: VERSE.replace(",", " —"), reference: "St Luke 2:30,31" }, "agrees"],
  ["Saint spelled out", { text: VERSE, reference: "Saint Luke 2:30,31" }, "agrees"],
  ["the honorific dropped", { text: VERSE, reference: "Luke 2:30,31" }, "agrees"],
  ["a word missing", { text: VERSE.replace("For ", ""), reference: "St Luke 2:30,31" }, "disagrees"],
  ["a different verse", { text: "Jesus wept and the people saw", reference: "St Luke 2:30,31" }, "disagrees"],
  ["a different reference", { text: VERSE, reference: "Luke 2:30" }, "disagrees"],
  ["a different book", { text: VERSE, reference: "St John 2:30,31" }, "disagrees"],
];
for (const [what, teacher, expected] of pairs) {
  check(`${what} → ${expected}`, crossCheck(page, { available: true, ...teacher }).status === expected);
}

/*
  The third outcome. A missing second opinion has to be its own status: if it
  ever collapsed into "agrees", every chapter with no Sheet row would claim to
  have been confirmed by a teacher who never saw it.
*/
check("no teacher entry is unavailable, not agreement", crossCheck(page, null).status === "unavailable");
check(
  "a blank teacher entry is unavailable too",
  crossCheck(page, { available: true, text: "", reference: "" }).status === "unavailable",
);

// A hyphen inside a word is part of the word; one with space around it is not.
check("hyphenated words survive folding", spelling("a God-fearing man") === "a god-fearing man");
check("a dash used as punctuation does not", spelling("salvation — which") === spelling("salvation, which"));
check("St and Saint fold together", referenceSpelling("St. Luke 2:30") === referenceSpelling("Saint Luke 2:30"));
check("different chapters do not", referenceSpelling("Luke 2:30") !== referenceSpelling("Luke 3:30"));

console.log(
  failures === 0
    ? "\n\x1b[32mThe deterministic half of the agent behaves.\x1b[0m\n"
    : `\n\x1b[31m${failures} check(s) failed.\x1b[0m\n`,
);
process.exit(failures === 0 ? 0 : 1);
