import Picture from "@/components/Picture";
import type { Art } from "@/content";

/**
 * A page of the story.
 *
 * The picture is the story and the words give it context, so the illustration
 * takes the room and the text sits quietly beneath it with air around it.
 * Nothing else is on screen.
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
  return (
    <>
      <div className="w-full max-w-md px-6">
        <Picture art={art} {...(alt ? { alt } : {})} />
      </div>

      {text ? (
        <p className="breathe max-w-sm text-center text-2xl leading-relaxed text-balance">
          {text}
        </p>
      ) : null}
    </>
  );
}
