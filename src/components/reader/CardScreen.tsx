import type { Card } from "@/content";

import CelebrationCard from "./CelebrationCard";
import CoverCard from "./CoverCard";
import QuizCard from "./QuizCard";
import StoryCard from "./StoryCard";
import VerseCard from "./VerseCard";

/**
 * One full screen, whatever kind of card is on it.
 *
 * Every page of the chapter gets the same frame — the same height, the same
 * margins, the same centre — so that turning a page never moves the ground
 * under a child's feet. What changes inside is only ever the content.
 *
 * `active` says whether this is the page the child has actually turned to,
 * as opposed to the neighbour the page-turn reader keeps mounted so it can
 * be revealed mid-drag. Only kinds that carry their own state and timers
 * (currently quiz) need to know; everything else ignores it.
 */
export default function CardScreen({
  card,
  title,
  active = true,
}: {
  card: Card;
  title: string;
  active?: boolean;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-10 py-4">
      {render(card, title, active)}
    </div>
  );
}

function render(card: Card, title: string, active: boolean) {
  switch (card.kind) {
    case "cover":
      return <CoverCard art={card.art} title={title} />;

    case "story":
      return (
        <StoryCard
          art={card.art}
          {...(card.text !== undefined && { text: card.text })}
          {...(card.alt !== undefined && { alt: card.alt })}
        />
      );

    case "quiz":
      return <QuizCard interaction={card.interaction} active={active} />;

    case "verse":
      return <VerseCard text={card.text} reference={card.reference} />;

    case "celebration":
      return (
        <CelebrationCard
          {...(card.art !== undefined && { art: card.art })}
          message={card.message}
        />
      );

    // Activity and practice are not readable yet. Their interactions arrive
    // in Milestones 5 and 6, and until then the reader does not show them at
    // all — see READABLE in the chapter page.
    default:
      return null;
  }
}
