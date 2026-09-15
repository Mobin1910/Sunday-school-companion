import { CLASSES } from "@/classes/registry";
import { everyChapter, verseOf } from "@/content";
import { playableFromDraft } from "@/content/preview";
import { ladderFor } from "../../../../agents/memory-verse/ladder";
import { newestDraft } from "./draft";

import LadderPreview, { type Rung } from "./LadderPreview";

/**
 * The difficulty ladder, playable.
 *
 * The Memory Verse agent turns one verse into seven class practices, and the
 * thing that is easy to get wrong about it is not whether it runs — it is
 * whether Nursery through Young Adult is actually a *learning* progression
 * rather than seven arbitrary widgets. "Nursery gets multiple choice and Young
 * Adult drags seventeen words" satisfies every requirement and could still be
 * a bad ladder.
 *
 * So this page exists to be judged, not to be shipped. It takes a verse that
 * already exists in the content library, runs it through the same ladder the
 * agent runs, converts the result through the same schema and the same
 * converter a chapter file goes through, and plays each rung in the real
 * `InteractionPlayer` with the real assistance and the real Halo. There is no
 * preview-only rendering path anywhere in it.
 *
 * The verse is never written here. It comes from the newest agent draft if
 * there is one, and from the content library otherwise — because the ladder
 * most worth judging is usually the one that has just been generated and is
 * not content yet. A hard-coded verse in a preview is a hard-coded verse that
 * will one day disagree with the chapter it claims to be showing.
 *
 * Dev only, and the guard is *here* rather than only in the client component
 * underneath it. A component that returns null in production still receives
 * its props, and props to a client component are serialised into the payload
 * the browser downloads — so returning null down there while reading a draft
 * up here shipped an unapproved verse, and the reviewer notes attached to it,
 * inside the bundle. Stopping before the read is the only version of this
 * that is actually private.
 */
export default function MemoryVersePreviewPage() {
  if (process.env.NODE_ENV === "production") return null;

  /*
    Any chapter that has a verse will do; the ladder does not care which, and
    naming one here would make this page depend on a particular chapter
    existing — the mistake `/prototype/curl` made and had to be rescued from.
  */
  const draft = newestDraft();

  const chapter = everyChapter().find((c) => verseOf(c) !== undefined);
  const shipped = chapter ? verseOf(chapter) : undefined;

  const verse = draft ?? shipped;
  const from = draft
    ? draft.from
    : chapter
      ? `${chapter.classId}/${chapter.slug}`
      : "";

  if (!verse) {
    return (
      <main className="mx-auto max-w-xl px-6 py-12">
        <h1 className="text-3xl">Memory Verse ladder</h1>
        <p className="mt-3 text-lg text-ink-soft">
          No chapter in the content library has a verse yet, so there is
          nothing to run the ladder over.
        </p>
      </main>
    );
  }

  const { practice, skipped } = ladderFor({
    text: verse.text,
    reference: verse.reference,
  });

  const rungs: Rung[] = CLASSES.map((entry) => ({
    id: entry.id,
    display: entry.display,
    skipped: skipped[entry.id] ?? null,
    steps: (practice[entry.id] ?? []).map((step) => ({
      authored: step as Record<string, unknown>,
      played: playableFromDraft(step),
    })),
  }));

  return (
    <LadderPreview
      rungs={rungs}
      verse={{ text: verse.text, reference: verse.reference }}
      from={from}
      caveats={draft?.caveats ?? []}
      reviewRequired={draft?.reviewRequired ?? false}
      ownClass={draft?.classId ?? chapter?.classId}
    />
  );
}
