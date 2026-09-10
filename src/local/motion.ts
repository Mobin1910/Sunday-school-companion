/**
 * Whether this device has asked for things to hold still.
 *
 * Both routes the stylesheet honours, read the same way it reads them: the
 * browser setting, and the child's own choice in Settings, which overrides it
 * in either direction — a child on a shared tablet may need stillness the
 * device does not know about, or motion someone else turned off.
 *
 * It lives here, on its own, because three different parts of the app had
 * started keeping their own copy of these four lines, and a rule about
 * comfort that is written down three times is a rule that will eventually
 * disagree with itself.
 */
export function stillnessWanted(): boolean {
  try {
    const chosen = document.documentElement.dataset.motion;
    if (chosen === "reduce") return true;
    if (chosen === "full") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    // No document to ask. Nothing is animating anyway.
    return false;
  }
}
