/**
 * Taking a verse apart without changing it.
 *
 * Everything the ladder builds is made of these pieces, so this file has one
 * rule above all others: **the verse survives**. Join the tokens back with
 * single spaces and you must get the verse the curriculum supplied, modulo
 * whitespace. `checks.ts` enforces exactly that against any drill that ships,
 * so a tokenizer that quietly drops a comma fails the build rather than
 * teaching a child a misquotation.
 *
 * That is why a token carries its punctuation. "salvation," is one token, not
 * "salvation" plus a comma the app puts back later — the moment the app is
 * putting punctuation back, the app is deciding how scripture is written.
 *
 *   "For my eyes have seen your salvation, which you have prepared"
 *     → For · my · eyes · have · seen · your · salvation, · which · you …
 *
 * Splitting on whitespace alone is also what keeps hyphenated words,
 * apostrophes and quotation marks intact without a rule for each: "God's" and
 * "loving-kindness" are single words to a reader, so they are single tokens
 * here. Nothing is lower-cased, nothing is stripped, nothing is normalised.
 */

/** Whitespace collapsed, ends trimmed. The only thing ever done to a verse. */
export function tidy(text) {
  return String(text).replace(/\s+/g, " ").trim();
}

/**
 * The words, as written.
 *
 * @param {string} verse
 * @returns {string[]} tokens whose `join(" ")` is `tidy(verse)`
 */
export function words(verse) {
  const cleaned = tidy(verse);
  return cleaned === "" ? [] : cleaned.split(" ");
}

/** A token with its punctuation taken off, for comparing two words. */
export function bare(token) {
  return String(token)
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/[^\p{L}\p{N}]+$/u, "")
    .toLowerCase();
}

/**
 * The verse in breathing-sized pieces.
 *
 * Phrases are how a verse is actually held in the head — "For my eyes have
 * seen your salvation," then "which you have prepared," then "in the presence
 * of all peoples" — so the sequencing classes work in these rather than in
 * words, and the phrase boundaries are the verse's own punctuation wherever
 * it has any.
 *
 * Where a verse has no internal punctuation at all, it is cut on word count
 * instead so that Primary still has something to order. The cut is never
 * allowed to leave a one-word tail, which reads as a mistake rather than a
 * phrase.
 *
 * @param {string} verse
 * @param {{ min?: number, max?: number }} [size] words per phrase when cutting
 * @returns {string[]} phrases whose `join(" ")` is `tidy(verse)`
 */
export function phrases(verse, size = {}) {
  const { min = 3, max = 7 } = size;
  const all = words(verse);
  if (all.length === 0) return [];

  const out = [];
  let run = [];

  for (const token of all) {
    run.push(token);
    // A phrase ends where the verse itself pauses — but never so early that
    // "For my eyes," would become a piece on its own.
    const pauses = /[,;:—–]$/u.test(token);
    if (pauses && run.length >= min) {
      out.push(run.join(" "));
      run = [];
    }
  }
  if (run.length > 0) out.push(run.join(" "));

  // Too many tiny pieces is its own kind of wrong: merge forward until each
  // piece is at least `min` words long.
  const merged = [];
  for (const piece of out) {
    const last = merged[merged.length - 1];
    if (last && last.split(" ").length < min) {
      merged[merged.length - 1] = `${last} ${piece}`;
    } else {
      merged.push(piece);
    }
  }
  if (merged.length > 1 && merged[merged.length - 1].split(" ").length < min) {
    const tail = merged.pop();
    merged[merged.length - 1] = `${merged[merged.length - 1]} ${tail}`;
  }

  // And too long is the other kind. A piece the child has to read twice to
  // hold is not a phrase, so anything past `max` is cut again — at a clause,
  // never at an arbitrary word.
  return merged.flatMap((piece) => divide(piece, min, max));
}

