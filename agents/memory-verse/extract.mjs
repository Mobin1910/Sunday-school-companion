import { GeminiProvider } from "../shared/providers/gemini.mjs";

/**
 * Reading the teacher's curriculum with Gemini. NOT CURRENTLY USED.
 *
 * The agent does not call this and no run requires GEMINI_API_KEY. Curriculum
 * is read by Claude looking at the downloaded pages — a supervised step,
 * described in agents/README.md. This module is kept, unreferenced and
 * working, as the obvious starting point if an unattended pipeline is ever
 * wanted.
 *
 * What is worth keeping is the prompt. It is the distilled version of a lesson
 * worth not relearning: exactly what has to be forbidden, in writing, before a
 * model will transcribe instead of improve. The reasoning behind it outlived
 * the provider and now governs the supervised step too —
 *
 * A reader asked to *transcribe* can be held to the source; a reader asked to
 * *write* cannot. Scripture is the one kind of content where a plausible
 * paraphrase is worse than no output: a child who learns a verse slightly
 * wrong has learned it wrong for years, and nobody notices, because it reads
 * fine. So improvement is forbidden in every form it can take, and whatever
 * comes back is treated as a claim to be checked rather than an answer to be
 * used. When the reader is unsure, when the page has two candidate verses,
 * when the photograph is half-legible — the run stops and a human is asked.
 * Guessing is the one outcome that is never acceptable.
 *
 * The gates that enforce all of that moved to gates.mjs, so that applying them
 * costs nobody an AI import.
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

/*
  The gates live in gates.mjs, which imports no provider. Re-exported here
  so that anything still reaching for them through this module keeps working,
  and so that there is exactly one copy of them.
*/
export { judge } from "./gates.mjs";

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
