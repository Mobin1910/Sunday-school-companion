import { config, requireGeminiKey } from "../config.mjs";

/**
 * The one external AI provider, kept behind one door.
 *
 * Everything the rest of the pipeline knows about Gemini is this file's
 * exported shape: give it some files and a prompt, get back parsed JSON. No
 * other module imports a Gemini URL, a Gemini model name or a Gemini error
 * code. Swapping provider — if a free tier ever disappears — is rewriting
 * this file and nothing else.
 *
 * **Free tier only.** Nothing here enables billing, and nothing here retries
 * its way through a quota wall. The free tier is a real, small budget: a
 * handful of requests a minute and a few hundred a day. The agent is built so
 * that one chapter costs *one* request — the curriculum is read once and the
 * seven class variants are generated locally from the result — and so that a
 * successful read is cached and never paid for twice.
 *
 * When the quota is gone, `QuotaExhausted` is thrown and the run stops with
 * its state saved. It does not fall back to another provider, it does not ask
 * for a card, and it does not sit in a retry loop burning the next day's
 * allowance the moment the clock rolls over.
 */

export class QuotaExhausted extends Error {
  constructor(message, retryAfterSeconds) {
    super(message);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ProviderError extends Error {}

/** What a source file has to look like to be sent. */
export const SUPPORTED = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".pdf", "application/pdf"],
]);

export function mimeFor(name) {
  const at = String(name).lastIndexOf(".");
  return at === -1 ? undefined : SUPPORTED.get(name.slice(at).toLowerCase());
}

/** Seconds Google asked us to wait, when it said. */
function retryDelay(body) {
  const details = body?.error?.details ?? [];
  for (const detail of details) {
    if (typeof detail?.retryDelay === "string") {
      const seconds = Number.parseFloat(detail.retryDelay);
      if (Number.isFinite(seconds)) return seconds;
    }
  }
  return undefined;
}

export const GeminiProvider = {
  get model() {
    return config.gemini.model;
  },

  /**
   * Ask once, about some documents.
   *
   * @param {{ prompt: string, files: {name: string, mimeType: string, bytes: Buffer}[], schema?: object }} request
   * @returns {Promise<{ json: any, raw: string, model: string }>}
   */
  async read({ prompt, files, schema }) {
    const key = requireGeminiKey();
    const model = config.gemini.model;

    const parts = [
      { text: prompt },
      ...files.map((file) => ({
        inline_data: { mime_type: file.mimeType, data: file.bytes.toString("base64") },
      })),
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            // Extraction, not writing. The same pages must give the same verse
            // every time, or provenance means nothing.
            temperature: 0,
            responseMimeType: "application/json",
            ...(schema ? { responseSchema: schema } : {}),
          },
        }),
      },
    );

    if (response.status === 429) {
      const body = await response.json().catch(() => ({}));
      throw new QuotaExhausted(
        "Gemini free-tier quota is exhausted for now.",
        retryDelay(body),
      );
    }

    if (response.status === 404) {
      throw new ProviderError(
        `Gemini has no model called "${model}" for this key.\n` +
          "  Set GEMINI_MODEL in .env.local to one your account can use.",
      );
    }

    if (!response.ok) {
      throw new ProviderError(
        `Gemini request failed (${response.status}): ${await response.text()}`,
      );
    }

    const body = await response.json();

    /*
      A response that was cut off is not a short answer, it is half an answer.
      Treating it as data is how a truncated verse gets published.
    */
    const candidate = body.candidates?.[0];
    const finish = candidate?.finishReason;
    if (finish && finish !== "STOP") {
      throw new ProviderError(`Gemini stopped early (${finish}); nothing was extracted.`);
    }

    const raw = (candidate?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    if (raw === "") throw new ProviderError("Gemini returned nothing.");

    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new ProviderError(`Gemini did not return JSON:\n${raw.slice(0, 400)}`);
    }

    return { json, raw, model };
  },
};
