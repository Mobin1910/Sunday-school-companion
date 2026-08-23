import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { toCards, type Card } from "./cards";
import { chapterSchema, librarySchema } from "./schema";

/**
 * Reads chapter files from disk at build time.
 *
 * Nothing here names a chapter. Adding `noah.story.json` to content/ makes it
 * load, with no import to add and no registry to edit — that is the acceptance
 * test this whole layer exists to keep true.
 */

const CONTENT_DIR = join(process.cwd(), "content");
const SUFFIX = ".story.json";

export type LoadedChapter = {
  slug: string;
  file: string;
  title: string;
  reference: string;
  cards: Card[];
  /** Listed in library.json — meaning it ships, and is held to stricter checks. */
  shipping: boolean;
};

export class ContentError extends Error {}

function describe(file: string, error: unknown): string {
  if (!(error instanceof Error) || !("issues" in error)) {
    return `${file}: ${String(error)}`;
  }

  const issues = (error as { issues: { path: PropertyKey[]; message: string }[] })
    .issues;

  return issues
    .map((issue) => {
      const where = issue.path.length ? issue.path.join(".") : "(root)";
      return `  ${file} → ${where}\n    ${issue.message}`;
    })
    .join("\n");
}

function readLibrary(): string[] {
  const file = join(CONTENT_DIR, "library.json");
  if (!existsSync(file)) return [];

  const parsed = librarySchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    throw new ContentError(describe("content/library.json", parsed.error));
  }
  return parsed.data.chapters;
}

export function loadChapters(): LoadedChapter[] {
  const shipping = new Set(readLibrary());

  const files = readdirSync(CONTENT_DIR)
    .filter((name) => name.endsWith(SUFFIX))
    .sort();

  const chapters = files.map((name) => {
    const slug = name.slice(0, -SUFFIX.length);
    const file = `content/${name}`;

    const parsed = chapterSchema.safeParse(
      JSON.parse(readFileSync(join(CONTENT_DIR, name), "utf8")),
    );

    if (!parsed.success) {
      throw new ContentError(describe(file, parsed.error));
    }

    return {
      slug,
      file,
      title: parsed.data.title,
      reference: parsed.data.reference,
      cards: toCards(parsed.data),
      shipping: shipping.has(slug),
    };
  });

  const known = new Set(chapters.map((c) => c.slug));
  for (const slug of shipping) {
    if (!known.has(slug)) {
      throw new ContentError(
        `  content/library.json → chapters\n    "${slug}" is listed but there is no ${slug}${SUFFIX}`,
      );
    }
  }

  return chapters;
}
