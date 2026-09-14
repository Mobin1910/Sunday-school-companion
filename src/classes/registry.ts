import data from "../../content/classes.json";

/**
 * The Sunday School classes, and the only place they are listed.
 *
 * Imported from `content/classes.json` rather than retyped here, so the
 * registry the child's app renders and the registry the content tooling
 * validates against are the same seven rows. `resolveJsonModule` makes the
 * import a build-time constant, so this costs the bundle a few hundred bytes
 * and costs nothing at runtime — and it is small enough to live in the
 * browser, which is what lets the class selector, onboarding and Settings
 * all read it without a second copy.
 *
 * The names are canonical Sunday School class names and carry no ages. Which
 * age band sits in which class is a fact about a congregation rather than
 * about this product, so "Beginner" is never rendered as "Beginner (5–7)".
 *
 * The id is the identity and never changes. It names a Drive folder, a brief
 * file, a content directory, a route segment and every progress key a child
 * accumulates — renaming one orphans all five at once. The display name is
 * free to change whenever a congregation asks.
 */

export type ClassId =
  | "nursery"
  | "beginner"
  | "primary"
  | "junior"
  | "intermediate"
  | "senior"
  | "young-adult";

export type SundayClass = {
  readonly id: ClassId;
  readonly display: string;
  readonly order: number;
  /**
   * Whether this class's *editorial* pipeline is switched on — its sheet tab
   * and brief are being maintained.
   *
   * It deliberately does NOT gate the class picker. A child in Junior is in
   * Junior whether or not anyone has written a Junior chapter yet, and
   * hiding the class would leave them unable to say so. Every class is
   * always choosable; a class with nothing written lands on an empty state,
   * which is the honest answer rather than a missing option.
   */
  readonly live: boolean;
};

export const CLASSES: readonly SundayClass[] = [...data.classes]
  .sort((a, b) => a.order - b.order)
  .map((c) => ({
    id: c.id as ClassId,
    display: c.display,
    order: c.order,
    live: c.live,
  }));

const BY_ID = new Map(CLASSES.map((c) => [c.id, c]));

export function classOf(id: string | null | undefined): SundayClass | undefined {
  return id ? BY_ID.get(id as ClassId) : undefined;
}

/** What a child sees. Falls back to the id rather than to an empty space. */
export function displayName(id: string): string {
  return BY_ID.get(id as ClassId)?.display ?? id;
}

export function isClassId(value: unknown): value is ClassId {
  return typeof value === "string" && BY_ID.has(value as ClassId);
}
