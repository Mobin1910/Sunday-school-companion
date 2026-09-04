"use client";

import { useEffect, useRef, useState } from "react";

import type { Card } from "@/content";

/**
 * turn.js, wired to a real chapter, so the effect can be judged rather than
 * argued about.
 *
 * This is a prototype and is not part of the app. It exists at
 * /prototype/turn and nothing links to it.
 *
 * Two things make this awkward, and both are inherent rather than fixable:
 *
 * turn.js takes ownership of the DOM it is given — it rewrites the children,
 * wraps them, and animates them itself. React must therefore never re-render
 * inside the container. The pages are rendered once, and after that this
 * component treats them as somebody else's property.
 *
 * It also needs jQuery, and jQuery 1.7 specifically, which is loaded from
 * public/vendor at runtime rather than bundled. See the README there: the
 * licence for turn.js is unresolved.
 */

const VENDOR = "/vendor/turnjs";

/**
 * The slice of jQuery and turn.js this prototype touches. turn.js ships no
 * types and hasn't been published since 2012, so describing the two calls we
 * make is honest and finite — pulling in @types/jquery for this would be a
 * larger dependency than the thing being evaluated.
 */
type TurnCallbacks = { turned: (event: unknown, page: number) => void };
type TurnOptions = {
  display: "single" | "double";
  width: number;
  height: number;
  elevation?: number;
  gradients?: boolean;
  acceleration?: boolean;
  autoCenter?: boolean;
  duration?: number;
  when?: Partial<TurnCallbacks>;
};
type TurnTarget = { turn: (options: TurnOptions) => void };
type JQueryLike = (element: Element) => TurnTarget;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = false;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`could not load ${src}`));
    document.head.appendChild(el);
  });
}

export default function TurnBook({ cards }: { cards: Card[] }) {
  const book = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("loading turn.js…");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        // Order matters — turn.js attaches itself to jQuery.
        await loadScript(`${VENDOR}/jquery.min.1.7.js`);
        await loadScript(`${VENDOR}/modernizr.2.5.3.min.js`);
        await loadScript(`${VENDOR}/turn.min.js`);
      } catch (error) {
        setStatus(String(error));
        return;
      }

      if (cancelled || !book.current) return;

      const jq = (window as unknown as { jQuery?: JQueryLike }).jQuery;

      if (!jq) {
        setStatus("jQuery did not attach to window");
        return;
      }

      // turn.js wants fixed pixel dimensions and will not adapt on its own.
      const frame = book.current.parentElement;
      const width = frame?.clientWidth ?? window.innerWidth;
      const height = frame?.clientHeight ?? window.innerHeight;

      try {
        jq(book.current).turn({
          display: "single",
          width,
          height,
          elevation: 50,
          gradients: true,
          acceleration: true,
          autoCenter: false,
          duration: 900,
          when: {
            turned: (_event, turnedTo) => setPage(turnedTo),
          },
        });
        setStatus("");
      } catch (error) {
        setStatus(`turn.js failed to start: ${String(error)}`);
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
    // Deliberately runs once. Re-running would hand turn.js a DOM it has
    // already rewritten.
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-[#16181d]">
      <div className="flex items-center gap-3 px-3 py-2 text-[#8d95a5]">
        <span className="font-mono text-xs">turn.js 4.1.0 · prototype</span>
        <span className="ml-auto font-mono text-xs">
          page <b className="text-[#e8eaef]">{page}</b>/{cards.length}
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden bg-ground">
        {status ? (
          <p className="absolute inset-0 z-10 grid place-items-center px-8 text-center text-base text-ink-soft">
            {status}
          </p>
        ) : null}

        <div ref={book} className="h-full w-full">
          {cards.map((card, index) => (
            <div key={index} className="flex h-full w-full flex-col bg-ground">
              <div
                className="flex-1"
                style={{ background: sceneFor(index) }}
                aria-hidden
              />
              <div className="flex min-h-24 items-center justify-center border-t border-edge bg-ground-raised px-6 py-4 text-center text-xl leading-snug text-balance">
                {captionOf(card)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="bg-[#16181d] px-3 py-2 font-mono text-[11px] leading-relaxed text-[#8d95a5]">
        Drag from the right edge. Nothing in the app uses this — see
        public/vendor/turnjs/README.md before deciding anything.
      </p>
    </div>
  );
}

function captionOf(card: Card): string {
  switch (card.kind) {
    case "cover":
      return "Stephen";
    case "story":
      return card.text ?? "";
    case "verse":
      return `${card.text} — ${card.reference}`;
    case "celebration":
      return card.message;
    default:
      return "";
  }
}

/** Standing in for illustration. Pages must differ or a turn proves nothing. */
function sceneFor(index: number): string {
  const hues = [38, 30, 44, 46, 96, 28, 208, 42, 40, 24, 36, 34];
  const h = hues[index % hues.length] ?? 38;
  return (
    `radial-gradient(120% 80% at 28% 22%, hsl(${h} 62% 78%) 0%, transparent 58%),` +
    `radial-gradient(90% 70% at 78% 84%, hsl(${h} 48% 52%) 0%, transparent 52%),` +
    `linear-gradient(158deg, hsl(${h} 55% 82%), hsl(${h} 35% 46%))`
  );
}
