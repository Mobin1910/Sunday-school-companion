/**
 * The frame every global destination shares.
 *
 * One place decides that the bar sits below the content rather than floating
 * over it, and that the content — not the page — is what scrolls. Nothing
 * here may scroll sideways; a child who swipes to turn a page should never
 * discover that the whole screen slides instead.
 *
 * It no longer decides *which* screens carry a bar. That used to be a list of
 * exceptions kept here; it is now the shape of the routes themselves — the
 * three destinations that have a bar sit inside a layout that draws one, and
 * Home sits outside it. A rule expressed as structure cannot fall out of step
 * with itself, and it is what lets the bar survive a navigation and animate.
 */
export default function GlobalScreen({
  ground = "day",
  bar,
  children,
}: {
  /**
   * "night" presents the screen in Halo's own environment — the interface is
   * the night, Halo is the light. Home is the one destination that uses it.
   */
  ground?: "day" | "night";
  /** The bar, where there is one. Home passes nothing and carries none. */
  bar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const night = ground === "night";

  return (
    <div className={`flex h-dvh flex-col ${night ? "night-screen text-ink" : ""}`}>
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
      {bar}
    </div>
  );
}
