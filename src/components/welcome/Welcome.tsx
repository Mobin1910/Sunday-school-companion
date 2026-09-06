"use client";

import { useEffect, useRef, useState } from "react";

import { arrivalTaken, claimArrival } from "@/halo/arrival";
import HaloPresence from "@/halo/HaloPresence";
import type { HaloState } from "@/halo/state";
import { markWelcomed, saveName, tidyName } from "@/local/child";

/**
 * Meeting Halo.
 *
 * Four beats, one screen. Halo is mounted once and never remounts, so it
 * arrives, settles, breathes and changes mood continuously while the words
 * around it change — which is the whole difference between a companion
 * introducing itself and four slides about a product. Nothing here is a
 * card, nothing is a step indicator, and there are no progress dots: a
 * child being welcomed is not filling in a form.
 *
 * It reuses everything. The arrival is Home's arrival (`.halo-arriving`),
 * the states are the ordinary expression table, the name goes through the
 * same `saveName` Settings uses, and the ground is the same night. There is
 * no second Halo implementation here and no second design system.
 *
 * Halo's mood is the argument for this being a companion rather than a
 * flow: it is listening while it introduces itself, curious while it says
 * what it can do, and it becomes happy the moment a child writes their name
 * — before the button is pressed, because that is when the meeting actually
 * happens.
 */

type Step = 0 | 1 | 2 | 3;

/** How long "Nice to meet you" is allowed to be its own moment. */
const MEETING_MS = 1500;

