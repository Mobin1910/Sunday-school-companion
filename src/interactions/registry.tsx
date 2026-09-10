import type { PlayInteraction } from "@/content";

import Pairing from "./pairing/Pairing";
import Selection from "./selection/Selection";
import Reveal from "./reveal/Reveal";
import Sequence from "./sequence/Sequence";
import Words from "./words/Words";
import type { ModelProps } from "./types";

/**
 * Whether an interaction has a model to play it yet.
 *
 * Navigation needs to ask this before it offers a child a door: a section
 * whose only interaction cannot be played should say "not yet" on the way
 * in, not after. It sits beside the switch below so the two can never
 * disagree — adding a model means editing this file once.
 */
export function canPlay(interaction: PlayInteraction): boolean {
  return (
    interaction.type === "multiple-choice" ||
    interaction.type === "match" ||
    interaction.type === "sequence" ||
    interaction.type === "arrange-words" ||
    interaction.type === "reveal"
  );
}

/**
 * Which model plays which presentation.
 *
 * A switch rather than a lookup table, because it narrows the interaction
 * type as it goes — each model receives exactly the shape it handles, checked
 * by the compiler rather than asserted.
 *
 * Version 1 builds five presentations. All five are here.
 */
export function renderModel(props: ModelProps) {
  const { interaction } = props;

  switch (interaction.type) {
    case "multiple-choice":
      return <Selection {...props} interaction={interaction} />;

    case "match":
      return <Pairing {...props} interaction={interaction} />;

    case "sequence":
      return <Sequence {...props} interaction={interaction} />;

    case "arrange-words":
      return <Words {...props} interaction={interaction} />;

    case "reveal":
      return <Reveal {...props} interaction={interaction} />;
  }
}
