"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";

/**
 * Turns the pages of a chapter.
 *
 * The paging is native CSS scroll-snap rather than a JavaScript carousel.
 * That gives real swipe physics and real momentum on a phone, which is the
 * difference between turning a page and operating a control — and it is less
 * code than any version we would write ourselves.
 *
 * Navigation lives outside the scrolling track so the buttons never move
 * between pages. A control that stays exactly where it was is calmer for a
 * child than one that slides in with each screen, and it keeps the focus
 * order to one forward button rather than one per page.
 *
 * The pages arrive as children, already rendered on the server, because they
 * contain illustrations resolved from disk at build time.
 */
export default function ChapterReader({
  children,
}: {
  children: React.ReactNode;
}) {
  const pages = Children.toArray(children);
  const trackRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  // Only true once the reader is running, so the styles that depend on
  // JavaScript never hide anything from a child whose JavaScript failed.
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => setEnhanced(true), []);

  const lastPage = pages.length - 1;
  const onFirstPage = active === 0;
  const onLastPage = active === lastPage;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset["index"]));
          }
        }
      },
      { root: track, threshold: 0.6 },
    );

    for (const page of track.children) observer.observe(page);
    return () => observer.disconnect();
  }, [pages.length]);

  const goTo = useCallback(
    (index: number, jump = false) => {
      const track = trackRef.current;
      if (!track) return;

      const stillness = window.matchMedia("(prefers-reduced-motion: reduce)");
      const target = Math.max(0, Math.min(pages.length - 1, index));

      track.scrollTo({
        left: target * track.clientWidth,
        behavior: jump || stillness.matches ? "auto" : "smooth",
      });
    },
    [pages.length],
  );

  return (
    <div className="flex h-dvh flex-col" data-enhanced={enhanced}>
      <Dots count={pages.length} active={active} />

      <ol
        ref={trackRef}
        tabIndex={0}
        aria-label="Story pages"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") goTo(active + 1);
          if (event.key === "ArrowLeft") goTo(active - 1);
        }}
        className="reader-track flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain outline-none"
      >
        {pages.map((page, index) => (
          <li
            key={index}
            data-index={index}
            data-active={index === active}
            className="flex h-full w-full shrink-0 snap-center"
          >
            {page}
          </li>
        ))}
      </ol>

      <p className="sr-only" aria-live="polite">
        Page {active + 1} of {pages.length}
      </p>

      <nav className="flex items-center justify-between px-6 pt-2 pb-8">
        {/* Hidden rather than disabled on the first page. A child should never
            be shown something they are not allowed to press. */}
        {onFirstPage ? (
          <span className="size-16" aria-hidden />
        ) : (
          <RoundButton onClick={() => goTo(active - 1)} label="Go back" quiet>
            <ArrowLeft />
          </RoundButton>
        )}

        {onLastPage ? (
          // Never a dead end. The end of a chapter offers the thing children
          // this age actually want, which is to read it again.
          <RoundButton onClick={() => goTo(0, true)} label="Read it again">
            <Repeat />
          </RoundButton>
        ) : (
          <RoundButton onClick={() => goTo(active + 1)} label="Next page">
            <ArrowRight />
          </RoundButton>
        )}
      </nav>
    </div>
  );
}

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 pt-4 pb-2"
      aria-hidden
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            index === active ? "w-5 bg-touchable" : "w-1.5 bg-edge"
          }`}
        />
      ))}
    </div>
  );
}

function RoundButton({
  onClick,
  label,
  quiet = false,
  children,
}: {
  onClick: () => void;
  label: string;
  quiet?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex size-16 items-center justify-center rounded-full transition-transform duration-150 active:scale-95 ${
        quiet
          ? "bg-ground-raised text-ink-soft"
          : "bg-touchable text-ground-raised shadow-sm"
      }`}
    >
      {children}
    </button>
  );
}

const iconProps = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ArrowRight = () => (
  <svg {...iconProps}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const ArrowLeft = () => (
  <svg {...iconProps}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);

const Repeat = () => (
  <svg {...iconProps}>
    <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 3v5h-5" />
    <path d="M20 12a8 8 0 0 1-13.7 5.6L4 16M4 21v-5h5" />
  </svg>
);
