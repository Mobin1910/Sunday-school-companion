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
    /**
     * A picture for the question itself — and a warning about it.
     *
     * **Nothing draws this yet.** `Selection` renders the prompt and the
     * options and no picture between them, so the only effect setting it has
     * is on `firstPicture` in cards.ts, which may then pick it for the shelf.
     * Chapter 3 was written with one of these on every counting question,
     * on the reasonable assumption that a question about ten coins would show
     * the ten coins, and they were removed again rather than left sitting in
     * the file looking like they did something.
     *
     * It is kept because it is the right shape for the thing and the schema
     * is where that shape belongs — but a question screen already carries
     * Halo above the prompt, and a picture under it pushes the choices off
     * a phone. Whoever draws this has a layout to solve first, not a field
     * to add. Until then: put the picture on the *options*, which `Selection`
     * does render, or on the game, which the shelf does.
     */
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

/**
 * Pouring — the one interaction that is a scene rather than a question.
 *
 * A child can be asked what Jesus told the servants to do and pick the right
 * word out of three, or they can turn a tap and watch a jar fill. This is the
 * second, and it is the only place in the product where the interaction is
 * built rather than illustrated: no artwork, no hotspots, no tapping about on
 * a picture hoping something is clickable. Two objects respond to touch — the
 * handle, and then the jar — and never both at once.
 *
 * It carries only its words. Everything else it needs is a state machine and
 * a stylesheet, which is why this schema is three strings: what to do first,
 * what to do once the jar is full, and what is said while it changes.
 *
 * There is no `hint`, for the same reason `reveal` has none. Nothing here can
 * be done wrongly, so nothing here needs help — only the next thing to do,
 * which is on the screen already.
 */
const pouring = z.strictObject({
  type: z.literal("pouring"),
  prompt: z.string(),
  /** Once the jar is full and the jar is the thing that answers. */
  then: z.string(),
  /** While the water is turning. Optional; the change speaks for itself. */
  during: z.string().optional(),
  note,
});

/**
 * Writing where a verse comes from.
 *
 * The only interaction a child answers by typing, and it exists for exactly
 * one job: the oldest class is asked to recall the reference rather than
 * recognise it among three. Offering "St Luke 2:30,31 / St Luke 3:30,31 /
 * St John 2:30,31" to a fifteen-year-old is a spotting exercise, and spotting
 * is the thing every rung below this one has already done.
 *
 * `answer` is the reference as the curriculum wrote it, and it is the display
 * form too — what a child is shown at the end is what the teacher supplied,
 * never a normalised rewrite of it. Matching is forgiving of the things that
 * are not the answer (case, spacing, the difference between a comma and a
 * hyphen in a verse range) and unforgiving of the things that are (which
 * book, which chapter, which verses). The comparison lives in `reference.ts`
 * beside the model, not here, because it is behaviour rather than shape.
 *
 * `hint` is required for the same reason Selection's is: the second try
 * always comes with help, and a reference a child cannot begin to recall is
 * exactly where that promise matters.
 */
const writeReference = z.strictObject({
  type: z.literal("write-reference"),
  prompt: z.string(),
  answer: z.string().min(1),
  hint: z.string().min(1),
  /** What to show under the field — "Book chapter:verse", never the answer. */
  shape: z.string().optional(),
  note,
});