export default function Welcome({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>(0);
  const [draft, setDraft] = useState("");
  /** The beat between giving a name and the last screen. */
  const [meeting, setMeeting] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [name, setName] = useState("");

  const [arriving] = useState(() => !arrivalTaken());
  useEffect(() => {
    claimArrival();
  }, []);

  const field = useRef<HTMLInputElement>(null);
  const words = useRef<HTMLDivElement>(null);

  /*
    Each beat takes the focus.

    Without this the focus stays on the button that was just pressed, which
    React reuses across beats — so a child using a keyboard or a screen
    reader presses "next" and is told nothing has happened. Moving it to the
    words announces the new beat and puts the next Tab where it belongs.

    It is deliberately the words and not the name field, even on the beat
    that asks for a name. Focusing the field would raise the keyboard over
    Halo at exactly the moment Halo is asking the child something personal;
    the field is one tap away, and pressing the button without a name puts
    the cursor there anyway.
  */
  useEffect(() => {
    words.current?.focus({ preventScroll: true });
  }, [step, meeting]);

  /*
    Back walks the beats rather than leaving.

    A child who taps back should undo the last thing they did, and on this
    screen the last thing they did was move forward. Each step pushes an
    entry, so the browser's own gesture — and a tablet's — behaves the way
    everything else in the app does: back goes up one level.
  */
  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      const to = (event.state as { welcomeStep?: number } | null)?.welcomeStep;
      setMeeting(false);
      setStep(typeof to === "number" ? (Math.max(0, to) as Step) : 0);
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const goTo = (next: Step) => {
    setStep(next);
    try {
      window.history.pushState({ welcomeStep: next }, "");
    } catch {
      // A history that will not take an entry is not a reason to stop.
    }
  };

  const submitName = () => {
    const given = tidyName(draft);

    // Not an error. Nothing has gone wrong — Halo simply has not been told
    // yet, so it asks again, in the same voice, and points at the field.
    if (given === "") {
      setNudge(true);
      field.current?.focus();
      return;
    }

    setName(saveName(given));
    setNudge(false);
    setMeeting(true);
  };

  // The meeting is a beat, not a screen. It ends on its own.
  useEffect(() => {
    if (!meeting) return;
    const timer = window.setTimeout(() => {
      setMeeting(false);
      goTo(3);
    }, MEETING_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting]);

  const finish = () => {
    markWelcomed();
    onDone();
  };

  /*
    Halo's mood, as one expression rather than a branch in four places.
    `happy` the moment a name is written — the meeting is the writing of it,
    not the pressing of the button afterwards.
  */
  const halo: HaloState = meeting
    ? "happy"
    : step === 3
      ? "happy"
      : step === 2
        ? draft.trim()
          ? "happy"
          : "listening"
        : step === 1
          ? "curious"
          : "listening";

  return (
    <div className="welcome" data-step={meeting ? "meeting" : step}>
      <div className="welcome-stage">
        {arriving ? <div className="home-arrival" aria-hidden /> : null}

        <HaloPresence
          state={halo}
          placement="hero"
          className={`${arriving ? "halo-arriving" : ""} ${
            meeting ? "halo-gladdening" : ""
          }`}
        />
      </div>

      {/*
        One live region for the whole welcome. The beats replace each other
        rather than stacking, so a screen reader hears the same one thing a
        child sees, in the same order.
      */}
      <div
        ref={words}
        tabIndex={-1}
        className="welcome-words"
        key={meeting ? "meeting" : step}
      >
        {meeting ? (
          <p className="welcome-meeting" aria-live="polite">
            Nice to meet you, {name}!
          </p>
        ) : step === 0 ? (
          <>
            <h1 className="welcome-title">Hi! I&rsquo;m Halo.</h1>
            <p className="welcome-copy">
              I&rsquo;ll be your little companion as you explore the Bible.
            </p>
          </>
        ) : step === 1 ? (
          <>
            <h1 className="welcome-title">
              I&rsquo;m here to help you discover God&rsquo;s Word.
            </h1>
            <p className="welcome-copy">
              We&rsquo;ll explore amazing Bible stories, play fun games, learn
              special verses, and discover what God teaches us.
            </p>

            {/*
              Four words and four small marks, sitting in the dark. Not
              cards, not tiles and not a grid of panels — the point is that
              these are things Halo does with the child, and a dashboard
              would make them things the app contains.
            */}
            <ul className="welcome-things">
              {THINGS.map(({ label, icon: Icon }) => (
                <li key={label}>
                  <Icon />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </>
        ) : step === 2 ? (
          <>
            <h1 className="welcome-title">Before we begin&hellip;</h1>
            <label htmlFor="welcome-name" className="welcome-copy">
              What should I call you?
            </label>

            <input
              ref={field}
              id="welcome-name"
              className="welcome-field"
              value={draft}
              onChange={(event) => {
                setDraft(tidyName(event.target.value));
                setNudge(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitName();
              }}
              placeholder="Your name"
              autoComplete="given-name"
              autoCapitalize="words"
              spellCheck={false}
              enterKeyHint="done"
            />

            <p className="welcome-nudge" aria-live="polite">
              {nudge ? "Tell me your name and we can start." : " "}
            </p>
          </>
        ) : (
          <>
            <h1 className="welcome-title">Ready, {name || "friend"}?</h1>
            <p className="welcome-copy">
              There are lots of stories to discover. Let&rsquo;s see where your
              adventure begins.
            </p>
          </>
        )}
      </div>

      <div className="welcome-act">
        {meeting ? null : step === 0 ? (
          <Onward onClick={() => goTo(1)}>Nice to meet you →</Onward>
        ) : step === 1 ? (
          <Onward onClick={() => goTo(2)}>Let&rsquo;s explore →</Onward>
        ) : step === 2 ? (
          <Onward onClick={submitName}>That&rsquo;s me! →</Onward>
        ) : (
          <Onward onClick={finish}>Let&rsquo;s go! ✨</Onward>
        )}
      </div>
    </div>
  );
}

function Onward({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="welcome-onward">
      {children}
    </button>
  );
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const THINGS = [
  {
    label: "Stories",
    icon: () => (
      <svg {...iconProps}>
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z" />
        <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z" />
      </svg>
    ),
  },
  {
    label: "Games",
    icon: () => (
      <svg {...iconProps}>
        <path d="M12 4l1.8 4.9L19 10.5l-5.2 1.6L12 17l-1.8-4.9L5 10.5l5.2-1.6z" />
        <path d="M18 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
      </svg>
    ),
  },
  {
    label: "Verses",
    icon: () => (
      <svg {...iconProps}>
        <path d="M12 19.5S4.5 15 4.5 9.8A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7.5 1.8c0 5.2-7.5 9.7-7.5 9.7z" />
      </svg>
    ),
  },
  {
    label: "Discover",
    icon: () => (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="8" />
        <path d="M14.8 9.2 13.4 13.4 9.2 14.8l1.4-4.2z" />
      </svg>
    ),
  },
];
