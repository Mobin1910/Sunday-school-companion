/**
 * The part of the content layer a browser may have.
 *
 * `@/content` reaches the filesystem — it is how chapters are read at build
 * time — so importing a *value* from it in a client component would pull
 * `node:fs` into the bundle and fail the build. Types were always safe,
 * because TypeScript erases them, which is why client components have been
 * importing `Card` and `Art` from there all along without trouble.
 *
 * Now that a chapter link has to be spelt the same way everywhere, there is
 * a value to share as well. This is that door: the naming of a chapter, and
 * the card types, and deliberately nothing that loads anything.
 */

export { chapterHref, chapterKey } from "./key";
export type { Art, Card, PlayInteraction, PlayItem } from "./cards";
