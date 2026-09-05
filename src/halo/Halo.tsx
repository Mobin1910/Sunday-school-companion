import { expressionFor } from "./expression";
import { ANNOUNCEMENT, SIZE_PX, type HaloSize, type HaloState } from "./state";

/**
 * Halo.
 *
 * The companion itself, and nothing else. It is handed a state and renders
 * it. It does not know what a chapter is, whether an answer was right, how
 * many tries there were, or what an assistance ladder is — and the fact
 * that it imports nothing from `interactions` or `content` is what keeps
 * that true rather than merely intended.
 *
 * Everything is CSS custom properties driven from the expression table, so
 * a state change is a property change and the browser does the tween. That
 * is the whole animation system: no library, no per-transition code, and
 * `transform`/`opacity`/`filter` only, as the design system requires.
 *
 * Built from nested elements rather than SVG because `border-radius`
 * interpolates smoothly between four-corner shapes and an SVG path does
 * not — the morph between states is the effect, and this is the cheapest
 * way to get it on a low-end phone.
 */
export default function Halo({
  state,
  size = "standard",
  className = "",
}: {
  state: HaloState;
  size?: HaloSize;
  className?: string;
}) {
  const e = expressionFor(state);
  const px = SIZE_PX[size];
  const announcement = ANNOUNCEMENT[state];

  const style = {
    "--halo-size": `${px}px`,
    "--halo-scale": e.scale,
    "--halo-squish": e.squish,
    "--halo-shape": `${e.shape[0]}% ${e.shape[1]}% ${e.shape[2]}% ${e.shape[3]}% / ${e.shape[1]}% ${e.shape[2]}% ${e.shape[3]}% ${e.shape[0]}%`,
    "--halo-glow": e.glow,
    "--halo-light": e.light,
    "--halo-cross": e.cross,
    "--halo-gaze-x": `${e.gaze.x * px * 0.16}px`,
    "--halo-gaze-y": `${e.gaze.y * px * 0.16}px`,
    "--halo-openness": e.openness,
    "--halo-breath-duration": `${e.breath.duration}ms`,
    "--halo-breath-depth": e.breath.depth,
    "--halo-drift": `${e.drift}px`,
    "--halo-transition": `${e.transition}ms`,
  } as React.CSSProperties;

  return (
    <div
      className={`halo ${className}`}
      data-halo-state={state}
      data-halo-tone={e.tone}
      style={style}
    >
      <div className="halo-body" aria-hidden>
        <div className="halo-light" />
        <div className="halo-cross" />
        <div className="halo-eyes">
          <span className="halo-eye" />
          <span className="halo-eye" />
        </div>
      </div>

      {/* Most states say nothing. Halo is company, not commentary. */}
      {announcement ? (
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
      ) : null}
    </div>
  );
}
