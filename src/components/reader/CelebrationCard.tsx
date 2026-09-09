"use client";

import HaloPresence from "@/halo/HaloPresence";
import Confetti from "@/interactions/Confetti";

import { usePage } from "./PageContext";

/**
 * The warm ending.
 *
 * The message names what this child just did, because generic praise for
 * nothing is worth nothing. Nothing here counts, scores or compares.
 *
 * Halo comes to the end of the chapter, and this is the one place in the
 * reader it does. Everywhere else Halo stays out — the pages are the story,
 * and a companion standing in the middle of them would be an interface
 * walking into a painting. This page is not the story: it is the moment
 * after it, addressed to the child rather than about the Bible, and the
 * whole point of the moment is that somebody is pleased with them. A picture
 * cannot be pleased with anyone.
 *
 * It celebrates rather than being merely happy, and the difference is the
 * one written into the expression table: happy is Halo pleased *with* a
 * child, celebrating is Halo sharing their moment at full brightness. Both
 * wear the same curved eyes; this one brings the rest of the light with it.
 *
 * The burst waits for the child. This card is mounted before it is reached —
 * the reader keeps the next page ready underneath so it can be revealed
 * mid-turn — so a burst thrown on mount would be over before anyone arrived.
 * It is thrown when the page becomes the page being read, and it is the same
 * burst for every child: nothing here is earned, and nothing is bigger for
 * having gone faster.
 */
export default function CelebrationCard({ message }: { message: string }) {
  const page = usePage();

  return (
    <>
      <div
        className="relative"
        style={
          {
            "--halo-room": "clamp(6.5rem, 20vh, 10rem)",
            /* This Halo is half again the size of the one beside a
               question, so the burst is thrown half again as far. */
            "--confetti-scale": 1.5,
          } as React.CSSProperties
        }
      >
        {page.active ? <Confetti /> : null}
        <HaloPresence state="celebrating" placement="inline" />
      </div>

      <div className="celebration-light relative px-6">
        <p className="breathe relative max-w-sm text-center text-3xl leading-relaxed text-balance text-joy">
          {message}
        </p>
      </div>
    </>
  );
}
