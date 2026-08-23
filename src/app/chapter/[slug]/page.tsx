import { notFound } from "next/navigation";

import CardScreen from "@/components/reader/CardScreen";
import ChapterReader from "@/components/reader/ChapterReader";
import { getChapters, type Card } from "@/content";

/**
 * A chapter, read cover to celebration.
 *
 * Activity and practice are not shown yet. A card that asks a child to put
 * the story in order, with no way to do it, is worse than no card at all — so
 * until Milestones 5 and 6 give them their interactions, they are simply not
 * part of the read. Every page a child reaches is a whole page.
 */
const READABLE = new Set<Card["kind"]>([
  "cover",
  "story",
  "quiz",
  "verse",
  "celebration",
]);

export function generateStaticParams() {
  return getChapters().map(({ slug }) => ({ slug }));
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getChapters().find((c) => c.slug === slug);

  if (!chapter) notFound();

  const pages = chapter.cards.filter((card) => READABLE.has(card.kind));

  return (
    <ChapterReader>
      {pages.map((card, index) => (
        <CardScreen key={index} card={card} title={chapter.title} />
      ))}
    </ChapterReader>
  );
}
