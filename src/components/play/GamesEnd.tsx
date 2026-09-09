import Link from "next/link";

import HaloPresence from "@/halo/HaloPresence";

/**
 * Where the games leave a child.
 *
 * The last game used to end by navigating back to the shelf on its own, one
 * and a half seconds after the final answer. Nothing was wrong with the
 * destination and everything was wrong with the leaving: a child was moved
 * somewhere without being asked, and the screen they had just finished
 * vanished under them. The story does not end that way and neither should
 * this.
 *
 * The memory verse takes the lit place. It is the part of a chapter a child
 * is least likely to go looking for — it is the one door on the Hub that
 * sounds like homework — and this is the moment they are most likely to say
 * yes to it: they have just played with this story and are still in it.
 * Offered, never imposed; nothing here happens on a timer.
 *
 * Halo is pleased rather than celebrating, and the burst is not thrown
 * again. The last answer was celebrated a second and a half ago by the
 * player this replaces, and a second celebration for the same thing turns
 * the first one into punctuation.
 *
 * The words say nothing about how much was played. A child may take the
 * last game first — nothing is locked and nothing is ordered — so "you
 * played them all" is a sentence this screen cannot know to be true.
 */
export default function GamesEnd({
  verseHref,
  shelfHref,
  hubHref,
}: {
  /** The chapter's memory verse, where it has one written. */
  verseHref?: string;
  /** Back to the shelf, when there is more than one game to go back to. */
  shelfHref?: string;
  hubHref: string;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-7">
      <div
        className="relative"
        style={
          { "--halo-room": "clamp(5rem, 15vh, 7.5rem)" } as React.CSSProperties
        }
      >
        <HaloPresence state="happy" placement="inline" />
      </div>

      <p className="max-w-xs text-center text-2xl leading-snug text-balance text-joy">
        That was fun!
      </p>

      <nav className="flex w-full max-w-sm flex-col gap-3">
        {verseHref ? (
          <Link href={verseHref} className="cta min-h-16 px-6 text-xl">
            Learn the memory verse
          </Link>
        ) : null}

        {shelfHref ? (
          <Link
            href={shelfHref}
            className={
              verseHref
                ? "btn-quiet min-h-14 px-6 text-lg"
                : "cta min-h-16 px-6 text-xl"
            }
          >
            More games
          </Link>
        ) : null}

        <Link
          href={hubHref}
          className={
            verseHref || shelfHref
              ? "flex min-h-14 items-center justify-center rounded-card px-6 text-lg text-ink-soft"
              : "cta min-h-16 px-6 text-xl"
          }
        >
          Chapter menu
        </Link>
      </nav>
    </div>
  );
}
