import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as join } from "node:path";

/**
 * Lets the tests import the app's own modules, unchanged.
 *
 * The app is TypeScript written for a bundler, so its imports have no file
 * extension — `./config`, `@/pwa/record`. Node needs both: the extension,
 * because it resolves real files, and something to do about `@/`, which is a
 * `tsconfig` path alias that only a bundler knows.
 *
 * This hook supplies both, for the tests only. The alternative was to put
 * `.ts` extensions into the application source so that Node could read it —
 * which would mean shaping production code around the test runner, and would
 * leave every file in `src/pwa/` looking unlike every other file in `src/`.
 * Fifteen lines here is the cheaper trade.
 *
 * `registerHooks` is synchronous and in-process, so there is no worker thread
 * and no loader protocol to keep in step. Combined with Node's own type
 * stripping, the whole test setup is the runtime and nothing else — which is
 * the same bargain the agent self-tests in `agents/` already make by being
 * plain `node` scripts. No test framework is installed, and none is needed.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/** `@/pwa/record` → `<repo>/src/pwa/record`, the one alias `tsconfig` defines. */
function dealias(specifier) {
  return specifier.startsWith("@/") ? pathToFileURL(join(SRC, specifier.slice(2))).href : specifier;
}

registerHooks({
  resolve(specifier, context, next) {
    /*
      A `?fresh=n` suffix asks Node for a new copy of a module it has already
      cached. The manager is a singleton with one set of browser listeners, so
      each scenario that drives it needs its own; the query is how a test says
      so.

      It is split off before anything else touches the specifier, because
      `pathToFileURL` percent-escapes a `?` into part of the filename — which
      turns a cache-buster into a file that does not exist.
    */
    const cut = specifier.indexOf("?");
    const query = cut === -1 ? "" : specifier.slice(cut);
    const bare = dealias(cut === -1 ? specifier : specifier.slice(0, cut));

    /* Only extensionless specifiers are ours to repair. */
    if (/\.[a-z]+$/i.test(bare)) return next(bare + query, context);

    const base = bare.startsWith("file:")
      ? bare
      : bare.startsWith(".")
        ? new URL(bare, context.parentURL).href
        : null;

    if (base === null) return next(specifier, context);

    for (const ext of [".ts", ".tsx", ".mjs", ".js"]) {
      if (existsSync(fileURLToPath(base + ext))) {
        return { url: base + ext + query, shortCircuit: true };
      }
    }

    return next(specifier, context);
  },
});
