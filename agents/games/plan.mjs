/**
 * Curriculum → learning objectives → mechanics.
 *
 * The rule this file exists to enforce is the one that is easiest to state and
 * hardest to keep: **a question is not a game.** "Who is the prophet in this
 * lesson?" is not a request for three buttons with a name on each — it is a
 * statement that the child should come away able to name him, and there are a
 * dozen ways to reach that. So nothing here ever turns a question into a
 * multiple-choice by default. What it does is read what the question is
 * *asking for*, and hand that to a mechanic that exercises the matching skill.
 *
 * The classification is deliberately shallow keyword work, not cleverness.
 * It has to be: this runs with no AI and no network, and a heuristic that is
 * honest about being a heuristic is worth more than one that guesses well
 * most of the time and silently mis-files the rest. Where it cannot tell, it
 * says `unsure` and the supervised step decides — the same posture the memory
 * verse gates take with a blurred word.
 */

import { GENERAL, byMechanic } from "./catalogue.mjs";
import { bandFor, suits } from "./bands.mjs";

const lower = (s) => String(s ?? "").toLowerCase().trim();

/**
 * What a curriculum question is actually asking for.
 *
 * `asks` is the shape of the answer, which is what decides the mechanic.
 * `skill` is what a child has to do to produce it, which is what the band
 * checks. They are different: "what did he do to purify the water?" asks for
 * a *process* and exercises *sequencing*, while "who is the prophet?" asks
 * for an *identity* and exercises *recall*.
 */
