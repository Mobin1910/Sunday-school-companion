/**
 * The burst when a child arrives at the answer.
 *
 * Deliberately small, and deliberately *not* the chapter's celebration. The
 * end of a chapter warms the whole room and stays warm; this is a spark that
 * happens and is gone in a second. Keeping them different is what stops the
 * ending from feeling like the fifteenth time something popped.
 *
 * It is not a reward. Nothing is awarded, counted or kept — it is the same
 * burst whether a child found it first try or after help, because the moment
 * being marked is arriving, and arriving is arriving. A celebration that got
 * bigger for doing better would be a score with better manners.
 *
 * Every piece is placed from its own index rather than from a random number,
 * so the server and the browser draw the same thing and the burst can live
 * inside a prerendered page. It is drawn for nobody but the child watching:
 * `aria-hidden`, no pointer events, and stopped entirely under reduced
 * motion by the stylesheet rather than by a check here.
 */
const PIECES = 14;

/** Enough angles that the fan looks scattered rather than counted out. */
const SPREAD = 148;

export default function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: PIECES }, (_, i) => {
        const angle = -SPREAD / 2 + (SPREAD * i) / (PIECES - 1);
        // Alternating distances stop the pieces landing on one clean arc.
        const reach = 46 + ((i * 37) % 34);
        const spin = ((i * 149) % 360) - 180;

        return (
          <i
            key={i}
            className="confetti-piece"
            style={
              {
                "--angle": `${angle.toFixed(1)}deg`,
                "--reach": `${reach}px`,
                "--spin": `${spin}deg`,
                "--wait": `${(i % 5) * 26}ms`,
                "--tint": TINTS[i % TINTS.length]!,
                "--long": i % 3 === 0 ? "10px" : "6px",
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

/**
 * Halo's own warm key, and the one cool note that keeps it from reading as a
 * fire. No reds: red is a verdict everywhere else in this product, and it
 * cannot mean "well done" here and "wrong" three inches away.
 */
const TINTS = [
  "var(--color-joy)",
  "#ffd27a",
  "var(--color-touchable)",
  "#ffe9c2",
  "#9ec7ff",
];