/**
 * Searching for the lost coin.
 *
 * The chapter's own game, and — like `pouring` — one that is built rather
 * than illustrated. The parable is a woman sweeping a dark house by lamplight
 * until she finds one coin out of ten, so the interaction is a search: cloths
 * on the floor, a coin under one of them, and a child looking.
 *
 * It is authored as almost nothing, because almost nothing about it is an
 * editorial decision. How many cloths there are, how they move, how long the
 * coin is shown, what Halo says when a child misses — all of that is
 * behaviour, and behaviour lives in the model beside the component. What an
 * author chooses is what the child is asked and how many rounds they are
 * offered, because those are the two things that differ between meeting this
 * inside the story and meeting it in the Games section.
 *
 * `rounds` is the whole of that difference. In the story it is 1: the search
 * interrupts Panel 6, the child finds the coin, and Panel 7 says "She found
 * it!" — a second round there would be a game the story is waiting for. In
 * the Games section it is 2, and the second is played with eight cloths
 * rather than six, which is the only difficulty this game has.
 *
 * There is no `hint` string. The help is the task getting easier — cloths
 * withdraw, and the one covering the coin stirs — and a sentence cannot do
 * that. See `finding/Finding.tsx`.
 */
const finding = z.strictObject({
  type: z.literal("find-the-coin"),
  prompt: z.string(),
  /**
   * How many searches are offered, in order, each with more cloths than the
   * last. One inside the story, two in the Games section. Capped at two
   * because a game a child cannot finish is not a game, it is a chore.
   */
  rounds: z.union([z.literal(1), z.literal(2)]).optional(),
  note,
});

export const interactionSchema = z.discriminatedUnion("type", [
  multipleChoice,
  match,
  sequence,
  arrangeWords,
  reveal,
  pouring,
  finding,
  writeReference,
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

  /*
    Which of the chapter's own review questions this game answers.

    Numbers into `curriculum.questions`, and the reason it is a list of
    numbers rather than the questions themselves is that the question must
    exist in exactly one place. A game that restated it would be a second
    copy of the curriculum's words, free to drift from the book by a comma
    and then by a meaning.

    Optional, because a game does not have to come from a question — the
    chapter's search is the parable happening rather than a question being
    asked. But a chapter that *has* a curriculum block must answer every
    question in it, which is checked on the chapter below. That is the whole
    point of writing the block: it is not documentation, it is the list of
    things this chapter is required to have covered before it ships.
  */
  answers: z.array(z.number().int().min(1)).min(1).optional(),
  note,
});

export type Game = z.infer<typeof game>;

/* Chapter sections */

/**
 * The review questions the curriculum prints at the end of the chapter, and
 * what each one is for.
 *
 * This is the chapter's contract with the book it came from. The Beginners
 * volume ends The Lost Coin with seven numbered questions under "Answer the
 * Questions", and those questions — not a paraphrase of them, and not a
 * likelier-sounding set invented to suit a game — are what the games have to
 * cover. Writing them down here is what makes "we built games for chapter 3"
 * a checkable claim rather than an assertion.
 *
 * Four things live on each question and they are deliberately four different
 * kinds of thing:
 *
 *   `question`   the book's wording, verbatim, including its own punctuation
 *   `objective`  what a child should be able to do, in the teacher's register
 *   `answer`     the answer *the curriculum itself gives*, with where it says it
 *   `n`          the number the book prints beside it
 *
 * `answer` is quoted from the lesson rather than reasoned out, because the
 * moment an answer is composed here instead of found in the source, this
 * block stops being a record of the curriculum and starts being a second
 * opinion about it. Where the lesson does not answer its own question in so
 * many words, the note says so.
 *
 * Nothing here reaches a child. It is dropped in `cards.ts` along with the
 * notes — a six-year-old is not shown the learning objective for the thing
 * they are playing, and a browser should not download it.
 */
const curriculumQuestion = z.strictObject({
  /** The number the book prints. Questions are 1..n with none missing. */
  n: z.number().int().min(1),
  /** The book's own wording. Never tidied, never shortened. */
  question: z.string().min(1),
  /** What a child should be able to do, said for the grown-up. */
  objective: z.string().min(1),
  /** The curriculum's answer, quoted, with where it comes from. */
  answer: z.string().min(1),
  note,
});

