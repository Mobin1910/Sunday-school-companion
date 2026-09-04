import { notFound } from "next/navigation";

import { getChapters, type Card } from "@/content";

import TurnBook from "./TurnBook";

/**
 * A prototype, not a feature.
 *
 * Real turn.js running on a real chapter, so the page-turn question can be
 * settled by handling it rather than by argument. Nothing links here, the
 * app does not import it, and deleting this folder plus
 * public/vendor/turnjs removes every trace.
 *
 * The licence for turn.js is unresolved — see the README in that folder.
 */

const READABLE = new Set<Card["kind"]>([
  "cover",
  "story",
  "verse",
  "celebration",
]);

export default function TurnPrototypePage() {
  const chapter = getChapters().find((c) => c.slug === "stephen");
  if (!chapter) notFound();

  return <TurnBook cards={chapter.cards.filter((c) => READABLE.has(c.kind))} />;
}
