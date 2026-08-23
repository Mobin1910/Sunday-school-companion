import { existsSync } from "node:fs";
import { join } from "node:path";

import PicturePlaceholder from "./PicturePlaceholder";

/**
 * Renders a chapter illustration by name.
 *
 * Content never writes paths or file extensions — it writes "stephen-serving"
 * and this resolves it. That keeps position, format and filename out of the
 * chapter files, where they would be appearance masquerading as content.
 *
 * Resolution happens at build time, so a missing picture costs nothing at
 * runtime and simply becomes a placeholder.
 */

const EXTENSIONS = ["avif", "webp", "png", "jpg", "svg"] as const;

function resolve(chapter: string, name: string): string | null {
  for (const extension of EXTENSIONS) {
    const file = `${name}.${extension}`;
    if (existsSync(join(process.cwd(), "public", "art", chapter, file))) {
      return `/art/${chapter}/${file}`;
    }
  }
  return null;
}

type PictureProps = {
  chapter: string;
  name: string;
  /**
   * Only needed when a picture carries meaning that no nearby text conveys.
   * Story cards describe themselves through their own text, so this is
   * usually and correctly absent.
   */
  alt?: string;
};

export default function Picture({ chapter, name, alt }: PictureProps) {
  const src = resolve(chapter, name);

  if (!src) {
    return <PicturePlaceholder name={name} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export, images are pre-sized
    <img
      src={src}
      alt={alt ?? ""}
      className="aspect-4/3 w-full rounded-card object-cover"
    />
  );
}
