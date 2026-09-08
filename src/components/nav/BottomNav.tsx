"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DESTINATIONS } from "./destinations";

/**
 * The bar, and the one moving light in the product.
 *
 * It reads the route itself rather than being told which destination is
 * current, and that is the whole reason it can animate. When each screen
 * rendered its own bar, moving between destinations replaced the element —
 * so the mark was never *moved*, it was destroyed at one tab and drawn again
 * at the next, and no transition could run on a node that did not survive the
 * navigation. Now the bar lives in the layout the three barred destinations
 * share, the element persists, and the mark genuinely travels.
 *
 * The cost is that this is a client component where it used to be a server
 * one. It buys the only thing it could have bought: the bar knowing where it
 * is without anyone telling it. The destination list stays in its own module
 * so Home, which draws the same four marks, still costs nothing.
 *
 * Home has no bar and is deliberately not in that layout, so there is no
 * "which screens get a bar" list to keep in step with anything — a screen has
 * a bar if it is inside the group, and that is the only statement of the rule.
 */
export default function BottomNav() {
  const pathname = usePathname();

  /*
    An exact match, not a prefix. A chapter lives at /chapter/<slug>, never
    under /chapters, so nothing nested ever lights a tab — and Home, whose
    href every path would match as a prefix, cannot light one by accident.
  */
  const here = DESTINATIONS.findIndex((d) => d.href === pathname);

  return (
    <nav
      aria-label="Main"
      className="border-t border-edge bg-ground-raised/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
    >
      {/*
        `--nav-here` is the only thing that moves the mark: it is an index,
        and the stylesheet turns it into a position. The bar has no idea how
        wide it is, works the same on a phone and a tablet, and the travel is
        a transform, so it is the compositor's problem rather than layout's.
      */}
      <div
        className="relative mx-auto max-w-2xl"
        style={{ "--nav-here": Math.max(here, 0) } as React.CSSProperties}
      >
        <span className="nav-mark" aria-hidden />

        <ul className="flex">
          {DESTINATIONS.map(({ key, label, href, icon: Icon }, index) => {
            const lit = index === here;
            return (
              <li key={key} className="flex-1">
                <Link
                  href={href}
                  {...(lit ? { "aria-current": "page" as const } : {})}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 ${
                    lit ? "nav-here" : "text-ink-soft"
                  }`}
                >
                  <Icon lit={lit} />
                  {/* Weight carries the current destination as well as colour,
                      because colour alone is never allowed to mean something. */}
                  <span className={`text-xs ${lit ? "nav-label-here" : ""}`}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <LitStroke />
      </div>
    </nav>
  );
}

/**
 * The light the current destination's mark is drawn in.
 *
 * One gradient definition for the whole bar, referenced by whichever icon is
 * lit. It is the same three stops as a primary action, because being here and
 * being the way on are the same light in this product — see the lighting
 * order in globals.css.
 */
function LitStroke() {
  return (
    <svg width={0} height={0} aria-hidden className="absolute">
      <defs>
        <linearGradient id="nav-lit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-cta-start)" />
          <stop offset="52%" stopColor="var(--color-cta-mid)" />
          <stop offset="100%" stopColor="var(--color-cta-end)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
