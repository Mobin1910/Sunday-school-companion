import Picture from "@/components/Picture";
import type { Art } from "@/content";

/**
 * The warm ending.
 *
 * The message names what this child just did, because generic praise for
 * nothing is worth nothing. Nothing here counts, scores or compares.
 *
 * It is the one place in the product where the cool room is deliberately
 * warmed: a soft golden light gathers behind the words, in the same key as
 * Halo's ring. Cool environment, warm light — not confetti, not badges and
 * not a single star. Halo itself stays out, as it does everywhere in the
 * reader; the warmth arrives without the companion having to walk into the
 * artwork to deliver it.
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

      <div className="celebration-light relative px-6">
        <p className="breathe relative max-w-sm text-center text-3xl leading-relaxed text-balance text-joy">
          {message}
        </p>
      </div>
    </>
  );
}
