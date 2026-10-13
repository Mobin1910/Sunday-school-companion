"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ModelProps, ShowTheWay as Model } from "../types";

/**
 * Showing the way to Canaan.
 *
 * The curriculum prints this as a maze on p.75 and asks the child to draw the
 * line. So that is what this does: put a finger on Abraham and drag him
 * through. The trail he leaves is the pencil line.
 *
 * The first version of this made the child tap one square at a time, on the
 * reasoning that dragging is precision work and this age band is spared it.
 * That reasoning was wrong here, and it is worth writing down why, because it
 * is the sort of rule that looks right in the abstract and fails against the
 * actual thing. Dragging is precision work when the target is small and a
 * miss costs you something. Neither is true in a maze: the finger is never
 * aiming at anything, it is *following a corridor*, and a finger that strays
 * into a wall does not fail — it simply does not move him, and the corridor
 * is still there when it comes back. The constraint does the aiming. What the
 * tapping version actually cost was the whole feeling of the activity: a
 * child drawing a line through a maze is doing one continuous thing, and
 * forty separate taps is not that thing.
 *
 * So dragging is how it works, and tapping the next square still works too —
 * for a mouse, for a keyboard, and for anyone who would rather. Neither is
 * the "real" way.
 *
 * What is kept from the first version, because all of it was right:
 *
 *   · Stepping back the way you came is always allowed. Drag backwards along
 *     your own trail and it rubs out behind you. A maze you cannot reverse
 *     out of is a trap.
 *   · A wall costs nothing. He does not move; nothing already walked is
 *     undone. A maze that answers one wrong turn by erasing twenty right ones
 *     is a maze a child stops playing.
 *   · Nothing is counted. No timer, no shortest path, no step score. A child
 *     who wanders the whole maze and arrives has shown the way exactly as
 *     well as one who walked it straight.
 *   · The help ladder makes the task smaller and never makes the move:
 *     rung 2 outlines the squares he could step to, rung 3 lights the next
 *     one on the way through, and the child still has to go there.
 */

type Point = { x: number; y: number };

const NEIGHBOURS = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
] as const;

/**
 * Halo's own five colours, in the order they run around its body, as rgb
 * triples so they can be mixed here and handed to CSS as one custom property.
 *
 * They are also declared on `:root` in `globals.css`, which is where every
 * other use reads them. The duplication is deliberate and narrow: these are
 * needed as *numbers* to interpolate between, and CSS cannot hand a stylesheet
 * value back to JavaScript. If Halo's palette ever changes, both move.
 */
const HALO_LIGHT = [
  [79, 214, 255], // cyan
  [61, 123, 255], // blue
  [155, 107, 255], // violet
  [255, 142, 203], // pink
  [255, 181, 131], // peach
] as const;

/**
 * The colour of the trail a given fraction of the way along it.
 *
 * The whole path is one run through Halo's five, however long the path turns
 * out to be — so a child who wanders every dead end gets the same ribbon,
 * stretched, rather than a repeating pattern that would read as stripes.
 */
function haloLightAt(fraction: number): string {
  const span = HALO_LIGHT.length - 1;
  const t = Math.min(Math.max(fraction, 0), 1) * span;
  const index = Math.min(Math.floor(t), span - 1);
  const into = t - index;
  const from: readonly number[] = HALO_LIGHT[index] ?? HALO_LIGHT[0];
  const to: readonly number[] = HALO_LIGHT[index + 1] ?? from;
  return [0, 1, 2]
    .map((c) => {
      const a = from[c] ?? 0;
      const b = to[c] ?? a;
      return Math.round(a + (b - a) * into);
    })
    .join(" ");
}

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const apart = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** The shortest way on, from here, so rung 3 can light one square. */
function nextStepToward(
  grid: string[][],
  from: Point,
  goal: Point,
): Point | null {
  const key = (p: Point) => `${p.x},${p.y}`;
  const open = (p: Point) => {
    const cell = grid[p.y]?.[p.x];
    return cell !== undefined && cell !== "#";
  };

  const cameFrom = new Map<string, Point>();
  const seen = new Set<string>([key(from)]);
  const queue: Point[] = [from];

  while (queue.length) {
    const here = queue.shift() as Point;
    if (same(here, goal)) {
      let step = here;
      for (;;) {
        const previous = cameFrom.get(key(step));
        if (!previous) return null;
        if (same(previous, from)) return step;
        step = previous;
      }
    }
    for (const d of NEIGHBOURS) {
      const next = { x: here.x + d.x, y: here.y + d.y };
      if (!open(next) || seen.has(key(next))) continue;
      seen.add(key(next));
      cameFrom.set(key(next), here);
      queue.push(next);
    }
  }
  return null;
}