export function classify(question) {
  const q = lower(question);

  const has = (...words) => words.some((w) => q.includes(w));

  /*
    Anything beginning "who". It was a list of six openings and it missed
    "Who created everything?" — the question Beginner Chapter 6 turns on.
    A list of the ways a sentence can start asking about a person will
    always be one short; the word itself is the signal.
  */
  if (/^\s*\d*\.?\s*who\b/.test(q) || has("whom did", "who helped", "who told")) {
    return { asks: "identity", skill: "recall" };
  }

  /*
    Asking the child for their own answer.

    "Name two flowers you like" is not a question about the lesson at all —
    the curriculum names no flowers and has no opinion about which are the
    right two. Everything else in this table assumes an answer exists to be
    recalled; this is the one shape where the answer is the child's, and a
    multiple-choice would mark a five-year-old wrong for liking a different
    flower. Its only mechanic is `reveal`, which is the one built to have no
    wrong answer in it.

    Beginner Chapter 6 asks three of these in a row and is where the gap
    showed up.
  */
  if (
    /^\s*\d*\.?\s*name\b/.test(q) ||
    has("you like", "your favourite", "your favorite", "do you like")
  ) {
    return { asks: "personal", skill: "recognition" };
  }
  /*
    A blank to fill, which is a question wearing a statement's clothes.

    "The ark had __________ storeys." is question 3 of Beginner Chapter 8, and
    it has no question mark — so the statement rule below claimed it and
    offered `true-or-not`, which would have asked a child whether a sentence
    with a hole in it was Right or Wrong. That rule was written one chapter
    ago against a "Mark it as Right or Wrong" set; this is the first
    fill-in-the-blank the books have printed, and it is the one shape that
    looks like a statement and is not.

    The tell is the blank itself, and this library already writes one the same
    way everywhere it appears — a run of underscores, in Chapter 6's verse
    drill ("The ______ declare the glory of God;") and in Zacchaeus's
    ("For the Son of ______ came to seek and to save the lost."). What it
    wants back is the one word that goes in the hole, which is choosing, not
    weighing.
  */
  if (/_{2,}/.test(q)) {
    return { asks: "blank", skill: "recall" };
  }

  /*
    Not a question at all.

    "Mark it as Right or Wrong" prints statements, not questions, and the
    Samajam books carry that exercise alongside "Answer the Questions" in the
    same chapter. Manna keeps its five in the same numbered list as its five
    questions, so that one rule — every question is covered by a game —
    covers both halves of the exercise; Beginner Chapter 7 has four more.

    Everything below this line assumes it is reading a question, and on a
    statement it guesses. Beginner Chapter 7 showed how badly: "When Ahab was
    the king of Samaria, there was famine and drought." opens with the word
    "When", so the `time` rule claimed it and handed it a *sequence* — a
    confidently wrong answer, which this file exists to prevent, and worse
    than the `unsure` the other three fell through to. Manna's "When people
    grumbled, Moses prayed." would have gone the same way.

    The test is the question mark, and the library says it is safe: of the
    forty-one curriculum items written so far, thirty-three end in one and
    every single one of the other eight is either a Right/Wrong statement or
    a "Name two flowers you like" — and those are caught by the `personal`
    rule immediately above, which is why this sits here and not higher.

    `recall` rather than `understanding`, because holding a printed sentence
    against what the lesson said is remembering, and because `recall` is in
    every band from Beginner up — a statement set must not become unaskable
    for the six-year-olds whose book actually prints it.
  */
  if (!q.includes("?")) {
    return { asks: "statement", skill: "recall" };
  }

  /*
    Anywhere a question asks for a place.

    This used to sit near the bottom as a bare `has("where")`, which meant
    "To which place did the angel tell Joseph to go?" reached the generic
    "which" rule above it and came out `unsure` — the question was not even
    asking about a *thing*, it was asking about a place, and the word "place"
    is right there in it. It runs before the "which" rule now, because
    "which place" and "which city" are places first and sets second.
  */
  /*
    "In which pool did Jesus say to go and wash?" is Beginner Chapter 9's
    fifth question, and it fell past this rule to `saying` — because it
    contains "did Jesus say" and nothing here knew that a pool is a place.
    Naming the kinds of place the books actually ask about is narrower than a
    bare "in which", which would steal "in which year" from the `time` rule
    two blocks below.
  */
  if (
    has("where", "which place", "what place", "which city", "which town", "which country") ||
    /\bin which (pool|river|lake|sea|well|spring|town|city|village|land|country|house|garden|temple|mountain|place)\b/.test(q)
  ) {
    return { asks: "place", skill: "recall" };
  }

  /*
    "When did the family of Jesus come back to Nazareth?"

    A point in time, which nothing in this table could read. The lesson's
    answer is a relative one — after Herod died — so the mechanics that suit
    it are the ones that can hold two events and their order.
  */
  if (/^\s*\d*\.?\s*when\b/.test(q) || has("how long", "at what time", "in which year")) {
    return { asks: "time", skill: "sequencing" };
  }

  /*
    "Which tree did he climb?" names a thing out of a set, which is the same
    job as naming a person. Primary's Zacchaeus chapter is where this was
    missing: every one of its three questions fell through to `unsure`, and
    the planner did the honest thing and said so — and then gave two of the
    three a multiple-choice, which is the outcome this whole file exists to
    avoid. The flag was right; the table was short.
  */
  if (/^\s*which\b/.test(q) || has("which tree", "which of")) {
    return { asks: "identity", skill: "recall" };
  }
  /*
    "What was the name of the King who never obeyed God?" wants one word back.
    Asking for somebody's name is the plainest identity question there is, and
    it had no rule of its own — it was being caught by the attributes pattern
    above, which now steps aside for it.
  */
  if (has("the name of", "what is his name", "what is her name", "named")) {
    return { asks: "identity", skill: "recall" };
  }
  /*
    "What were the shortcomings of X?" asks for a list of things true about
    somebody — the same shape as "what are the properties of salt?", and the
    same mechanics suit it.
  */
  if (
    has("properties of", "for what purposes", "what is ... used") ||
    /*
      "of" is doing a lot of work in this pattern, and it over-reached.
      "What was the name of the King who never obeyed God?" is Beginner
      Chapter 7's second question, and it matched — a question whose answer
      is one word, Ahab, filed as a list of things true about somebody. The
      mechanic it landed on happened to be the one `identity` prefers anyway,
      so nothing shipped wrong; the label was still a confident wrong answer,
      and the label is what decides which questions share a game.

      Naming is identity, so naming is excluded here and falls through to the
      identity rules below.
    */
    (/what (were|are|was) the .*\bof\b/.test(q) && !has("the name of")) ||
    has("shortcomings", "qualities of")
  ) {
    return { asks: "attributes", skill: "understanding" };
  }
  if (/^\s*\d*\.?\s*what (was|were) .*(problem|wrong|the matter)/.test(q) || has("why did", "why were", "why was")) {
    return { asks: "cause", skill: "understanding" };
  }
  if (has("what happened to", "what happened when", "what happened")) {
    return { asks: "outcome", skill: "understanding" };
  }
  /*
    What somebody said back.

    "What was Jesus' reply when His parents asked Him?" has a quotation for
    an answer, and a quotation is the one answer shape that can be taken
    apart and put back together. It runs before the `what did` rule because
    "what did he say" would otherwise be read as a procedure.
  */
  /*
    Words somebody said — including the words of a question.

    Beginner Chapter 9 asks three of these in a row and two of them missed.
    "What did the disciples ask Jesus when they saw the blind man?" went to
    `scene`, because the perception rule below reads the word "saw" and this
    one did not know that asking is speech; the answer is the sentence the
    disciples spoke, not the sight they saw. "What was Jesus' answer to them?"
    reached no rule at all and came out `unsure` — "answered" was here, the
    noun "answer" was not.
  */
  if (
    has("reply", "replied", "answered", "answer to", "answer was",
        "did he say", "did she say", "did they say", "did jesus say") ||
    /what did .*\bask/.test(q)
  ) {
    return { asks: "saying", skill: "recall" };
  }

  /*
    What somebody saw is not what somebody did.

    `what did` was catching both, and "What did the parents see when they
    found Jesus?" came out `process` — which handed it a sequence and asked a
    child to put a single glimpse into order. The lesson's answer is one
    scene with several things in it at once: Jesus in the temple courts,
    sitting among the teachers, listening, asking questions. That is a list,
    and `reveal` is the mechanic for a list.
  */
  /*
    "do" decides it. "What did the woman do to find the lost coin?" is a
    procedure whose *purpose* is finding, and the perception rule below
    claimed it on the word "find" alone until this line went in front. Where
    the sentence says somebody did something, it is a process, whatever comes
    after.
  */
  if (/what did .*\bdo\b/.test(q)) {
    return { asks: "process", skill: "sequencing" };
  }
  if (/what did .*\b(see|saw|find|found|notice|hear|heard|observe)\b/.test(q)) {
    return { asks: "scene", skill: "understanding" };
  }
  if (has("what did", "how did", "what must", "what should")) {
    return { asks: "process", skill: "sequencing" };
  }
  /*
    "What gives us light in the day?" and "What else can we see in the sky at
    night?" ask a child to name a thing the lesson named — the same job as
    naming a person, and `identity` is where that already lives. These sit
    after the `what did` / `what happened` rules above so they cannot steal a
    process or an outcome question.
  */
  if (has("what gives", "what can we see", "what do we see", "what else")) {
    return { asks: "identity", skill: "recall" };
  }

  /*
    "How do we give thanks to creator God?" wants the ways, not the steps.
    `process` would have handed it a sequence and invented an order the
    lesson never gives; what it actually has is a handful of things that are
    all true at once, which is `reveal`'s shape.
  */
  if (has("how do we", "how can we", "how should we", "in what ways")) {
    return { asks: "ways", skill: "understanding" };
  }
  /*
    What a word means. Beginner Chapter 9 asks for the meaning of "Siloam",
    which is not a person, a place, a process or a list — it is a definition,
    and what it wants back is one word. Nothing in this table could read it.
  */
  if (has("the meaning of", "what does the word", "what is meant by")) {
    return { asks: "meaning", skill: "recall" };
  }
  if (has("how many", "how much")) return { asks: "quantity", skill: "recall" };
  if (has("what can we learn", "what do we learn")) {
    return { asks: "lesson", skill: "application" };
  }
  return { asks: "unsure", skill: "recall" };
}

