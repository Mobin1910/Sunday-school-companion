"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Card } from "@/content";

/**
 * A gesture-driven page curl.
 *
 * The previous prototype (`/prototype/spatial`) transitions between two flat
 * cards — nothing is revealed underneath anything, two rectangles just swap
 * places. This one is built the other way round: the next page sits under
 * the current one from the start, and dragging peels the current page's edge
 * back to expose it.
 *
 * A real page curl is two rigid regions, not one rotating rectangle — that
 * rigidity is exactly what made the first attempt read as a 3D carousel:
 *
 *  - `flat`  — the untouched majority of the current page. It never rotates,
 *    it only gets shorter, via `clip-path`, as the drag advances.
 *  - `spine` — a narrow strip at the boundary where `flat` was just cut.
 *    This is the only part that turns in 3D. It carries a copy of the same
 *    artwork so it lines up with `flat`'s cut edge at rest, and a soft
 *    light/shadow gradient so the fold itself reads as paper rather than a
 *    hard edge.
 *  - `under` — the neighbouring page, always full-size and stationary
 *    underneath. It becomes visible only through the gap `flat` and `spine`
 *    leave behind.
 *
 * This produces a straight, full-height hinge — the fold runs the entire
 * height of the page, not a single curved corner that depends on where
 * vertically the child grabbed. A true corner peel (the fold curving more
 * near the finger than far from it) is possible in CSS/DOM too, but needs a
 * touch-position-dependent polygon rather than a fixed inset, which is a
 * meaningfully bigger step. This prototype exists to answer the simpler
 * question first: does a rigid-flat + turning-strip curl already feel right
 * without that complexity.
 */

const THRESHOLD = 0.32;
const FLICK_VELOCITY = 0.5;
const EDGE_RESISTANCE = 3;
const MAX_ANGLE = 72;
const MIN_SPINE = 16;
const MAX_SPINE = 64;

