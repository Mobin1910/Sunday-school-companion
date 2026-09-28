/**
 * A browser small enough to reason about.
 *
 * The install manager is the one module in this feature that cannot be a pure
 * function: it exists to listen to a browser and to a clock. So the browser and
 * the clock are replaced with objects a test can drive, which is what makes
 * "hidden time does not count" and "the native prompt was declined" into
 * assertions rather than things to be checked by hand on a phone.
 *
 * Deliberately not jsdom. Nothing here needs layout, CSS or a DOM tree — the
 * manager touches nine browser properties in total, and this file is all nine.
 * Adding a DOM implementation to the repository to cover them would be a
 * dependency for the sake of a hundred lines.
 *
 * `Date.now`, `setInterval` and `clearInterval` are replaced too, so time only
 * moves when a test moves it. A test that waited five real minutes would be a
 * test nobody runs.
 */

export type Browser = {
  /**
   * Move the clock and run any interval that comes due.
   *
   * Time passing, and nothing else. Nobody touches anything, so the idle rule
   * in `activeUse.ts` applies — which is the point of having this separate from
   * `use`.
   */
  advance(ms: number): void;
  /**
   * Somebody using the app for this long.
   *
   * Advances the clock while tapping periodically, which is what the accrual
   * rules actually require: elapsed time alone is not use, and a test that
   * called `advance` and expected credit would be asserting the bug this
   * feature exists to avoid.
   */
  use(ms: number): void;
  /** Fire an event at `window` or `document`. */
  fire(on: "window" | "document", type: string, event?: Record<string, unknown>): void;
  /** Tab visible and window focused, or not. */
  attend(attending: boolean): void;
  /** What is in `localStorage`, for asserting on what was written. */
  stored(): Record<string, string>;
  /** Break `localStorage` the way a private window does: by throwing. */
  breakStorage(): void;
  now(): number;
  restore(): void;
};

export type BrowserOptions = {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  /** `navigator.standalone`. Only iOS defines it. */
  appleStandalone?: boolean;
  /** Which `display-mode` queries match. */
  displayModes?: string[];
  /** Whatever is already in storage. A raw string, so malformed data can be set. */
  storage?: Record<string, string>;
  attending?: boolean;
  startAt?: number;
};

const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36";

export const AGENTS = {
  android: ANDROID,
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  /** An older iPad, which still admits to being one. */
  ipad:
    "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  /** iPadOS 13+, which reports itself as a Mac. The case that needs the probe. */
  ipadOS:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  desktop:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  unknown: "",
} as const;

type Timer = { at: number; every: number; run: () => void };

