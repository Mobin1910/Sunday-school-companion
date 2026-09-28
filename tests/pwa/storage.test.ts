import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeBrowser } from "./harness";

/**
 * Storage, when there isn't any.
 *
 * `local/store.ts` is the product's whole memory and its contract is that
 * failing to store means *this device has no memory*, never that something is
 * broken. This file holds that contract to the one key the install invitation
 * adds — because a private window on a borrowed phone is exactly where a
 * grown-up is most likely to be handed this app.
 */

async function store() {
  /* Imported fresh per scenario: `store.ts` reads `window` at call time, but the
     module cache would otherwise carry state between cases. */
  return await import(`@/local/store?fresh=${Math.random()}`);
}

const keep = (raw: unknown) => (typeof raw === "object" && raw !== null ? raw : null);

test("a normal read and write", async () => {
  const browser = fakeBrowser();
  try {
    const { read, write } = await store();
    write("pwa-install", { status: "not-installed" });

    assert.deepEqual(browser.stored(), {
      "ssc.pwa-install": '{"status":"not-installed"}',
    });
    assert.deepEqual(read("pwa-install", keep, null), { status: "not-installed" });
  } finally {
    browser.restore();
  }
});

test("malformed JSON reads as the fallback rather than throwing", async () => {
  const browser = fakeBrowser({ storage: { "ssc.pwa-install": "{oh dear" } });
  try {
    const { read } = await store();
    assert.equal(read("pwa-install", keep, null), null);
  } finally {
    browser.restore();
  }
});

test("valid JSON of the wrong shape reads as the fallback", async () => {
  const browser = fakeBrowser({ storage: { "ssc.pwa-install": '"a string"' } });
  try {
    const { read } = await store();
    assert.equal(read("pwa-install", keep, null), null);
  } finally {
    browser.restore();
  }
});

test("storage that throws on read yields the fallback, not an exception", async () => {
  const browser = fakeBrowser();
  browser.breakStorage();
  try {
    const { read } = await store();
    assert.equal(read("pwa-install", keep, null), null);
  } finally {
    browser.restore();
  }
});

test("storage that throws on write is swallowed", async () => {
  const browser = fakeBrowser();
  browser.breakStorage();
  try {
    const { write } = await store();
    assert.doesNotThrow(() => write("pwa-install", { status: "installed" }));
  } finally {
    browser.restore();
  }
});

test("clearing everything reaches the install record", async () => {
  /* It is inside the `ssc.` namespace, so the prefix scan behind "clear
     progress" in Settings finds it. That is deliberate — see `store.ts`. */
  const browser = fakeBrowser({
    storage: { "ssc.pwa-install": "{}", "ssc.child": '{"name":"Sarah"}', "other.app": "keep" },
  });
  try {
    const { forgetEverything } = await store();
    forgetEverything();
    assert.deepEqual(browser.stored(), { "other.app": "keep" });
  } finally {
    browser.restore();
  }
});
