import { INSTALL_PROMPT_ACTIVE_MS } from "./config";
import type { InstallStatus } from "./installed";
import type { Platform } from "./platform";
import { cooling, type InstallRecord } from "./record";

/**
 * Whether to invite, and which invitation it would be.
 *
 * One pure function, and every rule this feature has about *asking* is inside
 * it. That is the point: the manager measures, the sheet draws, and neither
 * decides. A decision spread across a component and a timer is a decision
 * nobody can read, and this one has to be readable — it is the difference
 * between an invitation and nagging.
 *
 * There are exactly two kinds, because there are exactly two installation
 * mechanisms this product can honestly offer:
 *
 *   "native"  the browser has handed us a prompt we can actually open
 *   "ios"     no prompt exists, but the Share menu does, and we can show it
 *
 * There is deliberately no third kind for "some other browser that probably
 * has something in a menu somewhere". A button that promises an action the
 * app cannot perform is worse than no button, and a set of instructions for a
 * menu we have not seen is worse still — a grown-up following them and
 * finding nothing learns that this app does not know what it is talking
 * about. So an unknown platform with no native prompt is never asked.
 */

export type InvitationKind = "native" | "ios";

export type InvitationInput = {
  now: number;
  record: InstallRecord;
  /** What the browser says about *this* launch, folded over the record. */
  status: InstallStatus;
  platform: Platform;
  /**
   * Whether a `beforeinstallprompt` event is in hand right now.
   *
   * In hand, not "supported". The event is the capability: a browser that
   * fires it has told us we may ask, and a browser that has not fired it may
   * have decided the app is not installable — or may simply not have got
   * round to it yet, which is why this is re-asked rather than latched.
   */
  nativeReady: boolean;
};

/**
 * The invitation to show, or nothing.
 *
 * Order matters and is the whole of the logic, so it is written as a list of
 * reasons to stay quiet followed by the two reasons to speak.
 */
export function invitationFor(input: InvitationInput): InvitationKind | null {
  const { now, record, status, platform, nativeReady } = input;

  // Already installed — by this launch's evidence or by memory of an earlier
  // one. Nothing below this line can override it.
  if (status === "installed" || record.status === "installed") return null;

  // Asked, and answered. A week of quiet is what "not now" bought.
  if (cooling(record, now)) return null;

  // Not used enough yet. Five minutes of *active* use, not five minutes since
  // the tab opened — see `activeUse.ts`.
  if (record.activeUseMs < INSTALL_PROMPT_ACTIVE_MS) return null;

  /*
    A real prompt beats instructions, on any platform that offers one. This is
    checked before the iOS branch rather than after so that the day an iOS
    browser starts firing `beforeinstallprompt`, a grown-up gets the one-tap
    flow instead of being told to go hunting in a menu.
  */
  if (nativeReady) return "native";

  /*
    iOS and iPadOS: no prompt has ever existed here, and Add to Home Screen
    is a real, documented thing sitting in the Share menu. Instructions are
    the honest offer, and they are the only place in this feature where the
    app explains rather than acts.
  */
  if (platform === "ios") return "ios";

  /*
    Everything else. An Android browser with no `beforeinstallprompt` — which
    today is every Android browser using this app, because Chrome will not
    fire it until this product has a service worker — and every desktop
    browser. We have nothing true to say, so we say nothing.
  */
  return null;
}

/**
 * Whether accumulating active use is worth anything right now.
 *
 * The clock is switched off, not merely ignored, while the answer is no. That
 * is what stops the cooldown from being a snooze: if time kept banking through
 * the week, the threshold would already be met the instant the cooldown
 * lapsed, and the invitation would reappear on the next page load — which is
 * precisely the behaviour the cooldown exists to prevent.
 */
export function worthCounting(
  record: InstallRecord,
  status: InstallStatus,
  now: number,
): boolean {
  if (status === "installed" || record.status === "installed") return false;
  if (cooling(record, now)) return false;
  return record.activeUseMs < INSTALL_PROMPT_ACTIVE_MS;
}
