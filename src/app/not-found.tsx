import Link from "next/link";

/**
 * The one screen nobody designs, and the only one that can strand a child.
 *
 * Next's default here is a bare line of text with no way out — which is a
 * dead end, and the product does not have those. A child who mistypes a
 * link, opens a stale bookmark, or lands here from a shared URL should be
 * one tap from the shelf.
 *
 * Written to a child: nothing says "404", nothing says "error", and nothing
 * suggests they broke something.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h1 className="text-3xl leading-snug text-balance">
          That page isn&rsquo;t here.
        </h1>
        <p className="mt-3 text-lg text-ink-soft text-balance">
          Let&rsquo;s go back to the stories.
        </p>
      </div>

      <Link
        href="/chapters"
        className="flex min-h-16 items-center justify-center rounded-card bg-touchable px-8 text-xl text-ground-raised"
      >
        All chapters
      </Link>

      <Link href="/" className="min-h-12 text-lg text-ink-soft">
        Home
      </Link>
    </main>
  );
}
