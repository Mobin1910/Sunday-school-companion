import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { isClassId, type ClassId } from "@/classes/registry";

import { resolveAsset } from "./art";
import { toCards, type Card } from "./cards";
import { chapterKey } from "./key";
import { chapterSchema, librarySchema } from "./schema";

/**
 * Reads chapter files from disk at build time.
 *
 * Nothing here names a chapter or a class. Adding
 * `content/primary/noah.story.json` makes it load, with no import to add and
 * no registry to edit — that is the acceptance test this whole layer exists
 * to keep true, and it is what lets seven classes of twenty chapters arrive
 * without a code change.
 *
 * A chapter's identity is its class and its slug together. `Chapter 01`
 * exists in all seven classes and they are seven different lessons, so
 * nothing downstream may key on a slug alone — and because a slug is only
 * unique within its class, two classes may both have `wedding-at-cana` and
 * mean genuinely different chapters.
 */

const CONTENT_DIR = join(process.cwd(), "content");
const SUFFIX = ".story.json";

export type LoadedChapter = {
  /** The class this chapter belongs to. Half of its identity. */
  classId: ClassId;
  slug: string;
  file: string;
  /** Which chapter this is within its class. Authored, never positional. */
  chapter: number;
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


/**
 * Every class directory that actually exists under `content/`.
 *
 * Read from the filesystem rather than from `classes.json`, so a class with
 * no folder simply has no chapters — which is the ordinary state of six of
 * the seven right now and must not be an error. `classes.json` says which
 * classes the product *has*; this says which have anything written.
 */
function classDirectories(): ClassId[] {
  return readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "brief")
    .map((entry) => {
      /*
        A folder that is not one of the seven classes. Almost always a typo
        — `content/beginners/` rather than `content/beginner/` — and the
        symptom without this check is a whole class of chapters that load
        cleanly, build cleanly and are reachable by nobody, because no
        child can ever be in a class that does not exist.
      */
      if (!isClassId(entry.name)) {
        throw new ContentError(
          `  content/${entry.name}/\n    is not one of the classes in content/classes.json`,
        );
      }
      return entry.name;
    })
    .sort();
}

export function loadChapters(): LoadedChapter[] {
  const shipping = new Set(readLibrary());

  const chapters = classDirectories().flatMap((classId) => {
    const directory = join(CONTENT_DIR, classId);

    return readdirSync(directory)
      .filter((name) => name.endsWith(SUFFIX))
      .map((name) => {
        const slug = name.slice(0, -SUFFIX.length);
        const file = `content/${classId}/${name}`;

        const parsed = chapterSchema.safeParse(
          JSON.parse(readFileSync(join(directory, name), "utf8")),
        );

        if (!parsed.success) {
          throw new ContentError(describe(file, parsed.error));
        }

        /*
          The folder and the file have to agree about the class. They are
          two statements of one fact, and a file dropped into the wrong
          folder is the way a Primary lesson silently becomes a Beginner
          one — which is exactly the mix-up the whole class architecture
          exists to prevent, so it stops the build.
        */
        if (parsed.data.class !== classId) {
          throw new ContentError(
            `  ${file}\n    is in content/${classId}/ but declares class "${parsed.data.class}"`,
          );
        }

        return {
          classId,
          slug,
          file,
          chapter: parsed.data.chapter,
          title: parsed.data.title,
          reference: parsed.data.reference,
          cards: toCards(parsed.data, (ref) =>
            resolveAsset(classId, slug, ref),
          ),
          shipping: shipping.has(chapterKey(classId, slug)),
        };
      });
  });

  /*
    Two chapters of one class cannot be the same chapter.

    Checked here because this is the only place every chapter of a class is
    visible at once — a file on its own cannot know that another file claims
    its number. Without it the shelf would simply show the collision twice
    and let a teacher work out which Sunday was which.
  */
  const seen = new Map<string, string>();
  for (const chapter of chapters) {
    const key = `${chapter.classId}/${chapter.chapter}`;
    const already = seen.get(key);
    if (already) {
      throw new ContentError(
        `  ${chapter.file}\n    is chapter ${chapter.chapter} of ${chapter.classId}, and so is ${already}`,
      );
    }
    seen.set(key, chapter.file);
  }

  /*
    Ordered by the number the lesson states, so the shelf and the curriculum
    agree. This used to be the order `readdirSync` happened to return after
    sorting filenames, which is how The Lost Coin arrived between Baby Jesus
    and the Wedding at Cana and pushed Cana's number up by one.
  */
  chapters.sort((a, b) =>
    a.classId === b.classId
      ? a.chapter - b.chapter
      : a.classId.localeCompare(b.classId),
  );

  const known = new Set(chapters.map((c) => chapterKey(c.classId, c.slug)));
  for (const key of shipping) {
    if (!known.has(key)) {
      throw new ContentError(
        `  content/library.json → chapters\n    "${key}" is listed but there is no content/${key}${SUFFIX}`,
      );
    }
  }

  return chapters;
}
