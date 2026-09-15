#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The domain says the same thing in both places it is written.
 *
 * `brand/site.ts` is what the app builds canonical and Open Graph URLs from.
 * `vercel.json` is what Vercel's router reads before any of our code runs, and
 * it is static JSON that cannot import a constant. So the hostname genuinely
 * exists twice, and two copies of a hostname is precisely how the first one
 * came to read "comapnion" for the better part of a month without anyone
 * noticing — a misspelling is invisible at a glance and breaks nothing that
 * anybody tests.
 *
 * This is the check that would have caught it. It fails when:
 *
 *   - the redirect sends people somewhere other than the canonical origin
 *   - a retired origin has no redirect rule, so an old link simply dies
 *   - a redirect points at itself, which is a loop
 *   - the canonical origin is also listed as retired
 *
 * It cannot tell you the canonical domain is spelled right. Nothing can; only
 * a person reading it can. What it can guarantee is that there is exactly one
 * spelling to read.
 */

const ROOT = process.cwd();
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const problems = [];

/*
  site.ts is read rather than imported: it is TypeScript, this is a plain node
  script, and adding a build step to a check that exists to be fast and boring
  would be its own kind of mistake. The shapes it matches are the shapes the
  file is written in, and a change to either constant that this cannot parse
  fails loudly below rather than passing silently.
*/
const site = readFileSync(join(ROOT, "src/brand/site.ts"), "utf8");

const canonical = /CANONICAL_ORIGIN\s*=\s*"([^"]+)"/.exec(site)?.[1];
if (!canonical) {
  problems.push("src/brand/site.ts: could not find CANONICAL_ORIGIN");
}

const retiredBlock = (/RETIRED_ORIGINS\s*=\s*\[([\s\S]*?)\]/.exec(site)?.[1] ?? "")
  // Comments first. Each entry is explained above it, and those explanations
  // quote the very hostnames they are about — so reading strings without
  // stripping comments finds the typo being described as well as the domain
  // being listed, which is how this check first failed against itself.
  .replace(/\/\/[^\n]*/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

const retired = [...retiredBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

let config;
try {
  config = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
} catch (error) {
  problems.push(`vercel.json could not be read: ${error.message}`);
}

const redirects = config?.redirects ?? [];

/** The host a rule fires on, if it fires on a host at all. */
const hostOf = (rule) =>
  (rule.has ?? []).find((h) => h.type === "host")?.value;

if (canonical) {
  const canonicalHost = new URL(canonical).host;

  if (canonical.endsWith("/")) {
    problems.push("CANONICAL_ORIGIN must not end in a slash — paths are appended to it");
  }

  if (retired.includes(canonicalHost)) {
    problems.push(
      `${canonicalHost} is both the canonical origin and a retired one — it would redirect to itself`,
    );
  }

  for (const host of retired) {
    const rule = redirects.find((r) => hostOf(r) === host);

    if (!rule) {
      problems.push(
        `${host} is retired but vercel.json has no redirect for it — links to it would die`,
      );
      continue;
    }

    if (!rule.destination.startsWith(canonical)) {
      problems.push(
        `${host} redirects to ${rule.destination}, which is not the canonical origin (${canonical})`,
      );
    }

    if (!rule.source.includes(":path*") || !rule.destination.includes(":path*")) {
      problems.push(
        `${host} redirects only the root rather than the whole path — a link to a chapter would land on the home page`,
      );
    }
  }

  // A rule pointing at a host that is not retired is either a typo or a
  // redirect nobody meant to leave behind.
  for (const rule of redirects) {
    const host = hostOf(rule);
    if (host && host !== canonicalHost && !retired.includes(host)) {
      problems.push(
        `vercel.json redirects ${host}, which is not listed in RETIRED_ORIGINS`,
      );
    }
    if (host === canonicalHost) {
      problems.push(`vercel.json redirects ${host} to itself — that is a loop`);
    }
  }
}

if (problems.length > 0) {
  console.log(red(`\n✗ ${problems.length} problem(s) with the site's domain\n`));
  for (const problem of problems) console.log(red(`    ${problem}`));
  console.log("");
  process.exit(1);
}

console.log(green("\n✓ the domain agrees with itself"));
console.log(dim(`    canonical: ${canonical}`));
for (const host of retired) {
  console.log(dim(`    redirects: ${host} → ${canonical}`));
}
console.log("");
