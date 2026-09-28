import assert from "node:assert/strict";
import { test } from "node:test";

import { INSTALL_PROMPT_ACTIVE_MS, INSTALL_PROMPT_DISMISS_COOLDOWN_MS } from "@/pwa/config";

import { AGENTS, fakeBrowser, fakePrompt, type Browser, type BrowserOptions } from "./harness";

/**
 * The manager, driven through a browser it cannot tell from a real one.
 *
 * This is the only part of the feature that is not a pure function, and it is
 * where the edge cases that actually bite live: an event that fires before
 * anything is ready, a prompt that can only be used once, a tab that is not
 * being looked at, a second tab that has already answered.
 *
 * Each scenario gets its own copy of the module. The manager is a singleton
 * holding one set of browser listeners and one deferred prompt, which is right
 * for a document and wrong for a test file — see `tests/resolve.mjs` for the
 * `?fresh=` mechanism.
 */

let copies = 0;

/**
 * A fake browser with the manager freshly loaded into it.
 *
 * The order is the point. The module is imported *after* the browser exists,
 * because the listener for `beforeinstallprompt` is attached at module
 * evaluation — which is the whole reason it is attached there and not in a
 * React effect.
 */
async function withManager(options: BrowserOptions = {}) {
  const browser = fakeBrowser(options);
  copies += 1;
  const manager = await import(`@/pwa/manager?fresh=${copies}`);
  return { browser, manager } as {
    browser: Browser;
    manager: typeof import("@/pwa/manager");
  };
}

const ANDROID: BrowserOptions = { userAgent: AGENTS.android, platform: "Linux armv8l" };
const IPHONE: BrowserOptions = {
  userAgent: AGENTS.iphone,
  platform: "iPhone",
  appleStandalone: false,
};

const stored = (browser: Browser) => {
  const raw = browser.stored()["ssc.pwa-install"];
  return raw === undefined ? null : (JSON.parse(raw) as Record<string, unknown>);
};

/* ── beforeinstallprompt ───────────────────────────────────────────────── */

test("the event is captured, and the browser's own banner is suppressed", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    let prevented = 0;
    manager.begin();
    browser.fire("window", "beforeinstallprompt", {
      preventDefault: () => void (prevented += 1),
      ...fakePrompt("accepted").event,
    });

    assert.equal(prevented, 1, "the mini-infobar must be prevented");

    /* Captured, but not yet earned: the event is permission to ask, not a reason. */
    assert.equal(manager.getSnapshot().eligible, null);
  } finally {
    browser.restore();
  }
});

test("captured event plus five active minutes earns the native invitation", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    manager.begin();
    browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);

    assert.equal(manager.getSnapshot().eligible, "native");
  } finally {
    browser.restore();
  }
});

test("an event arriving after eligibility is reached still opens the native path", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    manager.begin();

    /* Five minutes first, with nothing in hand: Android with no prompt is asked
       nothing at all. */
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    assert.equal(manager.getSnapshot().eligible, null);

    browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    assert.equal(manager.getSnapshot().eligible, "native");
  } finally {
    browser.restore();
  }
});

test("no event means no invitation on android, not an invented one", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    manager.begin();
    browser.use(INSTALL_PROMPT_ACTIVE_MS * 3);
    assert.equal(manager.getSnapshot().eligible, null);
  } finally {
    browser.restore();
  }
});

test("accepting the native prompt marks the app installed", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    const prompt = fakePrompt("accepted");
    manager.begin();
    browser.fire("window", "beforeinstallprompt", prompt.event);
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    manager.offer();

    await manager.requestInstall();

    assert.equal(prompt.prompted(), 1, "the browser's prompt must actually open");
    assert.equal(stored(browser)?.status, "installed");
    assert.equal(manager.getSnapshot().open, false);
    assert.equal(manager.getSnapshot().eligible, null);
  } finally {
    browser.restore();
  }
});

