import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Turns a picture name into a URL, at build time.
 *
 * Content writes "stephen-serving" and never a path or an extension. This is
 * the only place that knows how those become files, so there is one list of
 * formats in the codebase rather than one per component.
 *
 * Resolution happens here, during the build, so that resolved artwork can be
 * handed to components that run in the browser — an interaction's options are
 * rendered on the client and cannot reach the filesystem themselves.
 */

const EXTENSIONS = ["avif", "webp", "png", "jpg", "svg"] as const;

const artDirectory = (slug: string) =>
  join(process.cwd(), "public", "art", slug);

export function resolvePicture(slug: string, name: string): string | null {
  for (const extension of EXTENSIONS) {
    const file = `${name}.${extension}`;
    if (existsSync(join(artDirectory(slug), file))) {
      return `/art/${slug}/${file}`;
    }
  }
  return null;
}

/** Every picture actually drawn for a chapter, used to spot orphans. */
export function drawnPictures(slug: string): string[] {
  const directory = artDirectory(slug);
  if (!existsSync(directory)) return [];

  return readdirSync(directory)
    .filter((file) => EXTENSIONS.some((ext) => file.endsWith(`.${ext}`)))
    .map((file) => file.slice(0, file.lastIndexOf(".")));
}
