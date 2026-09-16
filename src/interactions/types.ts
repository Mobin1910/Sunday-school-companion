import type { PlayInteraction } from "@/content";

/**
 * What every interaction model is handed.
 *
 * Assistance is not a function a model exposes — it is how a model looks at a
 * given rung. Passing the rung in as a required prop means a model cannot be
 * written without deciding how it helps a stuck child.
 *
 * A model reports two things and nothing else: that did not work, and we are
 * there. It never reports how many times, because nothing may count.
 */
export type ModelProps<T extends PlayInteraction = PlayInteraction> = {
  interaction: T;
  /** 0 alone · 1 a word · 2 a clue · 3 together */
  rung: number;
  /** Already arrived. Nothing more should respond to touch. */
  locked: boolean;
  /**
   * Whether anyone is actually looking at this.
   *
   * The reader keeps the next page mounted so it can be revealed mid-drag, so
   * a model that runs on its own clock — showing something, hiding it, moving
   * it — would otherwise play its whole opening to an empty room and be
   * half-finished by the time the child arrived. Models with no timers can
   * ignore it. `InteractionPlayer` already knew this; it just had no way to
   * say so.
   */
  active: boolean;
  onMiss: () => void;
  onArrive: () => void;
};

export type MultipleChoice = Extract<
  PlayInteraction,
  { type: "multiple-choice" }
>;

export type Ordering = Extract<PlayInteraction, { type: "sequence" }>;

export type Pairing = Extract<PlayInteraction, { type: "match" }>;

export type ArrangeWords = Extract<PlayInteraction, { type: "arrange-words" }>;

export type Discovery = Extract<PlayInteraction, { type: "reveal" }>;

export type Pouring = Extract<PlayInteraction, { type: "pouring" }>;

export type Finding = Extract<PlayInteraction, { type: "find-the-coin" }>;

export type WriteReference = Extract<
  PlayInteraction,
  { type: "write-reference" }
>;

export type Journey = Extract<PlayInteraction, { type: "journey" }>;

export type Provision = Extract<PlayInteraction, { type: "provision" }>;

export type TrueOrNot = Extract<PlayInteraction, { type: "true-or-not" }>;
