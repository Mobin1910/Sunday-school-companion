/**
 * Momentum, and nothing else.
 *
 * Three numbers live here: the best a child has ever done, the best they
 * have done today, and what day "today" is. The current run is *not* here —
 * it belongs to the session in front of the child and is gone when they
 * leave, which is what makes it a run rather than a record.
 *
 * What is deliberately absent matters more than what is present. There is
 * no total played, no correct-vs-wrong tally, no history, no per-chapter
 * breakdown and no timestamps beyond the day. Those are the beginnings of a
 * report card, and this product does not keep one. A streak here is a
 * gesture at momentum, not a measurement of a child.
 *
 * Everything is wrapped in try/catch because private browsing throws on
 * access, and a child in a private window must simply get a product with no
 * memory rather than a broken one.
 */

const KEY = "ssc.games.streak";

export type StreakRecord = {
  /** The highest run ever reached. */
  best: number;
  /** The highest run reached today. */
  todayBest: number;
  /** Which day `todayBest` refers to, as YYYY-MM-DD in local time. */
  day: string;
};

const EMPTY: StreakRecord = { best: 0, todayBest: 0, day: "" };

/** Local date, not UTC: "today" means the child's day, not Greenwich's. */
export function today(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function readStreak(now = new Date()): StreakRecord {
  let stored: StreakRecord = EMPTY;

  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StreakRecord>;
      stored = {
        best: Number(parsed.best) || 0,
        todayBest: Number(parsed.todayBest) || 0,
        day: typeof parsed.day === "string" ? parsed.day : "",
      };
    }
  } catch {
    return EMPTY;
  }

  // A new day starts at nothing, without touching the all-time best.
  return stored.day === today(now) ? stored : { ...stored, todayBest: 0, day: today(now) };
}

/**
 * Records a run, keeping only what is higher.
 *
 * Nothing here can go down. A run that ends is simply a run that did not
 * beat the last one, and the child is never told that.
 */
export function recordRun(run: number, now = new Date()): StreakRecord {
  const current = readStreak(now);
  const next: StreakRecord = {
    best: Math.max(current.best, run),
    todayBest: Math.max(current.todayBest, run),
    day: today(now),
  };

  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // No memory this session. The game still plays.
  }

  return next;
}
