import assert from "node:assert/strict";
import { test } from "node:test";

import { detectInstalled } from "@/pwa/installed";
import { BLANK, installed, withStatus } from "@/pwa/record";

/**
 * Installation state, including the answer that is neither yes nor no.
 *
 * "Unknown" earns its place here. A browser too old to answer must not be
 * treated as having said "not installed", because that is the answer that leads
 * to asking — and asking an installed user to install is the one outcome this
 * whole feature is arranged to avoid.
 */

const probe = (over: Partial<Parameters<typeof detectInstalled>[0]> = {}) => ({
  appDisplayModes: [] as string[],
  appleStandalone: undefined,
  canAsk: true,
  ...over,
});

test("a browser tab is not installed", () => {
  assert.equal(detectInstalled(probe()), "not-installed");
});

test("standalone is installed", () => {
  assert.equal(detectInstalled(probe({ appDisplayModes: ["standalone"] })), "installed");
});

test("fullscreen is installed", () => {
  assert.equal(detectInstalled(probe({ appDisplayModes: ["fullscreen"] })), "installed");
});

test("minimal-ui is installed", () => {
  /* Android hands this back when the app was installed from the browser menu
     rather than from a prompt. Checking only `standalone` would keep inviting
     a genuinely installed app to install itself. */
  assert.equal(detectInstalled(probe({ appDisplayModes: ["minimal-ui"] })), "installed");
});

test("apple's own standalone flag is installed", () => {
  assert.equal(detectInstalled(probe({ appleStandalone: true })), "installed");
});

test("apple's flag being false is not, on its own, an answer to disbelieve", () => {
  assert.equal(detectInstalled(probe({ appleStandalone: false })), "not-installed");
});

test("a browser that cannot be asked is unknown, not not-installed", () => {
  assert.equal(detectInstalled(probe({ canAsk: false })), "unknown");
});

test("unknown becomes not-installed once a browser answers", () => {
  const record = withStatus(BLANK, "not-installed");
  assert.equal(record.status, "not-installed");
});

test("installed is sticky: a later tab launch cannot undo it", () => {
  /* An installed app opened in a browser tab truthfully reports
     `not-installed` about that launch. Letting it overwrite the record would
     invite a grown-up to install what is already on the home screen. */
  const record = withStatus(installed(BLANK), "not-installed");
  assert.equal(record.status, "installed");
});

test("marking installed clears everything to do with asking", () => {
  const asked = {
    ...BLANK,
    status: "not-installed" as const,
    activeUseMs: 400_000,
    lastDismissedAt: 5,
    dismissedUntil: 99_999,
  };

  const done = installed(asked);
  assert.equal(done.status, "installed");
  assert.equal(done.activeUseMs, 0);
  assert.equal(done.lastDismissedAt, null);
  assert.equal(done.dismissedUntil, null);
});
