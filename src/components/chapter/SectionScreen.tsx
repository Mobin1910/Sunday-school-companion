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
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-6">
        <div>
          <BackLink href={hubHref} label={chapterTitle} />
          <h1 className="mt-2 text-3xl">{title}</h1>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          {children}
        </div>

        <Link
          href={hubHref}
          className="cta min-h-16 px-6 text-xl"
        >
          {onward ?? "Chapter menu"}
        </Link>
      </div>
    </div>
  );
}
