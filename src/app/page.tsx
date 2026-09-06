import type { Viewport } from "next";
import Link from "next/link";

import ContinueLearning from "@/components/home/ContinueLearning";
import Greeting from "@/components/home/Greeting";
import HomeHalo from "@/components/home/HomeHalo";
import { DESTINATIONS } from "@/components/nav/BottomNav";
import GlobalScreen from "@/components/nav/GlobalScreen";
import Doorway from "@/components/welcome/Doorway";
import { getChapters, storyCards } from "@/content";
import type { ChapterBrief } from "@/local/place";

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
 * The greeting and the chapter to carry on with both come from this device
 * and so are settled in the browser, which is why they are the only two
 * client components on the page. Everything else — including the chapter
 * list they are checked against — is built here on the server, so the
 * content layer never reaches the browser.
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
  const doors = DESTINATIONS.filter((d) => d.key !== "home");

  /*
    The smallest shape that can validate a remembered place and label a
    link. Sent rather than the chapters themselves so that nothing about
    content — cards, interactions, artwork — crosses into the bundle.
  */
  const chapters: ChapterBrief[] = getChapters().map((chapter) => ({
    slug: chapter.slug,
    title: chapter.title,
    reference: chapter.reference,
    storyPages: storyCards(chapter).length,
  }));

  return (
    <GlobalScreen active="home" ground="night">
      {/*
        A child who has not been welcomed meets Halo instead of Home, on the
        same route and the same ground — so finishing the welcome puts them
        *on* Home rather than navigating them to it.
      */}
      <Doorway>
        <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-10 px-6 pt-6 pb-12">
        <div className="flex flex-col gap-6">
          <header className="relative text-center">
            {/*
              Small, in the corner, and reachable rather than advertised.
              Settings is somewhere a child goes once — usually with an
              adult — so it gets a tap target and none of the hierarchy.
            */}
            <Link
              href="/settings"
              aria-label="Settings"
              className="absolute -top-2 -right-3 flex size-12 items-center justify-center rounded-full text-night-ink-soft"
            >
              <GearIcon />
            </Link>

            {/*
              Held clear of the control in the corner. Without the inset the
              two touch on a narrow phone and the icon reads as punctuation
              on the end of the app's own name.
            */}
            <p className="px-10 pt-2 text-xs tracking-[0.18em] text-night-ink-soft uppercase">
              Sunday School Companion
            </p>

            <Greeting />

            <p className="mt-2 text-lg text-night-ink-soft text-balance">
              Ready for a new adventure?
            </p>
          </header>

          <HomeHalo />
        </div>

        {chapters.length > 0 ? (
          <ContinueLearning chapters={chapters} />
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
      </Doorway>
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

function GearIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a1.9 1.9 0 1 1-2.7 2.7l-.05-.06a1.6 1.6 0 0 0-1.78-.32 1.6 1.6 0 0 0-.97 1.47v.17a1.9 1.9 0 0 1-3.8 0v-.09a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a1.9 1.9 0 1 1-2.7-2.7l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.98H3.5a1.9 1.9 0 0 1 0-3.8h.09a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.9 1.9 0 1 1 2.7-2.7l.06.06a1.6 1.6 0 0 0 1.77.32h.08a1.6 1.6 0 0 0 .97-1.47V3.5a1.9 1.9 0 0 1 3.8 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.78-.32l.05-.06a1.9 1.9 0 1 1 2.7 2.7l-.06.06a1.6 1.6 0 0 0-.32 1.77v.08a1.6 1.6 0 0 0 1.47.97h.17a1.9 1.9 0 0 1 0 3.8h-.09a1.6 1.6 0 0 0-1.47.97z" />
    </svg>
  );
}
