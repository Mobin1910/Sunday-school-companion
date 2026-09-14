/**
 * Whether two Bible references are the same reference.
 *
 * The oldest class writes the reference out rather than picking it from three,
 * so something has to decide what counts. The rule is: forgive everything that
 * is not the answer, forgive nothing that is.
 *
 * Not the answer, and therefore forgiven:
 *
 *   case            "st luke" · "St Luke" · "ST LUKE"
 *   spacing         "Luke 2:30" · "Luke  2 : 30"
 *   the honorific   "St Luke" · "Saint Luke" · "Luke"
 *   how a range is written   "2:30,31" · "2:30, 31" · "2:30-31" · "2:30–31"
 *   a trailing stop "Luke 2:30,31."
 *
 * The answer, and therefore not forgiven: which book, which chapter, which
 * verses. `Luke 2:30` is not `Luke 2:31`, and `Luke` is not `John`. A child
 * who writes a different passage has not recalled this one, and telling them
 * they have is the one thing this must never do.
 *
 * Abbreviations are deliberately *not* expanded — "Lk" is not accepted for
 * "Luke". A lookup table of sixty-six books with their short forms is a table
 * that will be wrong about somebody's tradition, and the hint already shows
 * the shape. Being asked to write the book out is part of the recall.
 */

/**
 * The numbers, as what they actually mean.
 *
 * "2:30,31" and "2:30-31" are the same two verses written two ways, and a
 * child who types the second when the curriculum printed the first has
 * recalled the passage. Comparing the punctuation says they are different;
 * comparing the verses says they are the same. So the numeric part is expanded
 * into a chapter and an explicit set of verse numbers, and the sets are what
 * is compared.
 *
 * This is also why the forgiveness cannot be "ignore all punctuation": that
 * would make "2:30,35" equal to "2:30-35", which is two verses and six verses.
 * Expanding a range is the only way to forgive the formatting without also
 * forgiving the meaning.
 *
 * Anything this cannot parse — an unusual multi-chapter span, say — falls back
 * to a strict comparison of the digits, which errs towards asking the child
 * again rather than towards accepting the wrong passage.
 */
function numbers(part: string): string {
  const cleaned = part
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, "")
    .replace(/[.;]+$/, "");

  const at = cleaned.indexOf(":");
  if (at === -1) {
    // "Psalm 23" — a whole chapter, and no verses to expand.
    return /^\d+$/.test(cleaned) ? `${Number(cleaned)}|` : cleaned.toLowerCase();
  }

  const chapter = cleaned.slice(0, at);
  const rest = cleaned.slice(at + 1);
  if (!/^\d+$/.test(chapter)) return cleaned.toLowerCase();

  const found = new Set<number>();
  for (const span of rest.split(/[,&]/)) {
    if (span === "") continue;

    const range = /^(\d+)-(\d+)$/.exec(span);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      // A backwards or absurd span is not something to guess at.
      if (to < from || to - from > 200) return cleaned.toLowerCase();
      for (let v = from; v <= to; v++) found.add(v);
      continue;
    }

    if (/^\d+$/.test(span)) {
      found.add(Number(span));
      continue;
    }

    return cleaned.toLowerCase();
  }

  const verses = [...found].sort((a, b) => a - b).join(",");
  return `${Number(chapter)}|${verses}`;
}

export function normaliseReference(input: string): string {
  const cleaned = String(input)
    .normalize("NFKD")
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .trim()
    .replace(/[.\s]+$/, "");

  // Split the book from the numbers at the first digit that starts a chapter.
  // A leading numeral is part of the book — "1 John", "2 Timothy" — so the
  // search starts after any leading "1 ", "2 ", "3 ".
  const lead = /^([123]\s*)?(.*)$/su.exec(cleaned);
  const ordinal = (lead?.[1] ?? "").replace(/\s+/g, "");
  const rest = lead?.[2] ?? cleaned;

  const found = rest.search(/\d/);
  const bookPart = found === -1 ? rest : rest.slice(0, found);
  const numberPart = found === -1 ? "" : rest.slice(found);

  const book = bookPart
    .toLowerCase()
    .replace(/\b(st|saint)\b\.?/g, "")
    .replace(/[^a-z]/g, "");

  return `${ordinal}${book}|${numbers(numberPart)}`;
}

export function sameReference(a: string, b: string): boolean {
  const left = normaliseReference(a);
  const right = normaliseReference(b);
  // An empty book on both sides would make any two numbers "match".
  if (left.startsWith("|")) return false;
  return left === right;
}
