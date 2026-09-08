/**
 * Where the child can go in the product — not where they can go in a chapter.
 *
 * These two levels are kept strictly apart. This list is the product's four
 * destinations. Inside a chapter, navigation belongs to the Chapter Hub and
 * the section screens, which have their own way back, and the bar is absent
 * so that a story is never framed by a tab bar.
 *
 * It lives apart from the bar that draws it because Home draws the same four
 * marks in its own way, and Home is a server component. Keeping the list here
 * means Home's doors cost no JavaScript even though the bar now does.
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
