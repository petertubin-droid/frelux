/**
 * Edge functions that must stay on Supabase, never on the Worker.
 *
 * The client rewrites `supabase.functions.invoke()` to the Cloudflare Worker so
 * function traffic stops consuming Supabase's invocation quota. That rewrite
 * must skip three kinds of function, because the Worker cannot carry them:
 *
 *  - AI: the Worker does not deploy AI functions. They call a model provider,
 *    which is the owner's standing exclusion.
 *  - CPU: the work per request does not fit the free tier's 10 ms CPU budget,
 *    so moving it would replace a working function with a 1101 error.
 *  - PAID: it would need a Workers Paid feature, and the free tier is the gate.
 *    Nothing here waits for an upgrade.
 *
 * This list is a copy of SUPABASE_ONLY in cloudflare/src/functions/registry.ts,
 * because the browser bundle cannot import the Worker's source. The two are
 * compared by src/lib/edge-functions-url.test.ts, so a name added on one side
 * fails the suite until it is added on the other. A name that reaches the
 * Worker anyway (an older cached bundle) still works: the Worker proxies it.
 */
export const SUPABASE_ONLY_FUNCTIONS: readonly string[] = [
  // AI: calls a model provider.
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
  // CPU-heavy: cannot fit 10 ms CPU per request.
  "pdf-studio-export",
  "roof-view-imagery",
  "price-intel-scan",
  "broadcast-campaign",
  "price-digest",
  "iot-ingest",
  "translate-content",
  "sitemap",
];

const SUPABASE_ONLY = new Set(SUPABASE_ONLY_FUNCTIONS);

/** True when the named function must be called on Supabase, not the Worker. */
export function staysOnSupabase(name: string): boolean {
  return SUPABASE_ONLY.has(name);
}
