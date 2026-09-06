import { z } from "zod";

/**
 * The chapter schema.
 *
 * This is the contract between content and the app, and it is the only place
 * hard rules live. Everything here fails the build — a broken chapter must
 * never reach a child.
 *
 * Softer rules that depend on whether a chapter is a draft (missing artwork,
 * copy length, placeholder translations) live in checks.ts instead.
 */

/** Any object in a chapter file may carry a note. The app ignores it entirely. */
const note = z.string().optional();

export type Item = {
  picture?: string;
  label?: string;
  correct?: true;
  note?: string;
};

/**
 * A bare string means "the picture with this name". Normalised here so that
 * nothing downstream ever has to think about the shorthand again.
 */
const item = z
  .union([
    z.string(),
    z.strictObject({
      picture: z.string().optional(),
      label: z.string().optional(),
      correct: z.literal(true).optional(),
      note,
    }),
  ])
  .transform((value): Item =>
    typeof value === "string" ? { picture: value } : value,
  )
  .refine((value) => value.picture !== undefined || value.label !== undefined, {
    message: "an item needs a picture or a label",
  });

/*
  Interactions — the five presentations Version 1 builds.

  Each one is written in its correct state and shuffled at runtime, so no
  schema here has positions, indices or answer keys.
*/

const multipleChoice = z
  .strictObject({
    type: z.literal("multiple-choice"),
    prompt: z.string(),
    // Required, not optional: the second try always comes with help, and a
    // chapter that breaks that promise should be impossible to write.
    hint: z.string().min(1),
    options: z.array(item).min(2).max(3),
    picture: z.string().optional(),
    note,
  })
  .refine((i) => i.options.filter((o) => o.correct).length === 1, {
    message: "needs exactly one option marked correct",
  });

const match = z.strictObject({
  type: z.literal("match"),
  prompt: z.string(),
  pairs: z.array(z.strictObject({ from: item, to: item, note })).min(2),
  hint: z.string().optional(),
  note,
});

const sequence = z.strictObject({
  type: z.literal("sequence"),
  prompt: z.string(),
  items: z.array(item).min(3),
  hint: z.string().optional(),
  note,
});

const arrangeWords = z.strictObject({
  type: z.literal("arrange-words"),
  prompt: z.string(),
  words: z.array(z.string().min(1)).min(2),
  hint: z.string().optional(),
  note,
});

/**
 * Discovery. Note there is no `hint` field at all — because the object is
 * strict, writing one is an error. Nothing in a reveal can be wrong, so
 * nothing in a reveal needs help.
 */
const reveal = z
  .strictObject({
    type: z.literal("reveal"),
    prompt: z.string().optional(),
    items: z.array(item).min(1),
    note,
  })
  .refine((i) => i.items.every((x) => x.correct === undefined), {
    message: "nothing in a reveal can be correct — discovery has no wrong answers",
  });

export const interactionSchema = z.discriminatedUnion("type", [
  multipleChoice,
  match,
  sequence,
  arrangeWords,
  reveal,
]);

export type Interaction = z.infer<typeof interactionSchema>;

/* Chapter sections */

const storyCard = z
  .strictObject({
    picture: z.string(),
    text: z.string().optional(),
    alt: z.string().optional(),
    interaction: interactionSchema.optional(),
    note,
  })
  .refine((card) => card.text !== undefined || card.alt !== undefined, {
    message:
      "a card with a picture and no text needs alt, or the picture is silent",
  });

const verse = z.strictObject({
  text: z.string(),
  reference: z.string(),
  translation: z.string(),
  attribution: z.string().optional(),
  picture: z.string().optional(),
  practice: interactionSchema.optional(),
  note,
});

/**
 * A video that belongs to a chapter.
 *
 * The identifier is validated to YouTube's actual format — eleven characters
 * from a known alphabet — rather than accepted as any string, so a pasted
 * full URL, a truncated id or an empty field fails the build instead of
 * becoming a broken player in front of a child. Nothing in the app ever
 * hard-codes one: a video is chapter content like everything else.
 *
 * `enabled` exists so a video can be written and held back without deleting
 * the work, which is the same reason `library.json` exists for chapters.
 * `picture` is an ordinary chapter picture, resolved like any other; it is
 * deliberately *not* a YouTube thumbnail URL, because fetching one would
 * reach out to a third party before the child has asked to watch anything.
 */
const video = z.strictObject({
  youtubeId: z
    .string()
    .regex(
      /^[A-Za-z0-9_-]{11}$/,
      "must be a YouTube video id — the 11 characters after `v=`, not a URL",
    ),
  title: z.string().min(1),
  description: z.string().optional(),
  picture: z.string().optional(),
  enabled: z.boolean().optional(),
  note,
});

export const chapterSchema = z.strictObject({
  title: z.string(),
  reference: z.string(),

  // Exactly one cover and exactly one celebration, guaranteed by the shape
  // rather than by a rule someone has to remember.
  cover: z.strictObject({ picture: z.string(), note }),
  story: z.array(storyCard).min(1),
  activity: interactionSchema.optional(),
  quiz: z.array(interactionSchema).min(1).optional(),
  verse: verse.optional(),

  /*
    Zero or one today, and the app already treats it as a list downstream, so
    the day a chapter wants two is a schema change here and nothing else.
    A chapter with no video is completely valid and always will be.
  */
  video: video.optional(),
  celebration: z.strictObject({
    message: z.string(),
    picture: z.string().optional(),
    note,
  }),
});

export type Chapter = z.infer<typeof chapterSchema>;

export const librarySchema = z.strictObject({
  chapters: z.array(z.string()),
});
