import { bare, chunks, opening, phrases, tidy, words } from "./tokenize.mjs";

/**
 * One verse, seven ways of asking for it back.
 *
 * This is the whole of the class ladder, and it is deterministic on purpose:
 * Gemini reads the curriculum and hands over the verse, and then *this* file
 * decides what a five-year-old and a fifteen-year-old are each asked to do
 * with it. Seven AI requests to phrase the same verse seven times would cost
 * quota, drift between chapters, and make difficulty a matter of whatever the
 * model felt like that morning. A function cannot drift.
 *
 * The rungs are retrieval load, not decoration. Nothing here gets smaller,
 * faster, noisier or more punishing as the class goes up; what changes is how
 * much of the verse the child has to supply from memory, and how much context
 * they are given to supply it from.
 *
 *   Nursery       which chunk comes next          — recognition, 2 choices
 *   Beginner      which word fills this gap       — recognition, both sides
 *   Primary       put three phrases in order      — sequencing, chunked
 *   Junior        which word comes next           — recall, left context only
 *   Intermediate  rebuild it word by word         — reconstruction
 *   Senior        rebuild it, then know where     — reconstruction + recognise
 *   Young Adult   rebuild it, then write where    — reconstruction + recall
 *
 * Two rules constrain every generator:
 *
 * **The verse is never altered.** Any `arrange-words` this produces must have
 * `words.join(" ")` equal to the verse — `checks.ts` fails the build
 * otherwise — so the pieces are always real cuts of the real text.
 *
 * **Distractors come out of the verse itself.** Nothing here invents words.
 * A wrong option is a genuine fragment of the same verse taken from somewhere
 * else in it, which makes the question "does this go *here*" rather than "is
 * this word biblical-sounding", and makes it impossible to accidentally
 * generate a second correct answer.
 *
 * A generator returns `null` when the verse is too short to ask that class
 * honestly — a three-word verse cannot carry a nine-tile reconstruction. The
 * agent records which classes could not be built and why, and never ships a
 * degenerate drill to fill the gap.
 */

/** Stop words make poor gaps: "for my eyes ___ seen" is a coin toss. */
const SLIGHT = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "is", "are",
  "was", "were", "be", "my", "your", "his", "her", "its", "our", "their",
  "you", "he", "she", "it", "we", "they", "i", "me", "him", "us", "them",
  "that", "this", "these", "those", "have", "has", "had", "will", "shall",
  "with", "by", "from", "not", "all", "so", "as", "at",
]);

const weighty = (token) => !SLIGHT.has(bare(token)) && bare(token).length > 2;

/**
 * An option for Selection. Labels only — this ladder draws no pictures.
 *
 * A trailing comma is punctuation belonging to the verse, not to the choice:
 * "salvation," sitting alone on a button reads as a typo. It is stripped from
 * the *label* only. Nothing that has to spell the verse back — every
 * `arrange-words` piece — goes through here, so the text itself is untouched.
 */
const choice = (label, correct = false) => {
  const shown = String(label).replace(/[,;:.]+$/u, "");
  return correct ? { label: shown, correct: true } : { label: shown };
};

/**
 * Fragments of the verse that are not the answer.
 *
 * Takes consecutive runs of `size` words from elsewhere in the verse, skipping
 * anything that overlaps the true answer's position, so a distractor is always
 * real text and never accidentally right.
 */
function elsewhereRuns(all, size, avoidFrom, avoidTo) {
  const out = [];
  for (let at = 0; at + size <= all.length; at++) {
    const overlaps = at < avoidTo && at + size > avoidFrom;
    if (overlaps) continue;
    out.push({ at, text: all.slice(at, at + size).join(" ") });
  }
  return out;
}

/** Spread picks out evenly, so options are not all from the same clause. */
function spread(items, wanted) {
  if (items.length <= wanted) return items;
  const step = (items.length - 1) / (wanted - 1);
  return Array.from({ length: wanted }, (_, i) => items[Math.round(i * step)]);
}

/* ─────────────────────────────  the seven  ───────────────────────────── */

