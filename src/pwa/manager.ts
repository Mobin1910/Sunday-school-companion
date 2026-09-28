"use client";

import { readInstallRecord, saveInstallRecord } from "@/local/install";

import * as clock from "./activeUse";
import { ACTIVE_TICK_MS, INSTALL_PROMPT_DISMISS_COOLDOWN_MS, PERSIST_EVERY_MS } from "./config";
import { readInstalled, type InstallStatus } from "./installed";
import { invitationFor, worthCounting, type InvitationKind } from "./invitation";
import { readPlatform, type Platform } from "./platform";
import {
  BLANK,
  dismissed,
  installed,
  shown,
  withActiveUse,
  withStatus,
  type InstallRecord,
} from "./record";

/**
 * The one thing in the app that knows how installation works.
 *
 * Everything platform-shaped is behind this file. The sheet does not know what
 * `beforeinstallprompt` is, no route knows that `navigator.standalone` exists,
 * and nothing outside `pwa/` and `local/install.ts` knows which key any of this
 * is stored under. What the UI asks is "is there an invitation, and which
 * kind", which is a product question rather than a browser one.
 *
 * A module singleton rather than a React context, for two reasons. The first
 * is that `beforeinstallprompt` can fire before React has rendered anything,
 * and a listener that only exists once a provider has mounted is a listener
 * that misses it — the event is not replayed, and it is the entire Android
 * path. Attaching at module evaluation is the earliest a client component can
 * manage without adding a second blocking script to every page, and it is
 * comfortably earlier than Chrome fires, which waits for a service worker to
 * activate. The second is that there is exactly one of these per document, and
 * a context would invite a second.
 *
 * It follows `local/run.ts` in shape: a subscriber set, a cached snapshot, and
 * `useSyncExternalStore` on the other end. That is this codebase's existing
 * answer for "state outside React that React has to see", and this is not
 * different enough to deserve a new one.
 */

/** The shape of the event, which TypeScript's DOM library does not carry. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type Stage = "invite" | "how";

export type Snapshot = {
  /**
   * The invitation this device has earned, ignoring where the child is.
   *
   * Whether it is a decent *moment* is the caller's question — see
   * `moment.ts` — because only React knows the route.
   */
  eligible: InvitationKind | null;
  open: boolean;
  stage: Stage;
  /** A native prompt is in flight. The sheet's buttons go quiet. */
  asking: boolean;
};

const listeners = new Set<() => void>();

let record: InstallRecord = BLANK;
let platform: Platform = "other";
let seen: InstallStatus = "unknown";

/**
 * The deferred prompt, held in memory and nowhere else.
 *
 * It cannot be serialised — it is a live object with a promise on it — and
 * writing anything derived from it to storage would be recording a capability
 * that expires when the page does. If the page reloads, the browser fires it
 * again or it does not, and either way the truth is whatever is in this
 * variable right now.
 */
let prompt: InstallPromptEvent | null = null;

let ticker: ReturnType<typeof setInterval> | null = null;
let pulse: clock.Clock = clock.idle(0);
let unsaved = 0;
let savedAt = 0;
let started = false;

let open = false;
let stage: Stage = "invite";
let asking = false;

const QUIET: Snapshot = {
  eligible: null,
  open: false,
  stage: "invite",
  asking: false,
};

let snapshot: Snapshot = QUIET;

const now = () => Date.now();

/*
  A fresh snapshot only when something actually changed, because
  `useSyncExternalStore` compares by identity and a new object every time is an
  infinite render.
*/
function publish(): void {
  const eligible = invitationFor({
    now: now(),
    record,
    status: seen,
    platform,
    nativeReady: prompt !== null,
  });

  if (
    snapshot.eligible === eligible &&
    snapshot.open === open &&
    snapshot.stage === stage &&
    snapshot.asking === asking
  ) {
    return;
  }

  snapshot = { eligible, open, stage, asking };
  for (const listen of listeners) listen();
}

function keep(next: InstallRecord): void {
  record = next;
  saveInstallRecord(record);
  savedAt = now();
  publish();
}

/* ── the active-use clock ──────────────────────────────────────────────── */

/**
 * Whether the app is being looked at.
 *
 * Focus is asked of the document rather than tracked through `blur`, because a
 * blur can come from a tap on the URL bar the person is about to come straight
 * back from, and `hasFocus()` is simply the current truth.
 */
function attended(): boolean {
  try {
    return document.visibilityState === "visible" && document.hasFocus();
  } catch {
    return false;
  }
}

/**
 * Fold what the stretch earned into the record, writing rarely.
 *
 * `unsaved` is the buffer that makes that possible: time accrues in memory on
 * every tick and reaches storage every `PERSIST_EVERY_MS`, or whenever the app
 * is about to stop being watched. The alternative is a `localStorage` write
 * every few seconds for a number nobody is waiting for, on devices where the
 * main thread is also drawing a story.
 */