/**
 * Which mechanics suit an answer of this shape, best first.
 *
 * A preference and not a rule — the band filters it, and variety reorders it.
 * `reveal` leads for a list-shaped answer and is absent for anything with one
 * right answer; `true-or-not` leads where an answer can be stated wrongly and
 * a child needs the reason more than the verdict.
 */
const PREFERENCE = {
  identity: ["match", "journey", "multiple-choice"],
  /*
    One mechanic, deliberately. Every other entry here offers alternatives
    because the question has an answer and more than one way of asking for
    it. A question whose answer is the child's own has exactly one honest
    treatment: a set of things to touch, none of them correct.
  */
  personal: ["reveal"],
  ways: ["reveal", "true-or-not", "multiple-choice"],
  time: ["sequence", "multiple-choice"],
  scene: ["reveal", "multiple-choice", "match"],
  /*
    `arrange-words` first, and only where a band allows it. Putting a
    remembered sentence back together is the closest this product comes to
    saying it out loud, and a quotation is the one answer that survives being
    cut into pieces. Nursery and Beginner forbid the mechanic, so their bands
    filter it out and the choice below takes over.
  */
  saying: ["arrange-words", "multiple-choice", "match"],
  attributes: ["reveal", "match", "multiple-choice"],
  cause: ["reveal", "multiple-choice", "true-or-not"],
  outcome: ["true-or-not", "multiple-choice", "reveal"],
  process: ["sequence", "reveal", "multiple-choice"],
  place: ["multiple-choice", "match"],
  quantity: ["multiple-choice"],
  lesson: ["true-or-not", "multiple-choice"],
  /*
    One mechanic and a fallback. A statement a child marks Right or Wrong is
    what `true-or-not` is; the fallback exists only for Nursery, which forbids
    it, and which no book has yet handed a Right/Wrong set to.
  */
  statement: ["true-or-not", "multiple-choice"],
  /*
    One word goes in the hole. `match` is the fallback only so that a band
    which somehow forbids multiple-choice still gets something that asks for
    a word rather than a verdict.
  */
  blank: ["multiple-choice", "match"],
  /*
    A definition wants one word back, the same as a blank does — so the same
    two mechanics, and for the same reason.
  */
  meaning: ["multiple-choice", "match"],
  unsure: ["multiple-choice"],
};