test("declining the native prompt buys a week of quiet, not another try", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    const prompt = fakePrompt("dismissed");
    manager.begin();
    browser.fire("window", "beforeinstallprompt", prompt.event);
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    manager.offer();

    await manager.requestInstall();

    const record = stored(browser);
    assert.equal(record?.status, "not-installed", "declining is not installing");
    assert.equal(record?.activeUseMs, 0, "the earned time is spent");
    assert.equal(
      record?.dismissedUntil,
      browser.now() + INSTALL_PROMPT_DISMISS_COOLDOWN_MS,
    );
    assert.equal(manager.getSnapshot().open, false);

    /* And five more minutes changes nothing, which is the headline requirement. */
    browser.use(INSTALL_PROMPT_ACTIVE_MS * 2);
    assert.equal(manager.getSnapshot().eligible, null);
  } finally {
    browser.restore();
  }
});

test("a spent prompt cannot be fired twice", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    const prompt = fakePrompt("dismissed");
    manager.begin();
    browser.fire("window", "beforeinstallprompt", prompt.event);
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    manager.offer();

    await manager.requestInstall();
    await manager.requestInstall();

    assert.equal(prompt.prompted(), 1);
  } finally {
    browser.restore();
  }
});

/* ── iOS ───────────────────────────────────────────────────────────────── */

test("iphone earns the instruction sheet, and it has two stages", async () => {
  const { browser, manager } = await withManager(IPHONE);
  try {
    manager.begin();
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    assert.equal(manager.getSnapshot().eligible, "ios");

    manager.offer();
    assert.equal(manager.getSnapshot().stage, "invite");

    manager.showHow();
    assert.equal(manager.getSnapshot().stage, "how");

    manager.showInvite();
    assert.equal(manager.getSnapshot().stage, "invite");
  } finally {
    browser.restore();
  }
});

test("an ipad reporting itself as a mac still earns the instruction sheet", async () => {
  const { browser, manager } = await withManager({
    userAgent: AGENTS.ipadOS,
    platform: "MacIntel",
    maxTouchPoints: 5,
  });
  try {
    manager.begin();
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    assert.equal(manager.getSnapshot().eligible, "ios");
  } finally {
    browser.restore();
  }
});

/* ── already installed ─────────────────────────────────────────────────── */

test("launched standalone: installed at startup, and nothing is counted", async () => {
  const { browser, manager } = await withManager({
    ...ANDROID,
    displayModes: ["standalone"],
  });
  try {
    manager.begin();
    assert.equal(stored(browser)?.status, "installed");

    browser.use(INSTALL_PROMPT_ACTIVE_MS * 3);
    assert.equal(manager.getSnapshot().eligible, null);
    assert.equal(stored(browser)?.activeUseMs, 0, "an installed app counts nothing");
  } finally {
    browser.restore();
  }
});

test("launched from the ios home screen is installed", async () => {
  const { browser, manager } = await withManager({
    userAgent: AGENTS.iphone,
    platform: "iPhone",
    appleStandalone: true,
  });
  try {
    manager.begin();
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    assert.equal(stored(browser)?.status, "installed");
    assert.equal(manager.getSnapshot().eligible, null);
  } finally {
    browser.restore();
  }
});

test("appinstalled marks installed and clears the invitation", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    manager.begin();
    browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    manager.offer();
    assert.equal(manager.getSnapshot().open, true);

    browser.fire("window", "appinstalled");

    assert.equal(stored(browser)?.status, "installed");
    assert.equal(manager.getSnapshot().open, false);
    assert.equal(manager.getSnapshot().eligible, null);
  } finally {
    browser.restore();
  }
});

test("a remembered install survives a later launch in a browser tab", async () => {
  const { browser, manager } = await withManager({
    ...ANDROID,
    displayModes: [],
    storage: { "ssc.pwa-install": JSON.stringify({ v: 1, status: "installed" }) },
  });
  try {
    manager.begin();
    browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    browser.use(INSTALL_PROMPT_ACTIVE_MS * 3);

    assert.equal(stored(browser)?.status, "installed");
    assert.equal(manager.getSnapshot().eligible, null);
  } finally {
    browser.restore();
  }
});

/* ── active use, through the real clock ────────────────────────────────── */

