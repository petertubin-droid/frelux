// =========================================================
// Ported function registry.
//
// Every entry here RUNS on the Worker. Anything not listed keeps proxying to
// Supabase through /api/fn/:name, so this file is the migration's on-switch and
// the honest inventory of what has actually moved.
//
// Adding a function:
//   1. create cloudflare/src/functions/<name>.ts exporting <name>Config
//   2. register it below
//   3. test it against a fake fetch and a fake env (see ported.test.ts)
//   4. only then remove the Supabase route if you intend to retire it - the
//      proxy fallback is what makes a bad wave a rollback, not an outage.
// =========================================================

import type { EdgeHandler } from "./runtime";
import { healthConfig } from "./health";
import { turnstileVerifyConfig } from "./turnstile-verify";

export interface PortedFunction {
  name: string;
  methods: readonly string[];
  requiredBindings: readonly string[];
  handler: EdgeHandler;
}

const ENTRIES: readonly PortedFunction[] = [healthConfig, turnstileVerifyConfig];

export const PORTED_FUNCTIONS: ReadonlyMap<string, PortedFunction> = new Map(
  ENTRIES.map((entry) => [entry.name, entry]),
);

export function getPortedFunction(name: string): PortedFunction | undefined {
  return PORTED_FUNCTIONS.get(name);
}

/** Names served by the Worker today; used by /health and by the docs. */
export function portedFunctionNames(): string[] {
  return [...PORTED_FUNCTIONS.keys()].sort();
}
