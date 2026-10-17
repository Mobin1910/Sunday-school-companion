#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * One Markdown page per chapter, for the people who draw the artwork.
 *
 *   npm run content:md
 *
 * A chapter's facts live in four places that are awkward to hold at once: the
 * printed pages in Drive, the chapter JSON, the games the chapter already has,
 * and the editorial notes recorded while it was built. Someone sitting down to
 * draw a panel needs all four, and until now the only way to get them was to
 * download four photographs and read the JSON.
 *
 * So this writes `docs/curriculum/<class>/chapter-NN.md` — the story beat by
 * beat, the Memory Verse, the lesson's own questions with the answers quoted
 * from the page, the decision, the song, the prayers, and every game with the
 * words a shelf card must never letter.
 *
 * **These files are generated. Never edit one by hand** — edit the chapter and
 * run this again. They are committed because the people who use them are not
 * always the people who can run a build, and a file in Drive beside the
 * photographs is worth more than a command nobody runs.
 *
 * Two honesty rules the output states for itself: the verse, questions,
 * decision, song and prayers are verbatim from the curriculum, and the story
 * is the app's child-facing telling rather than the printed lesson's prose.
 * Nothing here re-transcribes a page; it re-presents what was already read.
 */

const CLASS_DISPLAY = { nursery: "Nursery", beginner: "Beginner", primary: "Primary" };
const BOOK = {
  beginner: "Beginners Mar Thoma Vol-1",
  primary: "Primary Mar Thoma Vol-1",
};

