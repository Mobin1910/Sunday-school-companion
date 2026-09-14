import ClassPractice, {
  type VerseOnShelf,
} from "@/components/play/ClassPractice";
import { byClass, verseOf } from "@/content";
import { versePool, type PoolQuestion } from "@/content/pools";
import { canPlay } from "@/interactions/registry";

/**
 * The verses, and practising them.
 *
 * Two things a child can do with a verse, in the order that respects it:
 * practising is offered at the top, and the verses themselves are below,
 * always readable without playing anything.
 *
 * The practice runs across every chapter that has a verse drill, shuffled,
 * exactly the way Games runs across every chapter's questions — the same
 * component, a different pool, and its own streak. Holding particular words
 * and recalling a story are different kinds of practice, so a child flying
 * at one and finding the other hard sees two honest numbers instead of one
 * blurred one.
 *
 * Both the drill and the list below it are one class's, built here for all
 * seven and chosen in the browser — see `ClassPractice`.
 *
 * Nothing here is marked learned or unlearned. A verse a child half-knows is
 * not a failed verse, and this screen will never be the place that says so.
 */
export default function VersesPage() {
  const pools = byClass<PoolQuestion[]>((chapters) =>
    versePool(chapters).filter((question) => canPlay(question.interaction)),
  );

  const verses = byClass<VerseOnShelf[]>((chapters) =>
    chapters.flatMap((chapter) => {
      const verse = verseOf(chapter);
      return verse
        ? [
            {
              slug: chapter.slug,
              chapterTitle: chapter.title,
              text: verse.text,
              reference: verse.reference,
            },
          ]
        : [];
    }),
  );

  return (
    <ClassPractice
      pools={pools}
      verses={verses}
      streak="verse"
      title="Memory Verse"
      blurb="Words worth keeping."
      startLabel="Practise verses"
      note="Verses from every story you have, shuffled."
      empty={{
        title: "No verses to practise yet.",
        blurb: "They arrive with the stories.",
      }}
    />
  );
}
