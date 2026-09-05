"use client";

import Link from "next/link";
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * Turns the pages of a chapter's story with a page curl.
 *
 * Halo is deliberately absent from this file. The story artwork is not his,
 * and a companion floating over a page of Scripture would be the one place
 * he makes the product feel like a game. He belongs on the Hub, in practice
 * and beside the verse — not here.
 *
 * Chosen over scroll-snap and a flat-card slide after prototyping both at
 * /prototype/spatial (deleted) and /prototype/curl (kept, for reference).
 * The curl is two rigid pieces, not one rotating rectangle: `flat` is the
 * untouched majority of the current page, only ever cropped shorter by
 * `clip-path` as the drag advances; `spine` is a narrow strip at that cut
 * boundary, the only part that turns in 3D, and it is decoration only — a
 * light/shadow gradient standing in for the edge of the paper, never a copy
 * of the page's own content. Duplicating live content there would mean two
 * simultaneous instances of a quiz's state and timers.
 *
 * Only two pages are ever mounted: `flat` (the settled, active page) and
 * `under` (whichever neighbour the current drag direction would reveal).
 * That bounds memory and avoids a worse problem — a neighbour's
 * InteractionPlayer sitting fully mounted, and hence fully "on screen" by a
 * plain viewport IntersectionObserver, well before the child has actually
 * turned to it. `under` is always rendered with `active={false}` for
 * exactly that reason; see InteractionPlayer's `active` prop.
 *
 * A drag only begins once the pointer has moved past a small deadzone and
 * the movement reads as horizontal. Below that, or moving mostly downward,
 * nothing here intercepts the pointer at all — a tap on a quiz option still
 * reaches it as an ordinary click, because we never called
 * `setPointerCapture` or `preventDefault` on it.
 *
 * Trade-off worth naming: because only two pages are ever in the DOM, a
 * screen reader can no longer browse the whole chapter as a list the way
 * the old scroll-snap `<ol>` allowed — only the current page and the
 * `aria-live` page-count announcement are available at any moment.
 *
 * The reader is the one full-screen place in the app: no tab bar, no
 * dashboard, nothing framing the artwork. The only chrome is the page dots,
 * a way back up to the Chapter Hub, and — at the end — where to go next.
 */
