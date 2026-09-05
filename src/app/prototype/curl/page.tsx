import { notFound } from "next/navigation";

import { getChapters, type Card } from "@/content";

import CurlBook from "./CurlBook";

/**
 * A prototype, not a feature.
 *
 * Evaluates a genuine page-curl: the current page's edge lifts and recedes
 * while the next page is revealed underneath it, rather than two flat cards
 * rotating or sliding past each other. Nothing links here and the app does
 * not import it.
 */

const READABLE = new Set<Card["kind"]>([
  "cover",
  "story",
  "verse",
  "celebration",
]);

export default function CurlPrototypePage() {
  const chapter = getChapters().find((c) => c.slug === "stephen");
  if (!chapter) notFound();

  return (
    <CurlBook cards={chapter.cards.filter((c) => READABLE.has(c.kind))} />
  );
}
