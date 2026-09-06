import Link from "next/link";

import GlobalScreen from "@/components/nav/GlobalScreen";
import PracticeScreen from "@/components/play/PracticeScreen";
import { getChapters, verseOf } from "@/content";
import { versePool } from "@/content/pools";
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
 * Nothing here is marked learned or unlearned. A verse a child half-knows is
 * not a failed verse, and this screen will never be the place that says so.
 */
export default function VersesPage() {
  const chapters = getChapters();

  const pool = versePool(chapters).filter((question) =>
    canPlay(question.interaction),
  );

  const verses = chapters.flatMap((chapter) => {
    const verse = verseOf(chapter);
    return verse ? [{ chapter, verse }] : [];
  });

  return (
    <GlobalScreen active="verses">
      <PracticeScreen
        pool={pool}
        streak="verse"
        title="Memory Verse"
        blurb="Words worth keeping."
        startLabel="Practise verses"
        note="Verses from every story you have, shuffled."
        empty={{
          title: "No verses to practise yet.",
          blurb: "They arrive with the stories.",
        }}
      >
        {verses.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-sm tracking-wide text-ink-soft uppercase">
              Every verse
            </h2>

            <ul className="flex flex-col gap-4">
              {verses.map(({ chapter, verse }) => (
                <li key={chapter.slug}>
                  <Link
                    href={`/chapter/${chapter.slug}/verse`}
                    className="flex flex-col gap-3 rounded-card bg-ground-raised px-5 py-5"
                  >
                    <p className="text-2xl leading-relaxed text-balance">
                      {verse.text}
                    </p>
                    <p className="text-base text-ink-soft">
                      {verse.reference} · {chapter.title}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </PracticeScreen>
    </GlobalScreen>
  );
}
