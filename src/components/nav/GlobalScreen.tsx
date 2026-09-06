import BottomNav, { type GlobalDestination } from "./BottomNav";

/**
 * The frame every global destination shares.
 *
 * One place decides that the bar sits below the content rather than floating
 * over it, and that the content — not the page — is what scrolls. Nothing
 * here may scroll sideways; a child who swipes to turn a page should never
 * discover that the whole screen slides instead.
 *
 * It also decides *where the bar appears at all*, below, so that no page has
 * to remember the rule and no page can get it wrong.
 */

/**
 * Home carries no bar.
 *
 * It is already the orientation surface — the greeting, the chapter to carry
 * on with, and the three doors are all on it — so a bar repeating those doors
 * is the same navigation twice, and the row it costs is a row taken from
 * Halo. Every other destination gets the bar, because on those the way back
 * out is genuinely useful.
 *
 * There is no flicker to guard against: this is a server component, so a page
 * without a bar is shipped without one, and moving between destinations
 * replaces the whole frame rather than toggling a bar inside it.
 */
const BARELESS: readonly GlobalDestination[] = ["home"];

export default function GlobalScreen({
  active,
  ground = "day",
  children,
}: {
  active: GlobalDestination;
  /**
   * "night" presents the screen in Halo's own environment — the interface is
   * the night, Halo is the light. Home is the one destination that uses it.
   */
  ground?: "day" | "night";
  children: React.ReactNode;
}) {
  const night = ground === "night";

  return (
    <div
      className={`flex h-dvh flex-col ${
        night ? "night-screen text-ink" : ""
      }`}
    >
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
      {BARELESS.includes(active) ? null : <BottomNav active={active} />}
    </div>
  );
}
