import Picture from "@/components/Picture";
import type { Art } from "@/content";

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
 * Which one a card is, is decided by the card: `text` present or absent. That
 * is not a flag anyone sets — the schema already requires a picture with no
 * text to carry `alt`, precisely because such a picture cannot describe
 * itself, and a comic is the case that rule was waiting for.
 */
export default function StoryCard({
  art,
  text,
  alt,
}: {
  art: Art;
  text?: string;
  alt?: string;
}) {
  if (text === undefined) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <Picture
          art={art}
          {...(alt ? { alt } : {})}
          className="size-full object-cover"
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
