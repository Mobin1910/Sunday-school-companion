import HaloPresence from "@/halo/HaloPresence";

/**
 * An honest empty state for a section whose interaction has no model yet.
 *
 * Ordering, Pairing and Discovery arrive in Milestones 5 to 7. Until then
 * this says so plainly instead of rendering an empty frame a child would
 * try to tap. It is written to a child, not to a developer: nothing here
 * says "unsupported", and nothing implies they did something wrong.
 */
export default function NotReadyYet({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="max-w-sm text-2xl leading-relaxed text-balance">
        {what} is still being made.
      </p>
      <p className="max-w-sm text-lg text-ink-soft text-balance">
        Come back for it soon.
      </p>
      <HaloPresence state="idle" />
    </div>
  );
}
