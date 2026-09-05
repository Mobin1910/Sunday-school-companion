import BottomNav, { type GlobalDestination } from "./BottomNav";

/**
 * The frame every global destination shares.
 *
 * One place decides that the bar sits below the content rather than floating
 * over it, and that the content — not the page — is what scrolls. Nothing
 * here may scroll sideways; a child who swipes to turn a page should never
 * discover that the whole screen slides instead.
 */
export default function GlobalScreen({
  active,
  children,
}: {
  active: GlobalDestination;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col">
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
      <BottomNav active={active} />
    </div>
  );
}
