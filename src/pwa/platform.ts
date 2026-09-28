/**
 * Which kind of device this is, for the one question that needs to know.
 *
 * It exists because iOS and Android disagree about what installing even is:
 * Android has an install flow a page can trigger, and iOS has a menu a
 * grown-up has to be shown. Nothing else in the product asks what platform
 * it is on, and nothing else should start.
 *
 * Deliberately three answers and no more. "Other" is not a gap waiting to be
 * filled with Windows, macOS and Linux — it is the honest answer for every
 * device whose installation mechanism this product cannot name, and the
 * invitation's rule for it is to say nothing at all.
 *
 * The detection is a pure function over a probe rather than a module that
 * reads `navigator`, so the iPadOS case can be tested rather than reasoned
 * about. It is also the only user-agent sniffing in the codebase, and the
 * probe is where it stops.
 */

export type Platform = "ios" | "android" | "other";

/**
 * What the detection is allowed to look at.
 *
 * Read once, at the call site, from `navigator` and `window`. Nothing here is
 * stored, and nothing here is device information this product keeps — see
 * `local/install.ts`, which writes down none of it.
 */
export type PlatformProbe = {
  userAgent: string;
  /**
   * `navigator.platform`. Deprecated, and still the only reliable tell for an
   * iPad — see below.
   */
  platform: string;
  /** `navigator.maxTouchPoints`. */
  maxTouchPoints: number;
};

/**
 * The platform, from the probe.
 *
 * The iPad case is the whole reason this function is not two `includes`
 * calls. Since iPadOS 13 Safari reports itself as `Macintosh` with
 * `navigator.platform === "MacIntel"`, and a user who has asked for the
 * desktop site — or is on any recent iPad at all — produces a user agent
 * with no "iPad" in it. A check for `iPhone` and `iPad` alone therefore sends
 * every iPad owner down the "we don't know how to install here" path, on the
 * one platform where the instructions are the entire feature.
 *
 * The tell is `MacIntel` *plus* touch points. No real Mac reports more than
 * zero; every iPad reports five. It is a capability check wearing a
 * deprecated property's clothes, and it is the reason this file has a test
 * for "iPad pretending to be a Mac".
 */
export function detectPlatform(probe: PlatformProbe): Platform {
  const ua = probe.userAgent;

  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";

  /*
    An iPad that says it is a Mac. `maxTouchPoints > 1` rather than `> 0`
    because a Mac with a drawing tablet plugged in can report 1, and a
    borrowed stylus should not change which instructions a grown-up is shown.
  */
  if (probe.platform === "MacIntel" && probe.maxTouchPoints > 1) return "ios";

  /*
    Android before the generic case, and after iOS: some Android browsers
    carry "Linux" in the same string, and none of them carry "iPhone".
  */
  if (/Android/i.test(ua)) return "android";

  return "other";
}

/**
 * The probe, read from this browser.
 *
 * Wrapped because a server render has no `navigator` at all, and because the
 * whole feature is required to fail quietly rather than take a screen down
 * with it. A probe that cannot be read produces `"other"`, which produces no
 * invitation — the correct outcome for a device we know nothing about.
 */
export function readPlatform(): Platform {
  try {
    return detectPlatform({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints ?? 0,
    });
  } catch {
    return "other";
  }
}
