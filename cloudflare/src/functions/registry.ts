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
import {
  grantRewardedUnlockConfig,
  verifyRewardedAdConfig,
} from "./rewarded";
import { ec3EpdLookupConfig } from "./ec3-epd-lookup";
import { priceIndexApiConfig } from "./price-index-api";
import { verifyCopyGetConfig } from "./verify-copy-get";
import { clientIdentityConfig } from "./client-identity";
import { seoSearchConsoleConfig } from "./seo-search-console";

export interface PortedFunction {
  name: string;
  methods: readonly string[];
  requiredBindings: readonly string[];
  handler: EdgeHandler;
}

const ENTRIES: readonly PortedFunction[] = [
  healthConfig,
  turnstileVerifyConfig,
  verifyRewardedAdConfig,
  grantRewardedUnlockConfig,
  ec3EpdLookupConfig,
  priceIndexApiConfig,
  verifyCopyGetConfig,
  clientIdentityConfig,
  seoSearchConsoleConfig,
];

/**
 * Functions that must NOT be ported, with the reason. Two kinds:
 *
 *  - AI: they call a model provider, which is the owner's exclusion.
 *  - CPU-heavy: the work per request does not fit the 10 ms CPU budget the
 *    Worker runs on (free tier), so moving them would turn a working function
 *    into a 1101 "exceeded CPU" error, or force a paid plan. The owner's rule is
 *    explicit: anything that would need Workers Paid stays on Supabase, so this
 *    list is the paid tier by another name and nothing here waits for an upgrade.
 *
 * A name here is a decision, not a to-do: removing it needs evidence (a CPU
 * measurement from `wrangler tail` on a real request), not optimism.
 */
export const SUPABASE_ONLY: ReadonlyMap<string, string> = new Map([
  // AI (owner exclusion)
  ...([
    "ai-admin-assistant",
    "ai-building-estimation",
    "ai-color-consult",
    "ai-color-preview",
    "ai-construction-extraction",
    "ai-copilot",
    "ai-envelope-detect",
    "ai-ingestion",
    "ai-learn-assistant",
    "ai-livechat",
    "ai-logo-generation",
    "ai-plan-extraction",
    "ai-project-assistant",
    "ai-studio",
    "ai-tv-console-extract",
    "ai-visual-finishing",
    "count-vision",
    "support-chat",
    "frelix-api",
  ].map((name) => [name, "AI: calls a model provider; stays on Supabase."] as const)),
  // CPU-heavy: cannot fit 10 ms CPU
  ...([
    ["pdf-studio-export", "CPU-heavy: server-side PDF composition exceeds 10 ms CPU."],
    ["roof-view-imagery", "CPU-heavy: raster imagery work exceeds 10 ms CPU."],
    ["price-intel-scan", "CPU-heavy: multi-source scan loop exceeds 10 ms CPU."],
    ["broadcast-campaign", "CPU-heavy: batch fan-out exceeds 10 ms CPU."],
    ["price-digest", "CPU-heavy: digest aggregation exceeds 10 ms CPU."],
    ["iot-ingest", "CPU-heavy: burst ingest loop exceeds 10 ms CPU."],
    ["translate-content", "CPU-heavy: translation batching exceeds 10 ms CPU."],
    ["sitemap", "CPU-heavy: full sitemap assembly over the catalogue exceeds 10 ms CPU."],
  ] as const),
]);

/**
 * Ported functions whose CPU has not been measured on a real request yet.
 *
 * The free tier allows 10 ms of CPU per request. These are believed to fit
 * because their heavy work is I/O (a fetch, a JSON body) rather than
 * computation, but belief is not a measurement. One `wrangler tail` sample per
 * name settles it: inside budget keeps the port, over budget moves the name
 * into SUPABASE_ONLY and the Worker proxies it again with no other change.
 */
export const AWAITING_CPU_MEASUREMENT: readonly string[] = [
  "ec3-epd-lookup",
  "price-index-api",
  "client-identity",
  "seo-search-console",
];

export function needsCpuMeasurement(name: string): boolean {
  return AWAITING_CPU_MEASUREMENT.includes(name);
}

export function supabaseOnlyReason(name: string): string | undefined {
  return SUPABASE_ONLY.get(name);
}

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
