/**
 * Where the product lives, and where it used to live.
 *
 * Its own module because the domain is now needed in two places that cannot
 * import each other: the app, which builds every canonical and Open Graph URL
 * from it, and `vercel.json`, which is static JSON read by Vercel's router
 * before any of our code runs. Two copies of a hostname is exactly how the
 * first one came to be misspelled, so this is the copy that is *true* and
 * `tools/brand/check-site.mjs` fails the build if the other one drifts from
 * it.
 *
 * The app still prefers `NEXT_PUBLIC_SITE_URL` when it is set — that is how a
 * custom domain takes over without a code change, and the day that happens is
 * the day this file stops mattering. Until then the fallback has to be a real
 * domain rather than a guess: it used to fall back to `http://localhost:3000`,
 * and that shipped, producing link previews with no picture because the
 * crawler was being sent to fetch an image from its own machine.
 */

/** The one true origin. No trailing slash. */
export const CANONICAL_ORIGIN = "https://sunday-school-companion-kohl.vercel.app";

/**
 * Origins that used to be the product and must not simply break.
 *
 * A URL that has been shared into a WhatsApp group, written on a handout, or
 * saved to somebody's home screen does not stop existing because we fixed a
 * typo. Each of these is redirected to `CANONICAL_ORIGIN`, path and all, by
 * the rule in `vercel.json`.
 *
 * A redirect only happens if the hostname still reaches this deployment. If a
 * retired domain is ever released back to Vercel, requests to it never arrive
 * here and nothing in this repository can help them — which is why these stay
 * attached to the project rather than being deleted.
 */
export const RETIRED_ORIGINS = [
  // "comapnion". Lived long enough to be shared.
  "sunday-school-comapnion-kohl.vercel.app",
] as const;