function settle(force: boolean): void {
  if (unsaved <= 0) return;

  if (!force && now() - savedAt < PERSIST_EVERY_MS) return;

  const banked = withActiveUse(record, record.activeUseMs + unsaved);
  unsaved = 0;
  keep(banked);
}

function tick(): void {
  if (!attended()) return void stop();

  const credited = clock.credit(pulse, now());
  pulse = credited.clock;
  unsaved += credited.gained;

  /*
    Whether the threshold has just been crossed, asked of the total *including*
    what is still only in memory. Crossing it is the one moment worth a write
    of its own: everything else can wait for the throttle, but eligibility that
    sat unsaved for thirty seconds would be lost if the tab closed, and a
    grown-up would have to earn the last half-minute twice.
  */
  const arrived = !worthCounting(
    withActiveUse(record, record.activeUseMs + unsaved),
    seen,
    now(),
  );

  settle(arrived);
  publish();

  /* Earned. Nothing more to count until a cooldown opens the question again. */
  if (arrived) stop();
}

function start(): void {
  if (ticker !== null) return;
  if (!worthCounting(record, seen, now())) return;
  if (!attended()) return;

  pulse = clock.resume(now());
  ticker = setInterval(tick, ACTIVE_TICK_MS);
}

/**
 * Stop counting, and settle what is owed.
 *
 * The interval is cleared rather than left running on a hidden tab. A timer
 * that keeps waking in the background is the thing this product is least
 * willing to ship: it costs battery on a child's tablet for a number that
 * explicitly must not grow while nobody is looking.
 */
function stop(): void {
  if (ticker !== null) {
    clearInterval(ticker);
    ticker = null;
  }

  const settled = clock.pause(pulse, now());
  pulse = settled.clock;
  unsaved += settled.gained;
  settle(true);
}

/* ── browser signals ───────────────────────────────────────────────────── */

function onAttention(): void {
  if (attended()) start();
  else stop();
}

/**
 * The page is going away, or into the back/forward cache.
 *
 * `visibilityState` is not reliably `hidden` yet at this point, so this settles
 * unconditionally rather than asking. It is the last chance to write down time
 * that was genuinely spent.
 */
function onLeaving(): void {
  stop();
}

function onTouch(): void {
  pulse = clock.touch(pulse, now());

  /*
    An interaction is also the cheapest moment to notice that counting has
    become worthwhile again.

    The case is a cooldown lapsing while the app is open. `start` is otherwise
    only reconsidered when attention changes, so a tab left open across the end
    of the week would sit there eligible-but-not-counting until it was hidden
    and shown again. `start` is guarded and returns immediately when there is
    nothing to do, so the cost of asking here is a null check per tap.
  */
  if (ticker === null) start();
}

/**
 * Chrome (and friends) offering us the prompt.
 *
 * `preventDefault` stops the browser's own mini-infobar so the invitation can
 * be made at a moment this product chose, in this product's own voice. The
 * event is then held until a grown-up asks for it.
 */
function onPrompt(event: Event): void {
  event.preventDefault();
  prompt = event as InstallPromptEvent;
  publish();
  start();
}

/**
 * Installed, by whatever route.
 *
 * Not depended upon — several platforms never fire it, and iOS never has —
 * which is why display-mode and `navigator.standalone` are checked on every
 * startup as well. When it does arrive it is the cheapest and earliest signal
 * there is, so it is taken.
 */
function onInstalled(): void {
  prompt = null;
  open = false;
  asking = false;
  stage = "invite";
  unsaved = 0;
  stop();
  keep(installed(record));
}

/**
 * Another tab changed the record.
 *
 * Two tabs of the same app is an ordinary thing on a tablet. Without this, a
 * grown-up could say "not now" in one and be asked again in the other a moment
 * later, which would read as the app not listening. Only the visible tab
 * accrues time, so there is nothing to reconcile beyond re-reading.
 */
function onStored(event: StorageEvent): void {
  /*
    A `null` key means the whole store was cleared — which is what "clear
    everything" in Settings does — and that has to be picked up too, so it is
    deliberately not filtered out here.
  */
  if (event.key !== null && event.key !== "ssc.pwa-install") return;

  record = readInstallRecord();
  if (record.status === "installed" || record.dismissedUntil !== null) {
    open = false;
    asking = false;
    stage = "invite";
  }
  publish();
}

/* ── the public surface ────────────────────────────────────────────────── */

/**
 * Begin watching. Safe to call from every mount; it only ever runs once.
 *
 * The listener for `beforeinstallprompt` is attached at the bottom of this
 * file instead, at module evaluation, because by the time a component's effect
 * runs the event may already have been and gone.
 */
