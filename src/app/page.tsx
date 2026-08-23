import Link from "next/link";

import { getChapters } from "@/content";

/**
 * A temporary way in.
 *
 * The home screen — a shelf of covers a child can read by picture alone —
 * is Milestone 8. This is a plain list so there is something to click, and
 * it is deliberately undesigned so that nothing here has to be unbuilt later.
 */
export default function Page() {
  const chapters = getChapters();

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-4xl">Tiny Disciples</h1>
      <p className="mt-3 text-lg text-ink-soft">
        Bible stories to read again at home.
      </p>

      <ul className="mt-10 flex flex-col gap-3">
        {chapters.map((chapter) => (
          <li key={chapter.slug}>
            <Link
              href={`/chapter/${chapter.slug}`}
              className="flex min-h-16 items-center rounded-card bg-ground-raised px-6 text-xl"
            >
              {chapter.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