test("a hidden tab accumulates nothing", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    manager.begin();
    browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);

    browser.attend(false);
    browser.use(INSTALL_PROMPT_ACTIVE_MS * 2);

    assert.equal(manager.getSnapshot().eligible, null);
    assert.equal(stored(browser)?.activeUseMs, 0);
  } finally {
    browser.restore();
  }
});

test("time split across a hidden spell only counts the visible half", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    manager.begin();
    browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);

    browser.use(2 * 60_000);
    browser.attend(false);
    browser.advance(60 * 60_000);
    browser.attend(true);
    browser.use(2 * 60_000);

    assert.equal(manager.getSnapshot().eligible, null, "four minutes is not five");

    browser.use(90_000);
    assert.equal(manager.getSnapshot().eligible, "native");
  } finally {
    browser.restore();
  }
});

test("accumulated time is picked up again on a later visit", async () => {
  const half = INSTALL_PROMPT_ACTIVE_MS / 2;

  const first = await withManager(ANDROID);
  let carried: Record<string, string>;
  try {
    first.manager.begin();
    first.browser.use(half);
    /* Leaving the page is what settles the buffer. */
    first.browser.fire("window", "pagehide");
    carried = first.browser.stored();
    assert.ok(
      (JSON.parse(carried["ssc.pwa-install"]!) as { activeUseMs: number }).activeUseMs >= half - 5_000,
    );
  } finally {
    first.browser.restore();
  }

  const second = await withManager({ ...ANDROID, storage: carried });
  try {
    second.manager.begin();
    second.browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);

    /* Only the other half is still owed. */
    second.browser.use(half + 10_000);
    assert.equal(second.manager.getSnapshot().eligible, "native");
  } finally {
    second.browser.restore();
  }
});

/* ── dismissal across visits ───────────────────────────────────────────── */

test("not now, then a reload the next day: still quiet", async () => {
  const first = await withManager(ANDROID);
  let carried: Record<string, string>;
  try {
    first.manager.begin();
    first.browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    first.browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    first.manager.offer();
    first.manager.notNow();
    carried = first.browser.stored();
  } finally {
    first.browser.restore();
  }

  const day = 24 * 60 * 60 * 1000;
  const second = await withManager({
    ...ANDROID,
    storage: carried,
    startAt: 1_700_000_000_000 + day,
  });
  try {
    second.manager.begin();
    second.browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    second.browser.use(INSTALL_PROMPT_ACTIVE_MS * 2);

    assert.equal(second.manager.getSnapshot().eligible, null);
    assert.equal(stored(second.browser)?.activeUseMs, 0, "nothing accrues during a cooldown");
  } finally {
    second.browser.restore();
  }
});

test("not now, then a visit after the week: quiet until it is earned again", async () => {
  const first = await withManager(ANDROID);
  let carried: Record<string, string>;
  try {
    first.manager.begin();
    first.browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    first.browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    first.manager.offer();
    first.manager.notNow();
    carried = first.browser.stored();
  } finally {
    first.browser.restore();
  }

  /* Comfortably past the end of the cooldown the first session set, which it
     set from its own clock rather than from zero. */
  const second = await withManager({
    ...ANDROID,
    storage: carried,
    startAt: 1_700_000_000_000 + INSTALL_PROMPT_DISMISS_COOLDOWN_MS + 60 * 60_000,
  });
  try {
    second.manager.begin();
    second.browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);

    /* Not on arrival — the cooldown lapsing is not itself a reason to ask. */
    assert.equal(second.manager.getSnapshot().eligible, null);

    second.browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    assert.equal(second.manager.getSnapshot().eligible, "native");
  } finally {
    second.browser.restore();
  }
});

test("a cooldown lapsing while the app is open resumes counting", async () => {
  /* Unlikely — the boundary is a week away — but the clock is switched off
     during a cooldown, so something has to switch it back on without a reload.
     An interaction does. */
  const { browser, manager } = await withManager(ANDROID);
  try {
    manager.begin();
    browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    manager.offer();
    manager.notNow();

    /* Straight through the week without the page ever being reloaded. */
    browser.advance(INSTALL_PROMPT_DISMISS_COOLDOWN_MS + 60_000);
    assert.equal(manager.getSnapshot().eligible, null);

    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    assert.equal(manager.getSnapshot().eligible, "native");
  } finally {
    browser.restore();
  }
});

