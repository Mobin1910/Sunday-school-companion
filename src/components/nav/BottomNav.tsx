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
  icon: () => React.ReactElement;
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
  { key: "games", label: "Games", href: "/games", icon: SparkIcon },
  { key: "verses", label: "Verses", href: "/verses", icon: HeartIcon },
];

export default function BottomNav({ active }: { active: GlobalDestination }) {
  return (
    <nav
      aria-label="Main"
      className="border-t border-edge bg-ground-raised/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
    >
      <ul className="mx-auto flex max-w-2xl">
        {DESTINATIONS.map(({ key, label, href, icon: Icon }) => {
          const here = key === active;
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                {...(here ? { "aria-current": "page" as const } : {})}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 ${
                  here ? "nav-here text-touchable" : "text-ink-soft"
                }`}
              >
                <Icon />
                {/* Weight carries the current destination as well as colour,
                    because colour alone is never allowed to mean something. */}
                <span className={`text-xs ${here ? "font-bold" : ""}`}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function BooksIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
      <path d="M10 4h4.5A1.5 1.5 0 0 1 16 5.5v13a1.5 1.5 0 0 1-1.5 1.5H10" />
      <path d="M18 7l2 .5-2 12" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 4l1.8 4.9L19 10.5l-5.2 1.6L12 17l-1.8-4.9L5 10.5l5.2-1.6z" />
      <path d="M18 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 19.5S4.5 15 4.5 9.8A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7.5 1.8c0 5.2-7.5 9.7-7.5 9.7z" />
    </svg>
  );
}
