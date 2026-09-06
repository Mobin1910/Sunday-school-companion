"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { greeting, readName, saveName, tidyName } from "@/local/child";
import {
  applyMotion,
  readSettings,
  saveSettings,
  type Motion,
  type Settings,
  type Sound,
  DEFAULTS,
} from "@/local/settings";
import { forgetEverything } from "@/local/store";

/**
 * Settings.
 *
 * Small on purpose. Everything here is either something only this child can
 * know — their name — or something about comfort. There are no accounts, no
 * sync, no export and no advanced section, because every switch added here
 * is a decision handed to a six-year-old and most decisions are better made
 * once, well, by us.
 *
 * It is reached from a small control on Home rather than from the bottom
 * bar. Settings is somewhere a child goes once; the bar is for the four
 * places they go all the time.
 *
 * Everything is read after mount. Storage does not exist while prerendering,
 * and this screen has to be correct on a device that has no memory at all.
 */
export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(readSettings());
    setName(readName());
    setReady(true);
  }, []);

  const change = (next: Partial<Settings>) => {
    const merged = { ...settings, ...next };
    setSettings(saveSettings(merged));
    if (next.motion) applyMotion(next.motion);
  };

  const commitName = () => {
    setName(saveName(draft));
    setEditing(false);
  };

  const clearEverything = () => {
    forgetEverything();
    setSettings(DEFAULTS);
    applyMotion(DEFAULTS.motion);
    setName("");
    setConfirming(false);
    setCleared(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-6">
      <div>
        <Link
          href="/"
          className="-ml-2 inline-flex min-h-12 items-center gap-1 rounded-full px-2 text-base text-ink-soft"
        >
          <ChevronLeft />
          Home
        </Link>
        <h1 className="mt-2 text-3xl">Settings</h1>
      </div>

      <Group label="Profile">
        {editing ? (
          <div className="flex flex-col gap-3 px-1 py-3">
            <label htmlFor="child-name" className="text-lg">
              What&rsquo;s your name?
            </label>
            <input
              id="child-name"
              value={draft}
              onChange={(event) => setDraft(tidyName(event.target.value))}
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              className="min-h-14 rounded-card border border-edge bg-ground-raised px-4 text-xl text-ink"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={commitName}
                className="cta min-h-14 flex-1 px-5 text-lg"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="min-h-14 rounded-card px-5 text-lg text-ink-soft"
              >
                Cancel
              </button>
            </div>
            <p className="text-sm text-ink-soft text-balance">
              Your name stays on this device. Leave it empty to remove it.
            </p>
          </div>
        ) : (
          <Row label="Name" value={ready && name ? name : "Not set"}>
            <button
              type="button"
              onClick={() => {
                setDraft(name);
                setEditing(true);
              }}
              className="min-h-12 rounded-full px-3 text-base text-touchable"
            >
              {name ? "Edit" : "Add"}
            </button>
          </Row>
        )}

        {!editing && ready ? (
          <p className="px-1 pt-2 text-sm text-ink-soft text-balance">
            {greeting(name)} &mdash; this is how Home will say hello.
          </p>
        ) : null}
      </Group>

      <Group label="Experience">
        <Row label="Sound">
          <Choice<Sound>
            value={settings.sound}
            options={[
              ["on", "On"],
              ["off", "Off"],
            ]}
            onChange={(sound) => change({ sound })}
          />
        </Row>

        <Row label="Reduced motion" hint="Auto follows your device.">
          <Choice<Motion>
            value={settings.motion}
            options={[
              ["auto", "Auto"],
              ["reduce", "On"],
              ["full", "Off"],
            ]}
            onChange={(motion) => change({ motion })}
          />
        </Row>
      </Group>

      <Group label="App">
        <Row
          label="Clear progress"
          hint="Removes your name, your streaks and where you left off."
        >
          {confirming ? (
            <span className="flex gap-2">
              <button
                type="button"
                onClick={clearEverything}
                className="cta min-h-12 px-4 text-base"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="min-h-12 rounded-full px-3 text-base text-ink-soft"
              >
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="min-h-12 rounded-full px-3 text-base text-touchable"
            >
              Clear
            </button>
          )}
        </Row>

        {cleared ? (
          <p aria-live="polite" className="px-1 pt-2 text-sm text-joy">
            Cleared. Everything starts fresh.
          </p>
        ) : null}
      </Group>

      <section className="flex flex-col gap-2 border-t border-edge pt-6">
        <h2 className="text-lg">About Sunday School Companion</h2>
        <p className="text-base text-ink-soft text-balance">
          Bible stories to read again at home, with Halo for company.
        </p>
        <p className="text-base text-ink-soft text-balance">
          Everything you do here stays on this device. There is no account, no
          sign-in and nothing sent anywhere. Stories, games, verses and Halo all
          work without the internet; only the videos need it.
        </p>
        <p className="text-sm text-ink-soft text-balance">
          Where you got to is remembered, so Home can offer to carry on.
        </p>
      </section>
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col">
      <h2 className="mb-1 text-xs tracking-[0.14em] text-ink-soft uppercase">
        {label}
      </h2>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-edge py-3 last:border-0">
      <span className="min-w-0">
        <span className="block text-lg">{label}</span>
        {value ? (
          <span className="block text-base text-ink-soft">{value}</span>
        ) : null}
        {hint ? (
          <span className="block text-sm text-ink-soft text-balance">
            {hint}
          </span>
        ) : null}
      </span>
      {children}
    </div>
  );
}

/**
 * A small set of choices, shown all at once.
 *
 * Not a toggle switch: a switch says what it is *not* currently doing only
 * by its position, and "auto" cannot be a position at all. Three words a
 * child can read beats a control they have to interpret.
 */
function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <span className="flex shrink-0 gap-1 rounded-full border border-edge bg-ground-raised p-1">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={key === value}
          className={`min-h-11 rounded-full px-4 text-base ${
            key === value ? "cta" : "text-ink-soft"
          }`}
        >
          {label}
        </button>
      ))}
    </span>
  );
}

function ChevronLeft() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 5-7 7 7 7" />
    </svg>
  );
}
