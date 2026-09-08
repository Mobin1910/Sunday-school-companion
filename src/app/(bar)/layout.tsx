import BottomNav from "@/components/nav/BottomNav";
import GlobalScreen from "@/components/nav/GlobalScreen";

/**
 * The three destinations that carry the bar.
 *
 * A route group, so the URLs are untouched — `/chapters` is still `/chapters`.
 * What it buys is that these three share one frame: moving between them
 * changes only what is inside `main`, and the bar itself is the same element
 * throughout. That is what lets the mark travel from one tab to the next
 * instead of being destroyed at one and redrawn at the other.
 *
 * Home is deliberately not in here. It is already the orientation surface —
 * the greeting, the chapter to carry on with, and the three doors are all on
 * it — so a bar repeating those doors is the same navigation twice, and the
 * row it costs is a row taken from Halo. Its absence from this group is now
 * the only statement of that rule.
 */
export default function BarredLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GlobalScreen bar={<BottomNav />}>{children}</GlobalScreen>;
}