/**
 * Nursery — which chunk comes next.
 *
 * The easiest rung there is. The verse begins on the screen and the child
 * picks the piece that follows it out of two. Chunks rather than words,
 * because a four-year-old recognises the shape of "seen your salvation"
 * before they can read either word in it, and two options rather than four
 * because a wall of choices is its own difficulty and not the one we want.
 *
 * No typing, no ordering, nothing to drag, and never the whole verse.
 */
function nursery({ text }) {
  const all = words(text);
  if (all.length < 6) return null;

  /*
    A short opening, not the whole first phrase.

    The head is the run-up — just enough for a child to hear where they are —
    and the answer is the next few words. Showing the entire first clause and
    asking for the one after it is Primary's question, not this one.
  */
  const headLength = Math.min(4, Math.max(2, Math.floor(all.length / 4)));
  const size = Math.min(3, all.length - headLength);
  if (size < 2) return null;

  const head = all.slice(0, headLength).join(" ");
  const answer = all.slice(headLength, headLength + size).join(" ");

  /*
    The wrong chunk comes from later in the verse — never from the words
    already on the screen. An option a child can see printed in the prompt
    above it is not a choice, it is a formality.
  */
  const others = elsewhereRuns(all, size, 0, headLength + size).filter(
    (run) => run.at >= headLength + size,
  );
  if (others.length === 0) return null;

  const far = others[others.length - 1];

  return {
    type: "multiple-choice",
    prompt: `${head}…`,
    hint: "Say the verse out loud with Halo, and listen for what comes next.",
    options: [choice(answer, true), choice(far.text)],
  };
}

/**
 * Beginner — which word fills the gap.
 *
 * A step finer than Nursery: the sentence is whole except for one word, and
 * the child supplies it. Context on both sides is what makes this the second
 * rung rather than the fourth — "For my eyes have ___ your salvation" can be
 * reasoned about, where Junior's version of the same question cannot.
 *
 * The gap is always a word that carries meaning. Blanking "the" asks nothing.
 */
function beginner({ text }) {
  const all = words(text);
  const parts = phrases(text);

  /*
    The gap has to have words on *both* sides of it.

    This is the whole difference between this rung and Junior's: here the
    sentence can be read around the blank, there it cannot. A gap on the last
    word of the line — "Trust in the ______" — is Junior's question wearing
    Beginner's label, so the line grows until there is somewhere for the gap to
    sit with context after it.
  */
  const lines = [
    parts[0] ? words(parts[0]) : all,
    parts.length > 1 ? words(parts.slice(0, 2).join(" ")) : all,
    all,
  ];

  let line;
  let at = -1;
  for (const candidate of lines) {
    const found = candidate.findIndex(
      (token, i) => i > 0 && i < candidate.length - 1 && weighty(token),
    );
    if (found !== -1) {
      line = candidate;
      at = found;
      break;
    }
  }
  if (!line || at === -1) return null;

  const answer = line[at];
  const shown = [...line];
  shown[at] = "______";

  const pool = all
    .map((token, i) => ({ token, i }))
    .filter(({ token, i }) => i !== at && weighty(token) && bare(token) !== bare(answer));
  if (pool.length === 0) return null;

  const wrong = spread(pool, 2).map((p) => choice(p.token));

  return {
    type: "multiple-choice",
    prompt: shown.join(" "),
    /*
      A nudge, not the answer. Rung 1 is "a word" — the first letter is a
      word; printing the missing word here would end the question on the
      child's first wobble, which is what rung 3 is for.
    */
    hint: `The missing word starts with “${bare(answer)[0]}”.`,
    options: [choice(answer, true), ...wrong],
  };
}

/**
 * Primary — the verse in order, a phrase at a time.
 *
 * The first rung that asks for the whole verse. The pieces are still large
 * enough to recognise on sight, so the work is sequencing rather than recall:
 * a child who knows how the verse *goes* can do this without being able to
 * recite it, which is exactly the stage this class is at.
 *
 * `arrange-words` rather than `sequence`, because a verse assembles into a
 * line and not into numbered slots — see the note at the top of `Words.tsx`.
 */
