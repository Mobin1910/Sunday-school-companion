import type { Art } from "@/content";

import PicturePlaceholder from "./PicturePlaceholder";

/**
 * Shows an illustration, or says which one is missing.
 *
 * Resolution happened at build time, so this component only decides how to
 * present the result. That keeps it usable everywhere — including inside
 * interactions, which run in the browser and cannot look at the filesystem.
 */
export default function Picture({
  art,
  alt,
  className = "aspect-4/3 w-full rounded-card object-cover",
}: {
  art: Art;
  /**
   * Only needed when a picture carries meaning that no nearby text conveys.
   * Story cards describe themselves through their own text, so this is
   * usually and correctly absent.
   */
  alt?: string;
  className?: string;
}) {
  if (art.src === null) {
    return <PicturePlaceholder name={art.name} className={className} />;
  }

  // eslint-disable-next-line @next/next/no-img-element -- static export, images are pre-sized
  return <img src={art.src} alt={alt ?? ""} className={className} />;
}
