"use client";

import { useEffect, useState } from "react";

import { readWelcomed } from "@/local/child";

import Welcome from "./Welcome";

/**
 * Which screen `/` is.
 *
 * A child who has been welcomed gets Home. One who has not meets Halo. It
 * is the same route either way, deliberately: finishing the welcome should
 * put a child *on* Home rather than navigate them to it, so the last thing
 * they see of Halo is the same Halo, in the same place, on the same ground.
 *
 * The page is prerendered and the answer lives on the device, so both are
 * in the first frame and the stylesheet picks — see `DOORWAY_SCRIPT`, which
 * sets `data-welcomed` before anything paints. Without that a returning
 * child would glimpse the welcome, or a new one would glimpse a Home built
 * around a name they have not given: either way the first impression would
 * be of an app changing its mind. Once React knows, it drops the one that
 * was never wanted.
 *
 * With no JavaScript at all, nothing is hidden and Home is what shows. That
 * is the right fallback: the welcome is lovely, and the stories are the
 * point.
 */
export default function Doorway({ children }: { children: React.ReactNode }) {
  const [welcomed, setWelcomed] = useState<boolean | null>(null);

  useEffect(() => setWelcomed(readWelcomed()), []);

  /*
    `data-welcomed` is a mirror of this state, and this is what keeps it one.
    The pre-paint script only sets its *first* value; it never runs again. So
    when the welcome finishes, or a grown-up clears everything in Settings,
    React swaps the branch while the attribute still describes the old world
    — and the stylesheet, which trusts the attribute, hides the branch that
    just arrived. The screen goes blank until a reload re-runs the script.
    Owning the attribute here rather than at the two places that write the
    flag covers both directions, and keeps one thing responsible for it.
  */
  useEffect(() => {
    if (welcomed === null) return;
    document.documentElement.dataset.welcomed = welcomed ? "yes" : "no";
  }, [welcomed]);

  /*
    Both branches keep the same position in the tree while the answer is
    unknown, and the welcome keeps it afterwards. That is not tidiness: React
    remounts a component that moves, and a remounted welcome would ask Halo
    for its entrance a second time — by which point the entrance has already
    been claimed, so the child would meet a Halo that was simply already
    there. The one thing this screen exists for would be the one thing it
    lost. Home may unmount freely; nothing about it is a first impression.
  */
  return (
    <>
      {welcomed === false ? null : (
        <div data-doorway="home">{children}</div>
      )}

      {welcomed === true ? null : (
        <div data-doorway="welcome">
          <Welcome onDone={() => setWelcomed(true)} />
        </div>
      )}
    </>
  );
}