test("a dismissal leaves the installation status alone", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    manager.begin();
    browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    manager.offer();
    manager.notNow();

    assert.equal(stored(browser)?.status, "not-installed");
  } finally {
    browser.restore();
  }
});

/* ── a second tab ──────────────────────────────────────────────────────── */

test("answering in one tab closes the question in the other", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    manager.begin();
    browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    manager.offer();
    assert.equal(manager.getSnapshot().open, true);

    /* The other tab writes a dismissal, and this one is told about it. */
    const at = browser.now();
    browser.stored();
    (globalThis as unknown as { window: { localStorage: Record<string, string> } }).window.localStorage[
      "ssc.pwa-install"
    ] = JSON.stringify({
      v: 1,
      status: "not-installed",
      activeUseMs: 0,
      lastPromptShownAt: at,
      lastDismissedAt: at,
      dismissedUntil: at + INSTALL_PROMPT_DISMISS_COOLDOWN_MS,
    });
    browser.fire("window", "storage", { key: "ssc.pwa-install" });

    assert.equal(manager.getSnapshot().open, false);
    assert.equal(manager.getSnapshot().eligible, null);
  } finally {
    browser.restore();
  }
});

test("an unrelated key changing is ignored", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    manager.begin();
    browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    manager.offer();

    browser.fire("window", "storage", { key: "ssc.child" });

    assert.equal(manager.getSnapshot().open, true);
  } finally {
    browser.restore();
  }
});

/* ── no storage at all ─────────────────────────────────────────────────── */

test("a private window with no storage still works, and never throws", async () => {
  const browser = fakeBrowser(ANDROID);
  browser.breakStorage();
  copies += 1;
  const manager = (await import(`@/pwa/manager?fresh=${copies}`)) as typeof import("@/pwa/manager");

  try {
    assert.doesNotThrow(() => manager.begin());
    browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);

    /* It works for this sitting; it simply cannot remember afterwards. */
    assert.equal(manager.getSnapshot().eligible, "native");
    assert.doesNotThrow(() => manager.offer());
    assert.doesNotThrow(() => manager.notNow());
  } finally {
    browser.restore();
  }
});

test("a malformed stored record does not break startup", async () => {
  const { browser, manager } = await withManager({
    ...ANDROID,
    storage: { "ssc.pwa-install": "{not json at all" },
  });
  try {
    assert.doesNotThrow(() => manager.begin());
    browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);
    assert.equal(manager.getSnapshot().eligible, "native");
  } finally {
    browser.restore();
  }
});

/* ── the sheet itself ──────────────────────────────────────────────────── */

test("offering records that it was shown, and stops the clock", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    manager.begin();
    browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);

    manager.offer();
    const record = stored(browser);
    assert.equal(record?.lastPromptShownAt, browser.now());
    assert.equal(manager.getSnapshot().open, true);

    /* Nothing further is earned while the sheet is up. */
    const before = record?.activeUseMs;
    browser.use(INSTALL_PROMPT_ACTIVE_MS);
    assert.equal(stored(browser)?.activeUseMs, before);
  } finally {
    browser.restore();
  }
});

test("offering twice does not reopen or re-record", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    manager.begin();
    browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    browser.use(INSTALL_PROMPT_ACTIVE_MS + 10_000);

    manager.offer();
    const first = stored(browser)?.lastPromptShownAt;
    browser.use(30_000);
    manager.offer();

    assert.equal(stored(browser)?.lastPromptShownAt, first);
  } finally {
    browser.restore();
  }
});

test("nothing is offered before it is earned", async () => {
  const { browser, manager } = await withManager(ANDROID);
  try {
    manager.begin();
    browser.fire("window", "beforeinstallprompt", fakePrompt("accepted").event);
    browser.use(60_000);

    manager.offer();
    assert.equal(manager.getSnapshot().open, false);
  } finally {
    browser.restore();
  }
});
