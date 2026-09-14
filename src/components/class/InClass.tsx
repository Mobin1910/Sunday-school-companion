"use client";

import type { ClassId } from "@/classes/registry";
import { useResolvedClass } from "@/local/class";

import ClassSelector from "./ClassSelector";

/**
 * One class's share of something the server shipped for all seven.
 *
 * This is the shape a static export forces, and it is worth naming plainly.
 * There is no server at runtime, so `/chapters` is one file served to every
 * child, and which chapters belong on it is a fact that lives on the device.
 * Each of those screens therefore ships a small map — class to whatever that
 * screen draws — and this picks one entry out of it. What crosses into the
 * bundle is the projection the screen chose, never the chapters themselves.
 *
 * The cost is honest: seven classes of twenty chapters means seven lists
 * where one would do. The projections are small — a title, a reference, a
 * cover path — and the alternative was a class in the URL of every
 * destination, which would mean the tab bar could not be drawn until
 * localStorage had been read. A tab bar that arrives late is a worse thing
 * than a few kilobytes.
 *
 * A hook and a component rather than one wrapper with a render prop, because
 * a render prop is a function and a function cannot be handed from a server
 * component to a client one. The map can cross that line; the code that picks
 * from it cannot, so it lives on this side with the screen that uses it.
 */

export type MyClass<T> =
  /** The device has not answered yet. Draw nothing rather than a guess. */
  | { state: "unsettled" }
  /** Answered, and the answer is "nobody has asked me". */
  | { state: "unchosen" }
  | { state: "chosen"; classId: ClassId; mine: T };

/**
 * Which class this child is in, and their share of the map.
 *
 * `unsettled` and `unchosen` are separate states and that separation is the
 * whole point. `null` means both for one frame, and a screen that cannot tell
 * them apart either flashes a question at a child who has already answered
 * it, or flashes one class's chapters at a child who is in another. Both were
 * real; both are what this prevents.
 */
export function useMyClass<T>(by: Record<ClassId, T>): MyClass<T> {
  const { id, settled } = useResolvedClass();

  if (!settled) return { state: "unsettled" };
  if (!id) return { state: "unchosen" };
  return { state: "chosen", classId: id, mine: by[id] };
}

/**
 * The question, asked by a screen that cannot draw itself without the answer.
 *
 * Every destination is reachable without going through the door: a child can
 * open `/chapters` straight from the home screen of their phone, or from a
 * link, having never been asked. They are asked here rather than sent away,
 * because the question is short and the answer is the whole of what the
 * screen is missing.
 */
export function ChooseClassFirst() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-6 py-10">
      <h1 className="text-3xl leading-tight">What class are you in?</h1>
      <p className="text-lg text-ink-soft text-balance">
        Every class has its own stories. Tell me yours and I&rsquo;ll bring the
        right ones.
      </p>
      <ClassSelector />
    </div>
  );
}