function primary({ text }) {
  /*
    The verse's own punctuation first, because that is where it really pauses.
    A verse with one comma in it gives two pieces, which is not a sequencing
    task — so it is cut into three at its clauses instead. A verse too short
    for three real phrases gets no Primary drill at all rather than three
    pieces one word long.
  */
  let pieces = phrases(text);
  if (pieces.length < 3) pieces = chunks(text, 3);
  if (pieces.length < 3) return null;
  if (pieces.join(" ") !== text) return null;

  return {
    type: "arrange-words",
    prompt: "Put the verse back together.",
    words: pieces,
    hint: `It begins “${pieces[0]}”`,
  };
}

/**
 * Junior — which word comes next.
 *
 * The same question as Beginner with the scaffolding taken away on one side.
 * The child sees only what comes *before* the gap, so the sentence cannot be
 * read around the missing word; it has to be remembered forwards. That is the
 * move from recognition into recall, and it is the point of this rung.
 *
 * Four options, all real words from the verse, so a wrong answer is a word
 * the child has definitely read — never a word that is obviously foreign.
 */
function junior({ text }) {
  const all = words(text);
  if (all.length < 8) return null;

  // Far enough in that there is something to remember, short of the end so
  // the verse is not simply finished for them.
  const at = all.findIndex((token, i) => i >= 4 && weighty(token));
  if (at === -1 || at >= all.length - 1) return null;

  const answer = all[at];

  /*
    Distractors from the part of the verse the child cannot see.

    Everything before the gap is printed in the prompt, so a word taken from
    there is eliminated by looking up rather than by remembering. Words from
    after the gap are ones the child has read but is not being shown, which is
    what makes them worth considering.
  */
  const ahead = all
    .map((token, i) => ({ token, i }))
    .filter(({ token, i }) => i > at && weighty(token) && bare(token) !== bare(answer));
  const anywhere = all
    .map((token, i) => ({ token, i }))
    .filter(({ token, i }) => i !== at && weighty(token) && bare(token) !== bare(answer));

  const pool = ahead.length >= 2 ? ahead : anywhere;
  if (pool.length < 2) return null;

  const wrong = spread(pool, 3).map((p) => choice(p.token));

  return {
    type: "multiple-choice",
    prompt: `${all.slice(0, at).join(" ")} ______`,
    hint: `After “${all[at - 1]}” comes a word beginning with “${answer[0]}”.`,
    options: [choice(answer, true), ...wrong],
  };
}

/**
 * Intermediate — rebuild it, word by word.
 *
 * Every word of the verse as its own tile, shuffled. There is no context to
 * read around and no chunk to recognise: the only thing that puts the words
 * in order is remembering the verse. This is the first rung that is properly
 * reconstruction rather than retrieval-with-help.
 */
function intermediate({ text }) {
  const all = words(text);
  if (all.length < 6) return null;

  return {
    type: "arrange-words",
    prompt: "Rebuild the verse, one word at a time.",
    words: all,
    hint: `It begins “${all.slice(0, 3).join(" ")}…”`,
  };
}

/**
 * Senior — rebuild it, then know where it is from.
 *
 * The reconstruction is Intermediate's, and the second half is what makes
 * this the rung above: a verse without its reference is a sentence, and this
 * is the class that starts being answerable for both. The reference is still
 * *recognised* here rather than recalled — picked out of four real-looking
 * references — which is deliberately one step short of Young Adult.
 */
function senior({ text, reference }) {
  const verse = intermediate({ text });
  if (!verse) return null;

  const options = referenceChoices(reference);
  if (!options) return [verse];

  return [
    { ...verse, prompt: "Rebuild the verse." },
    {
      type: "multiple-choice",
      prompt: "Where is this verse from?",
      hint: "Think of the book the story came from.",
      options,
    },
  ];
}

/**
 * Young Adult — rebuild it, then write where it is from.
 *
 * The hardest rung, and the only one with nothing on screen to choose from at
 * the end. The verse is rebuilt word by word exactly as Senior rebuilds it,
 * and then the reference has to be produced rather than spotted — typed out,
 * from memory, with the shape as the only prompt.
 *
 * Not multiple choice, on purpose: offering a fifteen-year-old three
 * near-identical references is a spotting exercise, and spotting is what
 * every rung below this one already does.
 */
