/**
 * What the app can actually play, and what each mechanic is good for.
 *
 * This file is the agent's contract with the running application. Every entry
 * names an interaction `type` that `src/interactions/registry.tsx` can render;
 * `npm run agent:games -- --check` reads the registry and fails if this list
 * and that switch ever disagree. An agent that proposes a mechanic the app
 * cannot play has produced a chapter that does not build, which is worse than
 * producing nothing.
 *
 * Two fields decide almost everything downstream.
 *
 * `skills` is what the mechanic actually exercises — not what a question is
 * *about*, but what a child has to *do*. Matching exercises recall even when
 * the pairs are about causes; sequencing exercises ordering even when the
 * steps are pictures. Difficulty comes from here rather than from option
 * counts, which is the whole reason a Senior game is a different game and not
 * a Beginner game with smaller text.
 *
 * `bespoke` marks the scenes that were built for one chapter and mean nothing
 * outside it: Cana's jars, the Lost Coin's cloths, Manna's morning and
 * evening. They stay in the catalogue because the registry can play them and
 * a chapter may name one deliberately, but the planner never *chooses* one,
 * because "the jars" is not a mechanic — it is that story, drawn.
 */

/** Cognitive skills, coarse enough to be judged and fine enough to order. */
export const SKILLS = [
  "recognition", // pick out a thing that is shown
  "recall", // produce a thing that is not shown
  "sequencing", // put known things in their order
  "understanding", // say why, or what follows from what
  "application", // carry the lesson to a new situation
  "reasoning", // combine several facts into one conclusion
];

export const CATALOGUE = [
  {
    mechanic: "multiple-choice",
    name: "Choose",
    skills: ["recognition", "recall", "understanding"],
    /** How much a child must read before they can act. */
    reading: "low",
    /** What content this needs, for the plan's skeleton. */
    shape: "prompt + hint + 2–4 options, exactly one correct",
    art: "optional on options",
  },
  {
    mechanic: "match",
    name: "Pair up",
    skills: ["recall", "understanding"],
    reading: "low",
    shape: "prompt + 2–4 pairs of from/to",
    art: "optional on either side",
  },
  {
    mechanic: "sequence",
    name: "Put in order",
    skills: ["sequencing", "understanding"],
    reading: "medium",
    shape: "prompt + 3+ steps, each with its position",
    art: "strongly preferred — pictures carry the order",
  },
  {
    mechanic: "reveal",
    name: "Find out",
    skills: ["recognition", "understanding"],
    reading: "low",
    /*
      The only mechanic with no wrong answer in it. That makes it the right
      home for a question whose answer is a *list* — the things someone did,
      what was left in the camp — and the wrong home for anything with one
      answer, because a discovery a child can fail is a quiz in costume.
    */
    shape: "optional prompt + 1+ items to tap, none correct",
    art: "optional per item",
  },
  {
    mechanic: "arrange-words",
    name: "Build the sentence",
    skills: ["recall", "sequencing"],
    reading: "high",
    shape: "prompt + the pieces, in order, that spell the sentence",
    art: "none",
  },
  {
    mechanic: "true-or-not",
    name: "Yes or no",
    skills: ["understanding", "reasoning"],
    reading: "medium",
    /*
      Carries its own teaching: every answer is followed by the reason, so it
      is the one mechanic that can take a *false* statement safely. A wrong
      idea a child is left holding is worse than no question.
    */
    shape: "2–6 statements, each with ask / source / answer / because",
    art: "none",
  },
  {
    mechanic: "journey",
    name: "Send them on",
    skills: ["recall", "understanding"],
    reading: "low",
    shape: "prompt + hint + 2–4 choices, one correct + the line said after",
    art: "optional on choices",
  },
  {
    mechanic: "write-reference",
    name: "Write where it comes from",
    skills: ["recall"],
    reading: "high",
    shape: "prompt + hint + the reference, typed",
    art: "none",
  },

  /* ── bespoke scenes: playable, never auto-chosen ──────────────────────── */
  {
    mechanic: "pouring",
    name: "Fill the jars",
    skills: ["understanding"],
    reading: "low",
    shape: "prompt + then + during",
    art: "built in CSS",
    bespoke: "Wedding at Cana",
  },
  {
    mechanic: "find-the-coin",
    name: "Search",
    skills: ["recognition"],
    reading: "low",
    shape: "prompt + rounds",
    art: "built in CSS",
    bespoke: "The Lost Coin",
  },
  {
    mechanic: "provision",
    name: "Morning and evening",
    skills: ["understanding"],
    reading: "low",
    shape: "two phases, each with prompt / hint / options / then + a closing",
    art: "built in CSS",
    bespoke: "Manna",
  },
];

/** The mechanics the planner may pick from. Bespoke scenes are not among them. */
export const GENERAL = CATALOGUE.filter((m) => !m.bespoke);

export const byMechanic = (type) => CATALOGUE.find((m) => m.mechanic === type);

/** Reading load as a number, so a band can hold a ceiling. */
export const READING = { low: 1, medium: 2, high: 3 };
