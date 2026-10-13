"use client";

import { useMemo, useState } from "react";

import type { ModelProps, ShowTheWay as Model } from "../types";

/**
 * Showing the way to Canaan.
 *
 * The curriculum prints this as a maze on p.75 and asks the child to draw the
 * line. Here they tap the next square instead of dragging a fingertip along a
 * corridor, for the reason `journey` is a tap: precision dragging is ruled out
 * for six-year-olds, and a maze is nothing but precision dragging.
 *
 * So the task is one decision at a time. Abraham is on a square; the squares
 * he could step to are the four beside him; tapping an open one moves him.
 * Tapping a wall is the only way to be wrong, and being wrong does nothing at
 * all except say so quietly — he does not go back to the start, because a
 * maze that punishes a wrong turn by undoing twenty right ones is a maze a
 * child stops playing.
 *
 * Stepping back the way you came is always allowed. That is the whole of how
 * a person solves a maze, and a maze you cannot reverse out of is a trap.
 *
 * The help ladder makes the task smaller and never makes the move:
 *   rung 2 — the squares he could step to are outlined
 *   rung 3 — the next square on the way through is lit, and still tapped
 *            by the child
 *
 * Nothing is counted. There is no timer, no best path, no score for the
 * number of steps. A child who wanders the whole maze and arrives has shown
 * the way exactly as well as one who walked it straight.
 */

type Point = { x: number; y: number };

const NEIGHBOURS = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
] as const;

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
    if (here.x === goal.x && here.y === goal.y) {
      /* Walk the trail back to the square right after `from`. */
      let step = here;
      while (true) {
        const previous = cameFrom.get(key(step));
        if (!previous) return null;
        if (previous.x === from.x && previous.y === from.y) return step;
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

  /* The trail always holds at least the start, so there is always a square. */
  const at = trail[trail.length - 1] ?? start;
  const width = grid[0]?.length ?? 0;

  const isOpen = (x: number, y: number) => {
    const cell = grid[y]?.[x];
    return cell !== undefined && cell !== "#";
  };
  const beside = (x: number, y: number) =>
    Math.abs(x - at.x) + Math.abs(y - at.y) === 1;
  const onTrail = (x: number, y: number) =>
    trail.some((p) => p.x === x && p.y === y);

  const pointingAt =
    rung >= 3 && !arrived && !locked ? nextStepToward(grid, at, goal) : null;

  function step(x: number, y: number) {
    if (locked || arrived || !beside(x, y)) return;

    if (!isOpen(x, y)) {
      /* A wall. Nothing moves, nothing is undone, and it is said once. */
      onMiss();
      return;
    }

    /* Back the way he came: shorten the trail rather than doubling it. */
    const back = trail.length >= 2 && trail[trail.length - 2];
    if (back && back.x === x && back.y === y) {
      setTrail((was) => was.slice(0, -1));
      return;
    }

    setTrail((was) => [...was, { x, y }]);

    if (x === goal.x && y === goal.y) {
      setArrived(true);
      onArrive();
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 px-2">
      <h2 className="asking text-center leading-snug text-balance">
        {arrived ? interaction.then : interaction.prompt}
      </h2>

      <div
        className="way-maze"
        style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}
        role="group"
        aria-label={interaction.prompt}
      >
        {grid.flatMap((row, y) =>
          row.map((cell, x) => {
            const wall = cell === "#";
            const here = at.x === x && at.y === y;
            const isGoal = goal.x === x && goal.y === y;
            const reachable = !wall && beside(x, y) && !arrived && !locked;
            const lit = pointingAt?.x === x && pointingAt?.y === y;

            if (wall) {
              return (
                <span
                  key={`${x},${y}`}
                  className="way-cell is-wall"
                  aria-hidden
                />
              );
            }

            return (
              <button
                key={`${x},${y}`}
                type="button"
                className={[
                  "way-cell",
                  onTrail(x, y) && "is-walked",
                  here && "is-here",
                  isGoal && "is-goal",
                  rung >= 2 && reachable && "is-open",
                  lit && "noticing",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => step(x, y)}
                disabled={locked || arrived || !beside(x, y)}
                aria-label={
                  here
                    ? "Abraham is here"
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
