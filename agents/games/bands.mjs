/**
 * What each class may be asked, and how.
 *
 * The difficulty ladder, and the one place it lives. `agents/memory-verse/
 * ladder.mjs` does the same job for verses with one generator per class; this
 * is the same idea for games, except that a band is *declarative* — it says
 * which cognitive skills are in range and what the copy budget is, and the
 * planner does the choosing. That difference matters: a verse has one shape
 * and seven treatments, while a chapter has six questions and a dozen
 * mechanics, so the ladder here has to be something a selection algorithm can
 * read rather than seven hand-written functions.
 *
 * **Difficulty is which skills are in range, not how many options there are.**
 * A Senior game is not a Beginner game with four choices instead of three and
 * a smaller font. Beginner tops out at sequencing — put known things in their
 * order. Senior starts where Beginner stops and goes up to reasoning, where
 * several facts have to be held at once to reach one conclusion. The copy
 * budgets below follow from that rather than causing it.
 *
 * Every band from Beginner up includes `recall`, including the oldest. A band
 * is a *ceiling* for the young and a *floor* for the old: Beginner stops at
 * sequencing, and Senior starts above recognition — but nobody ever stops
 * being asked to remember something, and a ladder that said otherwise locked
 * `write-reference` and `arrange-words` out of the only classes old enough
 * for them.
 *
 * `reading` is the ceiling from `catalogue.READING`. It is what keeps a
 * six-year-old away from `arrange-words` as a *game* — they meet that shape
 * in the memory verse, where the words are already known, and not as a way of
 * being asked what happened in the story.
 */

import { READING } from "./catalogue.mjs";

/**
 * The seven bands, in the order `content/classes.json` orders the classes.
 *
 * `games` is a range and not a target. The planner stops when the curriculum
 * is covered and the variety rule is satisfied; it never pads to reach the
 * bottom of the range, because a game invented to make the count look right
 * is the clearest possible sign that nobody knew what it was for.
 */
export const BANDS = {
  nursery: {
    ages: "4–5",
    skills: ["recognition"],
    games: [2, 3],
    reading: READING.low,
    maxOptions: 2,
    maxPromptWords: 6,
    maxLabelWords: 3,
    /** How many of the chapter's games may lean on choose-one-of-N. */
    choosingShare: 0.5,
    forbid: ["arrange-words", "write-reference", "sequence", "true-or-not"],
    note: "Two things on the screen at once, and a picture on each. Nothing to read that a grown-up has not read aloud first.",
  },
  beginner: {
    ages: "6–7",
    skills: ["recognition", "recall", "sequencing"],
    games: [3, 4],
    reading: READING.medium,
    maxOptions: 3,
    maxPromptWords: 9,
    maxLabelWords: 5,
    choosingShare: 0.5,
    forbid: ["write-reference", "arrange-words"],
    note: "Recognise, remember, and put in order. Understanding is reached *through* the pictures rather than asked for in words.",
  },
  primary: {
    ages: "8–9",
    skills: ["recall", "sequencing", "understanding"],
    games: [4, 5],
    reading: READING.medium,
    maxOptions: 4,
    maxPromptWords: 12,
    maxLabelWords: 6,
    choosingShare: 0.4,
    forbid: ["write-reference"],
    note: "Why, as well as what. Sorting and categorising arrive here, and a sequence may be longer than four steps.",
  },
  junior: {
    ages: "10–11",
    skills: ["recall", "sequencing", "understanding", "application"],
    games: [4, 6],
    reading: READING.high,
    maxOptions: 4,
    maxPromptWords: 16,
    maxLabelWords: 8,
    choosingShare: 0.35,
    forbid: [],
    note: "Cause and effect, and the first questions that ask a child to carry the lesson somewhere the story did not go.",
  },
  intermediate: {
    ages: "12–13",
    skills: ["recall", "sequencing", "understanding", "application", "reasoning"],
    games: [4, 6],
    reading: READING.high,
    maxOptions: 4,
    maxPromptWords: 20,
    maxLabelWords: 10,
    choosingShare: 0.3,
    forbid: [],
    note: "Several facts at once. Timelines, consequences, and statements that are nearly true.",
  },
  senior: {
    ages: "14–15",
    skills: ["recall", "understanding", "application", "reasoning"],
    games: [5, 7],
    reading: READING.high,
    maxOptions: 4,
    maxPromptWords: 24,
    maxLabelWords: 12,
    choosingShare: 0.25,
    forbid: [],
    note: "Deduction and scenario. Recognition is no longer a question worth asking at this age — it is assumed and built on.",
  },
  "young-adult": {
    ages: "16+",
    skills: ["recall", "understanding", "application", "reasoning"],
    games: [5, 7],
    reading: READING.high,
    maxOptions: 4,
    maxPromptWords: 28,
    maxLabelWords: 14,
    choosingShare: 0.25,
    forbid: [],
    note: "The class that is asked to produce rather than recognise — the only band where writing a reference from memory is a fair question.",
  },
};

export const bandFor = (classId) => BANDS[classId];

/** Whether a mechanic is in range for a band: allowed, readable, and useful. */
export function suits(band, entry) {
  if (band.forbid.includes(entry.mechanic)) return false;
  if (READING[entry.reading] > band.reading) return false;
  return entry.skills.some((s) => band.skills.includes(s));
}
