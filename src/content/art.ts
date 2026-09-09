import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { AssetReference } from "./schema";

/**
 * Turns a picture reference into a URL, at build time.
 *
 * Content writes a name, never a path or an extension. This is the only
 * place that knows how those become files, so there is one list of formats
 * in the codebase rather than one per component.
 *
 * Resolution happens here, during the build, so that resolved artwork can be
 * handed to components that run in the browser — an interaction's options are
 * rendered on the client and cannot reach the filesystem themselves.
 *
 * A chapter's artwork lives in two places and the split is deliberate:
 *
 *   public/art/<chapter>/            the story. Panels, the cover, anything
 *                                    the chapter itself is made of.
 *   public/art/<chapter>/games/      artwork drawn for one game, under a
 *                                    folder named for that game.
 *
 * Which one a reference means is stated in the reference, not guessed from
 * the name — so a game may point at a story panel and reuse it, and nothing
 * has to be copied for it to do so.
 */

const EXTENSIONS = ["avif", "webp", "png", "jpg", "svg"] as const;

const GAMES_DIR = "games";

const artDirectory = (slug: string) =>
  join(process.cwd(), "public", "art", slug);

/**
 * A reference as one readable string.
 *
 * This is what a missing-picture warning prints and what the orphan check
 * compares against, so it has to round-trip: `panel-08` for the story, and
 * `games/what-happened-first/step-01` for a game's own artwork.
 */
export function assetName(ref: AssetReference): string {
  return ref.source === "story" ? ref.panelId : `${GAMES_DIR}/${ref.path}`;
}

export function resolveAsset(slug: string, ref: AssetReference): string | null {
  const name = assetName(ref);

  for (const extension of EXTENSIONS) {
    const file = `${name}.${extension}`;
    if (existsSync(join(artDirectory(slug), file))) {
      return `/art/${slug}/${file}`;
    }
  }
  return null;
}

/**
 * Every picture actually drawn for a chapter, used to spot orphans.
 *
 * Walks into the games folder as well, and names what it finds there the way
 * a reference would, so that a game asset nothing points at is reported the
 * same way an unused panel is.
 */
export function drawnPictures(slug: string): string[] {
  const root = artDirectory(slug);
  if (!existsSync(root)) return [];

  const pictures = (directory: string, prefix: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const here = `${prefix}${entry.name}`;

      if (entry.isDirectory()) {
        return pictures(join(directory, entry.name), `${here}/`);
      }

      return EXTENSIONS.some((ext) => entry.name.endsWith(`.${ext}`))
        ? [here.slice(0, here.lastIndexOf("."))]
        : [];
    });

  return pictures(root, "");
}
