import Link from "next/link";

import BackLink from "./BackLink";

/**
 * The frame a chapter section that isn't the story sits in.
 *
 * Games and the memory verse are short and quiet, so they are ordinary
 * screens rather than the page-turning reader — a swipe gesture on a screen
 * with one thing on it teaches a child nothing.
 *
 * Both ends are named. The way back up is at the top, and the way onward is
 * repeated at the bottom, because the bottom is where a child arrives when
 * they have finished and it should never be a wall.
 */
export default function SectionScreen({
  title,
  chapterTitle,
  hubHref,
  onward,
  fit = false,
  children,
}: {
  title: string;
  chapterTitle: string;
  hubHref: string;
  /**
   * What the way onward is called, when the place above this screen is not
   * the Chapter Hub. A screen one level deeper than a section — a single
   * game, chosen off the games shelf — goes back to the shelf, and a button
   * that says "Chapter menu" and does not go there is a small lie.
   */
  onward?: string;
  /**
   * Hold the screen to exactly one fold, and let what is inside it have all
   * the room that is left.
   *
   * A game is a thing a child looks at and touches, and both halves of that
   * have to be true at once: a question whose answers are below the fold has
   * been asked of somebody who cannot see them. So a fitted screen loses the
   * repeated way onward at the bottom — on these screens it only says again
   * what the link at the top already says — and gives the height back to the
   * game.
   */
  fit?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex min-h-dvh flex-col overflow-x-hidden ${fit ? "fit-fold" : ""}`}
    >
      <div
        className={`mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 ${
          fit ? "min-h-0 gap-3 pt-4 pb-3" : "gap-8 py-6"
        }`}
      >
        <div className="shrink-0">
          <BackLink href={hubHref} label={chapterTitle} />
          <h1 className={fit ? "mt-1 text-2xl" : "mt-2 text-3xl"}>{title}</h1>
        </div>

        <div
          className={`flex min-h-0 flex-1 flex-col items-center justify-center ${
            fit ? "" : "gap-8"
          }`}
        >
          {children}
        </div>

        {fit ? null : (
          <Link href={hubHref} className="cta min-h-16 px-6 text-xl">
            {onward ?? "Chapter menu"}
          </Link>
        )}
      </div>
    </div>
  );
}
