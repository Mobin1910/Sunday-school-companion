"use client";

import { useEffect, useState } from "react";

import Picture from "@/components/Picture";
import type { VideoCard } from "@/content";
import HaloPresence from "@/halo/HaloPresence";

/**
 * Watching, as one of a chapter's mediums.
 *
 * The player is not on the page. It is *offered* on the page, and only
 * mounted once a child taps to watch. That is not a performance trick, or
 * not only one: an embedded player is a third party, and a third party
 * loaded on arrival means a child's device has spoken to Google before they
 * asked to watch anything. Nothing here reaches outward until they do —
 * there is no thumbnail fetched from YouTube either, which is why the poster
 * is drawn from the app's own palette or from a picture the chapter itself
 * carries.
 *
 * Once tapped, the embed is the ordinary official one, on the
 * privacy-enhanced domain, and it plays here. A child never leaves the
 * chapter to watch a chapter's video.
 *
 * Nothing about the video is cached, proxied or stored. It is the one part
 * of this product that genuinely needs the internet, and when there is none
 * it says so plainly rather than showing a player that cannot work.
 */
export default function WatchSection({ video }: { video: VideoCard }) {
  const [watching, setWatching] = useState(false);

  /**
   * Optimistic on purpose. `navigator.onLine` is only reliable when it says
   * *false* — a device can be on a network that goes nowhere — so the page
   * starts assuming the video will work and steps back only when the browser
   * actually says it is offline. Guessing pessimistically would hide a
   * working video from a child on a connection the browser is unsure about.
   *
   * It also starts true so that the server-rendered markup and the first
   * client render agree; the real state arrives a moment later.
   */
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();

    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // Going offline mid-video takes the player away rather than leaving a
  // frozen frame the child will keep tapping.
  useEffect(() => {
    if (!online) setWatching(false);
  }, [online]);

  return (
    <section className="flex w-full flex-col gap-4">
      {/*
        The frame is the video's shape only while there is a video in it.
        The offline state says more than a picture does and is allowed the
        height to say it — a message cropped by a 16:9 box would be a second
        thing gone wrong on top of the first.
      */}
      <div
        className={`night-screen relative w-full overflow-hidden rounded-card ${
          online ? "aspect-video" : ""
        }`}
      >
        {watching ? (
          <iframe
            className="absolute inset-0 size-full"
            /*
              The privacy-enhanced domain, which is YouTube's own embed and
              not a workaround: same player, no cookie until playback.
              `playsinline` keeps it in the page on iOS instead of throwing
              the child into the system player, and `rel=0` keeps the
              end-screen suggestions inside this channel rather than
              offering a six-year-old the whole of YouTube.
            */
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <Poster video={video} online={online} onWatch={() => setWatching(true)} />
        )}
      </div>

      <div>
        <h2 className="text-2xl leading-snug text-balance">{video.title}</h2>
        {video.description ? (
          <p className="mt-1 text-lg text-ink-soft text-balance">
            {video.description}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Poster({
  video,
  online,
  onWatch,
}: {
  video: VideoCard;
  online: boolean;
  onWatch: () => void;
}) {
  const artwork = video.art ? (
    <Picture
      art={video.art}
      className="absolute inset-0 size-full object-cover opacity-70"
    />
  ) : null;

  if (!online) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
        <HaloPresence state="transitioning" size="compact" />
        <p className="text-lg text-night-ink">Video unavailable offline</p>
        <p className="max-w-xs text-base text-night-ink-soft text-balance">
          Everything else still works. Come back when you&rsquo;re connected.
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onWatch}
      className="absolute inset-0 flex flex-col items-center justify-center gap-3"
    >
      {artwork}

      <span className="relative flex flex-col items-center gap-3">
        <HaloPresence state="listening" size="standard" />
        <span className="flex items-center gap-2 rounded-full bg-night-ink/95 px-5 py-2.5 text-lg text-night">
          <PlayIcon />
          Watch
        </span>
      </span>

      <span className="sr-only">Play {video.title}</span>
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.4-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2z" />
    </svg>
  );
}
