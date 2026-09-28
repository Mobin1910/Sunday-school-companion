/**
 * Whether this app is installed, asked of the browser rather than assumed.
 *
 * Three answers, and the third one matters. "Unknown" is what an old browser
 * with no `matchMedia` gets, and it is not a quiet synonym for
 * "not-installed": a product that treats "I could not tell" as "go ahead and
 * ask" is a product that asks installed users to install.
 *
 * Nothing here infers installation from anything a *child* did. Dismissing
 * the invitation is not installing. Visiting twice is not installing. Having
 * played six games is not installing. The only evidence accepted is the
 * browser saying the app is running as an app, which is a fact about the
 * launch rather than a guess about the person.
 */

export type InstallStatus = "unknown" | "not-installed" | "installed";

/**
 * The display modes that mean "launched as an app".
 *
 * All three, because the manifest asks for `standalone` and platforms are
 * free to give something adjacent: Android may hand back `minimal-ui` when a
 * user installs from the browser menu rather than the prompt, and a kiosk or
 * a tablet in a classroom may be in `fullscreen`. Checking only `standalone`
 * means a genuinely installed app on one of those keeps being invited to
 * install itself.
 *
 * `browser` is deliberately absent. It is the tab, which is where the
 * invitation belongs.
 */
export const APP_DISPLAY_MODES = ["standalone", "fullscreen", "minimal-ui"] as const;

export type InstalledProbe = {
  /** Which of `APP_DISPLAY_MODES` this launch matches. */
  appDisplayModes: readonly string[];
  /**
   * `navigator.standalone` — Apple's own signal, and on iOS the only one that
   * has ever been reliable. `undefined` everywhere else, which is why the
   * check below is against `true` rather than truthiness.
   */
  appleStandalone: boolean | undefined;
  /** Whether the browser could be asked at all. */
  canAsk: boolean;
};

export function detectInstalled(probe: InstalledProbe): InstallStatus {
  if (probe.appDisplayModes.length > 0) return "installed";
  if (probe.appleStandalone === true) return "installed";

  /*
    A negative answer from a browser that understood the question. It means
    "this launch is a tab", which is all this function ever claims — the
    stickiness in `local/install.ts` is what remembers that a *previous*
    launch was an app.
  */
  if (probe.canAsk) return "not-installed";

  return "unknown";
}

/**
 * The probe, read from this browser.
 *
 * Every access is inside the `try`. `matchMedia` exists nowhere on the server
 * and `navigator.standalone` is a property access that some privacy tooling
 * makes throw, and neither is worth a blank screen.
 */
export function readInstalled(): InstallStatus {
  try {
    const apple = (navigator as { standalone?: boolean }).standalone;
    const canAsk = typeof window.matchMedia === "function";

    return detectInstalled({
      appDisplayModes: canAsk
        ? APP_DISPLAY_MODES.filter(
            (mode) => window.matchMedia(`(display-mode: ${mode})`).matches,
          )
        : [],
      appleStandalone: apple,
      canAsk,
    });
  } catch {
    return "unknown";
  }
}