/** Mechanics that are, at bottom, "choose one of these" — capped per band. */
const CHOOSING = new Set(["multiple-choice", "journey"]);

/**
 * The plan for one chapter.
 *
 * Questions in, game assignments out. Nothing here writes a prompt or an
 * option — that is the supervised half, and it is the half that needs a
 * person who has read the lesson. What this decides is the *set*: how many
 * games, which mechanic each one uses, and which questions each one answers.
 *
 * @param {{ classId: string, questions: {n:number, question:string, objective?:string}[] }} input
 */
export function planFor({ classId, questions }) {
  const band = bandFor(classId);
  if (!band) return { error: `no band for the class "${classId}"` };
  if (!questions?.length) return { error: "the chapter records no curriculum questions" };

  const playable = GENERAL.filter((m) => suits(band, m));
  if (!playable.length) {
    return { error: `no mechanic in the catalogue suits the ${classId} band` };
  }

  /* ── 1. what each question is for ──────────────────────────────────── */
  const read = questions.map((q) => ({ ...q, ...classify(q.question) }));

  /* ── 2. group questions that want the same treatment ───────────────── */
  /*
    Two questions to a group, except for a Right/Wrong set.

    The cap of two is what stops a game becoming a grab-bag of whatever
    happened to share a shape. A printed "Mark it as Right or Wrong" exercise
    is the opposite of a grab-bag — it is one exercise, in one box, on one
    page — and `true-or-not` holds two to six statements by schema, which is
    the range those exercises come in. Split across two games it stops being
    the thing the book set: Beginner Chapter 7's four came out as two
    multiple-choices of two, and Manna's five would have made three games.
  */
  const roomIn = (g) => (g.asks[0] === "statement" ? 6 : 2);

  let groups = [];
  for (const q of read) {
    const mate = groups.find(
      (g) => g.asks[0] === q.asks && g.questions.length < roomIn(g) && q.asks !== "unsure",
    );
    if (mate) mate.questions.push(q);
    else groups.push({ asks: [q.asks], skill: q.skill, questions: [q] });
  }

  /*
    Fold the groups down to what the band actually wants.

    Six questions is six groups, and six games is right for Senior and wrong
    for Nursery, whose band asks for two or three. Without this step the
    planner handed a four-year-old five games and reached for `reveal` four
    times to fill them, which is the "Matching 1, Matching 2, Matching 3"
    failure wearing a different hat.

    Folding is not dropping. Two groups become one *game with two
    interactions* — the shape the chapter schema already supports and the one
    every hand-built chapter here uses — so every question is still answered
    and the coverage gate still passes. The smallest groups merge first, so
    what combines is what had least to say on its own.
  */
  const [, ceiling] = band.games;
  while (groups.length > ceiling) {
    groups.sort((a, b) => a.questions.length - b.questions.length);
    const [a, b] = groups;
    groups = [
      { asks: [...new Set([...a.asks, ...b.asks])], skill: a.skill, questions: [...a.questions, ...b.questions] },
      ...groups.slice(2),
    ];
  }
  groups.sort((a, b) => a.questions[0].n - b.questions[0].n);

  /* ── 3. a mechanic per strand, never the same one twice ────────────── */
  const used = new Map();
  let choosing = 0;
  const capped = Math.floor(ceiling * band.choosingShare);

  /*
    What the band is *for* outranks what the question shape suggests.

    The preference table below knows that an identity question suits
    `match`; it does not know that asking a sixteen-year-old to pair a name
    with a job is beneath them. So a mechanic is scored by how much it
    exercises the band's *top* skills — the last two it lists — and that
    score comes first. It is the difference between Senior games and
    Beginner games with longer words.
  */
  const deep = band.skills.slice(-2);
  const depth = (m) => -m.skills.filter((s) => deep.includes(s)).length;

  const pickFor = (asks) => {
    const wanted = PREFERENCE[asks] ?? PREFERENCE.unsure;
    const ranked = playable
      .filter((m) => wanted.includes(m.mechanic))
      .sort((a, b) => {
        const seen = (m) => (used.get(m.mechanic) ?? 0) * 10;
        return (
          depth(a) * 3 + seen(a) + wanted.indexOf(a.mechanic) -
          (depth(b) * 3 + seen(b) + wanted.indexOf(b.mechanic))
        );
      });

    const pick =
      ranked.find((m) => !(CHOOSING.has(m.mechanic) && choosing >= capped)) ??
      ranked[0] ??
      playable.slice().sort((a, b) => (used.get(a.mechanic) ?? 0) - (used.get(b.mechanic) ?? 0))[0];

    used.set(pick.mechanic, (used.get(pick.mechanic) ?? 0) + 1);
    if (CHOOSING.has(pick.mechanic)) choosing += 1;
    return pick;
  };

  const assignments = groups.map((group) => {
    /*
      One strand per kind of question the group holds, at most two — and
      never the same mechanic twice inside one game. A folded group whose
      two halves both land on `reveal` does not want two reveals; it wants
      one reveal with more in it, which is what dropping the duplicate
      leaves behind. Nursery, with only two mechanics in range, is where
      this showed up and it would have shipped "tap these / now tap these".
    */
    const strands = [];
    for (const asks of group.asks.slice(0, 2)) {
      const m = pickFor(asks);
      if (strands.some((st) => st.mechanic === m.mechanic)) continue;
      strands.push({ mechanic: m.mechanic, asks, shape: m.shape, art: m.art });
    }

    return {
      mechanics: strands.map((s) => s.mechanic),
      strands,
      asks: group.asks,
      skill: group.skill,
      answers: group.questions.map((q) => q.n),
      questions: group.questions.map((q) => q.question),
      objective: group.questions[0]?.objective ?? "",
    };
  });

  return {
    classId,
    band: { ages: band.ages, skills: band.skills, games: band.games, note: band.note },
    assignments,
    /*
      Said out loud rather than left for someone to notice. A chapter whose
      own central action has no mechanic — a prophet throwing salt into a
      spring — is not a chapter to be squeezed into `match`; it is a chapter
      that wants a scene built for it, the way Cana, the Lost Coin and Manna
      each did. The agent cannot write React, so it raises this and stops
      short of pretending otherwise.
    */
    bespokeSuggestion:
      assignments.length > 0
        ? "If this chapter has one physical action a child could perform — a thing poured, thrown, swept, gathered — consider a built scene for it, as `pouring`, `find-the-coin` and `provision` each are. The planner cannot choose one; a person builds it and names it in the chapter."
        : null,
    unsure: read.filter((q) => q.asks === "unsure").map((q) => q.n),
  };
}
