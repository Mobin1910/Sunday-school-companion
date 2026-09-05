"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Card } from "@/content";

/**
 * A gesture-driven spatial transition between story pages, evaluated as the
 * replacement for the physical page-turn idea.
 *
 * The whole thing is driven by one number: `position`, a float that sits at
 * an integer (a settled page) except while a finger is down, when it tracks
 * the drag exactly. Every card's offset from `position` produces its
 * transform, so there is one formula rather than separate "outgoing" and
 * "incoming" cases.
 *
 * Per-frame style writes go straight to the DOM through refs rather than
 * through React state. At 60fps that's the difference between one style
 * mutation and a full render pass, and on a low-end Android phone that
 * difference is the difference between tactile and laggy.
 */

const THRESHOLD = 0.28;
const FLICK_VELOCITY = 0.5; // px/ms
const EDGE_RESISTANCE = 3;

export default function SpatialBook({ cards }: { cards: Card[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const cardEls = useRef(new Map<number, HTMLDivElement>());
  const sceneEls = useRef(new Map<number, HTMLDivElement>());
  const companion = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLSpanElement>(null);

  const position = useRef(0);
  const anchor = useRef(0);
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
    return viewport.current?.clientWidth ?? window.innerWidth;
  }

  function renderAt(pos: number) {
    const width = widthOf();
    const global = pos - anchor.current;
    if (companion.current) {
      const c = Math.max(-1, Math.min(1, global));
      companion.current.style.transform = `translateX(${(c * 10).toFixed(2)}px) rotate(${(c * 8).toFixed(2)}deg)`;
    }
    if (hud.current) {
      hud.current.textContent = pos.toFixed(2);
    }

    for (const [i, el] of cardEls.current) {
      const offset = i - pos;
      const abs = Math.abs(offset);
      if (abs > 1.5) {
        el.style.display = "none";
        continue;
      }
      el.style.display = "";
      const clamped = Math.min(abs, 1);
      const scale = 1 - 0.08 * clamped;
      const opacity = 1 - 0.4 * clamped;
      const translateX = offset * width;
      const blur = reducedMotion ? 0 : clamped * 0.8;
      el.style.transform = `translateX(${translateX.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      el.style.opacity = opacity.toFixed(3);
      el.style.filter = blur > 0.02 ? `blur(${blur.toFixed(2)}px)` : "";

      const scene = sceneEls.current.get(i);
      if (scene) {
        const lag = reducedMotion ? 0 : offset * width * 0.15;
        scene.style.transform = `translateX(${(-lag).toFixed(1)}px)`;
      }
    }
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
    viewport.current?.setPointerCapture(e.pointerId);
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
        <span className="font-mono text-xs">spatial transition · prototype</span>
        <span className="ml-auto font-mono text-xs">
          page <b className="text-[#e8eaef]">{index + 1}</b>/{cards.length} ·{" "}
          <span ref={hud}>0.00</span>
        </span>
      </div>

      <div
        ref={viewport}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative flex-1 touch-none select-none overflow-hidden bg-ground"
      >
        {cards.map((card, i) => (
          <div
            key={i}
            ref={(el) => {
              if (el) cardEls.current.set(i, el);
              else cardEls.current.delete(i);
            }}
            className="absolute inset-0 flex flex-col overflow-hidden bg-ground will-change-transform"
            style={{ transformOrigin: "center center" }}
          >
            <div
              ref={(el) => {
                if (el) sceneEls.current.set(i, el);
                else sceneEls.current.delete(i);
              }}
              className="flex-1 will-change-transform"
              style={{ background: sceneFor(i) }}
              aria-hidden
            />
            <div className="flex min-h-24 items-center justify-center border-t border-edge bg-ground-raised px-6 py-4 text-center text-xl leading-snug text-balance">
              {captionOf(card)}
            </div>
          </div>
        ))}

        <div
          ref={companion}
          className="pointer-events-none absolute bottom-6 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full bg-touchable/80 will-change-transform"
          aria-hidden
        />
      </div>

      <p className="bg-[#16181d] px-3 py-2 font-mono text-[11px] leading-relaxed text-[#8d95a5]">
        Drag anywhere, any distance. Fast flicks commit even on a short drag.
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

/** Standing in for illustration. Pages must differ or the motion proves nothing. */
function sceneFor(index: number): string {
  const hues = [38, 30, 44, 46, 96, 28, 208, 42, 40, 24, 36, 34];
  const h = hues[index % hues.length] ?? 38;
  return (
    `radial-gradient(120% 80% at 28% 22%, hsl(${h} 62% 78%) 0%, transparent 58%),` +
    `radial-gradient(90% 70% at 78% 84%, hsl(${h} 48% 52%) 0%, transparent 52%),` +
    `linear-gradient(158deg, hsl(${h} 55% 82%), hsl(${h} 35% 46%))`
  );
}
