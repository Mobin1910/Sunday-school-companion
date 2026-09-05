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
  const [onDark, setOnDark] = useState(false);

  const e = expressionFor(state);

  return (
    <div className="flex flex-col gap-6">
      <div
        className={`flex min-h-72 items-center justify-center rounded-card transition-colors duration-300 ${
          onDark ? "bg-[#2a2119]" : "bg-ground-raised"
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
          <Chip on={!onDark} onClick={() => setOnDark(false)}>
            light
          </Chip>
          <Chip on={onDark} onClick={() => setOnDark(true)}>
            dark
          </Chip>
        </Row>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs text-ink-soft sm:grid-cols-3">
        <Value name="tone" value={e.tone} />
        <Value name="scale" value={e.scale} />
        <Value name="squish" value={e.squish} />
        <Value name="glow" value={e.glow} />
        <Value name="light" value={e.light} />
        <Value name="cross" value={e.cross} />
        <Value name="openness" value={e.openness} />
        <Value name="gaze" value={`${e.gaze.x}, ${e.gaze.y}`} />
        <Value name="drift" value={`${e.drift}px`} />
        <Value name="breath" value={`${e.breath.duration}ms`} />
        <Value name="depth" value={e.breath.depth} />
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
        on ? "bg-touchable text-ground-raised" : "bg-ground-raised text-ink-soft"
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
