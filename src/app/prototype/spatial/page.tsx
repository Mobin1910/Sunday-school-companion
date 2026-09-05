import { notFound } from "next/navigation";

import { getChapters, type Card } from "@/content";

import SpatialBook from "./SpatialBook";

/**
 * A prototype, not a feature.
 *
 * Evaluates a gesture-driven spatial page transition — the outgoing page
 * recedes and settles back, the incoming page grows into place — as a
 * replacement for the physical page-turn idea (dropped: turn.js's licence
 * was unresolved, and a literal book felt like the wrong metaphor anyway).
 *
 * Nothing links here and the app does not import it.
 */

const READABLE = new Set<Card["kind"]>([
  "cover",
  "story",
  "verse",
  "celebration",
]);

export default function SpatialPrototypePage() {
  const chapter = getChapters().find((c) => c.slug === "stephen");
  if (!chapter) notFound();

  return (
    <SpatialBook cards={chapter.cards.filter((c) => READABLE.has(c.kind))} />
  );
}