const curriculum = z
  .strictObject({
    /** Book, chapter and page. Specific enough to open and check. */
    source: z.string().min(1),
    questions: z.array(curriculumQuestion).min(1),
    note,
  })
  .refine(
    (c) => {
      const seen = new Set<number>(c.questions.map((q) => q.n));
      return (
        seen.size === c.questions.length &&
        [...seen].every((n) => n >= 1 && n <= c.questions.length)
      );
    },
    {
      message:
        "question numbers must be exactly 1..n — each printed once, none missing, none repeated",
    },
  );

const storyCard = z
  .strictObject({
    picture: z.string(),
    text: z.string().optional(),
    alt: z.string().optional(),
    interaction: interactionSchema.optional(),
    /**
     * Whether the story waits here until the interaction is finished.
     *
     * Off by default, and deliberately so. Most asking panels are a pause the
     * story offers — a child who would rather keep reading should be able to,
     * because a comic that locks its own pages is a comic arguing with the
     * reader. A gate is for the rare panel where the interaction *is* the
     * next event in the plot: Chapter 3 asks a child to help search for the
     * coin, and the panel after it says "She found it!". Letting a child turn
     * past the search to be told the search succeeded tells them their part
     * did not matter.
     *
     * Only ever holds a page a child has not finished, and only forward.
     * Turning back is always allowed, because nothing is being prevented —
     * something is being waited for.
     */
    gate: z.boolean().optional(),
    note,
  })
  .refine((card) => card.text !== undefined || card.alt !== undefined, {
    message:
      "a card with a picture and no text needs alt, or the picture is silent",
  })
  .refine((card) => !card.gate || card.interaction !== undefined, {
    message: "a card can only gate on an interaction it actually has",
  });

/**
 * The drill a verse carries.
 *
 * One interaction, or several done in order. It was one, and for six of the
 * seven classes it still is — a single arrangement or a single choice is the
 * whole of the practice. Young Adult is why this is a list: that class
 * rebuilds the verse word by word *and then* writes down where it came from,
 * and those are two different acts of recall rather than one interaction with
 * a tail on it.
 *
 * A bare interaction is normalised to a list of one, so every chapter written
 * before this existed means exactly what it meant, and nothing downstream has
 * to ask which form it got. This is the same shape `game.interactions`
 * already has, and `PractiseVerse` walks it the way `GamePlayer` walks that.
 */
const practice = z
  .union([interactionSchema, z.array(interactionSchema).min(1)])
  .transform((value) => (Array.isArray(value) ? value : [value]));

