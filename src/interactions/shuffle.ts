"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

/**
 * The order a child sees, decided once and then left alone.
 *
 * A fixed order teaches the wrong lesson. If the answer is reliably second,
 * a child learns *tap the second one* rather than *think about the answer* —
 * and a per-question fixed order teaches it just as well, one question at a
 * time, because the same question comes back with the same layout. So the
 * order is genuinely random, and rolled again every time the question is
 * presented.
 *
 * It is decided **once**, and nothing after that may disturb it. A wrong tap,
 * Recovery, a hint, the assistance ladder climbing and any re-render all
 * leave it exactly as it was: a child looking again at the same choices must
 * be able to reason about the same choices in the same places. Reordering
 * under them would turn a second try into a fresh puzzle.
 *
 * The order is settled by an effect rather than during render because a
 * prerendered page has already been drawn by the time this runs: React must
 * see the same order it shipped in the HTML until hydration is over, or the
 * whole tree is thrown away and redrawn. `hydrating` is what makes that safe
 * without also making it slow — a question mounted by a tap (which is how
 * Games opens every one of them) was never in any HTML, so it can be
 * shuffled for its very first frame.
 *
 * Shuffling moves things and never means anything. Every model here keeps
 * its answer key on the item itself — `correct` on an option, `position` on
 * a step, a pair's two halves inside one object — precisely so that this
 * function can reorder freely and nothing it touches can change what is
 * true.
 */
export function useShuffled<T>(items: T[]): T[] {
  const hydrating = useSyncExternalStore(
    () => () => {},
    () => false,
    () => true,
  );

  const [rolled, setRolled] = useState(() => (hydrating ? null : roll(items)));

  // Rolls only for a list it has not already rolled for. Without that check
  // this would fire a second time on the very first pass and reorder the
  // choices a frame after the child first saw them.
  useEffect(() => {
    setRolled((current) => (current?.of === items ? current : roll(items)));
  }, [items]);

  const order = rolled?.of === items ? rolled.order : null;

  return useMemo(
    () => (order ? order.map((i) => items[i]!) : items),
    [items, order],
  );
}

/** An order, tagged with the list it belongs to. */
function roll<T>(of: T[]) {
  return { of, order: shuffledIndices(of.length) };
}

/** Fisher–Yates, unbiased, over the positions rather than the items. */
function shuffledIndices(count: number): number[] {
  const out = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