export default function CurlBook({ cards }: { cards: Card[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const underArt = useRef<HTMLDivElement>(null);
  const underCaption = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const spine = useRef<HTMLDivElement>(null);
  const spineArt = useRef<HTMLDivElement>(null);
  const spineCaption = useRef<HTMLDivElement>(null);
  const spineShade = useRef<HTMLDivElement>(null);
  const flat = useRef<HTMLDivElement>(null);
  const flatArt = useRef<HTMLDivElement>(null);
  const flatCaption = useRef<HTMLDivElement>(null);
  const companion = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLSpanElement>(null);

  const position = useRef(0);
  const anchor = useRef(0);
  const paintedCurrent = useRef(-1);
  const paintedUnder = useRef(-1);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startPosition = useRef(0);
  const samples = useRef<{ t: number; x: number }[]>([]);
  const settleFrame = useRef<number | null>(null);

  const [index, setIndex] = useState(0);
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  function widthOf(): number {
    return stage.current?.clientWidth ?? window.innerWidth;
  }

  function paint(
    artRef: React.RefObject<HTMLDivElement | null>,
    capRef: React.RefObject<HTMLDivElement | null>,
    rawIndex: number,
  ) {
    const i = Math.max(0, Math.min(cards.length - 1, rawIndex));
    if (artRef.current) artRef.current.style.background = sceneFor(i);
    const card = cards[i];
    if (capRef.current && card) capRef.current.textContent = captionOf(card);
  }

  function renderAt(pos: number) {
    const width = widthOf();
    const raw = pos - anchor.current;
    const progress = Math.max(-1, Math.min(1, raw));
    const forward = progress >= 0;
    const underIndex = anchor.current + (forward ? 1 : -1);

    if (anchor.current !== paintedCurrent.current) {
      paint(flatArt, flatCaption, anchor.current);
      paint(spineArt, spineCaption, anchor.current);
      paintedCurrent.current = anchor.current;
    }
    if (underIndex !== paintedUnder.current) {
      paint(underArt, underCaption, underIndex);
      paintedUnder.current = underIndex;
    }

    const dFrac = Math.abs(progress);
    const dPx = dFrac * width;
    const eased = 1 - Math.pow(1 - dFrac, 2);
    const angle = eased * MAX_ANGLE;
    const spineW = MIN_SPINE + eased * (MAX_SPINE - MIN_SPINE);

    if (hud.current) {
      hud.current.textContent = `${forward ? "→" : "←"} ${dFrac.toFixed(2)}`;
    }
    if (companion.current) {
      const c = Math.max(-1, Math.min(1, raw));
      companion.current.style.transform = `translateX(${(c * 10).toFixed(2)}px) rotate(${(c * 8).toFixed(2)}deg)`;
    }

    const flatEl = flat.current;
    const spineEl = spine.current;
    const shadeEl = spineShade.current;
    const shadowEl = shadow.current;
    if (!flatEl || !spineEl || !shadeEl || !shadowEl) return;

    const cut = Math.min(width, dPx);

    // `flat` and `spine` must be adjacent, never overlapping — flat is on
    // top (z-index), so any overlap means it simply paints over the curl.
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
      shadowEl.style.width = `${Math.min(width - spineEnd, spineW * 1.6)}px`;
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
      shadowEl.style.width = `${Math.min(spineStart, spineW * 1.6)}px`;
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
    const clampedTarget = Math.max(0, Math.min(cards.length - 1, target));
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

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== undefined && e.button !== 0) return;
    cancelSettle();
    dragging.current = true;
    startX.current = e.clientX;
    startPosition.current = position.current;
    samples.current = [{ t: performance.now(), x: e.clientX }];
    stage.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const width = widthOf();
    const dx = e.clientX - startX.current;
    let next = startPosition.current - dx / width;

    const min = 0;
    const max = cards.length - 1;
    if (next < min) next = min - (min - next) / EDGE_RESISTANCE;
    if (next > max) next = max + (next - max) / EDGE_RESISTANCE;

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

  return (
    <div className="flex h-dvh flex-col bg-[#16181d]">
      <div className="flex items-center gap-3 px-3 py-2 text-[#8d95a5]">
        <span className="font-mono text-xs">page curl · prototype</span>
        <span className="ml-auto font-mono text-xs">
          page <b className="text-[#e8eaef]">{index + 1}</b>/{cards.length} ·{" "}
          <span ref={hud}>0.00</span>
        </span>
      </div>

      <div
        ref={stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative flex-1 touch-none select-none overflow-hidden bg-ground"
        style={{ perspective: 1400 }}
      >
        <div className="page absolute inset-0 z-[1] flex flex-col overflow-hidden bg-ground">
          <div ref={underArt} className="flex-1" aria-hidden />
          <div
            ref={underCaption}
            className="flex min-h-24 items-center justify-center border-t border-edge bg-ground-raised px-6 py-4 text-center text-xl leading-snug text-balance"
          />
        </div>

        <div
          ref={shadow}
          className="pointer-events-none absolute inset-y-0 z-[2]"
          aria-hidden
        />

        <div
          ref={spine}
          className="absolute inset-0 z-[3] flex flex-col overflow-hidden bg-ground will-change-transform"
          style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
        >
          <div ref={spineArt} className="relative flex-1" aria-hidden>
            <div ref={spineShade} className="pointer-events-none absolute inset-0" />
          </div>
          <div
            ref={spineCaption}
            className="flex min-h-24 items-center justify-center border-t border-edge bg-ground-raised px-6 py-4 text-center text-xl leading-snug text-balance"
          />
        </div>

        <div className="page absolute inset-0 z-[4] flex flex-col overflow-hidden bg-ground will-change-[clip-path]" ref={flat}>
          <div ref={flatArt} className="flex-1" aria-hidden />
          <div
            ref={flatCaption}
            className="flex min-h-24 items-center justify-center border-t border-edge bg-ground-raised px-6 py-4 text-center text-xl leading-snug text-balance"
          />
        </div>

        <div
          ref={companion}
          className="pointer-events-none absolute bottom-6 left-1/2 z-[5] h-10 w-10 -translate-x-1/2 rounded-full bg-touchable/80 will-change-transform"
          aria-hidden
        />
      </div>

      <p className="bg-[#16181d] px-3 py-2 font-mono text-[11px] leading-relaxed text-[#8d95a5]">
        Drag anywhere. The edge peels back and the next page shows through
        underneath — nothing rotates as a flat rectangle.
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

/** Standing in for illustration. Pages must differ or the curl proves nothing. */
function sceneFor(index: number): string {
  const hues = [38, 30, 44, 46, 96, 28, 208, 42, 40, 24, 36, 34];
  const h = hues[index % hues.length] ?? 38;
  return (
    `radial-gradient(120% 80% at 28% 22%, hsl(${h} 62% 78%) 0%, transparent 58%),` +
    `radial-gradient(90% 70% at 78% 84%, hsl(${h} 48% 52%) 0%, transparent 52%),` +
    `linear-gradient(158deg, hsl(${h} 55% 82%), hsl(${h} 35% 46%))`
  );
}
