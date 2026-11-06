// The market price scanner was dead in production while every indicator said it
// was healthy: the cron job was scheduled, enabled, and firing every 20 minutes.
// It failed 72 times in 24 hours because dispatch_market_scans declared a
// variable named `token` that shadowed the column it was selecting, and then,
// once that was fixed, because the RETURNS TABLE output parameter `market`
// shadowed the column in its UPDATE. Both defects are asserted here so neither
// can be reintroduced by a later migration.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationsDir = join(root, "supabase/migrations");

const tokenFix = readFileSync(
  join(migrationsDir, "20261106100000_revive_market_scan_dispatch.sql"),
  "utf8",
);
const shadowFix = readFileSync(
  join(migrationsDir, "20261106103000_fix_dispatch_output_shadowing.sql"),
  "utf8",
);

/** Every migration that defines dispatch_market_scans, oldest to newest. */
function dispatchDefinitions(): { file: string; sql: string }[] {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({
      file: f,
      sql: readFileSync(join(migrationsDir, f), "utf8"),
    }))
    .filter((m) => /function public\.dispatch_market_scans/i.test(m.sql));
}

describe("market scan dispatch", () => {
  it("never declares a plpgsql variable that shadows the token column", () => {
    const definitions = dispatchDefinitions();
    const latest = definitions[definitions.length - 1];
    // Any later revision must keep the fixed shape, because the newest
    // definition is the one production runs.
    expect(latest).toBeTruthy();
    expect(latest!.sql).toContain("v_token text;");
    expect(latest!.sql).not.toMatch(/select\s+token\s+into\s+token/i);
  });

  it("qualifies the UPDATE so the output parameter cannot shadow the column", () => {
    expect(shadowFix).toMatch(/update public\.market_scan_settings s/i);
    expect(shadowFix).toMatch(/where s\.market = v_row\.market/i);
    expect(shadowFix).toMatch(/for v_row in/i);
  });

  it("refuses to dispatch with no usable token instead of sending an empty header", () => {
    expect(tokenFix).toMatch(
      /raise exception 'dispatch_market_scans: no active price_intel_tokens row/i,
    );
    expect(tokenFix).toMatch(/length\(btrim\(v_token\)\) = 0/);
  });

  it("picks the newest active unexpired token deterministically", () => {
    expect(tokenFix).toMatch(/order by t\.created_at desc nulls last/i);
    expect(tokenFix).toMatch(
      /t\.expires_at is null or t\.expires_at > now\(\)/,
    );
    expect(tokenFix).toMatch(
      /add column if not exists is_active boolean not null default true/,
    );
  });

  it("keeps the weekly digest cron body valid JSONB", () => {
    // The previous definition called jsonb_build_object('{}') with one argument
    // and failed every Monday with "argument list must have even number of
    // elements".
    expect(tokenFix).toContain("body := '{}'::jsonb");
    // The odd-arity call is the defect: one argument, no key.
    expect(tokenFix).not.toMatch(/jsonb_build_object\(\s*'\{\}'\s*\)/);
  });

  it("publishes scan coverage so source counts are not mistaken for reach", () => {
    expect(tokenFix).toMatch(
      /create or replace function public\.price_scan_coverage\(\)/,
    );
    expect(tokenFix).toMatch(/search_page_only/);
    expect(tokenFix).toMatch(
      /revoke all on function public\.price_scan_coverage\(\) from public/i,
    );
    expect(tokenFix).toMatch(
      /grant execute on function public\.price_scan_coverage\(\) to authenticated, service_role/i,
    );
  });
});
