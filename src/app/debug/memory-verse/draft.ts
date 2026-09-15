import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The newest thing the agent has produced, if it has produced anything.
 *
 * The preview's whole job is to let a person judge a ladder before it becomes
 * content, which means the ladder most worth showing is usually the one that
 * does not exist in `content/` yet. Reading the drafts directory is what makes
 * "the agent just ran, go and look at it" a real instruction instead of a
 * round trip through hand-copied JSON.
 *
 * Build-time only, and forgiving of every absence. `agents/.drafts/` is
 * git-ignored, so on a clean checkout, in CI, and in the production build it
 * simply is not there — and a preview page that crashed the build because
 * nobody had run the agent would be a preview page that had made itself the
 * product's problem. Every failure here returns undefined and the caller falls
 * back to the content library.
 */

export type DraftVerse = {
  text: string;
  reference: string;
  /** Where it came from, for the heading. */
  from: string;
  /** Why a reviewer should look harder than usual, if there is a reason. */
  caveats: string[];
  reviewRequired: boolean;
};

const DRAFTS = join(process.cwd(), "agents", ".drafts");

/** Every `memory-verse-draft-*.json` under `agents/.drafts/`, newest first. */
function draftFiles(): string[] {
  if (!existsSync(DRAFTS)) return [];

  const found: { path: string; at: number }[] = [];

  const walk = (dir: string, depth: number) => {
    if (depth > 3) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const path = join(dir, name);
      let stat;
      try {
        stat = statSync(path);
      } catch {
        continue;
      }
      if (stat.isDirectory()) walk(path, depth + 1);
      else if (name.startsWith("memory-verse-draft-") && name.endsWith(".json")) {
        found.push({ path, at: stat.mtimeMs });
      }
    }
  };

  walk(DRAFTS, 0);
  return found.sort((a, b) => b.at - a.at).map((f) => f.path);
}

export function newestDraft(): DraftVerse | undefined {
  for (const path of draftFiles()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      continue;
    }

    // Hand-checked rather than schema-parsed: this is a dev affordance reading
    // a file it does not own, and the cost of a malformed one is skipping it.
    const draft = parsed as {
      verse?: { text?: unknown; reference?: unknown };
      provenance?: {
        class?: { display?: unknown };
        chapter?: unknown;
        caveats?: unknown;
        review?: { required?: unknown };
      };
    };

    const text = draft.verse?.text;
    const reference = draft.verse?.reference;
    if (typeof text !== "string" || typeof reference !== "string") continue;
    if (text.trim() === "") continue;

    const display = draft.provenance?.class?.display;
    const chapter = draft.provenance?.chapter;

    return {
      text,
      reference,
      from:
        typeof display === "string" && typeof chapter === "string"
          ? `${display} / Chapter ${chapter} (agent draft)`
          : "agent draft",
      caveats: Array.isArray(draft.provenance?.caveats)
        ? draft.provenance.caveats.filter((c): c is string => typeof c === "string")
        : [],
      reviewRequired: draft.provenance?.review?.required === true,
    };
  }

  return undefined;
}
