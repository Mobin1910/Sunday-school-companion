import { GeminiProvider } from "../shared/providers/gemini.mjs";

/**
 * Reading the teacher's curriculum, and knowing when not to.
 *
 * This is the only place in the whole pipeline where an AI model is asked
 * anything, and it is asked exactly one question: *what does this page say the
 * memory verse is?* It is not asked to design a game, phrase a hint, pick a
 * difficulty or write anything at all. Everything a child eventually touches is
 * built from the answer by code that cannot improvise.
 *
 * The reason is not only cost, though one request per chapter instead of seven
 * is most of what keeps this inside a free tier. It is that a model asked to
 * *transcribe* can be held to the source, and a model asked to *write* cannot.
 * Scripture is the one kind of content where a plausible paraphrase is worse
 * than no output: a child who learns a verse slightly wrong has learned it
 * wrong for years, and nobody will notice because it reads fine.
 *
 * So the prompt forbids improvement in every form it can take, and the result
 * is treated as a claim to be checked rather than an answer to be used. When
 * the model is unsure, or the page has two candidate verses, or the photograph
 * is half-legible, the run stops and a human is asked. Guessing is the one
 * outcome that is never acceptable.
 */

export const EXTRACTION_PROMPT = `You are extracting curriculum data from Sunday School teaching material.

The pages supplied are photographs or scans of printed curriculum for one chapter.

TASK
Find the Memory Verse and its Bible reference.

RULES
- Return only information supported by the supplied pages.
- Preserve the exact wording of the verse as printed, character for character.
- Preserve the Bible reference exactly as printed, including any abbreviation
  or honorific such as "St".
- Do NOT paraphrase, shorten, modernise, correct, re-punctuate or complete the
  verse.
- Do NOT substitute a different Bible translation, even if you recognise the
  verse and believe another wording is more standard.
- Do NOT supply a verse from memory. If the pages do not show one, say so.
- If the verse or reference is unclear, ambiguous, partially unreadable, or
  there is more than one plausible candidate, report that instead of choosing.

CONFIDENCE
- "high"   the verse and reference are printed plainly and legibly.
- "medium" legible but something is uncertain — a word is blurred, the
           reference is cropped, the label is unusual.
- "low"    you are inferring, guessing, or the page is largely unreadable.

Set reviewRequired to true, and give reviewReason, whenever confidence is not
"high", whenever more than one candidate verse appears, and whenever any part
of the verse or reference is unreadable.

Name the file or files the verse was read from in sourceFiles, using the
filenames given to you.

Return JSON only.`;

/** The shape Gemini is asked to return. Enforced server-side by responseSchema. */
export const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    memoryVerse: {
      type: "object",
      properties: {
        text: { type: "string" },
        reference: { type: "string" },
      },
      required: ["text", "reference"],
    },
    sourceFiles: { type: "array", items: { type: "string" } },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    reviewRequired: { type: "boolean" },
    reviewReason: { type: "string" },
    candidates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          reference: { type: "string" },
          where: { type: "string" },
        },
        required: ["text"],
      },
    },
  },
  required: ["memoryVerse", "confidence", "reviewRequired"],
};

const tidy = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/**
 * Whether what came back can be used without a human.
 *
 * Four gates, and a claim has to pass all of them. Three are the model's own
 * report — it said it was unsure, it said review was needed, it offered more
 * than one candidate — and the fourth is ours: a verse that is one word long,
 * or a reference with no digits in it, is not a verse and not a reference
 * whatever the model says about its confidence. The model is allowed to be
 * wrong about being right.
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

/**
 * One request, one chapter.
 *
 * @param {{name: string, mimeType: string, bytes: Buffer}[]} files
 */
export async function extractVerse(files) {
  const named = files.map((file) => ({
    ...file,
    bytes: file.bytes,
  }));

  const prompt =
    `${EXTRACTION_PROMPT}\n\nThe pages, in order, are: ` +
    named.map((f) => f.name).join(", ");

  const { json, model } = await GeminiProvider.read({
    prompt,
    files: named,
    schema: EXTRACTION_SCHEMA,
  });

  return { result: json, model, at: new Date().toISOString() };
}
