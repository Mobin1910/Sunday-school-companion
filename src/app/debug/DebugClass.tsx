"use client";

import ClassSelector from "@/components/class/ClassSelector";
import { displayName } from "@/classes/registry";
import { forgetClass, useResolvedClass } from "@/local/class";

/**
 * Switching class without going through onboarding. Development only.
 *
 * Every class-dependent screen has to be checkable in all seven states, and
 * the honest route to that — clear the device, walk the welcome, choose a
 * class — is slow enough that it would quietly stop being done. This is the
 * shortcut, and it is deliberately in `/debug` rather than anywhere a child
 * could reach: the child-facing way to change class is the one on Home and
 * in Settings, which is the same selector with the same wording.
 *
 * It is compiled out of a production build. `process.env.NODE_ENV` is
 * replaced with a literal at build time, so the branch below is dead code in
 * production and the bundler drops it along with everything it references.
 * It is not hidden by CSS and not behind a flag anybody can flip — it is not
 * there at all.
 */
export default function DebugClass() {
  const { id, settled } = useResolvedClass();

  if (process.env.NODE_ENV === "production") return null;
  if (!settled) return null;

  return (
    <section className="mt-8 flex flex-col gap-3 border-y border-edge py-6">
      <p className="text-base text-ink-soft">
        Class: <span className="text-ink">{id ? displayName(id) : "none"}</span>
      </p>

      <ClassSelector chosen={id} />

      <button
        type="button"
        onClick={forgetClass}
        className="self-start text-base text-ink-soft underline underline-offset-4"
      >
        Forget the class (re-ask on Home)
      </button>
    </section>
  );
}
