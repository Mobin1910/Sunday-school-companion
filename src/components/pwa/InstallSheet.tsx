"use client";

import { useEffect, useId, useRef } from "react";

import type { InvitationKind } from "@/pwa/invitation";
import type { Stage } from "@/pwa/manager";

/**
 * The invitation itself: a sheet that rises from the bottom of the screen.
 *
 * A sheet rather than a centred dialog, and it covers about a third of a phone
 * rather than all of it. That is a product decision, not a layout one — the
 * screen behind stays visible, so what a child was doing is still there and
 * the sheet reads as something offered beside it rather than a wall across it.
 * A full-screen takeover would make an invitation feel like a gate.
 *
 * ## Who this is for
 *
 * The grown-up, and only the grown-up. `PRODUCT_CONSTITUTION.md` is explicit:
 * "The parent is not a user. The parent is the door", and the one adult-facing
 * moment the product is allowed is an install moment "written for an adult, not
 * a child". So the copy says so in as many words, and nothing here asks a child
 * to do anything or suggests they are missing out on anything. A six-year-old
 * who reads this sheet should understand it is not addressed to them, and a
 * six-year-old who ignores it loses nothing at all.
 *
 * There is no "you must", no "to continue", no countdown and no third option
 * dressed up as a second. "Not now" is a real answer and it lasts a week.
 *
 * ## Visual
 *
 * The existing language, unchanged: a `surface` with its hairline edge, one
 * `cta` as the single lit thing, and a `btn-quiet` beside it. No new palette,
 * no new radius, no gradient invented for this screen. Halo appears as a small
 * still mark rather than the animated companion — this is the adult's sheet,
 * and putting the child's friend in it, moving, to sell an install would be
 * using Halo as an advertisement.
 */
export default function InstallSheet({
  kind,
  stage,
  asking,
  onInstall,
  onHow,
  onBack,
  onNotNow,
}: {
  kind: InvitationKind;
  stage: Stage;
  /** A native prompt is in flight; the buttons wait rather than double-fire. */
  asking: boolean;
  onInstall: () => void;
  onHow: () => void;
  onBack: () => void;
  onNotNow: () => void;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();

  /*
    Focus moves into the sheet when it opens, and Escape closes it. Both are
    done here because this is the product's first modal — there is no existing
    modal system to inherit from, and the next one should inherit from this.

    Focus lands on the sheet itself rather than on the primary button. A screen
    reader then announces the dialog, its heading and its body before the
    actions, which is the order a person needs; landing on "Install App" reads
    the button and leaves the reason behind it unsaid.
  */
  useEffect(() => {
    sheet.current?.focus();
  }, []);

  /*
    A focus trap, and the reason it is hand-written rather than inherited: the
    sheet is the only thing on screen that should be reachable while it is up,
    and the rest of the page is left in the tab order by the browser. It is
    eleven lines and it is the difference between a keyboard user being able to
    answer the question and being able to tab into a story behind it.
  */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onNotNow();
        return;
      }

      if (event.key !== "Tab") return;

      const box = sheet.current;
      if (!box) return;

      const stops = box.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onNotNow]);

  const how = kind === "ios" && stage === "how";

  return (
    <div className="install-layer">
      {/*
        A scrim, and it is deliberately not a dismiss target. Tapping outside
        would be a way to answer the question by accident, and an accidental
        "not now" costs a week. The two answers are both buttons.

        `aria-hidden` because it carries nothing; the dialog beside it is the
        content.
      */}
      <div className="install-scrim" aria-hidden />

      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        className="install-sheet surface"
      >
        <div className="install-grip" aria-hidden />

        {how ? (
          <>
            <h2 id={titleId} className="install-title">
              Add to your Home Screen
            </h2>

            {/*
              An ordered list, because the order is the instruction. Each step
              names what a grown-up is looking for rather than where it is: the
              Share button has moved between iOS versions and sits in different
              corners in different apps, and a sheet that says "bottom of the
              screen" is wrong on an iPad and wrong again next September.
            */}
            <ol id={bodyId} className="install-steps">
              <li>
                <span className="install-step-mark" aria-hidden>
                  <ShareIcon />
                </span>
                <span>
                  Tap the <strong>Share</strong> button in Safari.
                </span>
              </li>
              <li>
                <span className="install-step-mark" aria-hidden>
                  <PlusIcon />
                </span>
                <span>
                  Choose <strong>Add to Home Screen</strong>.
                </span>
              </li>
              <li>
                <span className="install-step-mark" aria-hidden>
                  <TickIcon />
                </span>
                <span>
                  Tap <strong>Add</strong>.
                </span>
              </li>
            </ol>

            <div className="install-actions">
              <button type="button" className="btn-quiet install-btn" onClick={onBack}>
                Back
              </button>
              <button type="button" className="btn-quiet install-btn" onClick={onNotNow}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="install-head">
              <span className="install-mark" aria-hidden>
                <HaloMark />
              </span>
              <div>
                <p className="install-eyebrow">For a grown-up</p>
                <h2 id={titleId} className="install-title">
                  {kind === "native"
                    ? "Keep Sunday School Companion with you"
                    : "Keep Sunday School Companion close"}
                </h2>
              </div>
            </div>

            <p id={bodyId} className="install-body">
              {kind === "native"
                ? "Install the app so the stories, games and memory verses are easy to find."
                : "Add it to the Home Screen so the stories, games and memory verses are easy to find."}
            </p>

            <div className="install-actions">
              <button
                type="button"
                className="cta install-btn"
                onClick={kind === "native" ? onInstall : onHow}
                disabled={asking}
              >
                {kind === "native" ? "Install App" : "Show me how"}
              </button>

              <button
                type="button"
                className="btn-quiet install-btn"
                onClick={onNotNow}
                disabled={asking}
              >
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Halo, still.
 *
 * The ring and the body, at the size of a favicon, drawn flat. Not the real
 * `Halo` component: that one arrives, breathes and looks around, and none of
 * that belongs in a sheet aimed at an adult. A companion animating to sell an
 * installation is the companion being spent on the wrong thing.
 */
function HaloMark() {
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" fill="none" aria-hidden>
      <defs>
        <linearGradient id="install-halo" x1="6" y1="8" x2="34" y2="34">
          <stop offset="0%" stopColor="var(--color-cta-start)" />
          <stop offset="52%" stopColor="var(--color-cta-mid)" />
          <stop offset="100%" stopColor="var(--color-cta-end)" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="22" r="10.5" fill="url(#install-halo)" />
      <ellipse
        cx="20"
        cy="8.5"
        rx="8"
        ry="2.6"
        stroke="var(--color-joy)"
        strokeWidth="1.8"
      />
    </svg>
  );
}

/* The three marks beside the iOS steps. Stroked, so they inherit the ink. */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function ShareIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M12 15.5V3.8" />
      <path d="M8.2 7.6 12 3.8l3.8 3.8" />
      <path d="M6.5 12.5H5.2A1.2 1.2 0 0 0 4 13.7v5.1A1.2 1.2 0 0 0 5.2 20h13.6a1.2 1.2 0 0 0 1.2-1.2v-5.1a1.2 1.2 0 0 0-1.2-1.2h-1.3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="4.2" />
      <path d="M12 8.6v6.8M8.6 12h6.8" />
    </svg>
  );
}

function TickIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M5 12.8 9.6 17.4 19 8" />
    </svg>
  );
}
