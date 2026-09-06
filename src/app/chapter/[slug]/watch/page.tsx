import { notFound } from "next/navigation";

import SectionScreen from "@/components/chapter/SectionScreen";
import WatchSection from "@/components/chapter/WatchSection";
import { getChapters, videosOf } from "@/content";

/**
 * Watching, as a section of a chapter.
 *
 * A fourth medium beside Story, Games and Memory Verse, reached the same
 * way and framed the same way. It is a section rather than something pinned
 * to the Hub because that is what it is: another way into the same story,
 * chosen by the child.
 *
 * A chapter without a video has no Watch entry on its Hub and nothing here —
 * not an empty screen apologising for itself. The route is still generated
 * for every chapter rather than only for the ones with videos, because a
 * static export needs at least one path to build and today no chapter ships
 * a video; a chapter without one simply answers "not found", which is the
 * truth and is a page nothing in the app links to.
 */
export function generateStaticParams() {
  return getChapters().map(({ slug }) => ({ slug }));
}

export default async function ChapterWatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getChapters().find((c) => c.slug === slug);

  if (!chapter) notFound();

  const videos = videosOf(chapter);
  if (videos.length === 0) notFound();

  return (
    <SectionScreen
      title="Watch"
      chapterTitle={chapter.title}
      hubHref={`/chapter/${slug}`}
    >
      {videos.map((video) => (
        <WatchSection key={video.youtubeId} video={video} />
      ))}
    </SectionScreen>
  );
}