export default function ShowTheWay({
  interaction,
  rung,
  locked,
  onMiss,
  onArrive,
}: ModelProps<Model>) {
  const { grid, start, goal } = useMemo(() => {
    const g = interaction.rows.map((row) => [...row]);
    let s: Point = { x: 0, y: 0 };
    let go: Point = { x: 0, y: 0 };
    g.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell === "A") s = { x, y };
        if (cell === "C") go = { x, y };
      }),
    );
    return { grid: g, start: s, goal: go };
  }, [interaction.rows]);

  /** Every square walked so far, start first. The last one is where he is. */
  const [trail, setTrail] = useState<Point[]>([start]);
  const [arrived, setArrived] = useState(false);
  const [dragging, setDragging] = useState(false);
  const board = useRef<HTMLDivElement | null>(null);

  const at = trail[trail.length - 1] ?? start;
  const width = grid[0]?.length ?? 0;

  const isOpen = useCallback(
    (x: number, y: number) => {
      const cell = grid[y]?.[x];
      return cell !== undefined && cell !== "#";
    },
    [grid],
  );

  /*
    Where each walked square sits along the path, so it can be given its own
    colour. A square walked twice keeps the first time it was reached, which
    is what a pencil line does too.
  */
  const walkedAt = useMemo(() => {
    const seen = new Map<string, number>();
    trail.forEach((p, index) => {
      const key = `${p.x},${p.y}`;
      if (!seen.has(key)) seen.set(key, index);
    });
    return seen;
  }, [trail]);

  const pointingAt =
    rung >= 3 && !arrived && !locked ? nextStepToward(grid, at, goal) : null;

  /**
   * Walk to a square, if walking there is a thing that can be done.
   *
   * Returns whether anything moved, so the caller can decide what a refusal
   * means — a tap on a wall is worth saying something about, the same finger
   * grazing the same wall mid-drag is not.
   */
  const walkTo = useCallback(
    (to: Point): boolean => {
      if (locked || arrived) return false;

      let moved = false;

      setTrail((was) => {
        const head = was[was.length - 1];
        if (!head || same(head, to)) return was;

        /* Back the way he came: rub the trail out behind him. */
        const back = was.length >= 2 ? was[was.length - 2] : undefined;
        if (back && same(back, to)) {
          moved = true;
          return was.slice(0, -1);
        }

        if (!isOpen(to.x, to.y)) return was;

        const gap = apart(head, to);
        if (gap === 1) {
          moved = true;
          return [...was, to];
        }

        /*
          A fast finger can cross a whole square between two pointer events,
          so one skipped square is bridged if there is exactly one open way
          through it. Only one: bridging further would start solving the maze
          on the child's behalf, which is the one thing this must not do.
        */
        if (gap === 2) {
          const between = NEIGHBOURS.map((d) => ({
            x: head.x + d.x,
            y: head.y + d.y,
          })).filter((p) => isOpen(p.x, p.y) && apart(p, to) === 1);

          if (between.length === 1 && between[0]) {
            moved = true;
            return [...was, between[0], to];
          }
        }

        return was;
      });

      return moved;
    },
    [arrived, isOpen, locked],
  );

  /* Arriving is a fact about the trail, so it is noticed where the trail is. */
  useEffect(() => {
    if (arrived || locked) return;
    if (!same(at, goal)) return;
    setArrived(true);
    setDragging(false);
    onArrive();
  }, [arrived, at, goal, locked, onArrive]);

  /** Which square is under a pointer, wall squares included. */
  function squareUnder(clientX: number, clientY: number): Point | null {
    const element = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-way-cell]");
    if (!element || !board.current?.contains(element)) return null;
    const x = Number(element.dataset.x);
    const y = Number(element.dataset.y);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (locked || arrived) return;
    const square = squareUnder(event.clientX, event.clientY);
    if (!square) return;

    /* Picking him up. From here the finger drags rather than taps. */
    if (same(square, at)) {
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    /*
      Not him, and not a drag. One tap on a square he cannot reach — a wall,
      or somewhere across the maze — and the model says so once. This is the
      only way a miss is reported: a finger grazing a wall while dragging
      reports nothing, because it has not done anything wrong.
    */
    if (!walkTo(square)) onMiss();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || locked || arrived) return;
    const square = squareUnder(event.clientX, event.clientY);
    if (square) walkTo(square);
  }

  const stopDragging = () => setDragging(false);

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 px-2">
      <h2 className="asking text-center leading-snug text-balance">
        {arrived ? interaction.then : interaction.prompt}
      </h2>

      <div
        ref={board}
        className="way-maze"
        data-dragging={dragging ? "" : undefined}
        style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}
        role="group"
        aria-label={interaction.prompt}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        {grid.flatMap((row, y) =>
          row.map((cell, x) => {
            const wall = cell === "#";
            const here = same(at, { x, y });
            const isGoal = same(goal, { x, y });
            const reachable =
              !wall && apart(at, { x, y }) === 1 && !arrived && !locked;
            const lit = pointingAt ? same(pointingAt, { x, y }) : false;
            const walked = walkedAt.get(`${x},${y}`);

            if (wall) {
              return (
                <span
                  key={`${x},${y}`}
                  data-way-cell=""
                  data-x={x}
                  data-y={y}
                  className="way-cell is-wall"
                  aria-hidden
                />
              );
            }

            return (
              <button
                key={`${x},${y}`}
                type="button"
                data-way-cell=""
                data-x={x}
                data-y={y}
                style={
                  walked === undefined
                    ? undefined
                    : ({
                        "--trail": haloLightAt(
                          walked / Math.max(trail.length - 1, 1),
                        ),
                      } as React.CSSProperties)
                }
                className={[
                  "way-cell",
                  walked !== undefined && "is-walked",
                  here && "is-here",
                  isGoal && "is-goal",
                  rung >= 2 && reachable && "is-open",
                  lit && "noticing",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => walkTo({ x, y })}
                disabled={locked || arrived || (!reachable && !here)}
                aria-label={
                  here
                    ? "Abraham is here. Drag him, or tap the next square."
                    : isGoal
                      ? "Canaan"
                      : reachable
                        ? "step here"
                        : "a square of the way"
                }
              >
                {here ? <span className="way-abraham" aria-hidden /> : null}
                {isGoal && !here ? (
                  <span className="way-canaan" aria-hidden />
                ) : null}
              </button>
            );
          }),
        )}
      </div>

      {interaction.hint && rung >= 1 && !arrived ? (
        <p className="helping text-center text-sm">{interaction.hint}</p>
      ) : null}

      {arrived ? (
        <p className="sr-only" aria-live="polite">
          {interaction.then}
        </p>
      ) : null}
    </div>
  );
}
