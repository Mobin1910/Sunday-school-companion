import Link from "next/link";

import Picture from "@/components/Picture";
import type { Card } from "@/content";

/**
 * One chapter on the shelf.
 *
 * The picture is the label. A six-year-old who cannot yet read the title
 * should still be able to find the story they were told on Sunday, so the
 * cover is given the room and the words sit under it.
 *
 * It leads to the chapter's Hub, never straight into the story — every
 * chapter begins by showing what is inside it.
 */
export default function ChapterCard({
  slug,
  title,
  reference,
  cover,
}: {
  slug: string;
  title: string;
  reference: string;
  cover: Extract<Card, { kind: "cover" }> | undefined;
}) {
  return (
    <Link
      href={`/chapter/${slug}`}
      className="surface flex flex-col gap-3 p-3"
    >
      {cover ? (
        <Picture art={cover.art} alt={title} />
      ) : (
        <div className="aspect-4/3 w-full rounded-card bg-ground" aria-hidden />
      )}

      <div className="px-1 pb-1">
        <h2 className="text-2xl leading-snug text-balance">{title}</h2>
        <p className="mt-0.5 text-sm text-ink-soft">{reference}</p>
      </div>
    </Link>
  );
}
