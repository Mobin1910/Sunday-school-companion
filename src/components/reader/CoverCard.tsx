import Picture from "@/components/Picture";
import type { Art } from "@/content";

/**
 * The front door of the chapter.
 *
 * One illustration, edge to edge, and nothing else. The chapter's name is
 * painted into the artwork rather than set beneath it — a cover is a picture
 * with a title on it, not a picture with a caption — so this card lays no
 * type over the image at all and only makes sure the name still exists for a
 * screen reader, which cannot read paint.
 *
 * It is the one card that escapes the shared frame: everywhere else in the
 * reader the margins are fixed so that turning a page never moves the ground
 * under a child's feet, and here the whole page *is* the picture. The scrim
 * is what makes that safe — it lands the bottom of the artwork exactly on the
 * ground colour, so the chrome the reader draws over it is legible without
 * anything being boxed off.
 *
 * It fills the screen, which on a phone means cropping: the artwork is less
 * tall in proportion than the display, so roughly nine percent comes off each
 * side at 390x844. That is a deliberate trade of edges for immersion. It does
 * ask something of the artwork in return — keep the title, and anything else
 * that carries meaning, inside the central 82% horizontally.
 *
 * The way in is the same forward button used on every other page, so a child
 * learns one gesture and it never changes.
 */
export default function CoverCard({
  art,
  title,
}: {
  art: Art;
  title: string;
}) {
  return (
    // Contained, for the same reason a story panel is: a cover has its
    // chapter title and its verse painted into the artwork, so anything
    // cropped off the edge is words. What is left over is the ground.
    <div className="absolute inset-0 overflow-hidden bg-ground">
      <Picture art={art} alt={title} className="size-full object-contain" />
      <div className="cover-scrim absolute inset-0" aria-hidden />
      <h1 className="sr-only">{title}</h1>
    </div>
  );
}
