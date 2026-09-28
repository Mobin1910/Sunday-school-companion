import assert from "node:assert/strict";
import { test } from "node:test";

import { ACTIVE_IDLE_MS, ACTIVE_TICK_MS } from "@/pwa/config";
import { credit, idle, pause, resume, touch } from "@/pwa/activeUse";

/**
 * The arithmetic of "five minutes of actually using it".
 *
 * Every test here is a case where the naive implementation — a timeout from
 * page load — would have credited time that nobody spent.
 */

const T = 1_000_000;

test("a paused clock earns nothing", () => {
  const { gained } = credit(idle(T), T + 60_000);
  assert.equal(gained, 0);
});

test("a running clock earns the interval it covered", () => {
  const started = resume(T);
  const { gained } = credit(started, T + ACTIVE_TICK_MS);
  assert.equal(gained, ACTIVE_TICK_MS);
});

test("each tick settles only its own interval", () => {
  /* Two ticks over ten seconds must earn ten seconds, not fifteen. */
  let clock = resume(T);
  let total = 0;

  for (let n = 1; n <= 2; n += 1) {
    const step = credit(touch(clock, T + n * ACTIVE_TICK_MS), T + n * ACTIVE_TICK_MS);
    clock = step.clock;
    total += step.gained;
  }

  assert.equal(total, ACTIVE_TICK_MS * 2);
});

test("hidden time does not count", () => {
  /* Paused at T, credited at T + five minutes. Nothing in between was use. */
  const stopped = pause(resume(T), T).clock;
  const { gained } = credit(stopped, T + 5 * 60_000);
  assert.equal(gained, 0);
});

test("pausing settles what was genuinely owed first", () => {
  const { gained } = pause(resume(T), T + ACTIVE_TICK_MS);
  assert.equal(gained, ACTIVE_TICK_MS);
});

test("untouched time beyond the idle window does not count", () => {
  /* A lit screen in an empty room. */
  const started = resume(T);
  const { gained } = credit(started, T + ACTIVE_IDLE_MS + 1);
  assert.equal(gained, 0);
});

test("the dead interval is not back-credited when they return", () => {
  /* Twenty idle minutes, then a tap. What the next tick may credit is about one
     tick — never the twenty minutes, which is what would happen if the idle
     rule only skipped the credit and left the mark where it was. */
  const gap = 20 * 60_000;
  const started = resume(T);
  const gone = credit(started, T + gap).clock;

  const back = touch(gone, T + gap + 1);
  const { gained } = credit(back, T + gap + 1 + ACTIVE_TICK_MS);

  assert.ok(gained <= ACTIVE_TICK_MS * 2, `credited ${gained}ms`);
  assert.ok(gained >= ACTIVE_TICK_MS, `credited only ${gained}ms`);
});

test("reading without tapping still counts inside the idle window", () => {
  /* A story panel can hold a child for a minute without a single interaction,
     and that minute is real use. Twelve ticks, no touch, all of it counted. */
  let clock = resume(T);
  let total = 0;

  for (let n = 1; n <= 12; n += 1) {
    const step = credit(clock, T + n * ACTIVE_TICK_MS);
    clock = step.clock;
    total += step.gained;
  }

  assert.equal(total, 12 * ACTIVE_TICK_MS);
  assert.ok(12 * ACTIVE_TICK_MS < ACTIVE_IDLE_MS, "the run must stay inside the idle window");
});

test("a sleeping machine cannot credit hours in one tick", () => {
  /* A suspended laptop fires no timers and does not always report itself
     hidden, so the first tick after the lid opens can carry wall-clock hours.
     The idle rule catches most of it; the ceiling makes it impossible. */
  const awake = touch(resume(T), T + 4 * 60 * 60_000);
  const { gained } = credit(awake, T + 4 * 60 * 60_000);
  assert.ok(gained <= ACTIVE_TICK_MS * 2, `credited ${gained}ms in one tick`);
});

test("touching a paused clock does not restart it", () => {
  /* A scroll event on a hidden tab — some browsers still deliver them — must
     not quietly resume counting. Only `resume` starts a stretch. */
  const stopped = pause(resume(T), T).clock;
  const poked = touch(stopped, T + 1000);
  assert.equal(poked.creditedTo, null);
  assert.equal(credit(poked, T + 2000).gained, 0);
});