export function begin(): void {
  if (started) return;
  started = true;

  platform = readPlatform();
  record = withStatus(readInstallRecord(), (seen = readInstalled()));
  savedAt = now();

  /*
    An installed app, launched as an app. Nothing further to do, ever — and
    persisting it here is what makes the next launch-in-a-tab quiet too.
  */
  if (record.status === "installed") {
    saveInstallRecord(record);
    publish();
    return;
  }

  saveInstallRecord(record);

  try {
    document.addEventListener("visibilitychange", onAttention);
    window.addEventListener("focus", onAttention);
    window.addEventListener("blur", onAttention);
    window.addEventListener("pagehide", onLeaving);
    window.addEventListener("storage", onStored);
    window.addEventListener("appinstalled", onInstalled);

    /*
      Passive and captured, so they cost nothing and cannot be swallowed by a
      handler that stops propagation. These only move a timestamp in memory —
      see `onTouch` — and never write to storage.
    */
    const quiet = { passive: true, capture: true } as const;
    document.addEventListener("pointerdown", onTouch, quiet);
    document.addEventListener("keydown", onTouch, quiet);
    document.addEventListener("scroll", onTouch, quiet);
  } catch {
    // No document to listen to. The feature is simply absent; nothing else
    // in the app depends on it.
  }

  publish();
  start();
}

export function subscribe(listen: () => void): () => void {
  listeners.add(listen);
  return () => listeners.delete(listen);
}

export function getSnapshot(): Snapshot {
  return snapshot;
}

/**
 * What the server renders: nothing is ever invited during a prerender.
 *
 * Every page in this product is statically exported, so this is the snapshot
 * baked into the HTML — and an install sheet in a prerendered page would be an
 * install sheet on the first frame for everybody.
 */
export function getServerSnapshot(): Snapshot {
  return QUIET;
}

/**
 * Put the invitation on screen.
 *
 * Called by the component once it has agreed that this is a calm moment. The
 * eligibility check is repeated here because the two are decided a second and
 * a half apart, and a `beforeinstallprompt` could have been withdrawn or
 * another tab could have dismissed in between.
 */
export function offer(): void {
  if (open) return;
  if (snapshot.eligible === null) return;

  open = true;
  stage = "invite";
  keep(shown(record, now()));

  /* Nothing accrues while the sheet is up; it is no longer being earned. */
  stop();
}

/** iOS, second stage: the Share-menu instructions. */
export function showHow(): void {
  if (!open) return;
  stage = "how";
  publish();
}

/** iOS, back from the instructions to the offer. */
export function showInvite(): void {
  if (!open) return;
  stage = "invite";
  publish();
}

/**
 * "Not now".
 *
 * Closes first and records second, so the sheet is gone in the same frame as
 * the tap. Nothing about this is treated as a failure: no counter goes up, the
 * installation status is untouched, and no progress of any kind is affected.
 */
export function notNow(): void {
  open = false;
  asking = false;
  stage = "invite";
  keep(dismissed(record, now(), INSTALL_PROMPT_DISMISS_COOLDOWN_MS));
}

/**
 * Open the browser's own install prompt, and take the answer.
 *
 * Only ever reached from the native invitation, which only exists when this
 * event is in hand. The event is single-use, so it is dropped either way — a
 * second tap on a stale prompt throws, and a grown-up seeing an error because
 * we kept a spent object is a worse outcome than one more week of quiet.
 */
export async function requestInstall(): Promise<void> {
  const held = prompt;
  if (held === null || asking) return;

  asking = true;
  publish();

  try {
    await held.prompt();
    const { outcome } = await held.userChoice;

    prompt = null;

    if (outcome === "accepted") {
      /*
        `appinstalled` usually follows and would do this anyway. Doing it here
        as well costs nothing — both routes go through `installed()`, which is
        idempotent — and covers the browsers that never fire it.
      */
      onInstalled();
      return;
    }

    /*
      Declined at the browser's own prompt. That is the same answer as "not
      now" and gets the same week of quiet: asking again in five minutes
      because the refusal happened in Chrome's dialog rather than ours would be
      the same nagging with an extra step.
    */
    notNow();
  } catch {
    prompt = null;
    notNow();
  }
}

/*
  Attached at module evaluation, and this is the only side effect in the file.

  `beforeinstallprompt` is not replayed. A listener added inside a React effect
  runs after hydration, and on a fast connection with a warm service worker the
  event can already have fired — so the Android path would work on a slow
  laptop and silently not on a fast phone. Attaching here means the listener
  exists as soon as this module is evaluated, which is when the layout's client
  bundle loads, before React renders.
*/
if (typeof window !== "undefined") {
  try {
    window.addEventListener("beforeinstallprompt", onPrompt);
  } catch {
    // Nothing to attach to. Android's path is simply unavailable.
  }
}