/** The words a child is marked on — which a shelf card may never letter. */
function answersOf(i) {
  switch (i.type) {
    case "multiple-choice":
      return (i.options ?? []).filter((o) => o.correct).map((o) => o.label);
    case "journey":
      return (i.choices ?? []).filter((c) => c.correct).map((c) => c.label);
    case "sequence":
      return [...(i.items ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((s) => `${s.position}. ${s.label}`);
    case "match":
      return (i.pairs ?? []).map((p) => `${p.from.label} → ${p.to.label}`);
    case "reveal":
      return (i.items ?? []).map((x) => x.label);
    case "true-or-not":
      return (i.statements ?? []).map((s) => `${s.ask} — ${s.answer ? "yes" : "no"}`);
    case "show-the-way":
      return ["(the maze itself)"];
    default:
      return [];
  }
}

function render(d, classId, artCount) {
  const L = [];
  const cls = CLASS_DISPLAY[classId] ?? classId;
  const n = String(d.chapter).padStart(2, "0");

  L.push(`# ${cls} · Chapter ${n} — “${d.title}”\n`);
  L.push(`**Bible Portion:** ${d.reference ?? "—"}  `);
  L.push(`**Source:** ${BOOK[classId] ?? ""}, Chapter ${n}  `);
  L.push(
    `**Artwork:** ${artCount ? `drawn — ${artCount} files in the app` : "**not drawn yet**"}  `,
  );
  L.push(
    "**Format when it is drawn:** portrait **9:16, 941 × 1672 px** for every panel and the portrait cover; **1672 × 941** for the landscape cover.\n",
  );
  L.push("> Generated from the chapter content already approved in the app, which was transcribed from the");
  L.push("> curriculum photographs in Drive. The photographs remain the source of truth. The verse, the questions,");
  L.push("> the decision, the song and the prayers are **verbatim**; the story below is the child-facing telling the");
  L.push("> app ships, not the printed lesson's own prose.\n");
  L.push("---\n");

  L.push("## 1. The story, beat by beat\n");
  const drawn = d.story.some((c) => "alt" in c);
  L.push(
    drawn
      ? "*These describe panels that already exist — each says what is drawn and quotes what is lettered on it.*\n"
      : `*${d.story.length} beats, the cards the app shows today, in order. This is the narrative a panel sequence has to carry.*\n`,
  );
  d.story.forEach((c, i) => L.push(`${i + 1}. ${c.text ?? c.alt ?? ""}`));
  L.push("");

  if (d.verse) {
    L.push("## 2. Memory Verse\n");
    L.push(`> ${d.verse.text}\n`);
    L.push(`— **${d.verse.reference}**\n`);
    L.push(
      `**Never paraphrase this, and never reword it in artwork.** ${
        d.verse.translation === "PLACEHOLDER"
          ? "The translation is unresolved and recorded as PLACEHOLDER."
          : `Translation: ${d.verse.translation}.`
      }\n`,
    );
  }

  if (d.curriculum) {
    L.push("## 3. The lesson's own questions\n");
    L.push(`*${d.curriculum.source ?? ""}*\n`);
    for (const q of d.curriculum.questions) {
      L.push(`**${q.n}. ${q.question}**  `);
      L.push(`*What the child must take away:* ${q.objective ?? "—"}  `);
      if (q.answer) L.push(`*Answer, quoted from the lesson:* ${q.answer}`);
      L.push("");
    }
  }

  L.push("## 4. Decision, song and prayer\n");
  if (d.decision) L.push(`**My Decision** — ${d.decision.statement}\n`);
  if (d.song) {
    L.push("**Song**  ");
    for (const line of d.song.lines) L.push(`${line}  `);
    L.push("");
  }
  if (d.prayer) L.push(`**Prayer** — ${d.prayer.text}\n`);
  if (d.celebration) {
    L.push(`**The chapter's own turn, in one line** — “${d.celebration.message}”\n`);
  }

  if (d.games?.length) {
    L.push("## 5. The games this chapter already has\n");
    L.push("Artwork is reused as game cards, so this matters while you draw:\n");
    L.push("- a card may letter a **question**, never an **answer** a child is marked on;");
    L.push(
      "- the shelf crops each card to a **centre square** and prints the game's title across the bottom of it, so any lettering must survive that crop whole and sit clear of the title;",
    );
    L.push(
      "- the whole shelf is read before any game is played, so a picture that letters **any** game's answer is barred from **every** card.\n",
    );
    for (const g of d.games) {
      const mech = (g.interactions ?? []).map((i) => i.type).join(", ");
      L.push(`### “${g.title}” · \`${g.id}\` · ${mech}`);
      L.push(`*Objective:* ${g.objective ?? "—"}  `);
      L.push(`*Shelf picture:* ${g.picture ? `\`${g.picture}\`` : "**none yet**"}  `);
      L.push("*Must not be lettered on any card:*");
      for (const i of g.interactions ?? []) {
        for (const a of answersOf(i)) L.push(`  - ${a}`);
      }
      L.push("");
    }
  }

  if (d.curriculum) {
    L.push("## 6. What the artwork has to carry\n");
    for (const q of d.curriculum.questions) L.push(`- ${q.objective ?? "—"}`);
    L.push("");
    L.push("Everything else a panel does should serve one of those.\n");
  }

  if (d.note) {
    L.push("## 7. What the build recorded about this chapter\n");
    L.push(`${d.note.trim()}\n`);
  }

  if (!d.video) {
    L.push("---\n");
    L.push("*No video is attached to this chapter yet.*\n");
  }

  return `${L.join("\n").trimEnd()}\n`;
}

const root = process.cwd();
const outRoot = join(root, "docs", "curriculum");
let written = 0;

for (const classId of readdirSync(join(root, "content"), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)) {
  const dir = join(root, "content", classId);
  const files = readdirSync(dir).filter((f) => f.endsWith(".story.json")).sort();
  if (!files.length) continue;
  mkdirSync(join(outRoot, classId), { recursive: true });

  for (const f of files) {
    const d = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const slug = basename(f, ".story.json");
    let artCount = 0;
    try {
      artCount = readdirSync(join(root, "public", "art", classId, slug)).length;
    } catch {
      artCount = 0;
    }
    const n = String(d.chapter).padStart(2, "0");
    writeFileSync(join(outRoot, classId, `chapter-${n}.md`), render(d, classId, artCount));
    written += 1;
  }
}

console.log(`${written} chapter page(s) written to docs/curriculum`);
