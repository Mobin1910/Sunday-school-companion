/**
 * Types for the ladder, which is plain JavaScript because the agent runs on
 * bare Node with no build step. The dev-only preview imports it, so TypeScript
 * needs to know the shape; the authored interactions are validated by the real
 * Zod schema at the point of use (see `content/preview.ts`), so `unknown` here
 * is honest rather than lazy — nothing should trust this file's word for it.
 */
export declare function ladderFor(verse: { text: string; reference: string }): {
  practice: Record<string, unknown[]>;
  skipped: Record<string, string>;
};
