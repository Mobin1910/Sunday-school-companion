import Picture from "@/components/Picture";
import type { Art } from "@/content";

/**
 * The front door of the chapter.
 *
 * A book cover, not a menu: the title and one picture, with nothing to decide.
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
    <>
      <div className="w-full max-w-md px-6">
        <Picture art={art} alt={title} />
      </div>

      <h1 className="breathe px-6 text-center text-5xl leading-tight text-balance">
        {title}
      </h1>
    </>
  );
}
