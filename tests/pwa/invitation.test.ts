import assert from "node:assert/strict";
import { test } from "node:test";

import {
  INSTALL_PROMPT_ACTIVE_MS,
  INSTALL_PROMPT_DISMISS_COOLDOWN_MS,
} from "@/pwa/config";
import { invitationFor, worthCounting } from "@/pwa/invitation";
import { BLANK, dismissed, installed, type InstallRecord } from "@/pwa/record";

/**
 * Whether to ask, and the rule that keeps it from becoming nagging.
 *
 * The heading test of the file is the last one: five active minutes is the
 * *first* eligibility point, not a repeating alarm. Everything else here exists
 * to pin down the edges of that.
 */

const NOW = 1_700_000_000_000;

const earned: InstallRecord = { ...BLANK, status: "not-installed", activeUseMs: INSTALL_PROMPT_ACTIVE_MS };

const ask = (over: Partial<Parameters<typeof invitationFor>[0]> = {}) =>
  invitationFor({
    now: NOW,
    record: earned,
    status: "not-installed",
    platform: "android",
    nativeReady: true,
    ...over,
  });

/* ── earning it ───────────────────────────────────────────────────────── */

test("nothing before the threshold", () => {
  assert.equal(
    ask({ record: { ...earned, activeUseMs: INSTALL_PROMPT_ACTIVE_MS - 1 } }),
    null,
  );
});

test("the native invitation at the threshold", () => {
  assert.equal(ask(), "native");
});

/* ── installed suppresses everything ─────────────────────────────────── */

test("an installed app is never invited", () => {
  assert.equal(ask({ record: installed(earned) }), null);
});

test("a standalone launch suppresses it even before the record catches up", () => {
  assert.equal(ask({ status: "installed" }), null);
});

/* ── the cooldown ────────────────────────────────────────────────────── */

test("dismissing silences it immediately", () => {
  const record = dismissed(earned, NOW, INSTALL_PROMPT_DISMISS_COOLDOWN_MS);
  assert.equal(ask({ record, now: NOW + 1 }), null);
});

test("still silent five minutes later — this is not a five-minute timer", () => {
  const record = dismissed(earned, NOW, INSTALL_PROMPT_DISMISS_COOLDOWN_MS);

  /* Even if time had somehow been banked, which it has not: */
  const banked = { ...record, activeUseMs: INSTALL_PROMPT_ACTIVE_MS };
  assert.equal(ask({ record: banked, now: NOW + 5 * 60 * 1000 }), null);
});

test("still silent after one day", () => {
  const record = dismissed(earned, NOW, INSTALL_PROMPT_DISMISS_COOLDOWN_MS);
  assert.equal(ask({ record, now: NOW + 24 * 60 * 60 * 1000 }), null);
});

test("still silent one second before the week is up", () => {
  const record = dismissed(earned, NOW, INSTALL_PROMPT_DISMISS_COOLDOWN_MS);
  assert.equal(ask({ record, now: NOW + INSTALL_PROMPT_DISMISS_COOLDOWN_MS - 1 }), null);
});

test("dismissal resets the earned time, so the week does not end in a prompt", () => {
  /* The single line that makes this a cooldown rather than a snooze. Without
     it the counter would sit at the threshold all week and the invitation
     would reappear in the first second after it lapsed. */
  const record = dismissed(earned, NOW, INSTALL_PROMPT_DISMISS_COOLDOWN_MS);
  assert.equal(record.activeUseMs, 0);
  assert.equal(ask({ record, now: NOW + INSTALL_PROMPT_DISMISS_COOLDOWN_MS + 1 }), null);
});

test("after the week, another five active minutes earns it again", () => {
  const record = dismissed(earned, NOW, INSTALL_PROMPT_DISMISS_COOLDOWN_MS);
  const later = NOW + INSTALL_PROMPT_DISMISS_COOLDOWN_MS + 1;
  const reearned = { ...record, activeUseMs: INSTALL_PROMPT_ACTIVE_MS };
  assert.equal(ask({ record: reearned, now: later }), "native");
});

test("a dismissal does not touch the installation status", () => {
  const record = dismissed({ ...earned, status: "not-installed" }, NOW, 1000);
  assert.equal(record.status, "not-installed");
});

/* ── which invitation ────────────────────────────────────────────────── */

test("ios with no native prompt gets the instructions", () => {
  assert.equal(ask({ platform: "ios", nativeReady: false }), "ios");
});

test("a real prompt beats instructions, even on ios", () => {
  /* If an iOS browser ever starts firing `beforeinstallprompt`, a grown-up
     should get the one tap rather than a hunt through a menu. */
  assert.equal(ask({ platform: "ios", nativeReady: true }), "native");
});

test("android with no native prompt is asked nothing", () => {
  /* Which is every Android browser using this app today: Chrome will not fire
     `beforeinstallprompt` until the product has a service worker. Inventing an
     "Add to Home Screen" button here would promise something untriggerable. */
  assert.equal(ask({ platform: "android", nativeReady: false }), null);
});

test("desktop with no native prompt is asked nothing", () => {
  assert.equal(ask({ platform: "other", nativeReady: false }), null);
});

test("desktop with a native prompt is offered it", () => {
  assert.equal(ask({ platform: "other", nativeReady: true }), "native");
});

/* ── when counting is worth anything ─────────────────────────────────── */

test("counting stops once the threshold is reached", () => {
  assert.equal(worthCounting(earned, "not-installed", NOW), false);
});

test("counting stops while installed", () => {
  assert.equal(worthCounting(BLANK, "installed", NOW), false);
});

test("counting stops during the cooldown, which is what keeps it a cooldown", () => {
  const record = dismissed(earned, NOW, INSTALL_PROMPT_DISMISS_COOLDOWN_MS);
  assert.equal(worthCounting(record, "not-installed", NOW + 1000), false);
});

test("counting resumes once the cooldown lapses", () => {
  const record = dismissed(earned, NOW, INSTALL_PROMPT_DISMISS_COOLDOWN_MS);
  const later = NOW + INSTALL_PROMPT_DISMISS_COOLDOWN_MS + 1;
  assert.equal(worthCounting(record, "not-installed", later), true);
});
