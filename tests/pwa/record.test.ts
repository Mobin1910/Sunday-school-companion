import assert from "node:assert/strict";
import { test } from "node:test";

import { BLANK, repairInstallRecord } from "@/pwa/record";

/**
 * What happens when what was on disk is nonsense.
 *
 * Stored data outlives the code that wrote it, and this record will one day be
 * read by a version of the app that did not write it — or by this one, after a
 * grown-up has been in devtools. The two outcomes worth fearing are an
 * invitation that can never appear and one that can never stop, and both are a
 * single unchecked field away.
 */

test("nothing at all", () => {
  assert.equal(repairInstallRecord(null), null);
  assert.equal(repairInstallRecord(undefined), null);
  assert.equal(repairInstallRecord("not a record"), null);
  assert.equal(repairInstallRecord(42), null);
});

test("an empty object becomes the blank record", () => {
  assert.deepEqual(repairInstallRecord({}), BLANK);
});

test("a nonsense status becomes unknown, never installed", () => {
  /* Erring towards `installed` would silence the feature forever on the
     strength of a corrupt byte. */
  assert.equal(repairInstallRecord({ status: "yes" })?.status, "unknown");
  assert.equal(repairInstallRecord({ status: true })?.status, "unknown");
  assert.equal(repairInstallRecord({ status: "dismissed" })?.status, "unknown");
});

test("a real status survives", () => {
  assert.equal(repairInstallRecord({ status: "installed" })?.status, "installed");
  assert.equal(repairInstallRecord({ status: "not-installed" })?.status, "not-installed");
});

test("NaN is not a duration", () => {
  /* The quiet killer: `NaN < threshold` is false, so a NaN here would mean the
     invitation never appears again and nothing looks broken. */
  assert.equal(repairInstallRecord({ activeUseMs: Number.NaN })?.activeUseMs, 0);
  assert.equal(repairInstallRecord({ dismissedUntil: Number.NaN })?.dismissedUntil, null);
});

test("infinity is not a timestamp", () => {
  assert.equal(repairInstallRecord({ dismissedUntil: Infinity })?.dismissedUntil, null);
  assert.equal(repairInstallRecord({ activeUseMs: Infinity })?.activeUseMs, 0);
});

test("negative time is discarded", () => {
  assert.equal(repairInstallRecord({ activeUseMs: -5000 })?.activeUseMs, 0);
  assert.equal(repairInstallRecord({ lastDismissedAt: -1 })?.lastDismissedAt, null);
});

test("a wildly large accumulated total is clamped, not trusted", () => {
  const repaired = repairInstallRecord({ activeUseMs: 9e15 });
  assert.equal(repaired?.activeUseMs, 24 * 60 * 60 * 1000);
});

test("strings where numbers belong are discarded", () => {
  assert.equal(repairInstallRecord({ activeUseMs: "300000" })?.activeUseMs, 0);
  assert.equal(repairInstallRecord({ dismissedUntil: "later" })?.dismissedUntil, null);
});

test("unknown extra fields are dropped rather than carried", () => {
  const repaired = repairInstallRecord({ status: "not-installed", model: "Pixel 8", visits: 12 });
  assert.deepEqual(Object.keys(repaired ?? {}).sort(), [
    "activeUseMs",
    "dismissedUntil",
    "lastDismissedAt",
    "lastPromptShownAt",
    "status",
    "v",
  ]);
});

test("a good record round-trips unchanged", () => {
  const good = {
    v: 1 as const,
    status: "not-installed" as const,
    activeUseMs: 120_000,
    lastPromptShownAt: 1_700_000_000_000,
    lastDismissedAt: 1_700_000_000_000,
    dismissedUntil: 1_700_604_800_000,
  };
  assert.deepEqual(repairInstallRecord(good), good);
});
