/**
 * Every number the install invitation is timed by, in one place.
 *
 * They are here rather than beside the code that uses them because the whole
 * risk of this feature is a number written twice: a threshold that says five
 * minutes in the module that measures and five minutes in the module that
 * decides is a threshold that will one day say five in one and three in the
 * other, and the symptom is a grown-up being asked twice.
 *
 * Nothing here is a product decision a child can feel except the first two.
 * The rest are the cost of measuring honestly.
 */

/**
 * How much *active* use earns the invitation.
 *
 * Not five minutes since the page loaded — five minutes of the app actually
 * being looked at and touched. See `activeUse.ts` for what counts.
 */
export const INSTALL_PROMPT_ACTIVE_MS = 5 * 60 * 1000;

/**
 * How long "Not now" lasts.
 *
 * A week, and it is the most important number in the file. The invitation is
 * an invitation: asked once and answered, it goes away for long enough that
 * the answer meant something.
 */
export const INSTALL_PROMPT_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * How often active time accrues while the app is being used.
 *
 * The clock only exists while the document is visible and focused, so this
 * is not a background timer — see `activeUse.ts`. Five seconds is coarse
 * enough to cost nothing and fine enough that the threshold lands within a
 * few seconds of where it should.
 */
export const ACTIVE_TICK_MS = 5 * 1000;

/**
 * How long after the last interaction the app still counts as being used.
 *
 * A story panel can hold a child's attention without a single tap, so this
 * is generous. What it is for is the other case: a tab left open on a lit
 * screen in an empty room, which must never accumulate towards anything.
 */
export const ACTIVE_IDLE_MS = 90 * 1000;

/**
 * How often accumulated time is written down.
 *
 * Never on an interaction. A pointer event that writes to `localStorage` is
 * a pointer event that can jank a page turn, and there is nothing here worth
 * a dropped frame.
 */
export const PERSIST_EVERY_MS = 30 * 1000;

/**
 * How long a calm screen has to stay calm before the invitation appears on it.
 *
 * Eligibility is usually reached mid-story or mid-game, so the sheet is
 * waiting for a quiet moment by the time one arrives. Without this pause it
 * would open in the same instant as the screen a child just navigated to,
 * which reads as the app having been waiting to pounce.
 */
export const SETTLE_MS = 1_500;
