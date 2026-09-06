import type { Viewport } from "next";
import Link from "next/link";

import HomeHalo from "@/components/home/HomeHalo";
import { DESTINATIONS } from "@/components/nav/BottomNav";
import GlobalScreen from "@/components/nav/GlobalScreen";
import { getChapters } from "@/content";

/**
 * Home.
 *
 * Not a door and not a dashboard: the room the companion lives in. A child
 * opening the app should meet Halo before they meet anything else, so the
 * order of this screen is greeting, Halo, the story to carry on with, and
 * then the ways further in — and Halo is given more of the first screenful
 * than anything else on it.
 *
 * It is the one destination presented in the night. Everywhere else the app
 * is parchment; here the interface is the dark and Halo is the light in it,
 * which is the only arrangement in which a luminous companion actually reads
 * as luminous.
 *
 * Nothing here counts anything. There is no streak, no progress ring and no
 * "3 chapters left" — those turn returning into an obligation. "Continue
 * learning" names a chapter, which is a fact about the content, not a
 * measurement of the child.
 */
/**
 * The phone's own furniture joins the night while Home is open. A cream
 * status bar above a navy screen is a seam across the top of the one moment
 * that is meant to feel whole.
 */
export const viewport: Viewport = { themeColor: "#050a19" };

export default function HomePage() {
  const chapters = getChapters();
  const latest = chapters[chapters.length - 1];
  const doors = DESTINATIONS.filter((d) => d.key !== "home");

  return (
    <GlobalScreen active="home" ground="night">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-10 px-6 pt-8 pb-12">
        <div className="flex flex-col gap-6">
          <header className="text-center">
            <p className="text-xs tracking-[0.18em] text-night-ink-soft uppercase">
              Sunday School Companion
            </p>
            <h1 className="mt-3 text-4xl leading-tight text-balance">
              Good to see you!
            </h1>
            <p className="mt-2 text-lg text-night-ink-soft text-balance">
              Ready for a new adventure?
            </p>
          </header>

          <HomeHalo />
        </div>

        {latest ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs tracking-[0.14em] text-night-ink-soft uppercase">
              Continue learning
            </h2>

            {/*
              One surface, not a card of cards. It sits in the world rather
              than floating above it — a translucent pane the atmosphere shows
              through — because a solid panel here would read as a dashboard
              tile and take the dark away from Halo.
            */}
            <Link
              href={`/chapter/${latest.slug}`}
              className="flex items-center gap-4 rounded-card border border-night-edge bg-night-raised/50 px-5 py-4"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-2xl leading-snug text-balance">
                  {latest.title}
                </span>
                <span className="mt-0.5 block text-sm text-night-ink-soft">
                  {latest.reference}
                </span>
              </span>
              <Chevron />
            </Link>
          </section>
        ) : (
          <p className="text-lg text-night-ink-soft">
            Stories are on their way.
          </p>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-xs tracking-[0.14em] text-night-ink-soft uppercase">
            Explore
          </h2>

          {/*
            The same three destinations the bar carries elsewhere, from the
            same list, so they can never drift apart. Rows rather than tiles:
            a three-up grid of equal boxes is the dashboard this screen is
            deliberately not.
          */}
          <ul className="flex flex-col">
            {doors.map(({ key, label, href, icon: Icon }) => (
              <li key={key} className="border-b border-night-edge last:border-0">
                <Link
                  href={href}
                  className="flex min-h-16 items-center gap-4 text-lg"
                >
                  <span className="text-night-ink-soft">
                    <Icon />
                  </span>
                  <span className="flex-1">{label}</span>
                  <Chevron />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </GlobalScreen>
  );
}

function Chevron() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-night-ink-soft"
      aria-hidden
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}
