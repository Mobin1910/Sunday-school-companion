import type { InstallStatus } from "./installed";

/**
 * What this device remembers about being installed, and about being asked.
 *
 * One record, one key. The alternative — a key for the status, a key for the
 * accumulated time, a key for the dismissal — is four things that can
 * disagree with each other, and a dismissal that survives while the cooldown
 * it set does not is a grown-up being asked again the next morning.
 *
 * Two facts, kept strictly apart, because conflating them is the single
 * easiest way to get this feature wrong:
 *
 *   `status`      whether the app is installed on this device
 *   `dismissed*`  whether a grown-up has already been asked, and until when
 *
 * Saying "not now" is not installing. It is also not a failure, and nothing
 * here records it as one: there is no count of refusals, no escalation and no
 * second, shorter cooldown for someone who has said no twice.
 *
 * What is deliberately absent: no device model, no user agent, no platform,
 * no session count, no list of screens visited, no timings beyond the two
 * timestamps the cooldown arithmetic needs. This is a product that collects
 * nothing, and an install prompt is exactly where that promise would be
 * quietly broken first.
 */

/**
 * The record, versioned because it outlives the code that wrote it.
 *
 * `activeUseMs` is the only field that moves while the app is open. The rest
 * change once each, at most, per cooldown window.
 */
export type InstallRecord = {
  v: 1;
  status: InstallStatus;
  /** Accumulated *active* use towards the threshold. See `pwa/activeUse.ts`. */
  activeUseMs: number;
  lastPromptShownAt: number | null;
  lastDismissedAt: number | null;
  /** The instant the invitation may be considered again. */
  dismissedUntil: number | null;
};

export const BLANK: InstallRecord = {
  v: 1,
  status: "unknown",
  activeUseMs: 0,
  lastPromptShownAt: null,
  lastDismissedAt: null,
  dismissedUntil: null,
};

/**
 * A ceiling on the accumulated total.
 *
 * Nothing above the threshold means anything — the invitation fires at the
 * threshold and the counter is reset — so a stored value of four hours can
 * only be a hand-edit, a clock change, or a bug. Clamping keeps the arithmetic
 * finite and keeps a corrupt number from looking like a legitimate one.
 */
const CEILING = 24 * 60 * 60 * 1000;

/**
 * A finite, non-negative number, or nothing. Everything else is damage.
 *
 * Durations and timestamps are both validated by this one rule, because both
 * are milliseconds and neither has any meaning below zero or at infinity. A
 * `NaN` slipping through here would poison every comparison downstream
 * silently — `NaN < threshold` is false, so the invitation would simply never
 * appear again and nothing would look broken.
 */
function ms(raw: unknown): number | null {
  return typeof raw === "number" && Number.isFinite(raw) && raw >= 0 ? raw : null;
}

/**
 * Repairs whatever was on disk into something the rest of the feature can
 * trust, or gives back nothing.
 *
 * Every field is checked rather than cast. This data can be older than the
 * code, hand-edited in devtools, or half-written by a tab that was killed
 * mid-save, and the consequence of trusting it is either a prompt that never
 * appears or one that appears forever.
 *
 * Pure, and separate from the reading of it, so that "what happens when the
 * stored record is nonsense" is a test rather than a hope.
 */
export function repairInstallRecord(raw: unknown): InstallRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Partial<InstallRecord>;

  return {
    v: 1,
    status:
      r.status === "installed" || r.status === "not-installed"
        ? r.status
        : "unknown",
    activeUseMs: Math.min(ms(r.activeUseMs) ?? 0, CEILING),
    lastPromptShownAt: ms(r.lastPromptShownAt),
    lastDismissedAt: ms(r.lastDismissedAt),
    dismissedUntil: ms(r.dismissedUntil),
  };
}

/*
  The four things that ever happen to this record, as functions of it rather
  than as writes. Pure, so the rules can be tested without a browser, and so
  the caller cannot forget half of a pair — recording a dismissal *must* also
  set the cooldown, and marking installed *must* also clear the invitation
  state, and neither is left to a call site to remember.
*/

/**
 * Installation confirmed.
 *
 * Everything to do with asking is cleared, because none of it can ever matter
 * again: an installed app is never invited to install. Keeping the old
 * dismissal timestamps would only leave a trap for a later change that
 * reasoned from them.
 */
export function installed(record: InstallRecord): InstallRecord {
  return {
    ...record,
    status: "installed",
    activeUseMs: 0,
    lastDismissedAt: null,
    dismissedUntil: null,
  };
}

/**
 * The browser's answer about this launch, folded in without ever downgrading.
 *
 * Sticky on purpose. An installed app opened in a browser tab reports
 * `not-installed` — truthfully, about that launch — and a device that let
 * that overwrite a remembered `installed` would invite a grown-up to install
 * an app that is already on the home screen. So the record only ever moves
 * towards `installed`.
 *
 * The cost is that uninstalling is invisible to this product, and that is the
 * right way round: the failure mode is "never asked again", not "asked
 * forever".
 */
export function withStatus(
  record: InstallRecord,
  seen: InstallStatus,
): InstallRecord {
  if (record.status === "installed") return record;
  if (seen === "installed") return installed(record);
  if (seen === record.status) return record;
  return { ...record, status: seen };
}

/** The invitation was put on screen. Recorded for its own sake, not counted. */
export function shown(record: InstallRecord, at: number): InstallRecord {
  return { ...record, lastPromptShownAt: at };
}

/**
 * "Not now", and what it costs to ask again.
 *
 * `activeUseMs` goes back to zero, and that single line is what makes this a
 * cooldown rather than a snooze. Without it the counter would sit at the
 * threshold for the whole week and the invitation would reappear in the first
 * second after the cooldown lapsed — which is the behaviour a cooldown exists
 * to prevent. Having to earn the threshold again is the point: the next ask,
 * if there is one, follows another five minutes of someone actually using
 * this.
 */
export function dismissed(
  record: InstallRecord,
  at: number,
  cooldownMs: number,
): InstallRecord {
  return {
    ...record,
    activeUseMs: 0,
    lastDismissedAt: at,
    dismissedUntil: at + cooldownMs,
  };
}

/** Whether the cooldown from a previous "not now" is still running. */
export function cooling(record: InstallRecord, now: number): boolean {
  return record.dismissedUntil !== null && now < record.dismissedUntil;
}

export function withActiveUse(
  record: InstallRecord,
  activeUseMs: number,
): InstallRecord {
  return { ...record, activeUseMs: Math.min(Math.max(activeUseMs, 0), CEILING) };
}
