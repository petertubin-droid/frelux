// Three defects that only execution could reveal, after the scanner was revived:
//
//   {"market":"CI","scanned":2,"candidates_created":1,"observations_filed":0,
//    "auto_applied":1}
//
// A price was published while the observation behind it was never stored. The
// upsert targeted source_id,supplier_name,market,material_slug,brand,
// specification,unit,observed_on, but the only unique index was built on
// COALESCE expressions, which Postgres cannot use to infer an ON CONFLICT
// target, so every write failed with 42P10 and the function discarded the error.
// Separately, price-intel-scan wrote three columns to price_scan_runs that did
// not exist, so the whole audit close was rejected and runs stayed 'running'.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8");

const dedupMigration = read(
  "supabase/migrations/20261106110000_fix_observation_dedup_and_outliers.sql",
);
const countersMigration = read(
  "supabase/migrations/20261106113000_price_scan_run_counters.sql",
);
const scanFn = read("supabase/functions/price-intel-scan/index.ts");

/** The conflict target the writer actually sends to PostgREST. */
function conflictTarget(): string[] {
  const match = scanFn.match(/onConflict:\s*\n?\s*"([^"]+)"/);
  expect(match).toBeTruthy();
  return match![1].split(",").map((c) => c.trim());
}

describe("price observation integrity", () => {
  it("indexes exactly the columns the upsert conflicts on", () => {
    const columns = conflictTarget();
    // The index must be plain: an expression index cannot be inferred.
    const indexBlock = dedupMigration.slice(
      dedupMigration.indexOf(
        "create unique index market_price_observations_daily_uidx",
      ),
    );
    for (const column of columns) {
      expect(indexBlock).toContain(column);
    }
    expect(dedupMigration).toMatch(
      /drop index if exists public\.market_price_observations_daily_uidx/,
    );
    const created = indexBlock.slice(0, indexBlock.indexOf(");"));
    expect(created).not.toMatch(/coalesce/i);
  });

  it("keeps duplicate rows out for any writer, not only this one", () => {
    expect(dedupMigration).toMatch(
      /create trigger market_price_observation_guard_trg/,
    );
    expect(dedupMigration).toMatch(
      /before insert on public\.market_price_observations/,
    );
    expect(dedupMigration).toMatch(/return null;/);
  });

  it("flags an outlier only against real peers", () => {
    expect(dedupMigration).toMatch(/percentile_cont\(0\.5\)/);
    expect(dedupMigration).toMatch(/v_peers, 0\) >= 5/);
    expect(dedupMigration).toMatch(/new\.is_outlier := true/);
  });

  it("never discards a failed observation write", () => {
    expect(scanFn).toContain("observationsFailed += chunk.length");
    expect(scanFn).toContain("observations_error: observationsError");
    // The old shape swallowed the error.
    expect(scanFn).not.toMatch(/if \(!obsError && inserted\)/);
  });

  it("refuses to publish a price whose evidence could not be stored", () => {
    const gate = scanFn.slice(scanFn.indexOf("if (observationsError) {"));
    expect(gate).toBeTruthy();
    const gateBody = gate.slice(0, 400);
    expect(gateBody).toContain("autoApplySkipped.push");
    expect(gateBody).toMatch(/continue;/);
    // The gate must run before a rule can authorise an auto-apply.
    expect(scanFn.indexOf("if (observationsError) {")).toBeLessThan(
      scanFn.indexOf("const rule = rules.get(market)"),
    );
  });

  it("declares every counter the run audit close writes", () => {
    const written = scanFn.slice(
      scanFn.indexOf('.from("price_scan_runs")'),
      scanFn.indexOf("finished_at: finishedAt"),
    );
    for (const column of [
      "observations_filed",
      "observations_failed",
      "markets_scanned",
      "prices_updated",
    ]) {
      expect(written).toContain(`${column}:`);
      expect(countersMigration).toContain(`add column if not exists ${column}`);
    }
  });

  it("surfaces a rejected audit close instead of leaving a silent running row", () => {
    expect(scanFn).toContain("run audit close failed");
    expect(scanFn).toMatch(/if \(runCloseError\)/);
  });
});
