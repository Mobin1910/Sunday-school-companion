"use client";

import Link from "next/link";
import {
  Children,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { rememberPlace, resumeAt } from "@/local/place";

import { PageProvider } from "./PageContext";

/**
 * Turns the pages of a chapter's story with a page curl.
 *
 * Halo is deliberately absent from this file. The story artwork is not his,
 * and a companion floating over a page of Scripture would be the one place
 * he makes the product feel like a toy. He belongs on the Hub, in games
 * and beside the verse — not here.
 *
 * Chosen over scroll-snap and a flat-card slide after prototyping both at
 * /prototype/spatial (deleted) and /prototype/curl (kept, for reference).
 *
 * The fold is a corner peel, and the geometry is the real thing rather than
 * an impression of it. A stiff sheet lifted at one corner folds about a
 * straight line, and the part beyond that line is not squashed or rotated
 * away — it is *mirrored* across it. So there are two pieces and one line
 * between them: `flat` is the current page clipped to the near side of the
 * fold, and `fold` is the back of the paper, clipped to the reflection of
 * the cut-off corner in that same line. Both are `clip-path` polygons
 * recomputed per frame from one line, which is why they can never disagree
 * about where the crease is.
 *
 * The line is not vertical. It runs from wherever the child took hold of the
 * page, and the far end lags behind — take the bottom corner and the bottom
 * leads, take the middle and it stays nearly straight. That lag straightens
 * out as the page comes over, so a completed turn always clears the page
 * however it began.
 *
 * `fold` shows paper, never the page's own content. That is the same
 * decision the old turning strip made and for the same reason: copying live
 * content into it would mean two simultaneous instances of a quiz's state
 * and timers. A real book shows the blank back of the sheet here anyway.
 *
 * Only two pages are ever mounted: `flat` (the settled, active page) and
 * `under` (whichever neighbour the current drag direction would reveal).
 * That bounds memory and avoids a worse problem — a neighbour's
 * InteractionPlayer sitting fully mounted, and hence fully "on screen" by a
 * plain viewport IntersectionObserver, well before the child has actually
 * turned to it. The neighbour is given a page state that says it has not
 * been arrived at, for exactly that reason; see `PageContext`.
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
 * The reader is the one place in the app with no tab bar and no dashboard
 * framing it. The only chrome is the page count, a way back up to the
 * Chapter Hub, and — at the end — where to go next. It takes the full height
 * of the screen always, and the full width only while the screen is no wider
 * than the artwork; past that it stays a page and the ground shows either
 * side. See `.reader-page`, which is also what keeps the curl's arithmetic
 * honest — the drag is measured against the stage, not the window.
 */
export default function ChapterReader({
  children,
  slug,
  hubHref,
  chapterTitle,
  gamesHref,
  nextChapterHref,
  backs,
}: {
  children: React.ReactNode;
  /** Which chapter this is, for remembering the place in it. */
  slug: string;
  /** This chapter's Hub. Always reachable, from every page. */
  hubHref: string;
  chapterTitle: string;
  /**
   * This chapter's games, when it has any that can be played. Worked out by
   * the page, not here: which games are playable is a content question, and
   * the reader has no business knowing what an interaction is.
   */
  gamesHref?: string;
  /** The next chapter's Hub, when there is a next chapter. */
  nextChapterHref?: string;
  /**
   * The picture on each page, in page order, for the back of the sheet.
   *
   * Pictures rather than the pages themselves: the back of a turning page is
   * paper and ink, and mounting a second copy of a page to get it would mean
   * a second copy of anything live on that page — a question's state, its
   * shuffled order, its clocks. A page with no picture simply has a plain
   * back, which is what the back of a page of text looks like anyway.
   */
  backs?: (string | null)[];
}) {
  const pages = useMemo(() => Children.toArray(children), [children]);
  const lastPage = pages.length - 1;

  const stage = useRef<HTMLDivElement>(null);
  const fold = useRef<HTMLDivElement>(null);
  const foldShade = useRef<HTMLDivElement>(null);
  const foldBack = useRef<HTMLImageElement>(null);
  const flat = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);

  /**
   * Where down the page this turn was taken hold of, as -1 at the top edge
   * through 0 at the middle to 1 at the bottom. It sets which corner leads
   * the fold. A turn nobody grabbed — the Next button, an arrow key — is
   * given a low corner, because that is where a thumb would have been.
   */
  const grabAt = useRef(THUMB);

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
  /**
   * Whether the pointer is actually down on the page.
   *
   * A finger only reports movement while it is touching, so on a phone this
   * is implied. A mouse reports movement the whole time it is on screen, so
   * without this a desktop cursor crossing the page would peel it — and,
   * because no button is ever released, leave it peeled.
   */
  const pressed = useRef(false);
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

  /*
    Where they were, restored.

    Only when there is somewhere to return to: a chapter opened for the
    first time, or re-opened after being finished, starts at the cover.
    `resumeAt` decides which, and it runs once, after mount, because the
    answer lives on the device.

    It must run *before* the remembering below, and that order is
    load-bearing rather than incidental — that effect writes page 0 on
    mount, so reading the stored place after it would always find the
    beginning, every time.
  */
  useEffect(() => {
    const resume = resumeAt(slug, pages.length);
    if (resume === 0) return;

    position.current = resume;
    anchor.current = resume;
    targetIndex.current = resume;
    setIndex(resume);
    setUnderIndex(Math.min(resume + 1, pages.length - 1));
    renderAt(resume);
    // Once, on arrival. Later turns are the child's own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
    Where the child is, remembered.

    This is the component that knows it — the page a child is on exists here
    and nowhere else — so this is where it is written down. It is a place,
    not an address: the chapter, the section, and how far through, so that
    Home can check it against the content that actually exists rather than
    trusting a URL that content changes may have invalidated.

    It writes on settle rather than on every frame of a drag, so a chapter
    read end to end costs one small write per page turned.
  */
  useEffect(() => {
    rememberPlace({
      slug,
      section: "story",
      page: index,
      pages: pages.length,
      done: index === lastPage,
    });
  }, [slug, index, lastPage, pages.length]);

  /*
    Finish a turn in the same frame the new page appears in.

    A layout effect runs after React has mutated the DOM and before the
    browser paints, which is the only moment where "the page has changed"
    and "the page is whole again" can be made to happen together.
  */
  useSameFrame(() => {
    renderAt(position.current);
    // Once per settled page. Drags call renderAt themselves, every move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const back = backs?.[index] ?? null;

  const onFirstPage = index === 0;
  const onLastPage = index === lastPage;

  function widthOf(): number {
    return stage.current?.clientWidth ?? window.innerWidth;
  }

  function heightOf(): number {
    return stage.current?.clientHeight ?? window.innerHeight;
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

    const flatEl = flat.current;
    const foldEl = fold.current;
    const shadeEl = foldShade.current;
    const shadowEl = shadow.current;
    if (!flatEl || !foldEl || !shadeEl || !shadowEl) return;

    const dFrac = Math.abs(progress);
    const visible = dFrac > 0.001;
    foldEl.style.display = visible ? "" : "none";
    shadowEl.style.display = visible ? "" : "none";
    if (!visible) {
      // A settled page is whole. Nothing is clipped off it.
      flatEl.style.clipPath = "none";
      return;
    }

    const height = heightOf();
    const cut = Math.min(width, dFrac * width);

    /*
      The crease, as two points on the page's top and bottom edges.

      `lead` is how far the fold has run at the end the child took hold of,
      and it tracks the finger exactly — paper does not lag behind the hand
      holding it. `lag` is the other end, behind by the slant. The slant is
      widest for a corner grab and nothing at all for a grab at the middle,
      and it closes as the turn completes so that a finished fold has swept
      the whole page rather than leaving a wedge of it standing.
    */
    const slant = Math.min(1, Math.abs(grabAt.current)) * SLANT * (1 - dFrac);
    const lead = forward ? width - cut : cut;
    const lag = forward ? width - cut * (1 - slant) : cut * (1 - slant);
    const low = grabAt.current >= 0;
    const top = { x: low ? lag : lead, y: 0 };
    const bottom = { x: low ? lead : lag, y: height };

    // The two corners that leave the page, and where they land once the
    // sheet is folded over: their mirror image in the crease.
    const corners = forward
      ? [
          { x: width, y: 0 },
          { x: width, y: height },
        ]
      : [
          { x: 0, y: 0 },
          { x: 0, y: height },
        ];
    const turned = corners.map((c) => mirror(c, top, bottom));

    flatEl.style.clipPath = forward
      ? polygon([{ x: 0, y: 0 }, top, bottom, { x: 0, y: height }])
      : polygon([top, { x: width, y: 0 }, { x: width, y: height }, bottom]);

    foldEl.style.clipPath = polygon([top, turned[0]!, turned[1]!, bottom]);
    shadowEl.style.clipPath = polygon([top, corners[0]!, corners[1]!, bottom]);

    /*
      The back of the sheet is the page itself, reflected in the crease.

      The same reflection the corners went through, applied to the picture
      rather than to a point — so the image on the back lines up exactly with
      the image on the front along the fold, and swings with the crease as it
      slants. That is what a turning page actually looks like: you are seeing
      the same paper from the other side, not a second picture.

      It is a matrix because a reflection in an arbitrary line is one. A plain
      horizontal flip would only be right for a perfectly vertical crease, and
      would slide out of register the moment the fold leaned.
    */
    const backEl = foldBack.current;
    if (backEl) {
      const len = Math.hypot(bottom.x - top.x, bottom.y - top.y) || 1;
      const ux = (bottom.x - top.x) / len;
      const uy = (bottom.y - top.y) / len;
      const r11 = 2 * ux * ux - 1;
      const r12 = 2 * ux * uy;
      const r22 = 2 * uy * uy - 1;
      const tx = top.x - (r11 * top.x + r12 * top.y);
      const ty = top.y - (r12 * top.x + r22 * top.y);
      backEl.style.transform = `matrix(${r11}, ${r12}, ${r12}, ${r22}, ${tx}, ${ty})`;
    }

    /*
      Light, in the only two places a fold makes any.

      The crease is the bright edge — a hard rim right at it, falling away
      across the back of the sheet into its own shade. And the page being
      uncovered is darkest in the gutter immediately beside the crease. Both
      gradients run flat across the page rather than square to the crease: at
      these angles the difference cannot be seen, and it keeps every stop in
      the same units as the polygons above.

      All of it scales with how far the turn has come, so a page just barely
      lifted is barely shaded and nothing announces itself before it exists.
    */
    const crease = (top.x + bottom.x) / 2;
    const edge = forward ? 2 * crease - width : 2 * crease;
    const rim = forward ? crease - RIM : crease + RIM;
    const pct = (x: number) => `${((x / width) * 100).toFixed(2)}%`;
    // The crease keeps its light even when the page is barely lifted — that
    // bright edge is how a fold announces itself as paper rather than a hole.
    const lit = (0.14 + 0.3 * dFrac).toFixed(3);
    const away = (0.06 * dFrac).toFixed(3);
    const shade = (0.55 * dFrac).toFixed(3);
    const stops = forward
      ? [
          `rgba(0,0,0,${shade}) ${pct(edge)}`,
          `rgba(255,255,255,${away}) ${pct(rim)}`,
          `rgba(255,255,255,${lit}) ${pct(crease)}`,
        ]
      : [
          `rgba(255,255,255,${lit}) ${pct(crease)}`,
          `rgba(255,255,255,${away}) ${pct(rim)}`,
          `rgba(0,0,0,${shade}) ${pct(edge)}`,
        ];
    shadeEl.style.background = `linear-gradient(to right, ${stops.join(", ")})`;

    const gutter = (0.55 * dFrac).toFixed(3);
    shadowEl.style.background = forward
      ? `linear-gradient(to right, rgba(0,0,0,${gutter}) ${pct(crease)}, rgba(0,0,0,0) ${pct(crease + GUTTER)})`
      : `linear-gradient(to right, rgba(0,0,0,0) ${pct(crease - GUTTER)}, rgba(0,0,0,${gutter}) ${pct(crease)})`;
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
      /*
        Clamped at both ends, and the lower end is the one that matters.

        `start` is read inside the event that began the turn, but the frame
        callback is handed the time that frame *began* — which is earlier,
        because the event was handled during it. So the first step can arrive
        with a negative elapsed time, and this easing curve turns a slightly
        negative `t` into a slightly negative position: one frame of the page
        folding the wrong way, and of the neighbour underneath being the one
        behind rather than the one ahead. It read as a flick at the start of
        every turn.
      */
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      position.current = from + (clampedTarget - from) * eased;
      renderAt(position.current);
      if (t < 1) {
        settleFrame.current = requestAnimationFrame(step);
      } else {
        settleFrame.current = null;
        anchor.current = clampedTarget;
        setIndex(clampedTarget);
        /*
          The clip is *not* cleared here, and that is the whole point.

          Clearing it now un-clips whatever `flat` is currently showing —
          which is still the page being turned away from, because React has
          not swapped it yet. If the browser paints in that gap, the old page
          snaps back to full screen for one frame before the new one arrives.
          That was the flash after every turn.

          So the settle stops at saying where we are, and the layout effect
          below clears the clip after React has put the new page in — after
          the DOM changes, before anything is painted. The two can no longer
          be seen out of step because they now happen in the same frame.
        */
      }
    };
    settleFrame.current = requestAnimationFrame(step);
  }

  /*
    A question that has been answered turns its own page.

    This is a deliberate reversal: pages used to be turned only by the child,
    on the grounds that finishing something is not a reason to take the
    steering away. Watching it, that was wrong here — a child who has just
    got it right has plainly finished with the page, and asking them to then
    find the arrow reads as the app not having noticed.

    It waits, though. The pause is the celebration: Halo's face, the burst
    and the words all happen, and *then* the page turns. Turning on the
    instant of the tap would trade one bad feeling for another.
  */
  function turnAfterSolving() {
    window.setTimeout(() => goTo(targetIndex.current + 1), AFTER_SOLVING);
  }

  function goTo(rawTarget: number, jump = false) {
    cancelSettle();
    setTurnedOnce(true);
    // Nobody took hold of this one, so put the crease where a thumb goes.
    grabAt.current = THUMB;
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
    pressed.current = true;
    dragging.current = false;
    verticalLocked.current = false;
    potentialStart.current = { x: e.clientX, y: e.clientY };
    startX.current = e.clientX;
    startPosition.current = position.current;
    samples.current = [{ t: performance.now(), x: e.clientX }];

    // Which corner leads is decided here, by where the page was taken hold
    // of, and then held for the whole turn — a crease does not move up and
    // down the sheet while the hand slides across it.
    const box = stage.current?.getBoundingClientRect();
    if (box && box.height > 0) {
      const down = (e.clientY - box.top) / box.height;
      grabAt.current = Math.max(-1, Math.min(1, down * 2 - 1));
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    /*
      A page is turned by being held and moved, so a move with nothing held
      is not the beginning of anything. `buttons` is the browser's own answer
      to the same question and it re-asserts itself on every move, so it also
      recovers the case where a mouse was released somewhere this element
      never heard about — off the window, say, before the drag was captured.
      Only mice are checked that way: a finger in contact is expected to
      report a button, but that is not worth betting the whole gesture on.
    */
    if (!pressed.current) return;
    if (e.pointerType === "mouse" && e.buttons === 0) {
      pressed.current = false;
      return;
    }

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
    pressed.current = false;
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
    <div className="reader-page relative flex h-dvh flex-col" data-enhanced={enhanced}>
      {/*
        The way up a level, floating over the page rather than above it.

        A cover is a full-bleed illustration, so this button has to be able to
        sit on top of artwork and stay legible there — hence the dark disc
        behind it. It is the only chrome at the top of the reader now: where
        a child is in the chapter is said at the bottom, next to the button
        that moves them.
      */}
      <div className="absolute inset-x-0 top-0 z-[6] flex items-center px-4 pt-3">
        <Link
          href={hubHref}
          aria-label={`Back to ${chapterTitle}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-edge/70 bg-ground/55 text-ink backdrop-blur-sm"
        >
          <svg
            width={22}
            height={22}
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
      >
        <div
          data-active="false"
          className="absolute inset-0 z-[1] flex flex-col overflow-hidden bg-ground"
        >
          <PageProvider value={UNDER}>{pages[underIndex]}</PageProvider>
        </div>

        {/* The gutter: the dark the lifted corner drops onto the page it is
            uncovering. Clipped to exactly the part now showing. */}
        <div
          ref={shadow}
          className="pointer-events-none absolute inset-0 z-[2] will-change-[clip-path]"
          aria-hidden
        />

        <div
          ref={flat}
          data-active="true"
          className="absolute inset-0 z-[3] flex flex-col overflow-hidden bg-ground will-change-[clip-path]"
        >
          <PageProvider value={{ active: true, onSolved: turnAfterSolving }}>
            {pages[index]}
          </PageProvider>
        </div>

        {/* The back of the sheet, lying over the page it was just part of.
            Paper and light only — see the note at the top of this file on
            why the page's own content is never copied here. */}
        <div
          ref={fold}
          className="pointer-events-none absolute inset-0 z-[4] bg-ground-lit will-change-[clip-path]"
          aria-hidden
        >
          {back ? (
            <img
              ref={foldBack}
              src={back}
              alt=""
              className="fold-back"
              draggable={false}
            />
          ) : null}
          <div ref={foldShade} className="absolute inset-0" />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Page {index + 1} of {pages.length}
      </p>

      {/*
        Everything a child steers with, floating over the page rather than
        sitting beneath it. That is what lets a cover be one full-bleed
        illustration; CardScreen keeps every other kind of card clear of this
        band so nothing is ever covered by it.
      */}
      <div className="absolute inset-x-0 bottom-0 z-[6]">
        {/* Shown until the first page turn, then never again this reading.
            It floats above the row rather than joining it so that nothing
            moves when it goes — a child who has just learned the gesture
            should not have the page shift under the finger that did it. */}
        {showGuide ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-[7rem] flex justify-center"
            aria-hidden
          >
            <p className="voice btn-quiet gap-2 px-6 py-3 text-lg">
              Swipe to turn the page
              <ArrowRight small />
            </p>
          </div>
        ) : null}

        {onLastPage ? (
          <ChapterEnd
            hubHref={hubHref}
            {...(gamesHref ? { gamesHref } : {})}
            {...(nextChapterHref ? { nextChapterHref } : {})}
          />
        ) : (
          /*
            Back, where you are, forward — one layout for every page.

            The columns are sized to their contents at the ends and to
            whatever is left in the middle, because the middle is the row of
            pages and it wants the room. Equal thirds gave it a hundred
            pixels to fit nineteen marks into, which is a row of hairlines.

            On the cover the way back is an empty space rather than a hidden
            button, so the row does not jump the first time a child turns a
            page. And the cover keeps the one lit button in the chapter: a
            colour that appears once means something, and the same colour on
            all nineteen pages is wallpaper. Inside the story both directions
            are drawn alike, because by then going back is as ordinary as
            going on.
          */
          <nav className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-5 pt-2 pb-8">
            {onFirstPage ? (
              <span className="size-16" aria-hidden />
            ) : (
              <RoundButton
                quiet
                onClick={() => goTo(targetIndex.current - 1)}
                label="Go back a page"
                caption="Back"
              >
                <ArrowLeft small />
              </RoundButton>
            )}

            <PageTrack index={index} total={pages.length} />

            <RoundButton
              onClick={() => goTo(targetIndex.current + 1)}
              label="Next page"
              caption="Next"
              quiet={!onFirstPage}
            >
              <ArrowRight small />
            </RoundButton>
          </nav>
        )}
      </div>
    </div>
  );
}

/**
 * A layout effect that does not complain on the server.
 *
 * The reader is prerendered, and `useLayoutEffect` warns when it runs where
 * there is no layout to read. There is nothing to do in that pass anyway —
 * nothing has been painted yet — so on the server it is an ordinary effect
 * that never fires.
 */
const useSameFrame =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const DEADZONE = 8;
const THRESHOLD = 0.32;
const FLICK_VELOCITY = 0.5;
const EDGE_RESISTANCE = 3;
/** How far the far end of the crease lags behind, for a full corner grab. */
const SLANT = 0.55;
/** The reach of the dark the fold drops into the gutter, in pixels. */
const GUTTER = 64;
/** How wide the bright edge of the crease is, in pixels. */
const RIM = 10;
/** Where a thumb would have been, for turns nobody took hold of. */
const THUMB = 0.62;
/** How long a solved page is left alone before it turns itself. */
const AFTER_SOLVING = 1600;

/** The neighbour page: on screen, not arrived at, and not steering. */
const UNDER = { active: false } as const;

/**
 * A point reflected in the line through `a` and `b`.
 *
 * This is the whole of the fold: the corner that leaves the page is not
 * moved or shrunk, it is mirrored in the crease, which is what a sheet of
 * paper does when you lift it. Points already on the crease come back
 * unchanged, so the two pieces always meet exactly along it.
 */
function mirror(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const vx = p.x - a.x;
  const vy = p.y - a.y;
  const along = vx * ux + vy * uy;
  return { x: a.x + 2 * along * ux - vx, y: a.y + 2 * along * uy - vy };
}

const polygon = (points: Point[]) =>
  `polygon(${points.map((p) => `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`).join(", ")})`;

type Point = { x: number; y: number };

/**
 * Where the story leaves a child.
 *
 * Never a dead end, and never a decision made for them: everything here is
 * offered, nothing happens on its own, there is no timer, and the way back
 * into this chapter is warm rather than a consolation prize. When there is
 * no next chapter, the shelf takes that place — a disabled button is a door
 * a child can see and not open, which is worse than no door.
 *
 * The games come first where a chapter has them, and that is a change of
 * mind about what the loudest thing here should be. Leaving the chapter was
 * the lit button, which meant the app's own suggestion, at the exact moment
 * a child finished the story, was to skip the rest of it — the games about
 * that story and the verse from it. The chapter's own parts come before
 * leaving the chapter. Nothing is locked either way: a child who wants the
 * next chapter still has it, one row down and perfectly visible.
 *
 * "Next chapter" goes to the next chapter's Hub, never straight into its
 * story. Every chapter is entered by seeing what is in it.
 */
function ChapterEnd({
  hubHref,
  gamesHref,
  nextChapterHref,
}: {
  hubHref: string;
  /** This chapter's games, when it has any that can actually be played. */
  gamesHref?: string;
  nextChapterHref?: string;
}) {
  return (
    <nav className="flex flex-col gap-3 px-6 pt-3 pb-8">
      {gamesHref ? (
        <Link href={gamesHref} className="cta min-h-16 px-6 text-xl">
          Play the games
          <ArrowRight small />
        </Link>
      ) : null}

      <Link
        href={nextChapterHref ?? "/chapters"}
        className={
          gamesHref
            ? "btn-quiet min-h-14 gap-2 px-6 text-lg"
            : "cta min-h-16 px-6 text-xl"
        }
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

/**
 * Where the child is in the chapter.
 *
 * This was "13 / 19" for a while, and before that a row of dots. The counter
 * was chosen over the dots on the grounds that it stays readable at thirty
 * pages, which is true and turned out to be beside the point: the reader is
 * for six-year-olds, and a fraction is the one notation in the product that
 * a child who cannot yet read numbers well gets nothing at all from. It says
 * where you are only if you can already do the arithmetic to care.
 *
 * A row of pages says it without being read. You can see how many there are,
 * which ones you have been through, and — the part a number never managed —
 * that they are laid out in a line and go that way. That is the thing the
 * screen most needed to say and had been saying only in words, once, in a
 * hint that disappears after the first turn.
 *
 * These are marks and not buttons. Nineteen targets four pixels wide would be
 * a row of things to miss, and jumping to page fourteen is not something a
 * story wants offered anyway — you read a chapter, you do not index it.
 *
 * The one you are on is wider rather than merely brighter, so it survives
 * being looked at on a bright panel by someone not looking carefully, and so
 * the row reads as a position rather than as a progress bar filling up. What
 * is behind you stays lit, quietly: it is a trail, and a trail is a nicer
 * thing to be shown than a percentage.
 *
 * Hidden from assistive technology: the live region below the stage already
 * says "Page 3 of 11" in words, and saying it twice is worse than once.
 */
function PageTrack({ index, total }: { index: number; total: number }) {
  return (
    <p className="page-track" aria-hidden>
      {Array.from({ length: total }, (_, page) => (
        <span
          key={page}
          className={
            page === index ? "is-here" : page < index ? "is-behind" : ""
          }
        />
      ))}
    </p>
  );
}

function RoundButton({
  onClick,
  label,
  caption,
  quiet = false,
  children,
}: {
  onClick: () => void;
  label: string;
  /** Said on the button as well as to a screen reader, where there is room. */
  caption?: string;
  quiet?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex size-16 flex-col items-center justify-center gap-0.5 rounded-full transition-transform duration-150 active:scale-95 ${
        quiet ? "btn-quiet text-ink-soft" : "cta"
      }`}
    >
      {children}
      {caption ? (
        <span className="text-[0.6875rem] leading-none" aria-hidden>
          {caption}
        </span>
      ) : null}
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

const ArrowLeft = ({ small = false }: { small?: boolean }) => (
  <svg {...iconProps} {...(small ? { width: 20, height: 20 } : {})}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);

