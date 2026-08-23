import Picture from "@/components/Picture";

/**
 * The front door of the chapter.
 *
 * A book cover, not a menu: the title and one picture, with nothing to decide.
 * The way in is the same forward button used on every other page, so a child
 * learns one gesture and it never changes.
 */
export default function CoverCard({
  slug,
  picture,
  title,
}: {
  slug: string;
  picture: string;
  title: string;
}) {
  return (
    <>
      <div className="w-full max-w-md">
        <Picture chapter={slug} name={picture} alt={title} />
      </div>

      <h1 className="breathe text-center text-5xl leading-tight text-balance">
        {title}
      </h1>
    </>
  );
}
