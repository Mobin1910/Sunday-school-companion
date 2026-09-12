"use client";

import Link from "next/link";

import Picture from "@/components/Picture";
import type { Art } from "@/content";
import { gamesDone, useSessionProgress } from "@/local/session";

/**
 * A chapter's games, as a shelf that knows what has been played today.
 *
 * Two across, and square. A story panel is portrait, so a wide card could
 * only ever show a band across its middle — the one stripe of an
 * illustration with no faces in it. A square keeps two thirds of the panel's
 * height, which is enough to hold whoever is in it, and two squares to a row
 * put every game a chapter has on one screen without a scroll.
 *
 * One game may be marked as the one the chapter leads with. It catches more
 * light, which is what `surface-lit` already means everywhere else. Either
 * way it is the chapter saying "start here" rather than the app ranking
 * anything: there is no difficulty, no order to work through, and nothing is
 * locked behind anything else. A child may play the last one first and has
 * lost nothing — which is also why the numbers on these cards are only
 * counting, and never a route to walk in order.
 *
 * What is new is that this screen now remembers the sitting. It is the place
 * a child comes back to after each game, so it is the one place that can
 * honestly say how far through they are — "2 of 3" — and the one place that
 * can offer the memory verse at the moment it is actually earned, rather
 * than at the end of whichever game happened to be played last.
 *
 * None of it is a score. The count is of the chapter's own games, not of the
 * child; it resets when the tab closes (see `local/session.ts`); a game
 * already played stays open and is played again by tapping it; and nothing
 * anywhere is locked behind finishing anything. The only thing completion
 * buys is a door being offered — never one being unlocked.
 *
 * The objective is not on the card. It is written in the grown-up's register
 * — the one thing a teacher needs in order to know what a game is for — and
 * printing it under every title turned a shelf a child chooses from into a
 * table of contents. It stays in the content, and it is what a screen reader
 * announces. This is not a curriculum dashboard.
 */
export default function GamesMenu({
  slug,
  games,
  verseHref,
}: {
  slug: string;
  games: { id: string; title: string; objective: string; featured?: true; art?: Art }[];
  /** The chapter's memory verse, where it has one that can be reached. */
  verseHref?: string;
}) {
  const progress = useSessionProgress()[slug];
  const ids = games.map((game) => game.id);
  const done = gamesDone(progress, ids);
  const all = games.length > 0 && done === games.length;

  return (
    <div className="flex w-full flex-col gap-5">
      {/*
        How far through, in the chapter's own terms.

        Not a percentage, not a bar, and not a tally that survives the day:
        "2 of 3" is a fact about a shelf with three things on it, and a child
        who has played two can see which one is left without being told they
        are 67% of anything.
      */}
      <p className="text-center text-base text-ink-soft" aria-live="polite">
        {all ? "All games complete!" : `${done} of ${games.length} complete`}
      </p>

      <ul className="grid w-full grid-cols-2 gap-3">
        {games.map((game, index) => {
          const played = progress?.games?.[game.id] === true;

          return (
            <li key={game.id}>
              <Link
                href={`/chapter/${slug}/games/${game.id}`}
                aria-label={`Game ${index + 1}. ${game.title}. ${game.objective}${
                  played ? ". Played" : ""
                }`}
                className={`surface relative flex aspect-square items-end overflow-hidden ${
                  game.featured ? "surface-lit" : ""
                }`}
              >
                {game.art ? (
                  <Picture
                    art={game.art}
                    className={`game-art absolute inset-0 size-full object-cover ${
                      played ? "opacity-55" : ""
                    }`}
                  />
                ) : null}

                {/* Only where there is a picture to be legible against. */}
                {game.art ? (
                  <div className="game-scrim absolute inset-0" aria-hidden />
                ) : null}

                {/*
                  A tick, not a lock and not a grey-out. A game that has been
                  played is still a game: the card stays lit enough to read
                  and stays tappable, because playing it again is a perfectly
                  good thing for a six-year-old to want.
                */}
                {played ? (
                  <span className="played-tick" aria-hidden>
                    <TickIcon />
                  </span>
                ) : null}

                <span className="relative px-3 pb-3">
                  {/*
                    The number is what a child reads, and the name is for
                    whoever is choosing with them. "Game 2" is a thing you can
                    point at before you can read "What Did Simeon Know?", and
                    it says the one true thing about a shelf where nothing is
                    locked and nothing is in order: there are three of them.
                  */}
                  <span className="block text-lg leading-tight font-semibold">
                    Game {index + 1}
                  </span>
                  <span className="mt-0.5 block text-sm leading-tight text-balance text-ink-soft">
                    {game.title}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/*
        The one obvious next thing, and only once there is one.

        The memory verse is the part of a chapter a child is least likely to
        go looking for — it is the one door on the Hub that sounds like
        homework — and this is the moment they are most likely to say yes to
        it: they have just played with this story and are still in it.

        Offered, never imposed, and never on a timer. It appears; nothing
        moves the child towards it.
      */}
      {all && verseHref ? (
        <Link href={verseHref} className="cta min-h-16 w-full px-6 text-xl">
          Memory Verse
        </Link>
      ) : null}
    </div>
  );
}

function TickIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}
