"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { SETTLE_MS } from "@/pwa/config";
import * as install from "@/pwa/manager";
import { isSafeMoment, readOnboarding } from "@/pwa/moment";

import InstallSheet from "./InstallSheet";

/**
 * Where the install invitation joins the app, and the only place it does.
 *
 * One line in `layout.tsx`, beside `Preferences`, and nothing else in the
 * product was touched. No route knows this exists; the chapter reader, the
 * game player and the verse practice have not gained a prop, a callback or a
 * line of state between them. That was the constraint worth holding onto —
 * the alternative is every immersive screen carrying a "don't interrupt me"
 * flag, which is the same rule written eight times.
 *
 * It renders nothing at all until three things are true at once: this device
 * has earned an invitation, the child is on a calm screen, and that screen has
 * been calm for a moment. The first is the manager's business, the second is
 * `moment.ts`, and the third is the pause below.
 */
export default function InstallInvitation() {
  const here = usePathname();

  const state = useSyncExternalStore(
    install.subscribe,
    install.getSnapshot,
    install.getServerSnapshot,
  );

  useEffect(() => install.begin(), []);

  /*
    Whether the current screen has been calm long enough.

    Eligibility is usually reached mid-story, so by the time a child lands
    somewhere quiet the invitation has been waiting. Opening it in the same
    frame as the navigation reads as an ambush — a sheet that was clearly
    poised for the tap. A second and a half is long enough for the screen to be
    the thing that arrived, and short enough that it still feels like part of
    the same moment.

    Re-armed on every navigation, so a child passing through the chapter hub on
    their way into a game is never caught by it.
  */
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setSettled(false);
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [here]);

  /*
    The moment check is deliberately made here rather than inside the manager.
    The route lives in React and nowhere else, and a manager that had to be
    told the pathname would be a manager with two sources of truth about where
    the child is.

    `readOnboarding` is read at this point rather than held in state because
    `Doorway` can change it after mount — a child finishing the welcome moves
    from "no" to "yes" without a navigation, and the pathname is `/` throughout.
  */
  const safe =
    settled &&
    isSafeMoment({
      pathname: here,
      onboarding: readOnboarding(),
      busy: false,
    });

  useEffect(() => {
    if (safe && state.eligible !== null && !state.open) install.offer();
  }, [safe, state.eligible, state.open]);

  if (!state.open || state.eligible === null) return null;

  return (
    <InstallSheet
      kind={state.eligible}
      stage={state.stage}
      asking={state.asking}
      onInstall={() => void install.requestInstall()}
      onHow={install.showHow}
      onBack={install.showInvite}
      onNotNow={install.notNow}
    />
  );
}
