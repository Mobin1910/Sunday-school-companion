import Selection from "./selection/Selection";
import type { ModelProps } from "./types";

/**
 * Which model plays which presentation.
 *
 * A switch rather than a lookup table, because it narrows the interaction
 * type as it goes — each model receives exactly the shape it handles, checked
 * by the compiler rather than asserted.
 *
 * Version 1 builds five presentations. This is the first.
 */
export function renderModel(props: ModelProps) {
  const { interaction } = props;

  switch (interaction.type) {
    case "multiple-choice":
      return <Selection {...props} interaction={interaction} />;

    // Not built yet: match, sequence, arrange-words and reveal arrive in
    // Milestones 5 to 7. Cards carrying them are not shown to a child until
    // then, so this is unreachable rather than a silent gap.
    default:
      return null;
  }
}