const verse = z.strictObject({
  text: z.string(),
  reference: z.string(),
  translation: z.string(),
  attribution: z.string().optional(),
  picture: z.string().optional(),
  practice: practice.optional(),
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

/**
 * How a lesson closes: a decision, a song, and a prayer.
 *
 * Three sections rather than one, because they are three different acts. The
 * curriculum ends every chapter this way and the app had nowhere to put any
 * of it — the story simply stopped. They are optional, so the two chapters
 * that predate them stay valid and unchanged.
 *
 * They become cards at the end of the story deck rather than doors on the
 * Hub, which is the decision worth explaining. A child does not *navigate* to
 * a prayer. These are the last beats of the lesson they have just read, in
 * the order the lesson puts them, reached by turning the page like everything
 * else. Giving them their own destinations would turn the quiet end of a
 * story into three more things to go and do.
 */
const decision = z.strictObject({
  /** The child's own words, first person, present tense. */
  statement: z.string().min(1),
  /** What it is a response to. One line, never a question to be answered. */
  because: z.string().optional(),
  note,
});

const song = z.strictObject({
  title: z.string().optional(),
  /**
   * The lines exactly as the curriculum prints them, one per entry.
   *
   * Never translated and never completed. The Beginners book gives three
   * lines of Malayalam in Latin script and permits an English song instead;
   * what it does not permit is a fourth line invented to round it out.
   */
  lines: z.array(z.string().min(1)).min(1),
  note,
});

const prayer = z.strictObject({
  /** Word for word from the curriculum, including the Amen. */
  text: z.string().min(1),
  note,
});

export const chapterSchema = z.strictObject({
  /**
   * Which chapter this is, within its class.
   *
   * Authored, because it is a fact about the lesson and not about the
   * repository. It used to be neither — the shelf numbered chapters by their
   * position after sorting filenames, so "Chapter 02" meant "second
   * alphabetically", and adding `the-lost-coin.story.json` to a folder that
   * already held `wedding-at-cana.story.json` renamed Wedding at Cana to
   * Chapter 03 without touching it. A number a child reads, and a teacher
   * says out loud on a Sunday, cannot be a side effect of a filename.
   *
   * It is also the order the shelf is built in, so the two can never
   * disagree. Numbers are unique within a class and start at 1; both are
   * checked in `load.ts`, where every chapter of a class is visible at once.
   */
  chapter: z.number().int().min(1).max(60),

  /**
   * Which class this chapter belongs to.
   *
   * Required, and checked against the directory the file was found in. The
   * path is how a chapter is discovered; this field is what makes a file
   * dragged into the wrong class folder fail the build instead of quietly
   * becoming a different class's lesson. Two statements of the same fact,
   * which is the point — one of them is a typo away from being wrong, and
   * disagreeing is what we want to hear about.
   *
   * It is the class *id*, never the display name: `beginner`, not
   * `Beginner`, and never `02 - Beginner`, which is a Drive folder's sort
   * order rather than an identity.
   */
  class: z.string().regex(/^[a-z0-9-]+$/),
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
    The end-of-chapter review questions, from the book. Optional, because the
    two chapters written before this existed did not record theirs — and
    binding, because a chapter that does record them must answer all of them.
    See `curriculum` above, and the refinements under this object.
  */
  curriculum: curriculum.optional(),

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
  /*
    The close of the lesson, in the order the curriculum closes it. All
    optional: a chapter written before these existed is still a whole chapter.
  */
  decision: decision.optional(),
  song: song.optional(),
  prayer: prayer.optional(),

  celebration: z.strictObject({ message: z.string(), note }),
})
  /*
    Every question is answered by something.

    This is the rule the curriculum block exists for. A chapter that writes
    down seven review questions and builds games for five of them has a gap
    that nothing else in this repository could see: all five games are valid,
    the build is green, and the two questions a teacher will actually ask on
    Sunday are simply not in the app. So it fails here, by number, saying
    which.

    "Answered by at least one game" rather than exactly one: a question can
    be worth meeting twice, and Chapter 3 meets "what did she do to find it?"
    both as a list to discover and as the search itself.
  */
  .superRefine((chapter, ctx) => {
    const numbers = new Set<number>(
      (chapter.curriculum?.questions ?? []).map((q) => q.n),
    );

    for (const [index, game] of (chapter.games ?? []).entries()) {
      for (const n of game.answers ?? []) {
        if (!numbers.has(n)) {
          ctx.addIssue({
            code: "custom",
            path: ["games", index, "answers"],
            message: chapter.curriculum
              ? `question ${n} is not one of the chapter's review questions`
              : `answers question ${n}, but the chapter has no curriculum block to answer from`,
          });
        }
      }
    }

    if (!chapter.curriculum) return;

    const answered = new Set<number>(
      (chapter.games ?? []).flatMap((game) => game.answers ?? []),
    );
    const unanswered = [...numbers].filter((n) => !answered.has(n)).sort((a, b) => a - b);

    if (unanswered.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["curriculum", "questions"],
        message:
          `no game answers question${unanswered.length > 1 ? "s" : ""} ` +
          `${unanswered.join(", ")} — every review question the chapter ` +
          `records has to be covered by a game that names it in \`answers\``,
      });
    }
  });

export type Chapter = z.infer<typeof chapterSchema>;

export const librarySchema = z.strictObject({
  chapters: z.array(z.string()),
});
