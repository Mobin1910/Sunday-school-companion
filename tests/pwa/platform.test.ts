import assert from "node:assert/strict";
import { test } from "node:test";

import { detectPlatform } from "@/pwa/platform";

import { AGENTS } from "./harness";

/**
 * Platform detection, and one case that is the reason this module exists.
 *
 * The iPadOS row is the whole point. Since iPadOS 13 Safari reports itself as a
 * Mac, so the obvious `userAgent.includes("iPad")` sends every modern iPad down
 * the path for devices whose install mechanism we do not know — which is the
 * path that shows nothing. On iOS the instructions *are* the feature, so that
 * mistake would silently switch the feature off for a whole platform.
 */

const probe = (userAgent: string, platform = "", maxTouchPoints = 0) => ({
  userAgent,
  platform,
  maxTouchPoints,
});

test("android is android", () => {
  assert.equal(detectPlatform(probe(AGENTS.android, "Linux armv8l", 5)), "android");
});

test("iphone is ios", () => {
  assert.equal(detectPlatform(probe(AGENTS.iphone, "iPhone", 5)), "ios");
});

test("an older ipad, which still says iPad, is ios", () => {
  assert.equal(detectPlatform(probe(AGENTS.ipad, "iPad", 5)), "ios");
});

test("ipadOS calling itself a Mac is still ios", () => {
  assert.equal(detectPlatform(probe(AGENTS.ipadOS, "MacIntel", 5)), "ios");
});

test("a real Mac is not ios", () => {
  const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";
  assert.equal(detectPlatform(probe(mac, "MacIntel", 0)), "other");
});

test("a Mac with one touch point is not an iPad", () => {
  /* A drawing tablet can report 1. Borrowing a stylus must not change the
     instructions a grown-up is shown. */
  const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";
  assert.equal(detectPlatform(probe(mac, "MacIntel", 1)), "other");
});

test("desktop windows is other", () => {
  assert.equal(detectPlatform(probe(AGENTS.desktop, "Win32", 0)), "other");
});

test("an empty user agent is other, not a guess", () => {
  assert.equal(detectPlatform(probe(AGENTS.unknown)), "other");
});

test("android inside an ios webview is read as ios", () => {
  /* Chrome on iOS carries both "CriOS" and "iPhone". iOS must win: the install
     mechanism belongs to the operating system, not to the browser's branding. */
  const crios =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) CriOS/124 Mobile/15E148 Safari/604.1";
  assert.equal(detectPlatform(probe(crios, "iPhone", 5)), "ios");
});
