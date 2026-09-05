import Link from "next/link";
import { notFound } from "next/navigation";

import HaloPresence from "@/halo/HaloPresence";
import Picture from "@/components/Picture";
import BackLink from "@/components/chapter/BackLink";
import {
  activityOf,
  coverOf,
  getChapters,
  storyCards,
  verseOf,
} from "@/content";

/**
 * The Chapter Hub — the home of everything in one chapter.
 *
 * Every chapter begins here, including one reached by "Next Chapter" from
 * the chapter before it. A child should always see what a chapter holds
 * before being put inside part of it.
 *
 * This is the level below the product's four destinations and above the
 * chapter's sections, and it deliberately looks like neither. There is no
 * tab bar (that belongs to the product) and no page dots (those belong to
 * the reader) — it is the inside of a book cover: the picture, the name, and
 * the ways in.
 *
 * Sections are a list, not three hand-placed tiles, so a fourth one is a new
 * entry rather than a redesign.
 */

export function generateStaticParams() {
  return getChapters().map(({ slug }) => ({ slug }));
}

export default async function ChapterHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getChapters().find((c) => c.slug === slug);

  if (!chapter) notFound();

  const cover = coverOf(chapter);

  const sections = [
    {
      key: "story",
      label: "Story",
      blurb: "Read it again",
      href: `/chapter/${slug}/story`,
      icon: BookIcon,
      present: storyCards(chapter).length > 0,
    },
    {
      key: "games",
      label: "Games",
      blurb: "Play with the story",
      href: `/chapter/${slug}/games`,
      icon: SparkIcon,
      present: activityOf(chapter) !== undefined,
    },
    {
      key: "verse",
      label: "Memory Verse",
      blurb: "Words worth keeping",
      href: `/chapter/${slug}/verse`,
      icon: HeartIcon,
      present: verseOf(chapter) !== undefined,
    },
  ].filter((section) => section.present);

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-6">
        <BackLink href="/chapters" label="All chapters" />

        <header className="flex flex-col items-center gap-5 text-center">
          {cover ? (
            <div className="w-full max-w-xs">
              <Picture art={cover.art} alt={chapter.title} />
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            {/*
              A welcome has to arrive when the child does. Parked below the
              section list, Halo sat under the fold and read as a mascot
              decorating the bottom of a menu — met last, doing nothing.
              Beside the title it is simply someone already here.
            */}
            <HaloPresence state="idle" placement="beside" size="compact" />

            <div className="text-left">
              <h1 className="text-4xl leading-tight text-balance">
                {chapter.title}
              </h1>
              <p className="mt-1 text-base text-ink-soft">
                {chapter.reference}
              </p>
            </div>
          </div>
        </header>

        <ul className="flex flex-col gap-3">
          {sections.map(({ key, label, blurb, href, icon: Icon }) => (
            <li key={key}>
              <Link
                href={href}
                className="flex min-h-20 items-center gap-4 rounded-card bg-ground-raised px-5 py-4"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ground text-touchable">
                  <Icon />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-2xl leading-snug">{label}</span>
                  <span className="block text-base text-ink-soft">{blurb}</span>
                </span>

                <ChevronRight />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const iconProps = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function BookIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 4l1.8 4.9L19 10.5l-5.2 1.6L12 17l-1.8-4.9L5 10.5l5.2-1.6z" />
      <path d="M18 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 19.5S4.5 15 4.5 9.8A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7.5 1.8c0 5.2-7.5 9.7-7.5 9.7z" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg {...iconProps} width={22} height={22} className="text-ink-soft">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
