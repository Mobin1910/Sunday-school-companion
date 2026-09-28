import assert from "node:assert/strict";
import { test } from "node:test";

import { streakNamed } from "@/local/streak";

import { fakeBrowser } from "../pwa/harness";

/**
 * A streak's identity, which is not a detail.
 *
 * This file exists because of one bug, and the bug is worth writing down.
 *
 * `streakNamed` used to build a fresh object on every call. `PracticeScreen`
 * holds one and puts it in an effect's dependency array; the effect reads the
 * record and stores it in state. A new object every render meant the effect
 * ran every render, set state, and rendered again — about fifteen thousand
 * times a second, for as long as the screen was open.
 *
 * Nothing said so. There was no console error, the screen looked and felt
 * normal, and a child could still play. What it actually broke was every link
 * on Games and Memory Verse, because the App Router navigates inside a
 * transition and a transition cannot commit in a tree that never stops
 * re-rendering. The report that came back was "the bottom bar does not work",
 * which is four steps from the cause.
 *
 * So identity is part of this function's contract now, and these tests are how
 * it stays that way. They are cheap and they are not really about streaks.
 */

test("the same name and class give back the very same object", () => {
  const browser = fakeBrowser();
  try {
    assert.equal(streakNamed("games", "beginner"), streakNamed("games", "beginner"));
  } finally {
    browser.restore();
  }
});

test("identity survives any number of calls, which is what a render loop is", () => {
  const browser = fakeBrowser();
  try {
    const first = streakNamed("verse", "primary");
    for (let i = 0; i < 200; i += 1) {
      assert.equal(streakNamed("verse", "primary"), first, `differed on call ${i}`);
    }
  } finally {
    browser.restore();
  }
});

test("two kinds of practice are still two different stores", () => {
  const browser = fakeBrowser();
  try {
    assert.notEqual(streakNamed("games", "beginner"), streakNamed("verse", "beginner"));
  } finally {
    browser.restore();
  }
});

test("two classes are still two different stores", () => {
  const browser = fakeBrowser();
  try {
    assert.notEqual(streakNamed("games", "beginner"), streakNamed("games", "primary"));
  } finally {
    browser.restore();
  }
});

test("a shared identity still reads and writes the right drawer", () => {
  /* Caching the object must not cache the *record*: the whole point is that
     the closure is stable while what it reads is live. */
  const browser = fakeBrowser();
  try {
    const games = streakNamed("games", "beginner");
    const verse = streakNamed("verse", "beginner");

    games.record(4);
    verse.record(9);

    assert.equal(streakNamed("games", "beginner").read().best, 4);
    assert.equal(streakNamed("verse", "beginner").read().best, 9);

    /* And a later run that beats it moves, through the same cached object. */
    games.record(7);
    assert.equal(games.read().best, 7);
  } finally {
    browser.restore();
  }
});
