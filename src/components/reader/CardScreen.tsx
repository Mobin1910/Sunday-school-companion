import type { Card } from "@/content";

import CelebrationCard from "./CelebrationCard";
import CoverCard from "./CoverCard";
import StoryCard from "./StoryCard";
import VerseCard from "./VerseCard";

/**
 * One full screen, whatever kind of card is on it.
 *
 * Every page of the chapter gets the same frame — the same height, the same
 * margins, the same centre — so that turning a page never moves the ground
 * under a child's feet. What changes inside is only ever the content.
 */
export default function CardScreen({
  card,
  slug,
  title,
}: {
  card: Card;
  slug: string;
  title: string;
}) {
  return (
    <div className="flex h-full w-full shrink-0 snap-center snap-always flex-col items-center justify-center gap-10 px-6">
      {render(card, slug, title)}
    </div>
  );
}

function render(card: Card, slug: string, title: string) {
  switch (card.kind) {
    case "cover":
      return <CoverCard slug={slug} picture={card.picture} title={title} />;

    case "story":
      return (
        <StoryCard
          slug={slug}
          picture={card.picture}
          {...(card.text !== undefined && { text: card.text })}
          {...(card.alt !== undefined && { alt: card.alt })}
        />
      );

    case "verse":
      return <VerseCard text={card.text} reference={card.reference} />;

    case "celebration":
      return (
        <CelebrationCard
          slug={slug}
          {...(card.picture !== undefined && { picture: card.picture })}
          message={card.message}
        />
      );

    // Interaction cards are not readable yet. They arrive with their
    // interactions in Milestones 4 to 6, and until then the reader does not
    // show them at all — see isReadable in the chapter page.
    default:
      return null;
  }
}