/**
 * Words a clause tends to begin at.
 *
 * This is the difference between "which you have prepared / in the presence of
 * all peoples" and "which you have prepared in the / presence of all peoples".
 * The first is two things a child can hold; the second is a verse cut with
 * scissors. Splitting on word count alone reliably produces the second.
 *
 * Deliberately small and deliberately English. It is a readability heuristic,
 * not grammar: it only ever chooses *where* an already-too-long phrase breaks,
 * and the words themselves are never altered, so the worst a bad guess can do
 * is make a piece slightly awkward. The verse is unchanged either way.
 */
export const CLAUSE = new Set([
  "and", "but", "or", "so", "for", "yet", "nor",
  "which", "who", "whom", "whose", "that", "when", "while", "because",
  "in", "on", "to", "of", "with", "by", "from", "before", "after",
  "through", "into", "upon", "among", "against", "unto",
]);

/** One phrase, cut at clauses until every piece fits. */
function divide(piece, min, max) {
  const all = piece.split(" ");
  if (all.length <= max) return [piece];

  // Every place a clause could open, with room for `min` words either side.
  const points = [];
  for (let at = min; at <= all.length - min; at++) {
    if (CLAUSE.has(bare(all[at]))) points.push(at);
  }

  const middle = Math.round(all.length / 2);
  const at = points.length
    ? points.reduce((best, p) =>
        Math.abs(p - middle) < Math.abs(best - middle) ? p : best,
      )
    : middle;

  return [
    ...divide(all.slice(0, at).join(" "), min, max),
    ...divide(all.slice(at).join(" "), min, max),
  ];
}

/**
 * A verse cut once, into an opening and what follows it.
 *
 * The two easiest classes are built on this: show the beginning, ask for the
 * rest. The cut lands on the first pause where there is one, so the opening is
 * a phrase a child can hear the shape of rather than an arbitrary five words.
 */
export function opening(verse, wanted = 4) {
  const parts = phrases(verse);
  if (parts.length >= 2) return { head: parts[0], tail: parts.slice(1).join(" ") };

  const all = words(verse);
  const at = Math.min(Math.max(wanted, 1), Math.max(all.length - 1, 1));
  return { head: all.slice(0, at).join(" "), tail: all.slice(at).join(" ") };
}

/**
 * The verse in exactly `count` pieces, when it is long enough to bear it.
 *
 * `phrases` follows the verse's own punctuation, which is the right instinct
 * and sometimes gives two pieces where a sequencing task needs three. This is
 * the fallback: cut at the clause openings nearest the even boundaries, so the
 * pieces are still places a sentence pauses rather than arbitrary fifths.
 *
 * Returns fewer pieces than asked for only when the verse genuinely cannot
 * carry them — two words cannot be three phrases, and pretending otherwise is
 * how a drill ends up with a piece that is a single "the".
 */
export function chunks(verse, count) {
  const all = words(verse);
  if (all.length < count * 2) return phrases(verse);

  /*
    How far a cut may wander to find a clause.

    Unbounded, the search for a nicer boundary drags the first cut across half
    the verse — "In the beginning God created the heavens | and the earth" when
    three pieces were asked for. A clause two words away is worth moving to; a
    clause five words away is a different cut.
  */
  const DRIFT = 2;

  const cuts = [];
  for (let piece = 1; piece < count; piece++) {
    const target = Math.round((all.length * piece) / count);

    let best = target;
    let bestGap = Infinity;
    for (let at = Math.max(2, target - DRIFT); at <= Math.min(all.length - 2, target + DRIFT); at++) {
      if (!CLAUSE.has(bare(all[at])) || cuts.includes(at)) continue;
      const gap = Math.abs(at - target);
      if (gap < bestGap) {
        best = at;
        bestGap = gap;
      }
    }

    // Never land on a cut already made; step off it rather than lose a piece.
    while (cuts.includes(best) && best < all.length - 1) best++;
    cuts.push(best);
  }

  const bounds = [0, ...[...new Set(cuts)].sort((a, b) => a - b), all.length];
  const out = [];
  for (let i = 1; i < bounds.length; i++) {
    const piece = all.slice(bounds[i - 1], bounds[i]).join(" ");
    if (piece.trim() !== "") out.push(piece);
  }
  return out;
}
