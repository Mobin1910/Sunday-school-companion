import HaloPlayground from "./HaloPlayground";

/**
 * Halo's sandbox, under the existing debug route.
 *
 * Deliberately not in any navigation a child or parent can reach. It sits
 * beside the content debug page for the same reason that one does: this is
 * a workbench, not a screen.
 */
export default function HaloDebugPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl">Halo</h1>
      <p className="mt-2 mb-8 text-ink-soft">
        Every state and size, without walking through a chapter to reach one.
        The numbers below come from <code>src/halo/expression.ts</code>.
      </p>

      <HaloPlayground />
    </main>
  );
}
