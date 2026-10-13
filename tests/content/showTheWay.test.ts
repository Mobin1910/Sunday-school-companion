import assert from "node:assert/strict";
import { test } from "node:test";

import { interactionSchema } from "@/content/schema";

/**
 * A maze with no way through must not load.
 *
 * This is the only interaction in the catalogue whose validity is a property
 * of the *content* rather than its shape, and that is exactly why it is
 * tested. Every other gate in this codebase catches a missing field or a
 * prompt three words too long — things a person notices reading the file. A
 * sealed maze reads perfectly: the rows are the right length, the markers are
 * there, every character is legal. The only way to find out it is wrong is to
 * walk it, and the only person who would walk it is a six-year-old who then
 * sits there unable to finish and with no way of knowing the fault was ours.
 *
 * So the schema walks it at load time, and this is the test that the walking
 * works. `content:check` and the build both run the same parse, so a sealed
 * maze cannot reach a child without first failing CI.
 */

const maze = (rows: string[]) =>
  interactionSchema.safeParse({
    type: "show-the-way",
    prompt: "Can you show the way?",
    rows,
    then: "He came to the land of Canaan.",
  });

test("a maze with a way through loads", () => {
  const result = maze([
    "#######",
    "#A..#.#",
    "#.#.#.#",
    "#.#...#",
    "#...#C#",
    "#######",
  ]);
  assert.equal(result.success, true);
});

test("a maze with no way through is refused", () => {
  /* C is walled off on all four sides. Every row is legal; the maze is not. */
  const result = maze([
    "#######",
    "#A....#",
    "#.....#",
    "#...###",
    "#...#C#",
    "#####*#".replace("*", "#"),
  ]);
  assert.equal(result.success, false);
  assert.match(
    JSON.stringify(result.error?.issues ?? []),
    /no way through/,
  );
});

test("rows of different lengths are refused", () => {
  const result = maze(["#####", "#A.C#", "####"]);
  assert.equal(result.success, false);
  assert.match(JSON.stringify(result.error?.issues ?? []), /same length/);
});

test("a maze needs exactly one start and one goal", () => {
  assert.equal(maze(["#####", "#A.C#", "#A..#", "#####"]).success, false);
  assert.equal(maze(["#####", "#...#", "#####"]).success, false);
});

test("an illegal character is refused", () => {
  const result = maze(["#####", "#AxC#", "#####"]);
  assert.equal(result.success, false);
});
