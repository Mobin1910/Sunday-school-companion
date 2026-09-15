"use client";

import { useEffect, useRef } from "react";

import InteractionPlayer from "@/interactions/InteractionPlayer";
import type { PlayInteraction } from "@/content";

import { usePage } from "./PageContext";

/**
 * A gentle "did you notice?".
 *
 * The card hands the interaction to the player and then stays out of the way.
 * It deliberately learns nothing about what happens inside — not whether the
 * child needed help, not how many tries it took. What it does learn is the
 * one bit the page above it needs: that this has been answered.
 *
 * It does not turn the page itself. It says so, and the reader turns it —
 * which keeps the turning in the one component that owns it, and keeps this
 * card usable on screens that have no pages at all.
 */
export default function QuizCard({
  interaction,
}: {
  interaction: PlayInteraction;
}) {
  /*
    Whether anyone is looking at this, and what to do when it is answered,
    both come from the page rather than from a prop. Off a reader — in a
    chapter's games, or the shuffled pool — the default says "you are the
    only thing here, and nothing follows", which is exactly right there.
  */
  const page = usePage();

  /*
    Held so that a page already turned, or a chapter already left, cannot be
    followed by a page turn nobody is there for.

    Reset on mount as well as latched on unmount, and the reset is the part
    that matters. The reader moves a page between two slots — the neighbour
    waiting underneath and the one being read — which unmounts and remounts
    it; React's development double-invoke does the same thing on the first
    render. Either way the cleanup fired while the ref lived on, and the card
    came back already believing it had been answered, so the page it was
    sitting on could never turn itself again.
  */
  const solved = useRef(false);
  useEffect(() => {
    solved.current = false;
    return () => {
      solved.current = true;
    };
  }, []);

  return (
    <InteractionPlayer
      interaction={interaction}
      active={page.active}
      onComplete={() => {
        if (solved.current) return;
        solved.current = true;
        page.onSolved?.();
      }}
    />
  );
}
