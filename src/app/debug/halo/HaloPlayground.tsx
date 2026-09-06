"use client";

import { useState } from "react";

import Halo from "@/halo/Halo";
import { expressionFor } from "@/halo/expression";
import {
  HALO_SIZES,
  HALO_STATES,
  type HaloSize,
  type HaloState,
} from "@/halo/state";

/**
 * The sandbox.
 *
 * Halo is a thing you tune by looking at it, and navigating three screens
 * into a chapter to see one state for four seconds is no way to tune
 * anything. Every state and size is one tap from every other here.
 *
 * It shows the expression values alongside the companion on purpose: when
 * "recovering" feels wrong, the fix is a number in `expression.ts`, and
 * this is where you find out which one.
 *
 * Not part of the product. Nothing links here from anything a child sees.
 */
export default function HaloPlayground() {
  const [state, setState] = useState<HaloState>("idle");
  const [size, setSize] = useState<HaloSize>("large");
  const [night, setNight] = useState(true);

  const e = expressionFor(state);

  return (
    <div className="flex flex-col gap-6">
      <div
        className={`flex min-h-80 items-center justify-center rounded-card transition-colors duration-300 ${
          night ? "halo-night" : "surface"
        }`}
      >
        <Halo state={state} size={size} />
      </div>

      <div className="flex flex-col gap-3">
        <Row label="State">
          {HALO_STATES.map((option) => (
            <Chip
              key={option}
              on={option === state}
              onClick={() => setState(option)}
            >
              {option}
            </Chip>
          ))}
        </Row>

        <Row label="Size">
          {HALO_SIZES.map((option) => (
            <Chip
              key={option}
              on={option === size}
              onClick={() => setSize(option)}
            >
              {option}
            </Chip>
          ))}
        </Row>

        <Row label="Ground">
          <Chip on={night} onClick={() => setNight(true)}>
            night
          </Chip>
          <Chip on={!night} onClick={() => setNight(false)}>
            light
          </Chip>
        </Row>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs text-ink-soft sm:grid-cols-3">
        <Value name="scale" value={e.scale} />
        <Value name="squish" value={e.squish} />
        <Value name="lean" value={`${e.lean}°`} />
        <Value name="glow" value={e.glow} />
        <Value name="light" value={e.light} />
        <Value name="warmth" value={e.warmth} />
        <Value name="openness" value={e.openness} />
        <Value name="eyeTilt" value={`${e.eyeTilt}°`} />
        <Value name="gaze" value={`${e.gaze.x}, ${e.gaze.y}`} />
        <Value name="ring lift" value={e.ring.lift} />
        <Value name="ring glow" value={e.ring.glow} />
        <Value name="ring scale" value={e.ring.scale} />
        <Value name="ring tilt" value={`${e.ring.tilt}°`} />
        <Value name="eyeCurve" value={e.eyeCurve} />
        <Value name="life" value={e.life} />
        <Value name="transition" value={`${e.transition}ms`} />
      </dl>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-14 shrink-0 font-mono text-xs text-ink-soft">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 rounded-full px-3 font-mono text-xs ${
        on ? "cta" : "btn-quiet text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

function Value({ name, value }: { name: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-2 border-b border-edge py-1">
      <dt>{name}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
