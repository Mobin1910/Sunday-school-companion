/**
 * Everything that has to be true before a verse is allowed through.
 *
 * These gates were written for a model's answer and are now applied to
 * Claude's. That is deliberate and it is the point: whoever reads the page,
 * the reading is treated as a claim to be checked rather than an answer to be
 * used. The gates did not become less necessary when the reader got better at
 * reading — a confident wrong verse is the failure mode either way, and it is
 * the one failure nobody downstream can catch. A child who learns a verse
 * slightly wrong has learned it wrong for years, and it reads fine.
 *
 * Nothing here talks to a network, and nothing here imports a provider. The
 * module is pure so that the selftest can exercise every gate without
 * credentials, and so that the agent's live path loads no AI client at all.
 */

const tidy = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/* ── the original gates, unchanged ───────────────────────────────────── */

/**
 * Whether a reading can be used without a human.
 *
 * Four of these are the reader's own report — it said it was unsure, it asked
 * for review, it offered more than one candidate — and the rest are ours: a
 * verse one word long, or a reference with no digits in it, is not a verse and
 * not a reference whatever anyone says about their confidence. The reader is
 * allowed to be wrong about being right.
 */
export function judge(result) {
  const text = tidy(result?.memoryVerse?.text);
  const reference = tidy(result?.memoryVerse?.reference);

  if (text === "" || reference === "") {
    return { ok: false, reason: "no memory verse or reference was found in the pages" };
  }
  if (result.reviewRequired === true) {
    return { ok: false, reason: tidy(result.reviewReason) || "the extractor asked for review" };
  }
  if (result.confidence !== "high") {
    return {
      ok: false,
      reason: `extraction confidence was "${result.confidence}"` +
        (result.reviewReason ? `: ${tidy(result.reviewReason)}` : ""),
    };
  }
  if (Array.isArray(result.candidates) && result.candidates.length > 1) {
    return {
      ok: false,
      reason: `the curriculum contains ${result.candidates.length} possible memory verses`,
    };
  }
  if (text.split(" ").length < 3) {
    return { ok: false, reason: `the extracted verse is too short to be a verse: "${text}"` };
  }
  if (!/\d/.test(reference)) {
    return {
      ok: false,
      reason: `the extracted reference has no chapter or verse number: "${reference}"`,
    };
  }

  return { ok: true, verse: { text, reference } };
}

/* ── the supervised reading, on its way to those gates ───────────────── */

export const CONFIDENCE = ["high", "medium", "low"];

/**
 * Is this file actually filled in?
 *
 * Separate from `judge` because the two answer different questions. This asks
 * whether the extraction file is a completed piece of work; `judge` asks
 * whether the reading it contains is safe to use. An untouched template — the
 * empty fields exactly as `--fetch` wrote them — is not a low-confidence
 * reading, it is a step nobody has done yet, and saying so plainly beats
 * failing a gate it was never offered to.
 */
export function readable(extraction) {
  if (!extraction || typeof extraction !== "object") {
    return { ok: false, reason: "the extraction file is not an object" };
  }

  const verseText = tidy(extraction.verseText);
  const reference = tidy(extraction.reference);

  if (verseText === "" && reference === "") {
    return {
      ok: false,
      reason:
        "the extraction file has not been filled in yet.\n" +
        "  Open the downloaded pages, read the memory verse off them, and write\n" +
        "  verseText, reference, sourceFile, confidence and ambiguities into it.",
    };
  }
  if (!CONFIDENCE.includes(extraction.confidence)) {
    return {
      ok: false,
      reason:
        `confidence must be one of ${CONFIDENCE.join(", ")} — got ` +
        `${JSON.stringify(extraction.confidence)}`,
    };
  }
  if (extraction.ambiguities !== undefined && !Array.isArray(extraction.ambiguities)) {
    return { ok: false, reason: "ambiguities must be an array" };
  }
  if (tidy(extraction.sourceFile) === "") {
    return {
      ok: false,
      reason: "sourceFile must name the page the verse was read from",
    };
  }

  return { ok: true };
}

/**
 * The supervised reading, in the shape the original gates already understand.
 *
 * A translation and not a second set of rules. Anything the reader flagged as
 * ambiguous becomes `reviewRequired`, which is the existing gate for "stop and
 * ask a human" — so listing a single doubt in `ambiguities` is enough to halt
 * the run, and no new gate had to be invented to make that true.
 */
