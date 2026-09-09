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
 * Whether this is the page the child has actually turned to — as opposed to
 * the neighbour the reader keeps mounted so it can be revealed mid-drag —
 * is not passed through here. Only the cards that carry their own state and
 * timers need it, and they read it from the page directly; see
 * `PageContext`, and why props cannot make that journey.
 *
 * The bottom padding is the room the reader's own chrome occupies. That
 * chrome floats over the page rather than sitting under it, so that a cover
 * can run the full height of the screen; every other card keeps clear of it
 * here, in one place, instead of each kind remembering to.
 *
 * The last page is the exception in both directions: it carries two stacked
 * ways onward instead of one round button, so it needs more room, and the
 * cover needs none at all because it is the picture underneath everything.
 */
const ROOM_FOR_CHROME: Partial<Record<Card["kind"], string>> = {
  cover: "",
  celebration: "pb-48",
};

export default function CardScreen({
  card,
  title,
}: {
  card: Card;
  title: string;
}) {
  const room = ROOM_FOR_CHROME[card.kind] ?? "pb-32";

  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center gap-10 pt-4 ${room}`}
    >
      {render(card, title)}
    </div>
  );
}

function render(card: Card, title: string) {
  switch (card.kind) {
    case "cover":
      return <CoverCard art={card.art} title={title} />;

    case "story":
      return (
        <StoryCard
          art={card.art}
          {...(card.text !== undefined && { text: card.text })}
          {...(card.alt !== undefined && { alt: card.alt })}
          {...(card.interaction !== undefined && {
            interaction: card.interaction,
          })}
        />
      );

    case "quiz":
      return <QuizCard interaction={card.interaction} />;

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
