"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import type { ClassId } from "@/classes/registry";
import type { PlayInteraction } from "@/content";
import InteractionPlayer from "@/interactions/InteractionPlayer";
import { readRun, writeRun } from "@/local/run";
import { finishedVerse } from "@/local/session";
import { streakNamed } from "@/local/streak";

/**
 * Practising a chapter's verse, and what a child sees when they have it.
 *
 * The drill itself is an ordinary `InteractionPlayer` — same ladder, same
 * Halo, same celebration. What this adds is the ending, which was missing:
 * a child assembled the verse, watched Halo celebrate, and was never shown
 * the reference. They had learned a sentence without being told where in the
 * Bible it lives, which is most of the point of a memory verse.
 *
 * So the verse and its reference are both shown when it is done, and both
 * come from the chapter file by way of the practice card. Neither is typed
 * into this component: a reference living in a component is a reference that
 * will one day disagree with the chapter it belongs to.
 *
 * It is also the last step of a chapter, and finishing it is what completes
 * the chapter for this session — see `local/session.ts`. Nothing is recorded
 * until the verse is actually finished, and nothing is recorded at all when
 * this is reached from the global Memory Verse, which has no chapter to
 * complete and passes no slug.
 *
 * The verse streak is fed here on the same terms a chapter's games feed the
 * games streak: right first time carries the run, a try that did not work
 * ends it, help arriving on its own does not. A child who held the whole
 * verse and was then told they had practised nothing today would have been
 * told something untrue by the one screen that had just watched them do it.
 * The two streaks stay apart — see `local/streak.ts`.
 */
export default function PractiseVerse({
  interaction,
  text,
  reference,
  classId,
  slug,
  onwardHref,
  onwardLabel,
}: {
  interaction: PlayInteraction;
  text: string;
  reference: string;
  /**
   * Which class's verse streak this feeds. Always known — from the route in
   * a chapter, and from the child's own class in free play — because a
   * streak belongs to a class even when no chapter does.
   */
  classId: ClassId;
  /**
   * The chapter this verse belongs to, when a chapter sent the child here.
   * Absent in free play, which completes nothing.
   */
  slug?: string;
  onwardHref: string;
  onwardLabel: string;
}) {
  const [done, setDone] = useState(false);
  const once = useRef(false);
  const stumbled = useRef(false);
  const streak = streakNamed("verse", classId);

  return done ? (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 px-4">
      <p className="text-center text-lg text-ink-soft">Verse complete!</p>

      {/*
        The whole verse, and then where it comes from. Not behind another
        tap: a child who has just earned the words should not have to ask
        for the rest of them.
      */}
      <p className="text-center text-[clamp(1.25rem,3.4vh,1.75rem)] leading-relaxed text-balance text-joy">
        {text}
      </p>

      <p className="text-center text-base text-ink-soft">{reference}</p>

      <Link href={onwardHref} className="cta min-h-16 w-full px-6 text-xl">
        {onwardLabel}
      </Link>
    </div>
  ) : (
    <InteractionPlayer
      interaction={interaction}
      onComplete={() => {
        if (once.current) return;
        once.current = true;
        if (slug) finishedVerse(classId, slug);

        const grown = stumbled.current
          ? readRun("verse")
          : readRun("verse") + 1;
        writeRun("verse", grown);
        streak.record(grown);

        // After the celebration has had its moment, not instead of it.
        window.setTimeout(() => setDone(true), 1800);
      }}
      onMiss={() => {
        if (stumbled.current) return;
        stumbled.current = true;
        // The run that just ended is kept before it is let go of. Nothing
        // about ending one is ever said to the child.
        streak.record(readRun("verse"));
        writeRun("verse", 0);
      }}
    />
  );
}
