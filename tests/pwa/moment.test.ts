import assert from "node:assert/strict";
import { test } from "node:test";

import { isSafeMoment } from "@/pwa/moment";

/**
 * Where the invitation may appear, and — mostly — where it may not.
 *
 * The deferral cases are the ones worth having. Reaching five active minutes
 * almost always happens mid-story or mid-question, and a sheet arriving there
 * is the app talking over a six-year-old to reach an adult.
 */

const at = (pathname: string, over: { onboarding?: boolean; busy?: boolean } = {}) =>
  isSafeMoment({ pathname, onboarding: false, busy: false, ...over });

/* ── calm ─────────────────────────────────────────────────────────────── */

test("home is a calm moment", () => assert.equal(at("/"), true));
test("the chapters shelf is calm", () => assert.equal(at("/chapters"), true));
test("the games destination is calm", () => assert.equal(at("/games"), true));
test("the verses destination is calm", () => assert.equal(at("/verses"), true));

test("a chapter hub is calm", () => {
  assert.equal(at("/chapter/beginner/the-lost-coin"), true);
});

test("a chapter's games shelf is calm — it is a list, not a question", () => {
  assert.equal(at("/chapter/beginner/the-lost-coin/games"), true);
});

test("a trailing slash is the same screen", () => {
  /* A static export can be served either way. */
  assert.equal(at("/chapters/"), true);
  assert.equal(at("/chapter/beginner/the-lost-coin/"), true);
});

/* ── defer ────────────────────────────────────────────────────────────── */

test("never during a story", () => {
  assert.equal(at("/chapter/beginner/the-lost-coin/story"), false);
});

test("never during a game", () => {
  assert.equal(at("/chapter/beginner/the-lost-coin/games/who-was-who"), false);
});

test("never on the memory verse", () => {
  assert.equal(at("/chapter/beginner/the-lost-coin/verse"), false);
});

test("never during verse practice", () => {
  assert.equal(at("/chapter/beginner/the-lost-coin/verse/practice"), false);
});

test("never while watching", () => {
  assert.equal(at("/chapter/beginner/the-lost-coin/watch"), false);
});

test("never in settings", () => assert.equal(at("/settings"), false));

test("never during onboarding, even though it shares Home's route", () => {
  assert.equal(at("/", { onboarding: true }), false);
});

test("never while another sheet is open", () => {
  assert.equal(at("/chapters", { busy: true }), false);
});

test("an unknown route defers rather than allows", () => {
  /* The allow-list direction: forgetting to add a new calm screen costs a
     later invitation, where forgetting to add a new immersive screen to a
     deny-list would cost an interruption mid-game. */
  assert.equal(at("/something-new-and-immersive"), false);
  assert.equal(at("/debug"), false);
  assert.equal(at("/prototype/curl"), false);
});

test("no pathname is not a moment", () => {
  assert.equal(isSafeMoment({ pathname: null, onboarding: false, busy: false }), false);
});
