/**
 * What has to be true before a game set is allowed out.
 *
 * `agents/memory-verse/gates.mjs` exists because a plausible paraphrase of
 * scripture is worse than no output. These gates exist for the quieter
 * equivalent: a game set that looks fine, builds fine, and quietly fails a
 * child — six multiple-choice questions in a row, a prompt too long for a
 * six-year-old, a curriculum question nothing covers. None of those break the
 * build. All of them are the difference between a chapter that works and a
 * chapter that ships.
 *
 * Everything here is checked against the *content*, after the words are
 * written, because that is the only point at which most of it is knowable.
 */

import { byMechanic } from "./catalogue.mjs";
import { bandFor } from "./bands.mjs";

const words = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;

/** Every prompt a child reads, whatever shape the interaction is. */
function promptsOf(i) {
  switch (i.type) {
    case "provision":
      return (i.phases ?? []).map((p) => p.prompt);
    case "true-or-not":
      return [...(i.prompt ? [i.prompt] : []), ...(i.statements ?? []).map((s) => s.ask)];
    default:
      return i.prompt ? [i.prompt] : [];
  }
}

/** Every short label a child reads on a tappable thing. */
function labelsOf(i) {
  switch (i.type) {
    case "multiple-choice":
      return (i.options ?? []).map((o) => o.label).filter(Boolean);
    case "journey":
      return (i.choices ?? []).map((c) => c.label).filter(Boolean);
    case "provision":
      return (i.phases ?? []).flatMap((p) => (p.options ?? []).map((o) => o.label));
    case "sequence":
    case "reveal":
      return (i.items ?? []).map((x) => x.label).filter(Boolean);
    case "match":
      return (i.pairs ?? []).flatMap((p) => [p.from?.label, p.to?.label]).filter(Boolean);
    default:
      return [];
  }
}

const CHOOSING = new Set(["multiple-choice", "journey"]);

/**
 * @param {{classId:string, questions:{n:number}[], games:object[]}} chapter
 * @returns {{problems:string[], notes:string[], summary:object}}
 */
export function check({ classId, questions, games }) {
  const band = bandFor(classId);
  const problems = [];
  const notes = [];

  if (!band) return { problems: [`no band for the class "${classId}"`], notes, summary: {} };

  /* ── coverage: every recorded question is answered by something ────── */
  const answered = new Set(games.flatMap((g) => g.answers ?? []));
  const missing = questions.map((q) => q.n).filter((n) => !answered.has(n));
  if (missing.length) {
    problems.push(
      `question${missing.length > 1 ? "s" : ""} ${missing.join(", ")} ${
        missing.length > 1 ? "are" : "is"
      } not answered by any game`,
    );
  }

  /* ── every game says what it is for ────────────────────────────────── */
  for (const g of games) {
    if (!g.objective?.trim()) problems.push(`"${g.id}" has no learning objective`);
    if (!(g.answers ?? []).length) {
      notes.push(`"${g.id}" answers no curriculum question — is it earning its place?`);
    }
  }

  /* ── variety: not the same mechanic over and over ──────────────────── */
  const mechanics = games.flatMap((g) => (g.interactions ?? []).map((i) => i.type));
  const distinct = new Set(mechanics);
  const primary = games.map((g) => g.interactions?.[0]?.type).filter(Boolean);
  const choosing = primary.filter((t) => CHOOSING.has(t)).length;

  if (games.length >= 3 && distinct.size < 3) {
    problems.push(
      `only ${distinct.size} distinct mechanic(s) across ${games.length} games — ` +
        `a chapter of near-identical games is a worksheet`,
    );
  }

  const cap = Math.ceil(games.length * band.choosingShare);
  if (choosing > cap) {
    problems.push(
      `${choosing} of ${games.length} games are choose-one-of-N; the ${classId} band allows ${cap}`,
    );
  }

  for (const [type, n] of Object.entries(
    primary.reduce((acc, t) => ({ ...acc, [t]: (acc[t] ?? 0) + 1 }), {}),
  )) {
    if (n > 2) notes.push(`"${type}" leads ${n} games — consider varying one of them`);
  }

  /* ── band fit: forbidden mechanics, reading load, copy budget ──────── */
  for (const g of games) {
    for (const i of g.interactions ?? []) {
      const entry = byMechanic(i.type);
      if (!entry) {
        problems.push(`"${g.id}" uses "${i.type}", which is not in the catalogue`);
        continue;
      }
      if (band.forbid.includes(i.type)) {
        problems.push(`"${g.id}" uses "${i.type}", which the ${classId} band forbids`);
      }
      for (const p of promptsOf(i)) {
        if (words(p) > band.maxPromptWords) {
          problems.push(
            `"${g.id}": prompt is ${words(p)} words, ${classId} allows ${band.maxPromptWords} — “${p}”`,
          );
        }
      }
      for (const l of labelsOf(i)) {
        if (words(l) > band.maxLabelWords) {
          problems.push(
            `"${g.id}": label is ${words(l)} words, ${classId} allows ${band.maxLabelWords} — “${l}”`,
          );
        }
      }
      const options =
        i.options?.length ?? i.choices?.length ?? Math.max(...(i.phases ?? []).map((p) => p.options?.length ?? 0), 0);
      if (options > band.maxOptions) {
        problems.push(
          `"${g.id}": ${options} options at once, ${classId} allows ${band.maxOptions}`,
        );
      }
    }
  }

  /* ── count: a range, and never padded to reach it ──────────────────── */
  const [floor, ceiling] = band.games;
  if (games.length < floor) {
    notes.push(`${games.length} games; ${classId} usually has ${floor}–${ceiling}`);
  }
  if (games.length > ceiling) {
    notes.push(`${games.length} games; ${classId} usually has ${floor}–${ceiling} — is one of them padding?`);
  }

  return {
    problems,
    notes,
    summary: {
      games: games.length,
      mechanics: [...distinct],
      choosingGames: `${choosing} of ${games.length}`,
      coverage: `${questions.length - missing.length} of ${questions.length} questions`,
    },
  };
}