function youngAdult({ text, reference }) {
  const verse = intermediate({ text });
  if (!verse) return null;

  return [
    { ...verse, prompt: "Rebuild the verse." },
    {
      type: "write-reference",
      prompt: "Where is this verse from?",
      answer: reference,
      hint: `It is in ${bookOf(reference) || "the book you have been reading"}.`,
      shape: "Book chapter:verse",
    },
  ];
}

/* ───────────────────────────  the reference  ─────────────────────────── */

function bookOf(reference) {
  const at = String(reference).search(/\d/);
  const lead = at === -1 ? reference : reference.slice(0, at);
  return lead.trim().replace(/[.,]$/, "");
}

/**
 * Four references, one of them true.
 *
 * The wrong three are built by moving the chapter, moving the verses, and
 * changing the book — each a reference that could plausibly exist, so the
 * question is whether the child knows this one rather than whether they can
 * spot the odd formatting. Every candidate is checked against the real answer
 * before it is offered, so a perturbation that lands back on the truth is
 * dropped rather than shipped as a second correct option.
 */
function referenceChoices(reference) {
  const book = bookOf(reference);
  const numbers = String(reference).slice(book.length).trim();
  const chapter = Number(/\d+/.exec(numbers)?.[0]);
  if (!book || !Number.isFinite(chapter)) return null;

  const neighbour = NEARBY[bare(book)] ?? (bare(book) === "john" ? "Luke" : "John");
  const moved = numbers.replace(/^\d+/, String(chapter === 1 ? chapter + 2 : chapter - 1));
  const shifted = numbers.replace(/(\d+)(?!.*\d)/, (d) => String(Number(d) + 3));

  const wrong = [
    `${book} ${moved}`,
    `${neighbour} ${numbers}`,
    `${book} ${shifted}`,
  ].filter(
    (candidate, i, list) =>
      norm(candidate) !== norm(reference) &&
      list.findIndex((other) => norm(other) === norm(candidate)) === i,
  );

  if (wrong.length < 1) return null;
  return [choice(reference, true), ...wrong.slice(0, 3).map((r) => choice(r))];
}

/** Same forgiveness the app uses, kept local so the agent has no app import. */
const norm = (r) =>
  String(r).toLowerCase().replace(/\b(st|saint)\b\.?/g, "").replace(/[^a-z0-9]/g, "");

/** A believable wrong book: a neighbour, not a random one. */
const NEARBY = {
  matthew: "Mark", mark: "Matthew", luke: "John", john: "Luke",
  acts: "Romans", romans: "Acts", genesis: "Exodus", exodus: "Genesis",
  psalms: "Proverbs", psalm: "Proverbs", proverbs: "Psalms",
  isaiah: "Jeremiah", jeremiah: "Isaiah",
};

/* ──────────────────────────────  the map  ────────────────────────────── */

const BUILDERS = {
  nursery,
  beginner,
  primary,
  junior,
  intermediate,
  senior,
  "young-adult": youngAdult,
};

/**
 * Every class's practice for one verse.
 *
 * @param {{ text: string, reference: string }} verse
 * @returns {{ practice: Record<string, object[]>, skipped: Record<string,string> }}
 */
export function ladderFor(verse) {
  const text = tidy(verse.text);
  const reference = tidy(verse.reference);

  const practice = {};
  const skipped = {};

  for (const [classId, build] of Object.entries(BUILDERS)) {
    const made = build({ text, reference });
    if (!made) {
      skipped[classId] =
        `the verse is too short to ask this class honestly (${words(text).length} words)`;
      continue;
    }
    const steps = Array.isArray(made) ? made : [made];

    // The promise checks.ts enforces, checked here too so a bad generator is
    // caught in the agent rather than at build time in the app.
    for (const step of steps) {
      if (step.type === "arrange-words" && step.words.join(" ") !== text) {
        throw new Error(
          `${classId}: the pieces do not spell the verse\n  verse:  ${text}\n  pieces: ${step.words.join(" ")}`,
        );
      }
    }
    practice[classId] = steps;
  }

  return { practice, skipped };
}

export { BUILDERS };
