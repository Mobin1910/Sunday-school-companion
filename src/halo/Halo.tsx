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
 * The nesting looks heavier than it is, and the reason is the whole point
 * of this component: **one element can only run one transform animation**.
 * A single element breathing on a single keyframe is what made Halo read as
 * a gradient illustration being scaled. Life comes from several slow
 * rhythms that never line up, so each rhythm gets its own layer:
 *
 *   aura     environmental bloom, breathing on its own long cycle
 *   orbit    the ring floating, on a cycle of its own
 *   ring     the ring's state — height, tilt, width, brightness
 *   drift    the whole body wandering — slow translate and rotation
 *   morph    the silhouette deforming — asymmetric squash, lean and shift
 *   body     the state's shape and transform, plus the corner wobble
 *   lume ×5  each colour of light drifting inside, independently
 *   rim      the lit edge of the translucent material
 *   sheen    the glass highlight
 *   eyes     state gaze (transition) wrapping a micro-wander (animation)
 *   floor    the reflection
 *
 * Every layer is `transform`/`opacity` only, so all of it stays on the
 * compositor. No library, and no JavaScript in the loop: React sets custom
 * properties when the state changes and is then out of the way entirely —
 * the motion continues without a single re-render.
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
    /*
      The four corner radii go out as bare numbers rather than a composed
      `border-radius` string, because CSS has to be able to add the wobble
      to each corner independently. They are registered with `@property` as
      `<number>`, which is also what lets the silhouette cross-fade between
      states instead of snapping: an unregistered custom property cannot be
      transitioned at all.
    */
    "--halo-s0": e.shape[0],
    "--halo-s1": e.shape[1],
    "--halo-s2": e.shape[2],
    "--halo-s3": e.shape[3],
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
    "--halo-transition": `${e.transition}ms`,
    /** How much the ambient life is turned up. Stillness dials it down. */
    "--halo-life": e.life,
  } as React.CSSProperties;

  return (
    <div className={`halo ${className}`} data-halo-state={state} style={style}>
      <div className="halo-stage" aria-hidden>
        <div className="halo-aura" />

        {/*
          The ring's float lives on the orbit wrapper and its *state* — how
          high it sits, how it tilts, how wide it is — on the ring itself.
          Putting both on one element would mean the keyframe overwriting
          the transform the state sets, and the ring would stop being able
          to say anything the moment motion was reduced.
        */}
        <div className="halo-ring-orbit">
          <div className="halo-ring" />
        </div>

        <div className="halo-drift">
          <div className="halo-morph">
            <div className="halo-body">
              {/*
                Five lights, five clocks. Each colour drifts inside the body
                on its own duration and path, so the interior never returns
                to an arrangement you have already seen. This is what makes
                it read as light moving through material rather than as a
                gradient someone painted on.
              */}
              <div className="halo-lume halo-lume-cyan" />
              <div className="halo-lume halo-lume-blue" />
              <div className="halo-lume halo-lume-violet" />
              <div className="halo-lume halo-lume-pink" />
              <div className="halo-lume halo-lume-peach" />

              <div className="halo-rim" />
              <div className="halo-sheen" />

              {/*
                Two forms per eye, cross-faded by --halo-eye-curve: the
                resting capsule, and the upward arc the reference uses for
                happy and celebrating. Still two minimal white shapes — no
                pupils, no lashes, nothing readable as a brow.

                The outer element carries the state's gaze as a transition;
                the inner one wanders a fraction of a pixel on a loop. Both
                at once is what "noticing" looks like, and neither alone is.
              */}
              <div className="halo-eyes">
                <div className="halo-eyes-wander">
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
            </div>
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
