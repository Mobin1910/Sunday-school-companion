import Picture from "@/components/Picture";
import type { Art } from "@/content";

/**
 * The warm ending.
 *
 * The message names what this child just did, because generic praise for
 * nothing is worth nothing. Nothing here counts, scores or compares.
 */
export default function CelebrationCard({
  art,
  message,
}: {
  art?: Art;
  message: string;
}) {
  return (
    <>
      {art ? (
        <div className="w-full max-w-md px-6">
          <Picture art={art} />
        </div>
      ) : null}

      <p className="breathe max-w-sm px-6 text-center text-3xl leading-relaxed text-balance text-joy">
        {message}
      </p>
    </>
  );
}