export function asClaim(extraction) {
  const ambiguities = (extraction.ambiguities ?? []).map(tidy).filter(Boolean);

  return {
    memoryVerse: {
      text: tidy(extraction.verseText),
      reference: tidy(extraction.reference),
    },
    confidence: extraction.confidence,
    reviewRequired: ambiguities.length > 0,
    reviewReason: ambiguities.join("; "),
    candidates: [],
  };
}

/* ── the second opinion ──────────────────────────────────────────────── */

/**
 * One spelling of a verse, for comparing two of them.
 *
 * Case, whitespace, and the shapes a quotation mark or a dash can take are
 * folded away; the words are not. A teacher typing the verse into a Sheet and
 * a photograph of the printed page will differ in the first kind of way all
 * the time and in the second kind of way almost never — and when they do, it
 * matters enough to stop.
 *
 * Case is folded deliberately, which loses "LORD" against "Lord". That is a
 * real translation difference and this will not catch it. It is accepted
 * because the alternative is a gate that stops on every sentence-initial
 * capital, and a gate that cries wolf is a gate somebody turns off. Both
 * spellings are printed in full whenever this reports a difference, so the
 * distinction is in front of the reviewer even though the comparison ignored
 * it.
 */
export function spelling(text) {
  return (
    String(text ?? "")
      .normalize("NFKD")
      .replace(/[‘’‛ʼ]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[‐-―−]/g, "-")
      // Everything that is not a letter, a number, an apostrophe or a hyphen
      // becomes a space. The hyphen is spared so that "God-fearing" stays one
      // word rather than becoming two.
      .replace(/[^\p{L}\p{N}'\s-]/gu, " ")
      /*
        But a hyphen with space around it is not part of a word — it is a dash
        someone used as punctuation, and the two sources will punctuate
        differently all day. "salvation — which" and "salvation, which" are
        the same sentence, and a gate that stopped on the difference would be
        stopping on typography.
      */
      .replace(/(^|\s)-+(\s|$)/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
  );
}

/**
 * One spelling of a reference.
 *
 * Deliberately simpler than the app's own `sameReference`, and deliberately
 * not a copy of it. That one decides what to accept from a child and has to
 * understand that "2:30-31" and "2:30,31" are the same two verses. This one is
 * asking a narrower question — do two adults describing the same lesson agree
 * about where it comes from — and its answer only ever routes a human's
 * attention. If it is over-sensitive, somebody reads two references side by
 * side and says "same thing"; if it were clever and wrong, nobody would look.
 *
 * The app's matcher still runs, later and for real, when the verse reaches
 * `content/` and `checks.ts` reads the drill back against it.
 */
export function referenceSpelling(reference) {
  return String(reference ?? "")
    .normalize("NFKD")
    .replace(/[‐-―−]/g, "-")
    .toLowerCase()
    .replace(/\b(st|saint)\b\.?/g, "")
    .replace(/[^a-z0-9:,-]/g, "");
}

/**
 * The page against what the teacher typed.
 *
 * Three outcomes rather than two. Agreement and disagreement are the obvious
 * ones; the third is that there is nothing to compare against, which is not
 * agreement and must never be recorded as if it were. A chapter whose verse
 * was read once by one reader and confirmed by nobody is a weaker thing than
 * one that two independent sources agree about, and the draft says which it
 * got.
 */
export function crossCheck(page, teacher) {
  if (!teacher || (tidy(teacher.text) === "" && tidy(teacher.reference) === "")) {
    return {
      status: "unavailable",
      reason: teacher?.reason ?? "no teacher-entered verse was found for this chapter",
    };
  }

  const differences = [];

  const teacherText = tidy(teacher.text);
  if (teacherText !== "" && spelling(teacherText) !== spelling(page.text)) {
    differences.push({
      field: "verse",
      page: page.text,
      teacher: teacherText,
    });
  }

  const teacherReference = tidy(teacher.reference);
  if (
    teacherReference !== "" &&
    referenceSpelling(teacherReference) !== referenceSpelling(page.reference)
  ) {
    differences.push({
      field: "reference",
      page: page.reference,
      teacher: teacherReference,
    });
  }

  return differences.length === 0
    ? { status: "agrees" }
    : { status: "disagrees", differences };
}
