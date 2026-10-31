import { describe, expect, it } from "vitest";
import {
  coverageFor,
  coverageList,
  isSnapshotStale,
  SNAPSHOT_STALE_DAYS,
  snapshotAgeDays,
  snapshotDate,
} from "@/lib/pricing/price-honesty";

const NOW = Date.parse("2026-10-31T09:00:00.000Z");

describe("price coverage honesty", () => {
  it("describes a market whose prices are its own and fresh", () => {
    const ng = coverageFor("NG", NOW);
    expect(ng).not.toBeNull();
    expect(ng!.status).toBe("local");
    expect(ng!.sentence).toContain("are local");
    expect(ng!.sentence).toContain("last checked");
  });

  it("says out loud how many prices are converted rather than local", () => {
    const gb = coverageFor("GB", NOW)!;
    expect(gb.status).toBe("partial");
    expect(gb.fx_reference).toBeGreaterThan(0);
    expect(gb.sentence).toContain("converted at a dated exchange rate");
    expect(gb.sentence).toContain("indicative");
  });

  it("admits when a market has no record at all", () => {
    const zz = coverageFor("ZZ", NOW)!;
    expect(zz.status).toBe("unrecorded");
    expect(zz.total).toBe(0);
    expect(zz.statusLabel).toBe("No local prices");
    expect(zz.sentence).toContain("No local price coverage is recorded");
  });

  it("returns nothing for a missing code instead of guessing a market", () => {
    expect(coverageFor(null)).toBeNull();
    expect(coverageFor(undefined)).toBeNull();
    expect(coverageFor("")).toBeNull();
  });

  it("matches the request regardless of case", () => {
    expect(coverageFor("ng", NOW)!.marketCode).toBe("NG");
  });

  it("reports the age of the snapshot in whole days", () => {
    // Snapshot taken 2026-10-29T09:04Z, so this is not quite two full days.
    expect(snapshotAgeDays(NOW)).toBe(1);
    expect(snapshotDate()).toBe("2026-10-29");
  });

  it("only calls a snapshot stale past its freshness window", () => {
    const fresh = Date.parse("2026-11-01T00:00:00.000Z");
    const old = Date.parse("2026-12-31T00:00:00.000Z");
    expect(isSnapshotStale(fresh)).toBe(false);
    expect(isSnapshotStale(old)).toBe(true);
    expect(snapshotAgeDays(old)).toBeGreaterThan(SNAPSHOT_STALE_DAYS);
  });

  it("warns inside the sentence once the snapshot is old", () => {
    const old = Date.parse("2027-01-15T00:00:00.000Z");
    const ng = coverageFor("NG", old)!;
    expect(ng.snapshotStale).toBe(true);
    expect(ng.sentence).toContain("days old");
  });

  it("keeps the order it was asked for and drops nothing silently", () => {
    const rows = coverageList(["US", "NG", "ZZ"], NOW);
    expect(rows.map((r) => r.marketCode)).toEqual(["US", "NG", "ZZ"]);
  });

  it("uses no em dashes in anything a visitor reads", () => {
    for (const code of ["NG", "GB", "ZZ"]) {
      expect(coverageFor(code, NOW)!.sentence).not.toContain("—");
    }
  });
});
