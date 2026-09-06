"use client";

import { useEffect } from "react";

import { applyMotion, readSettings } from "@/local/settings";

/**
 * Puts the stored comfort settings onto the document, once, everywhere.
 *
 * It renders nothing and exists only so the choice survives a reload and
 * applies on every screen rather than only on the one where it was made.
 *
 * The stylesheet still honours `prefers-reduced-motion` on its own, without
 * this ever running. That ordering is deliberate: a device asking for
 * stillness is obeyed even if this JavaScript never arrives, and the setting
 * is an override on top rather than the only route to it.
 */
export default function Preferences() {
  useEffect(() => applyMotion(readSettings().motion), []);
  return null;
}
