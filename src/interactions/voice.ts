/**
 * What the product says to a child.
 *
 * One module, not one per model, because this is the product's own voice and
 * it must sound like the same patient teacher everywhere. Four copies would
 * drift into four teachers.
 *
 * The story's voice is different and lives in the chapter file: the hint is
 * written by the author about that particular moment. Nothing here is ever
 * authored per chapter.
 *
 * Lines are drawn without replacement. That is not a nicety — a phrase heard
 * five times has told a child five times, which turns encouragement into a
 * tally of mistakes, and nothing in this product keeps count out loud.
 */

const POOLS = {
  /** First words after a try that did not work. Names the effort, never the outcome. */
  noticing: [
    "You're thinking",
    "Good thinking",
    "You're working it out",
    "Nice thinking",
    "You're figuring it out",
  ],

  /** As help climbs. The child stops being alone with it. */
  joining: [
    "Let's look together",
    "Let's find it together",
    "We can look again",
    "Let's have another look",
  ],

  /** Alongside a clue or the reveal. Forward-facing, never backward. */
  movingOn: [
    "Let's try another way",
    "Here's something that helps",
    "Let's look at this one",
    "Try this one",
  ],

  /** For stillness. A child who has done nothing has failed at nothing. */
  beginning: [
    "Let's start together",
    "I'll help you begin",
    "Shall we look?",
    "Let's begin here",
  ],

  /** Arrived alone. */
  capability: ["You found it", "You spotted it", "You did it", "That's the one"],

  /** Arrived after trying. Never mentions what did not work. */
  persistence: [
    "You kept looking",
    "You stayed with it",
    "You didn't give up",
    "You worked it out",
  ],

  /** Arrived after help. Honest about the company, never about the need for it. */
  partnership: [
    "We found it together",
    "We got there together",
    "We did that together",
  ],
} as const;

export type Pool = keyof typeof POOLS;

const unused = new Map<Pool, string[]>();

function shuffled(pool: Pool): string[] {
  const lines = [...POOLS[pool]];
  for (let i = lines.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lines[i], lines[j]] = [lines[j]!, lines[i]!];
  }
  return lines;
}

/** A line from the pool, never the same one twice until the pool runs out. */
export function say(pool: Pool): string {
  let remaining = unused.get(pool);

  if (!remaining || remaining.length === 0) {
    remaining = shuffled(pool);
    unused.set(pool, remaining);
  }

  return remaining.pop()!;
}
