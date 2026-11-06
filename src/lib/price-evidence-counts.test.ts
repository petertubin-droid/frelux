// Every one of the 1381 rows in market_material_prices carried observations_count
// > 0 while market_price_observations covered 6 market-material pairs, and
// describePriceProvenance rendered that number as "N observations recorded, none
// reviewed yet" in AdminMarketPrices and the supplier index. The counts had been
// copied from the estimation book, not derived from observations. These tests pin
// the derivation, its upkeep, and the dispatch change that stops spending scan
// budget on markets with no scannable source.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20261106120000_price_evidence_counts.sql"),
  "utf8",
);

describe("price evidence counts", () => {
  it("derives the counts from observations, not from the book", () => {
    expect(migration).toMatch(
      /update public\.market_material_prices p\s+set observations_count = coalesce\(agg\.obs, 0\)/,
    );
    expect(migration).toMatch(/from public\.market_price_observations o/);
    expect(migration).toMatch(/o\.observed_at > now\(\) - interval '90 days'/);
  });

  it("clears counts on pairs that have no observation", () => {
    expect(migration).toMatch(
      /set observations_count = 0,\s+suppliers_count = 0/,
    );
    expect(migration).toMatch(
      /still reports observations for pairs that have none/,
    );
  });

  it("keeps counts in step for every writer, per event", () => {
    // Transition tables cannot span more than one event; each must be its own
    // trigger or the migration is rejected outright.
    for (const event of ["after insert", "after update", "after delete"]) {
      expect(migration).toContain(event);
    }
    expect(migration).not.toMatch(
      /after insert or update on public\.market_price_observations/,
    );
    expect(migration).toMatch(/referencing new table as changed/);
    expect(migration).toMatch(/referencing old table as changed/);
  });

  it("reports per-market readiness with a verdict, not a source count", () => {
    expect(migration).toMatch(
      /create or replace function public\.price_market_readiness\(\)/,
    );
    for (const verdict of ["unconfigured", "configured, no data yet", "live"]) {
      expect(migration).toContain(verdict);
    }
    expect(migration).toMatch(
      /revoke all on function public\.price_market_readiness\(\) from public/i,
    );
  });

  it("parks a market whose sources cannot yield a price", () => {
    expect(migration).toMatch(/set next_run_at = now\(\) \+ interval '7 days'/);
    expect(migration).toMatch(/not in \('search_page_only', 'bot_blocked'\)/);
  });

  it("spends the dispatch budget where a scan can produce data", () => {
    const dispatch = migration.slice(
      migration.indexOf("for v_row in"),
      migration.indexOf("order by scannable desc"),
    );
    expect(dispatch).toContain("as scannable");
    expect(migration).toContain("order by scannable desc, s.next_run_at asc");
  });
});
