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
  onMiss: () => void;
  onArrive: () => void;
};

export type MultipleChoice = Extract<
  PlayInteraction,
  { type: "multiple-choice" }
>;
