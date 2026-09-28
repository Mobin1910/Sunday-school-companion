/**
 * Whether now is a decent moment to ask.
 *
 * Reaching the threshold and showing the invitation are two different events,
 * and keeping them apart is most of what makes this feature bearable. Five
 * active minutes almost always land in the middle of something: a story being
 * turned, a question half answered, a verse being held. Interrupting any of
 * those to offer a home screen icon is the app talking over the child to get
 * to the adult, which this product's constitution forbids in as many words.
 *
 * So eligibility is patient. It waits for a screen where nothing is being
 * played, and there is no time limit on the wait — a child who never leaves
 * the story is simply never asked, and that is the correct outcome.
 *
 * ## An allow-list, not a deny-list
 *
 * The calm screens are named and everything else defers. That direction is
 * deliberate and is the opposite of the usual instinct.
 *
 * A deny-list has to be updated every time an immersive screen is added, and
 * the failure mode of forgetting is a sheet sliding up over a game. An
 * allow-list has to be updated every time a calm screen is added, and the
 * failure mode of forgetting is an invitation that waits a little longer.
 * Between "occasionally interrupts a six-year-old mid-question" and
 * "occasionally asks a week later than it could have", there is no contest.
 *
 * It is also why no route implements anything for this. Nothing in the
 * chapter reader, the game player or the verse practice knows this feature
 * exists, and none of them had a line added for it.
 */

/**
 * The screens where a grown-up may be asked.
 *
 * Each one is a landing, not an activity — a shelf, a hub, a menu, or Home.
 * A child arrives at these having just finished something, or on their way to
 * choosing the next thing, and both are pauses.
 */
const CALM = [
  /*
    Home. Also the route the welcome and the class question live on, which is
    why `isSafeMoment` checks onboarding separately — matching this pattern is
    necessary but not sufficient for `/`.
  */
  /^\/$/,

  /* The three global destinations: Chapters, Games, Verses. */
  /^\/(chapters|games|verses)$/,

  /*
    A chapter hub. The screen a child lands on from the shelf and returns to
    between sections, and the natural resting point of the whole product.
  */
  /^\/chapter\/[^/]+\/[^/]+$/,

  /*
    A chapter's games shelf — not a game. This is where a child arrives after
    finishing one, which the brief names as a good moment, and it holds a list
    rather than a question.
  */
  /^\/chapter\/[^/]+\/[^/]+\/games$/,
] as const;

/**
 * What the check is allowed to know. A probe, so the rule is testable.
 *
 * `onboarding` is read from `data-welcomed` on the document element, which the
 * pre-paint script in `layout.tsx` sets and `Doorway` keeps honest. The
 * welcome and the class question share Home's route, so the pathname alone
 * cannot tell a returning child's Home from a new child's first meeting with
 * Halo — and interrupting *that* would be the worst moment in the product.
 *
 * `busy` is whatever other modal or sheet is open. There is only one in the
 * app today and it is this feature's own, so this is how the invitation
 * avoids opening on top of itself after a re-render.
 */
export type MomentProbe = {
  pathname: string | null;
  onboarding: boolean;
  busy: boolean;
};

export function isSafeMoment(probe: MomentProbe): boolean {
  if (probe.busy) return false;
  if (probe.onboarding) return false;

  const path = probe.pathname;
  if (path === null || path === "") return false;

  /*
    Trailing slashes, because a static export can be served either way and
    `/chapters/` must be the same calm screen as `/chapters`.
  */
  const tidy = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

  return CALM.some((shape) => shape.test(tidy));
}

/**
 * Whether the welcome or the class question is on screen.
 *
 * Reads the attribute rather than the stored flags so that it agrees with what
 * is actually being *shown*: `Doorway` owns this attribute and updates it the
 * moment the branch changes, which is a frame earlier than storage would say.
 *
 * A document that cannot be read is treated as onboarding — the cautious
 * answer, and the one that produces silence.
 */
export function readOnboarding(): boolean {
  try {
    return document.documentElement.dataset.welcomed !== "yes";
  } catch {
    return true;
  }
}
