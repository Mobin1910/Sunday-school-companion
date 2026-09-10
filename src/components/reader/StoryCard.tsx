import Picture from "@/components/Picture";
import type { Art, PlayInteraction } from "@/content";

import QuizCard from "./QuizCard";

/**
 * A page of the story, in one of two forms.
 *
 * **A finished comic** — a panel whose speech, narration and composition are
 * painted into the artwork itself. It has no `text`, because there is nothing
 * left for the interface to say, so it takes the whole page exactly as the
 * cover does: edge to edge, filling the screen, with the scrim landing the
 * bottom of it on the ground colour so the reader's own chrome stays legible
 * over it. Laying a caption under a panel that already contains its dialogue
 * would say the same thing twice, in two typefaces.
 *
 * Filling the screen means cropping, and that is the accepted trade: a phone
 * is taller in proportion than the artwork, so roughly nine percent comes off
 * each side at 390x844. Immersion was judged worth it. What it asks of the
 * artwork is a habit rather than a rule — keep anything that must survive,
 * speech bubbles above all, inside the central 82% horizontally.
 *
 * **A picture with words under it** — the older form, and still the right one
 * for a panel that has not been drawn as a comic. The illustration takes the
 * room and the text sits quietly beneath it with air around it.
 *
 * Which one a card is, is decided by the card: `text` present or absent, and
 * whether it carries a question. That is not a flag anyone sets — the schema
 * already requires a picture with no text to carry `alt`, precisely because
 * such a picture cannot describe itself, and a comic is the case that rule
 * was waiting for.
 */
export default function StoryCard({
  art,
  text,
  alt,
  interaction,
}: {
  art: Art;
  text?: string;
  alt?: string;
  interaction?: PlayInteraction;
}) {
  /*
    **A panel that stops and asks.** The story pauses on the picture it is
    asking about and the question is laid over it, so a child answers while
    still looking at the moment rather than after leaving it.

    The picture dims while the question is up. That is not decoration: the
    choices have to be readable over whatever happens to be painted behind
    them, and dimming says plainly that the story is waiting. It brightens
    again for nobody — the child turns the page, as they do everywhere else.
  */
  if (interaction) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <Picture
          art={art}
          {...(alt ? { alt } : {})}
          className="question-backdrop size-full object-cover"
        />
        <div className="question-veil absolute inset-0" aria-hidden />
        <div className="cover-scrim absolute inset-0" aria-hidden />

        {/* The same card the end-of-chapter question uses, so a question
            behaves identically wherever a child meets one. It is also what
            keeps this file a server component: the player needs a handler,
            and QuizCard is the one that owns it. */}
        <div className="absolute inset-x-0 top-0 bottom-24 flex items-center justify-center overflow-y-auto py-4">
          <QuizCard interaction={interaction} />
        </div>
      </div>
    );
  }

  if (text === undefined) {
    return (
      /*
        The whole panel, never part of it.

        This filled the page with `object-cover`, which is right for a
        photograph and wrong for a comic: the dialogue is painted into the
        artwork, so cropping to fill does not lose scenery, it loses words.
        Measured on a 2:3 panel at 390x844, thirty-one per cent of the width
        went — enough to take the first letter of a caption off the left edge
        and cut a character in half.

        So the panel is contained and whatever is left over is the ground
        colour the rest of the app is already made of. It reads as a page
        laid on the table rather than as a picture that did not fit, and it
        lets a chapter be drawn on any canvas without the reader having to
        be told which one.
      */
      <div className="absolute inset-0 overflow-hidden bg-ground">
        <Picture
          art={art}
          {...(alt ? { alt } : {})}
          className="size-full object-contain"
        />
        <div className="cover-scrim absolute inset-0" aria-hidden />
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-md px-6">
        <Picture art={art} {...(alt ? { alt } : {})} />
      </div>

      <p className="breathe max-w-sm text-center text-2xl leading-relaxed text-balance">
        {text}
      </p>
    </>
  );
}
