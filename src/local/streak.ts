import { read, write, type Key } from "./store";

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
 * There are two of these and they never meet. Games and the memory verses
 * are different kinds of practice — one is recall across every story, the
 * other is holding particular words — and a child who is flying at one and
 * finding the other hard should see that as two separate honest facts
 * rather than as one blurred number. Sharing a store would also mean a run
 * ended in one place quietly resetting the other, which would be a lie.
 */

export type StreakRecord = {
  /** The highest run ever reached. */
  best: number;
  /** The highest run reached today. */
  todayBest: number;
  /** Which day `todayBest` refers to, as YYYY-MM-DD in local time. */
  day: string;
};

export type Streak = {
  read: (now?: Date) => StreakRecord;
  record: (run: number, now?: Date) => StreakRecord;
};

const EMPTY: StreakRecord = { best: 0, todayBest: 0, day: "" };

/** Local date, not UTC: "today" means the child's day, not Greenwich's. */
export function today(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function repair(raw: unknown): StreakRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Partial<StreakRecord>;
  return {
    best: Number(r.best) || 0,
    todayBest: Number(r.todayBest) || 0,
    day: typeof r.day === "string" ? r.day : "",
  };
}

/**
 * One streak, under one key.
 *
 * A factory rather than a module of loose functions, so that adding a third
 * kind of practice is a line here and cannot accidentally be plumbed into an
 * existing store.
 */
export function streakUnder(key: Key): Streak {
  const readStreak = (now = new Date()): StreakRecord => {
    const stored = read(key, repair, EMPTY);

    // A new day starts at nothing, without touching the all-time best.
    return stored.day === today(now)
      ? stored
      : { ...stored, todayBest: 0, day: today(now) };
  };

  return {
    read: readStreak,

    /**
     * Records a run, keeping only what is higher.
     *
     * Nothing here can go down. A run that ends is simply a run that did not
     * beat the last one, and the child is never told that.
     */
    record: (run, now = new Date()) => {
      const current = readStreak(now);
      const next: StreakRecord = {
        best: Math.max(current.best, run),
        todayBest: Math.max(current.todayBest, run),
        day: today(now),
      };

      write(key, next);
      return next;
    },
  };
}

/**
 * The streaks, by name.
 *
 * A name rather than the store itself, because the screens that use these
 * are handed their streak by a server component and a function cannot cross
 * that boundary. The name is the whole prop: two words that cannot be
 * confused, and adding a third kind of practice means adding a line here.
 */
export type StreakName = "games" | "verse";

const STREAKS: Record<StreakName, Streak> = {
  games: streakUnder("games.streak"),
  verse: streakUnder("verse.streak"),
};

export function streakNamed(name: StreakName): Streak {
  return STREAKS[name];
}
