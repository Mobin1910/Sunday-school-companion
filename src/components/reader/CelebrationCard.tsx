import Picture from "@/components/Picture";

/**
 * The warm ending.
 *
 * The message names what this child just did, because generic praise for
 * nothing is worth nothing. Nothing here counts, scores or compares.
 */
export default function CelebrationCard({
  slug,
  picture,
  message,
}: {
  slug: string;
  picture?: string;
  message: string;
}) {
  return (
    <>
      {picture ? (
        <div className="w-full max-w-md">
          <Picture chapter={slug} name={picture} />
        </div>
      ) : null}

      <p className="breathe max-w-sm text-center text-3xl leading-relaxed text-balance text-joy">
        {message}
      </p>
    </>
  );
}
