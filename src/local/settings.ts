import { read, write } from "./store";

/**
 * What a child (or the adult beside them) has asked the app to be like.
 *
 * Two settings, and both are about comfort rather than configuration. This
 * is not a preferences system and must not grow into one: every switch added
 * here is a decision handed to a six-year-old, and most decisions are better
 * made once, well, by us.
 */

export type Sound = "on" | "off";

/**
 * "auto" follows the device. "reduce" and "full" are a deliberate override
 * of it — in both directions, because a child on a shared tablet may need
 * stillness the device does not know about, or motion the device has turned
 * off for someone else.
 */
export type Motion = "auto" | "reduce" | "full";

export type Settings = { sound: Sound; motion: Motion };

export const DEFAULTS: Settings = { sound: "on", motion: "auto" };

export function readSettings(): Settings {
  return read(
    "settings",
    (raw) => {
      if (typeof raw !== "object" || raw === null) return null;
      const r = raw as Partial<Settings>;
      return {
        sound: r.sound === "off" ? "off" : "on",
        motion:
          r.motion === "reduce" || r.motion === "full" ? r.motion : "auto",
      };
    },
    DEFAULTS,
  );
}

export function saveSettings(settings: Settings): Settings {
  write("settings", settings);
  return settings;
}

/**
 * Puts the motion choice where CSS can see it.
 *
 * The stylesheet keys off `data-motion` on the document element, alongside
 * the `prefers-reduced-motion` media query rather than instead of it — so a
 * device that asks for stillness gets it whether or not this ever runs, and
 * a child who asked for it themselves gets it too.
 */
export function applyMotion(motion: Motion): void {
  try {
    document.documentElement.dataset.motion = motion;
  } catch {
    // Nothing to apply to. The media query is still in force.
  }
}
