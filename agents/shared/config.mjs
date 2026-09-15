import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Everything the agents read from the environment, and nowhere else.
 *
 * Secrets live in `.env.local`, which is git-ignored, is never read by the
 * app, and is never bundled: the child-facing PWA is a static export that
 * makes no request to anything but its own assets, and no key in this file is
 * reachable from it. Content production is a thing a developer runs on a
 * laptop; it is not a feature of the product.
 *
 * `.env.local` is parsed here rather than with a dependency, because it is
 * twenty lines and a dependency that reads secrets is a dependency worth not
 * having.
 */

const ROOT = process.cwd();

function loadEnvFile(file) {
  if (!existsSync(file)) return;

  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const at = trimmed.indexOf("=");
    if (at === -1) continue;

    const key = trimmed.slice(0, at).trim();
    let value = trimmed.slice(at + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // A real environment variable always wins over the file.
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(join(ROOT, ".env.local"));

export const config = {
  /*
    Optional, and not used by the Memory Verse agent.

    Extraction is done by Claude looking at the pages — see agents/README.md.
    This block stays because the provider behind it is cleanly isolated and
    worth keeping for a future unattended pipeline, but nothing on the live
    path reads it and no run requires a key.
  */
  gemini: {
    key: process.env.GEMINI_API_KEY ?? "",
    /*
      Configurable, and deliberately not pinned to a model name in code. Free
      tier model names change; a hard-coded one becomes a 404 on somebody
      else's laptop six months from now. The default is the current free-tier
      workhorse and is meant to be overridden.
    */
    model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
  },
  google: {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
    refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN ?? "",
  },
  /** The library root in Drive. Found by name when not given. */
  driveRoot: process.env.DRIVE_LIBRARY_ROOT_ID ?? "",
  /*
    The editorial Sheet, where teachers type the verse as well as uploading
    the pages. Optional: without it a run still works, and says in the draft
    that the verse was confirmed by nobody but the page.
  */
  sheetId: process.env.SSC_SHEET_ID ?? "",
  paths: {
    root: ROOT,
    state: join(ROOT, "agents", ".state"),
    /*
      Curriculum pages, downloaded so that they can be looked at. Under
      `.state/` and therefore git-ignored: these are photographs of a
      teacher's book and they belong in neither the repository nor the app.
    */
    pages: join(ROOT, "agents", ".state", "pages"),
    drafts: join(ROOT, "agents", ".drafts"),
  },
};

/**
 * A credential that is missing rather than wrong.
 *
 * Its own type because it is the likeliest thing to go wrong on a machine
 * that has never run this before, and "you have not set the key yet" is not
 * a crash — it is a step of the setup. A stack trace for it would tell a
 * first-time reader that the tool is broken when in fact they are two lines
 * of `.env.local` away from it working.
 */
export class ConfigError extends Error {}

export function requireGeminiKey() {
  if (!config.gemini.key) {
    throw new ConfigError(
      "GEMINI_API_KEY is not set.\n" +
        "  Put it in .env.local (git-ignored):\n" +
        "    GEMINI_API_KEY=...\n" +
        "  Get a free-tier key at https://aistudio.google.com/apikey\n" +
        "  Create it in a project with no billing account attached — see agents/README.md.",
    );
  }
  return config.gemini.key;
}
