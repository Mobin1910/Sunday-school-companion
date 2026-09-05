import Halo from "./Halo";
import type { HaloPlacement, HaloSize, HaloState } from "./state";

/**
 * Where Halo is, as opposed to what Halo is.
 *
 * Kept apart deliberately. Halo has no opinion about whether it is beside a
 * quiz, tucked in a corner or filling a celebration — and every surface
 * that wants a companion should reach for this rather than positioning a
 * blob itself, or the next surface will position it slightly differently
 * and Halo will stop being one thing.
 *
 * Adding a placement is a case here. It is not a change to Halo.
 */

const PLACEMENT: Record<HaloPlacement, string> = {
  /** In the flow, where it was written. */
  inline: "flex justify-center",
  /** Alongside content, aligned to the top of it. */
  beside: "flex justify-start",
  /**
   * Out of the way, bottom-right of the nearest positioned ancestor. Never
   * over the middle of a story, and never in the way of a tap target.
   */
  corner: "pointer-events-none absolute bottom-4 right-4 z-10",
  /** The moment itself. */
  hero: "flex justify-center py-4",
};

const DEFAULT_SIZE: Record<HaloPlacement, HaloSize> = {
  inline: "standard",
  beside: "compact",
  corner: "compact",
  hero: "hero",
};

export default function HaloPresence({
  state,
  placement = "inline",
  size,
  className = "",
}: {
  state: HaloState;
  placement?: HaloPlacement;
  /** Overrides the placement's natural size. Rarely needed. */
  size?: HaloSize;
  className?: string;
}) {
  return (
    <div className={`${PLACEMENT[placement]} ${className}`}>
      <Halo state={state} size={size ?? DEFAULT_SIZE[placement]} />
    </div>
  );
}
