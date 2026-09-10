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

/**
 * Where a picture comes from.
 *
 * A chapter has two kinds of artwork and they are not the same thing. Story
 * panels are the chapter — drawn once, read in order, and freely reused by
 * anything that wants to point back at a moment in the story. Game artwork
 * is drawn for one game and means nothing outside it. Keeping them apart in
 * the content means keeping them apart on disk, which is what stops a games
 * folder slowly filling with copies of panels that already existed.
 *
 * A bare string is the shorthand every chapter already writes, and it means
 * a story panel of this chapter. It is normalised here, so nothing
 * downstream ever has to think about the shorthand again.
 */
export type AssetReference =
  | { source: "story"; panelId: string }
  | { source: "game"; path: string };

const assetReference = z
  .union([
    z.string().min(1),
    z.strictObject({ source: z.literal("story"), panelId: z.string().min(1) }),
    z.strictObject({ source: z.literal("game"), path: z.string().min(1) }),
  ])
  .transform((value): AssetReference =>
    typeof value === "string" ? { source: "story", panelId: value } : value,
  );

export type Item = {
  picture?: AssetReference;
  label?: string;
  correct?: true;
  note?: string;
};

/**
 * A bare string means "the story panel with this name". Normalised here so
 * that nothing downstream ever has to think about the shorthand again.
 */
const item = z
  .union([
    z.string(),
    z.strictObject({
      picture: assetReference.optional(),
      label: z.string().optional(),
      correct: z.literal(true).optional(),
      note,
    }),
  ])
  .transform((value): Item =>
    typeof value === "string" ? { picture: { source: "story", panelId: value } } : value,
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
    /*
      Four is the ceiling because four illustrated choices are what fits on
      one phone screen under the question, and a choice a child has to
      scroll to find is not really being offered. Two is the floor because
      one option is not a question.
    */
    options: z.array(item).min(2).max(4),
    picture: assetReference.optional(),
    note,
  })
  .refine((i) => i.options.filter((o) => o.correct).length === 1, {
    message: "needs exactly one option marked correct",
  });

/**
 * Pairing.
 *
 * The answer key is the shape: `from` and `to` sit inside one object, so a
 * thing and its partner are the same row of the file and cannot drift apart.
 * That is stronger than naming each side and pointing one at the other by
 * id — there is no id to mistype and no dangling reference to validate,
 * because an unpaired half cannot be written down in the first place.
 * Shuffling reorders the rows and each side independently; the binding is
 * untouched by any of it.
 */
const match = z.strictObject({
  type: z.literal("match"),
  prompt: z.string(),
  pairs: z.array(z.strictObject({ from: item, to: item, note })).min(2).max(4),
  hint: z.string().optional(),
  note,
});

/**
 * Ordering, with the order stated rather than implied.
 *
 * This is the one interaction where the note above does not hold, and it is
 * worth saying why. Selection carries `correct` on the option and Pairing
 * binds `from` to `to` inside one object: in both, the answer travels with
 * the thing it belongs to and survives any amount of shuffling or
 * re-editing. Ordering had no such anchor — the answer was the order the
 * items happened to be written in, so tidying the file, sorting it, or
 * moving one line for readability silently changed what was correct.
 *
 * So each step says where it goes. `position` is 1-based because it is read
 * by people, and the positions must be exactly 1..n with none missing and
 * none repeated — checked below, so a sequence cannot be half-numbered.
 */
const sequence = z
  .strictObject({
    type: z.literal("sequence"),
    prompt: z.string(),
    items: z
      .array(
        z
          .strictObject({
            picture: assetReference.optional(),
            label: z.string().optional(),
            position: z.number().int().min(1),
            note,
          })
          .refine((i) => i.picture !== undefined || i.label !== undefined, {
            message: "a step needs a picture or a label",
          }),
      )
      .min(3),
    hint: z.string().optional(),
    note,
  })
  .refine(
    (i) => {
      const seen = new Set(i.items.map((step) => step.position));
      return (
        seen.size === i.items.length &&
        [...seen].every((p) => p >= 1 && p <= i.items.length)
      );
    },
    {
      message:
        "positions must be exactly 1..n — each step numbered once, none missing, none repeated",
    },
  );

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

