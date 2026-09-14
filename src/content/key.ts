import type { ClassId } from "@/classes/registry";

/**
 * What a chapter is called — in storage, and in the address bar.
 *
 * A slug is only unique inside its class. Two classes may each have a
 * `wedding-at-cana` and mean genuinely different lessons, written for
 * different ages, with different artwork — so a slug alone can never be
 * allowed to identify a chapter anywhere in the product.
 *
 * Both spellings of the pair live here, with no imports beyond the class
 * registry, because the build tooling, the browser and the router all need
 * them and the content loader itself reads the filesystem.
 */

/** `beginner/wedding-at-cana`. The content loader and `library.json`. */
export const chapterKey = (classId: ClassId, slug: string): string =>
  `${classId}/${slug}`;

/**
 * `/chapter/beginner/wedding-at-cana/story`. Every link into a chapter.
 *
 * The class is in the URL rather than read from the device, and that is
 * deliberate: an address is a promise about *which* content, and a link
 * shared between two children on one iPad has to open the same lesson for
 * both of them. It also means a chapter page never has to wait for
 * localStorage to settle before it knows what to render.
 */
export const chapterHref = (
  classId: ClassId,
  slug: string,
  section?: "story" | "games" | "verse" | "watch" | "verse/practice",
): string =>
  section
    ? `/chapter/${classId}/${slug}/${section}`
    : `/chapter/${classId}/${slug}`;
