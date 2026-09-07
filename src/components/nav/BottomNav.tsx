import Link from "next/link";

/**
 * Where the child can go in the product — not where they can go in a chapter.
 *
 * These two levels are kept strictly apart. This bar is the product's four
 * destinations and appears only on them. Inside a chapter, navigation belongs
 * to the Chapter Hub and the section screens, which have their own way back,
 * and this bar is absent so that a story is never framed by a tab bar.
 *
 * `active` is passed rather than read from the router, so this stays a server
 * component and the bar costs no JavaScript. There are four callers; four
 * explicit props are cheaper than hydrating a nav.
 *
 * "Games" is what a child calls them, so it is what the tab says. That does
 * not make this an arcade: the destination holds a chapter's activities, and
 * there are no levels, locks or scores behind it. The word names the thing
 * from the child's side; the philosophy is enforced by what is actually
 * there, not by refusing the word.
 */

export type GlobalDestination = "home" | "chapters" | "games" | "verses";

export type Destination = {
  key: GlobalDestination;
  label: string;
  href: string;
  /**
   * `lit` is only ever true inside the bar, for the destination the child is
   * on. Home draws the same marks unlit, so the default has to be the quiet
   * one — an icon that needs a prop to be visible would vanish there.
   */
  icon: (props: { lit?: boolean }) => React.ReactElement;
};

/**
 * The product's destinations, in one list.
 *
 * Exported because Home shows the same doors in its own way, and two lists
 * would drift: a destination added to the bar but not to Home is a place a
 * child can only reach from three of the four screens.
 */
export const DESTINATIONS: Destination[] = [
  { key: "home", label: "Home", href: "/", icon: HomeIcon },
  { key: "chapters", label: "Chapters", href: "/chapters", icon: BooksIcon },
  { key: "games", label: "Games", href: "/games", icon: GamepadIcon },
  { key: "verses", label: "Verses", href: "/verses", icon: HeartIcon },
];

export default function BottomNav({ active }: { active: GlobalDestination }) {
  const here = DESTINATIONS.findIndex((d) => d.key === active);

  return (
    <nav
      aria-label="Main"
      className="border-t border-edge bg-ground-raised/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
    >
      {/*
        `--nav-here` is the only thing that moves the mark: it is an index,
        and the stylesheet turns it into a position. Which means the bar has
        no idea how wide it is, works the same on a phone and a tablet, and
        still costs no JavaScript.

        The mark carries a transition, so wherever the bar itself survives a
        navigation the light slides across to the new destination rather than
        cutting. Where the frame is replaced instead, it is simply already in
        the right place — the meaning is the position, and the travel is a
        courtesy on top of it.
      */}
      <div
        className="relative mx-auto max-w-2xl"
        style={{ "--nav-here": Math.max(here, 0) } as React.CSSProperties}
      >
        <span className="nav-mark" aria-hidden />

        <ul className="flex">
          {DESTINATIONS.map(({ key, label, href, icon: Icon }) => {
            const lit = key === active;
            return (
              <li key={key} className="flex-1">
                <Link
                  href={href}
                  {...(lit ? { "aria-current": "page" as const } : {})}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 ${
                    lit ? "nav-here" : "text-ink-soft"
                  }`}
                >
                  <Icon lit={lit} />
                  {/* Weight carries the current destination as well as colour,
                      because colour alone is never allowed to mean something. */}
                  <span className={`text-xs ${lit ? "nav-label-here" : ""}`}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <LitStroke />
      </div>
    </nav>
  );
}

/**
 * The light the current destination's mark is drawn in.
 *
 * One gradient definition for the whole bar, referenced by whichever icon is
 * lit. It is the same three stops as a primary action, because being here and
 * being the way on are the same light in this product — see the lighting
 * order in globals.css.
 */
function LitStroke() {
  return (
    <svg width={0} height={0} aria-hidden className="absolute">
      <defs>
        <linearGradient id="nav-lit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-cta-start)" />
          <stop offset="52%" stopColor="var(--color-cta-mid)" />
          <stop offset="100%" stopColor="var(--color-cta-end)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * A lit mark is stroked with the bar's own gradient rather than a flat
 * accent. Outside the bar there is no such gradient in the document, which
 * is exactly why `lit` defaults to false: an icon on Home asks for
 * `currentColor` and inherits the colour of the text around it.
 */
const iconProps = (lit?: boolean) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: lit ? "url(#nav-lit)" : "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

function HomeIcon({ lit }: { lit?: boolean }) {
  return (
    <svg {...iconProps(lit)}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function BooksIcon({ lit }: { lit?: boolean }) {
  return (
    <svg {...iconProps(lit)}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
      <path d="M10 4h4.5A1.5 1.5 0 0 1 16 5.5v13a1.5 1.5 0 0 1-1.5 1.5H10" />
      <path d="M18 7l2 .5-2 12" />
    </svg>
  );
}

/**
 * A controller, because "Games" is what a child calls them and a controller
 * is what a child pictures. It still opens a chapter's activities — there
 * are no levels, locks or scores behind it, and the word never made any.
 */
function GamepadIcon({ lit }: { lit?: boolean }) {
  return (
    <svg {...iconProps(lit)}>
      <path d="M8 9h8a5 5 0 0 1 4.9 4l.6 3.2a2.8 2.8 0 0 1-5.2 1.9L15.5 16h-7l-.8 2.1a2.8 2.8 0 0 1-5.2-1.9L3.1 13A5 5 0 0 1 8 9z" />
      <path d="M7 11.8v2.4M5.8 13h2.4" />
      <path d="M15.6 12.4h.01M17.8 14.2h.01" />
    </svg>
  );
}

function HeartIcon({ lit }: { lit?: boolean }) {
  return (
    <svg {...iconProps(lit)}>
      <path d="M12 19.5S4.5 15 4.5 9.8A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7.5 1.8c0 5.2-7.5 9.7-7.5 9.7z" />
    </svg>
  );
}
