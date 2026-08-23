import Picture from "@/components/Picture";

/**
 * Milestone 1 scaffold.
 *
 * This is not the home screen — that arrives in Milestone 8. It exists so the
 * provisional palette can be judged on a real device, and so the placeholder
 * system can be seen working before any chapter renders.
 */

const SWATCHES = [
  { role: "ground", className: "bg-ground" },
  { role: "ground-raised", className: "bg-ground-raised" },
  { role: "ink", className: "bg-ink" },
  { role: "ink-soft", className: "bg-ink-soft" },
  { role: "touchable", className: "bg-touchable" },
  { role: "joy", className: "bg-joy" },
  { role: "edge", className: "bg-edge" },
];

export default function Page() {
  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-4xl">Tiny Disciples</h1>
      <p className="mt-3 text-lg text-ink-soft">
        Bible stories to read again at home.
      </p>

      <section className="mt-12">
        <h2 className="text-2xl">Pictures not drawn yet</h2>
        <div className="mt-4 grid gap-4">
          <Picture chapter="stephen" name="stephen-serving" />
          <Picture chapter="stephen" name="sharing-bread" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl">Provisional colours</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {SWATCHES.map(({ role, className }) => (
            <li key={role} className="flex items-center gap-3">
              <span
                className={`size-12 shrink-0 rounded-full border border-edge ${className}`}
              />
              <span className="text-base text-ink-soft">{role}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
