/**
 * How patient the app is.
 *
 * Every number here is a guess until we have watched real children meet it,
 * so they live in one place and are meant to be tuned from play-testing
 * rather than reasoned about.
 *
 * Help offered too early steals the moment a child was about to have. Help
 * offered too late leaves them defeated. When unsure, wait longer than feels
 * comfortable — six-year-olds think slowly, and slow thinking is not
 * struggling.
 */
export const TIMING = {
  /**
   * How many tries that did not work before *help* begins.
   *
   * Every miss is answered, from the first — a tap that gets no reply reads
   * as an app that did not notice. What the first one gets is a word and a
   * look and nothing else: no rung, no narrowing, no clue. Help is a
   * different thing from being answered, and it still waits.
   */
  missesBeforeHelp: 2,

  /** Stillness is as loud a call for help as a wrong answer. */
  stillnessBeforeFirstHelp: 20_000,
  stillnessBetweenRungs: 15_000,

  /**
   * The pause between a try that did not work and the Recovery that follows.
   *
   * This is the whole effect. Help that arrives instantly reads as a response
   * to the mistake; help that arrives a beat later reads as company.
   */
  beforeRecovery: 600,

  /** Recovery is read, and then help arrives. */
  recoveryBeforeHelp: 1400,
} as const;