export function fakeBrowser(options: BrowserOptions = {}): Browser {
  let clock = options.startAt ?? 1_700_000_000_000;
  let attending = options.attending ?? true;
  let storageWorks = true;

  const timers = new Map<number, Timer>();
  let nextTimer = 1;

  const heard = {
    window: new Map<string, Set<(event: unknown) => void>>(),
    document: new Map<string, Set<(event: unknown) => void>>(),
  };

  function listen(where: "window" | "document") {
    return (type: string, fn: (event: unknown) => void) => {
      const set = heard[where].get(type) ?? new Set();
      set.add(fn);
      heard[where].set(type, set);
    };
  }

  function unlisten(where: "window" | "document") {
    return (type: string, fn: (event: unknown) => void) => {
      heard[where].get(type)?.delete(fn);
    };
  }

  /*
    The cells are real own properties and the three methods live on a prototype.

    That shape matters: `forgetEverything` in `store.ts` finds this product's
    keys with `Object.keys(window.localStorage)`, exactly as a real `Storage`
    supports. A plain object with the methods on it would hand that scan
    "getItem", "setItem", "removeItem" and none of the data.
  */
  const cells: Record<string, string> = Object.create({
    getItem(this: Record<string, string>, key: string): string | null {
      if (!storageWorks) throw new Error("storage is unavailable");
      return Object.prototype.hasOwnProperty.call(this, key) ? this[key]! : null;
    },
    setItem(this: Record<string, string>, key: string, value: string): void {
      if (!storageWorks) throw new Error("storage is unavailable");
      this[key] = value;
    },
    removeItem(this: Record<string, string>, key: string): void {
      if (!storageWorks) throw new Error("storage is unavailable");
      delete this[key];
    },
  });

  for (const [key, value] of Object.entries(options.storage ?? {})) cells[key] = value;

  const win = {
    addEventListener: listen("window"),
    removeEventListener: unlisten("window"),
    localStorage: cells,
    matchMedia(query: string) {
      const modes = options.displayModes ?? [];
      return { matches: modes.some((mode) => query.includes(mode)) };
    },
  };

  const doc = {
    addEventListener: listen("document"),
    removeEventListener: unlisten("document"),
    get visibilityState() {
      return attending ? "visible" : "hidden";
    },
    hasFocus: () => attending,
    documentElement: { dataset: { welcomed: "yes" } as Record<string, string> },
  };

  const nav: Record<string, unknown> = {
    userAgent: options.userAgent ?? ANDROID,
    platform: options.platform ?? "Linux armv8l",
    maxTouchPoints: options.maxTouchPoints ?? 5,
  };
  if (options.appleStandalone !== undefined) nav.standalone = options.appleStandalone;

  const real = {
    now: Date.now,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
    window: (globalThis as Record<string, unknown>).window,
    document: (globalThis as Record<string, unknown>).document,
    navigator: (globalThis as Record<string, unknown>).navigator,
  };

  const g = globalThis as unknown as Record<string, unknown>;
  g.window = win;
  g.document = doc;
  /* `navigator` is a getter-only global in Node, so it is redefined rather than
     assigned — assignment silently does nothing and every probe reads Node's. */
  Object.defineProperty(globalThis, "navigator", {
    value: nav,
    configurable: true,
    writable: true,
  });

  Date.now = () => clock;

  g.setInterval = ((run: () => void, every: number) => {
    const id = nextTimer++;
    timers.set(id, { at: clock + every, every, run });
    return id;
  }) as unknown as typeof setInterval;

  g.clearInterval = ((id: number) => void timers.delete(id)) as unknown as typeof clearInterval;

  return {
    /**
     * Move time forward, running due intervals in order.
     *
     * A loop rather than one jump, so a five-minute advance fires sixty ticks
     * the way a real five minutes would — which is the only way the idle rule
     * and the persistence throttle get exercised at all.
     */
    advance(ms: number): void {
      const until = clock + ms;
      for (;;) {
        let soonest: { id: number; timer: Timer } | null = null;
        for (const [id, timer] of timers) {
          if (timer.at <= until && (soonest === null || timer.at < soonest.timer.at)) {
            soonest = { id, timer };
          }
        }
        if (soonest === null) break;

        clock = soonest.timer.at;
        soonest.timer.at = clock + soonest.timer.every;
        soonest.timer.run();
      }
      clock = until;
    },

    use(ms: number): void {
      /* A tap every twenty seconds — comfortably inside the idle window, and
         roughly the pace of a child turning story pages. */
      const beat = 20_000;
      let left = ms;
      while (left > 0) {
        this.fire("document", "pointerdown");
        const step = Math.min(beat, left);
        this.advance(step);
        left -= step;
      }
      this.fire("document", "pointerdown");
    },

    fire(on, type, event = {}): void {
      const shaped = { type, preventDefault() {}, ...event };
      for (const fn of heard[on].get(type) ?? []) fn(shaped);
    },

    attend(next: boolean): void {
      attending = next;
      this.fire("document", "visibilitychange");
      this.fire("window", next ? "focus" : "blur");
    },

    stored(): Record<string, string> {
      return { ...cells };
    },

    breakStorage(): void {
      storageWorks = false;
    },

    now: () => clock,

    restore(): void {
      Date.now = real.now;
      g.setInterval = real.setInterval;
      g.clearInterval = real.clearInterval;
      g.window = real.window;
      g.document = real.document;
      Object.defineProperty(globalThis, "navigator", {
        value: real.navigator,
        configurable: true,
        writable: true,
      });
    },
  };
}

/** A `beforeinstallprompt` event whose answer a test chooses. */
export function fakePrompt(outcome: "accepted" | "dismissed") {
  let prompted = 0;
  return {
    event: {
      prompt: () => {
        prompted += 1;
        return Promise.resolve();
      },
      userChoice: Promise.resolve({ outcome }),
    },
    /** How many times the browser's own prompt was actually opened. */
    prompted: () => prompted,
  };
}