/**
 * A game: one interaction, with the things a child and a teacher need in
 * order to know what it is.
 *
 * A chapter used to carry a single bare `activity` — an interaction with no
 * name and nothing said about why it existed. That was fine while there was
 * one and it lived behind a door labelled "Games", and it stops being fine
 * the moment a chapter has three and a child has to choose between them.
 *
 * `objective` is required, and it is the reason this shape exists at all. It
 * is what the teacher's brief actually contains — a learning objective and a
 * suggested approach — so it is the one thing that must survive the journey
 * from the sheet into the repository. A game nobody can say the point of is
 * a game that should not have been written.
 *
 * `id` is the game's address: it names the file it was written in, the route
 * a child plays it at, and nothing else. It is deliberately not a number,
 * because numbers imply an order and these can be played in any.
 */
const game = z.strictObject({
  id: z
    .string()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "must be lower-case words joined by hyphens — it becomes part of a URL",
    ),
  title: z.string().min(1),
  objective: z.string().min(1),
  /*
    A game is one or more questions, played in the order they are written.
    Most are one. Where a second genuinely asks something the first does not
    — the *why* behind a *who*, say — it belongs to the same game rather than
    to a second one with its own name and its own objective.
  */
  interactions: z.array(interactionSchema).min(1),

  /*
    The one the chapter leads with, drawn larger on the shelf. It is a
    property of the game rather than of its position in the list, because
    the order these are written in is the order they read best in, and that
    is not always the one worth starting with. At most one per chapter.

    It is emphasis and never a ranking: nothing is locked, nothing is
    ordered, and a child who plays the last one first has lost nothing.
  */
  featured: z.literal(true).optional(),

  /*
    The picture on the shelf.

    Optional, and usually left out: a game that asks about a moment already
    has that moment drawn inside it, so the shelf takes the first picture the
    game uses and nothing has to be written down or drawn twice. Set this
    only where that pick is wrong, or where a game is all words and would
    otherwise be a paragraph on a dark card.

    It is an ordinary asset reference, so it can point at a story panel —
    which is the whole reason a reference says where it comes from.
  */
  picture: assetReference.optional(),
  note,
});

export type Game = z.infer<typeof game>;

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

  /*
    The chapter's own note. Every other object in a chapter file could carry
    one and this one could not, which made the rule at the top of this file
    false in exactly the place it is most needed: what a chapter is *for* —
    its lesson, its acts, what is still pending — belongs to the chapter, not
    to whichever card happens to be first. Ignored by the app like every
    other note; see cards.ts, which drops them all.
  */
  note,

  // Exactly one cover and exactly one celebration, guaranteed by the shape
  // rather than by a rule someone has to remember.
  cover: z.strictObject({ picture: z.string(), note }),
  story: z.array(storyCard).min(1),

  /*
    A chapter's games, each named and each with its point written down. Ids
    must be unique inside a chapter, because an id is a route.
  */
  games: z
    .array(game)
    .min(1)
    .optional()
    .refine(
      (games) =>
        games === undefined ||
        new Set(games.map((g) => g.id)).size === games.length,
      { message: "two games share an id, and an id is a route" },
    )
    .refine(
      (games) =>
        games === undefined || games.filter((g) => g.featured).length <= 1,
      { message: "only one game can be the one a chapter leads with" },
    ),

  quiz: z.array(interactionSchema).min(1).optional(),
  verse: verse.optional(),

  /*
    Zero or one today, and the app already treats it as a list downstream, so
    the day a chapter wants two is a schema change here and nothing else.
    A chapter with no video is completely valid and always will be.
  */
  video: video.optional(),
  /*
    The ending is a message and nothing else. It took a picture once, and
    the field is gone rather than left optional: a chapter ends on Halo
    celebrating with the child, so artwork here has nowhere to be drawn, and
    an accepted field that renders nothing is how a content file quietly
    stops matching the app.
  */
  celebration: z.strictObject({ message: z.string(), note }),
});

export type Chapter = z.infer<typeof chapterSchema>;

export const librarySchema = z.strictObject({
  chapters: z.array(z.string()),
});