export default function ChapterReader({
  children,
  hubHref,
  chapterTitle,
  nextChapterHref,
}: {
  children: React.ReactNode;
  /** This chapter's Hub. Always reachable, from every page. */
  hubHref: string;
  chapterTitle: string;
  /** The next chapter's Hub, when there is a next chapter. */
  nextChapterHref?: string;
}) {
  const pages = useMemo(() => Children.toArray(children), [children]);
  const lastPage = pages.length - 1;

  const stage = useRef<HTMLDivElement>(null);
  const spine = useRef<HTMLDivElement>(null);
  const spineShade = useRef<HTMLDivElement>(null);
  const flat = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);

  const position = useRef(0);
  const anchor = useRef(0);
  /**
   * Where a directed turn (keyboard, the nav buttons) is ultimately headed —
   * separate from `anchor`, which only updates once a turn actually settles.
   * Without this, pressing "next" twice quickly, before the first turn
   * finishes, would compute the second press's target from the still-stale
   * settled page and just re-target the same page instead of advancing.
   */
  const targetIndex = useRef(0);
  const dragging = useRef(false);
  const verticalLocked = useRef(false);
  const potentialStart = useRef({ x: 0, y: 0 });
  const startX = useRef(0);
  const startPosition = useRef(0);
  const samples = useRef<{ t: number; x: number }[]>([]);
  const settleFrame = useRef<number | null>(null);

  const [index, setIndex] = useState(0);
  const [underIndex, setUnderIndex] = useState(() => Math.min(1, lastPage));
  const underIndexRef = useRef(underIndex);
  /** The swipe guide is for a child who has not yet turned a page. Once. */
  const [turnedOnce, setTurnedOnce] = useState(false);

  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => setEnhanced(true), []);

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const onFirstPage = index === 0;
  const onLastPage = index === lastPage;

  function widthOf(): number {
    return stage.current?.clientWidth ?? window.innerWidth;
  }

  function renderAt(pos: number) {
    const width = widthOf();
    const raw = pos - anchor.current;
    const progress = Math.max(-1, Math.min(1, raw));
    const forward = progress >= 0;

    const desiredUnder = Math.max(
      0,
      Math.min(lastPage, anchor.current + (forward ? 1 : -1)),
    );
    if (desiredUnder !== underIndexRef.current) {
      underIndexRef.current = desiredUnder;
      setUnderIndex(desiredUnder);
    }

    const dFrac = Math.abs(progress);
    const dPx = dFrac * width;
    const eased = 1 - Math.pow(1 - dFrac, 2);
    const angle = eased * MAX_ANGLE;
    const spineW = MIN_SPINE + eased * (MAX_SPINE - MIN_SPINE);

    const flatEl = flat.current;
    const spineEl = spine.current;
    const shadeEl = spineShade.current;
    const shadowEl = shadow.current;
    if (!flatEl || !spineEl || !shadeEl || !shadowEl) return;

    const cut = Math.min(width, dPx);

    if (forward) {
      const flatEnd = Math.max(0, width - cut);
      const spineStart = flatEnd;
      const spineEnd = Math.min(width, flatEnd + spineW);

      flatEl.style.clipPath = `inset(0 ${width - flatEnd}px 0 0)`;
      spineEl.style.clipPath = `inset(0 ${width - spineEnd}px 0 ${spineStart}px)`;
      spineEl.style.transformOrigin = "left center";
      spineEl.style.transform = `rotateY(${angle}deg)`;

      shadowEl.style.left = `${spineEnd}px`;
      shadowEl.style.right = "auto";
      shadowEl.style.width = `${Math.max(0, Math.min(width - spineEnd, spineW * 1.6))}px`;
      shadowEl.style.background = `linear-gradient(to right, rgba(0,0,0,${(0.28 * eased).toFixed(3)}), rgba(0,0,0,0))`;
      shadeEl.style.background = `linear-gradient(to right, rgba(255,255,255,${(0.18 * eased).toFixed(3)}), rgba(0,0,0,${(0.24 * eased).toFixed(3)}))`;
    } else {
      const flatStart = Math.min(width, cut);
      const spineEnd = flatStart;
      const spineStart = Math.max(0, flatStart - spineW);

      flatEl.style.clipPath = `inset(0 0 0 ${flatStart}px)`;
      spineEl.style.clipPath = `inset(0 ${width - spineEnd}px 0 ${spineStart}px)`;
      spineEl.style.transformOrigin = "right center";
      spineEl.style.transform = `rotateY(${-angle}deg)`;

      shadowEl.style.right = `${width - spineStart}px`;
      shadowEl.style.left = "auto";
      shadowEl.style.width = `${Math.max(0, Math.min(spineStart, spineW * 1.6))}px`;
      shadowEl.style.background = `linear-gradient(to left, rgba(0,0,0,${(0.28 * eased).toFixed(3)}), rgba(0,0,0,0))`;
      shadeEl.style.background = `linear-gradient(to left, rgba(255,255,255,${(0.18 * eased).toFixed(3)}), rgba(0,0,0,${(0.24 * eased).toFixed(3)}))`;
    }

    const visible = dFrac > 0.001;
    spineEl.style.display = visible ? "" : "none";
    shadowEl.style.opacity = visible ? "1" : "0";
  }

  function cancelSettle() {
    if (settleFrame.current !== null) {
      cancelAnimationFrame(settleFrame.current);
      settleFrame.current = null;
    }
  }

  function settleTo(target: number) {
    const clampedTarget = Math.max(0, Math.min(lastPage, target));
    targetIndex.current = clampedTarget;
    const from = position.current;
    const distance = Math.abs(clampedTarget - from);
    const duration = reducedMotion
      ? 1
      : Math.max(180, Math.min(380, 220 + distance * 160));
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      position.current = from + (clampedTarget - from) * eased;
      renderAt(position.current);
      if (t < 1) {
        settleFrame.current = requestAnimationFrame(step);
      } else {
        settleFrame.current = null;
        anchor.current = clampedTarget;
        setIndex(clampedTarget);
        renderAt(position.current);
      }
    };
    settleFrame.current = requestAnimationFrame(step);
  }

  function goTo(rawTarget: number, jump = false) {
    cancelSettle();
    setTurnedOnce(true);
    const target = Math.max(0, Math.min(lastPage, rawTarget));
    targetIndex.current = target;
    if (jump || reducedMotion) {
      position.current = target;
      anchor.current = target;
      setIndex(target);
      renderAt(target);
    } else {
      settleTo(target);
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== undefined && e.button !== 0) return;
    cancelSettle();
    dragging.current = false;
    verticalLocked.current = false;
    potentialStart.current = { x: e.clientX, y: e.clientY };
    startX.current = e.clientX;
    startPosition.current = position.current;
    samples.current = [{ t: performance.now(), x: e.clientX }];
  }

  function onPointerMove(e: React.PointerEvent) {
    if (verticalLocked.current) return;

    if (!dragging.current) {
      const dx = e.clientX - potentialStart.current.x;
      const dy = e.clientY - potentialStart.current.y;
      if (Math.abs(dx) < DEADZONE && Math.abs(dy) < DEADZONE) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        verticalLocked.current = true;
        return;
      }
      dragging.current = true;
      setTurnedOnce(true);
      stage.current?.setPointerCapture(e.pointerId);
    }

    const width = widthOf();
    const dx = e.clientX - startX.current;
    let next = startPosition.current - dx / width;

    if (next < 0) next = -(0 - next) / EDGE_RESISTANCE;
    if (next > lastPage) next = lastPage + (next - lastPage) / EDGE_RESISTANCE;

    position.current = next;
    renderAt(next);

    samples.current.push({ t: performance.now(), x: e.clientX });
    const cutoff = performance.now() - 100;
    while (samples.current.length > 2 && (samples.current[0]?.t ?? 0) < cutoff) {
      samples.current.shift();
    }
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;

    const progress = position.current - anchor.current;
    const first = samples.current[0];
    const last = samples.current[samples.current.length - 1];
    const velocity =
      first && last && last.t !== first.t
        ? (last.x - first.x) / (last.t - first.t)
        : 0;

    let target = anchor.current;
    if (Math.abs(progress) > THRESHOLD) {
      target = anchor.current + (progress > 0 ? 1 : -1);
    } else if (Math.abs(velocity) > FLICK_VELOCITY && Math.abs(progress) > 0.03) {
      target = anchor.current + (velocity < 0 ? 1 : -1);
    }

    settleTo(target);
  }

  useEffect(() => {
    renderAt(position.current);
    const onResize = () => renderAt(position.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showGuide = enhanced && !turnedOnce && pages.length > 1;

  return (
    <div className="flex h-dvh flex-col" data-enhanced={enhanced}>
      <div className="flex items-center gap-2 px-3 pt-3">
        <Link
          href={hubHref}
          aria-label={`Back to ${chapterTitle}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft"
        >
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>

        <div className="min-w-0 flex-1">
          <Dots count={pages.length} active={index} />
        </div>

        {/* Keeps the dots optically centred against the button on the left. */}
        <span className="size-11 shrink-0" aria-hidden />
      </div>

      <div
        ref={stage}
        tabIndex={0}
        role="group"
        aria-roledescription="story page"
        aria-label={`Page ${index + 1} of ${pages.length}`}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") goTo(targetIndex.current + 1);
          if (event.key === "ArrowLeft") goTo(targetIndex.current - 1);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative flex-1 touch-pan-y select-none overflow-hidden outline-none"
        style={{ perspective: 1400 }}
      >
        <div
          data-active="false"
          className="absolute inset-0 z-[1] flex flex-col overflow-hidden bg-ground"
        >
          {withActive(pages[underIndex], false)}
        </div>

        <div
          ref={shadow}
          className="pointer-events-none absolute inset-y-0 z-[2]"
          aria-hidden
        />

        <div
          ref={spine}
          className="absolute inset-0 z-[3] overflow-hidden bg-ground will-change-transform"
          style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
          aria-hidden
        >
          <div ref={spineShade} className="absolute inset-0" />
        </div>

        <div
          ref={flat}
          data-active="true"
          className="absolute inset-0 z-[4] flex flex-col overflow-hidden bg-ground will-change-[clip-path]"
        >
          {withActive(pages[index], true)}
        </div>

        {/* Shown until the first page turn, then never again this reading.
            It sits over the page rather than in the layout so that nothing
            moves when it goes — a child who has just learned the gesture
            should not have the page shift under the finger that did it. */}
        {showGuide ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-4 z-[5] flex justify-center"
            aria-hidden
          >
            <p className="voice flex items-center gap-2 rounded-full bg-ground-raised/90 px-4 py-2 text-base text-ink-soft">
              Swipe to turn the page
              <ArrowRight small />
            </p>
          </div>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        Page {index + 1} of {pages.length}
      </p>



      {onLastPage ? (
        <ChapterEnd hubHref={hubHref} {...(nextChapterHref ? { nextChapterHref } : {})} />
      ) : (
        <nav className="flex items-center justify-between px-6 pt-2 pb-8">
          {/* Hidden rather than disabled on the first page. A child should
              never be shown something they are not allowed to press. */}
          {onFirstPage ? (
            <span className="size-16" aria-hidden />
          ) : (
            <RoundButton
              onClick={() => goTo(targetIndex.current - 1)}
              label="Go back"
              quiet
            >
              <ArrowLeft />
            </RoundButton>
          )}

          <RoundButton
            onClick={() => goTo(targetIndex.current + 1)}
            label="Next page"
          >
            <ArrowRight />
          </RoundButton>
        </nav>
      )}
    </div>
  );
}

const DEADZONE = 8;
const THRESHOLD = 0.32;
const FLICK_VELOCITY = 0.5;
const EDGE_RESISTANCE = 3;
const MAX_ANGLE = 72;
const MIN_SPINE = 16;
const MAX_SPINE = 64;

/**
 * Injects the runtime `active` flag into a pre-built CardScreen element.
 * ChapterReader is the one place that knows which of the (at most two)
 * mounted pages the child has actually turned to, so it is the one place
 * that can tell CardScreen — which is otherwise handed fully-formed
 * elements it never constructs itself.
 */
function withActive(node: React.ReactNode, active: boolean): React.ReactNode {
  if (!isValidElement<{ active?: boolean }>(node)) return node;
  return cloneElement(node, { active });
}

/**
 * Where the story leaves a child.
 *
 * Never a dead end, and never a decision made for them: the next chapter is
 * offered but nothing happens on its own, there is no timer, and the way
 * back into this chapter is warm rather than a consolation prize. When there
 * is no next chapter, the shelf takes the primary place — a disabled button
 * is a door a child can see and not open, which is worse than no door.
 *
 * "Next Chapter" goes to the next chapter's Hub, never straight into its
 * story. Every chapter is entered by seeing what is in it.
 */
function ChapterEnd({
  hubHref,
  nextChapterHref,
}: {
  hubHref: string;
  nextChapterHref?: string;
}) {
  return (
    <nav className="flex flex-col gap-3 px-6 pt-3 pb-8">
      <Link
        href={nextChapterHref ?? "/chapters"}
        className="flex min-h-16 items-center justify-center gap-2 rounded-card bg-touchable px-6 text-xl text-ground-raised"
      >
        {nextChapterHref ? "Next chapter" : "All chapters"}
        <ArrowRight small />
      </Link>

      <Link
        href={hubHref}
        className="flex min-h-14 items-center justify-center rounded-card px-6 text-lg text-ink-soft"
      >
        Chapter menu
      </Link>
    </nav>
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

const ArrowRight = ({ small = false }: { small?: boolean }) => (
  <svg {...iconProps} {...(small ? { width: 20, height: 20 } : {})}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const ArrowLeft = () => (
  <svg {...iconProps}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);

