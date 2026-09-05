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
 * Five layers, and each one is doing a specific job from the approved
 * reference:
 *
 *   ring       the golden ring floating above. Halo's strongest signature.
 *   glow       the bloom Halo puts into the room around it.
 *   body       the translucent jelly: cyan, blue, violet, pink and peach
 *              blended inside it rather than laid on in bands.
 *   sheen      the glass highlight that makes the surface read as a
 *              surface, and the reason it looks like jelly and not paint.
 *   eyes       two pale shapes that change form — capsule at rest, an
 *              upward arc when Halo is pleased. No pupils, no iris, no
 *              lashes, nothing readable as a brow or a mouth.
 *   floor      the reflection underneath, which is what grounds it.
 *
 * All of it is CSS custom properties driven from the expression table, so a
 * state change is a property change and the browser does the tween. No
 * library, no per-transition code, and `transform`/`opacity`/`filter` only.
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
    "--halo-lean": `${e.lean}deg`,
    "--halo-shape": `${e.shape[0]}% ${e.shape[1]}% ${e.shape[2]}% ${e.shape[3]}% / ${e.shape[1]}% ${e.shape[2]}% ${e.shape[3]}% ${e.shape[0]}%`,
    "--halo-glow": e.glow,
    "--halo-light": e.light,
    "--halo-warmth": e.warmth,
    "--halo-gaze-x": `${e.gaze.x * px * 0.1}px`,
    "--halo-gaze-y": `${e.gaze.y * px * 0.1}px`,
    "--halo-openness": e.openness,
    "--halo-eye-tilt": `${e.eyeTilt}deg`,
    "--halo-eye-curve": e.eyeCurve,
    "--halo-ring-lift": e.ring.lift,
    "--halo-ring-glow": e.ring.glow,
    "--halo-ring-scale": e.ring.scale,
    "--halo-ring-tilt": `${e.ring.tilt}deg`,
    "--halo-breath-duration": `${e.breath.duration}ms`,
    "--halo-breath-depth": e.breath.depth,
    "--halo-drift": `${e.drift}px`,
    "--halo-transition": `${e.transition}ms`,
  } as React.CSSProperties;

  return (
    <div className={`halo ${className}`} data-halo-state={state} style={style}>
      <div className="halo-stage" aria-hidden>
        <div className="halo-ring" />

        <div className="halo-body">
          <div className="halo-sheen" />
          {/*
            Two forms per eye, cross-faded by --halo-eye-curve: the resting
            capsule, and the upward arc the reference uses for happy and
            celebrating. Still two minimal white shapes — no pupils, no
            lashes, nothing that could be read as a brow.
          */}
          <div className="halo-eyes">
            <span className="halo-eye">
              <span className="halo-eye-capsule" />
              <span className="halo-eye-arc" />
            </span>
            <span className="halo-eye">
              <span className="halo-eye-capsule" />
              <span className="halo-eye-arc" />
            </span>
          </div>
        </div>

        <div className="halo-floor" />
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
