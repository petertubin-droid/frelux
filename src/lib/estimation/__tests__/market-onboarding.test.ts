/**
 * Phase 4 onboarding tooling gate: the scaffold and validator scripts are
 * the executable rollout runbook. These tests pin their refusal behavior
 * and checklist completeness so a market can never slip through with
 * scaffolded or invented data.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { spawnSync } from "child_process";

const root = process.cwd();

describe("market onboarding scripts (Phase 4)", () => {
  it("new-market.mjs refuses an existing market code", () => {
    const r = spawnSync("node", ["scripts/new-market.mjs", "NG", "Nigeria"], {
      cwd: root,
      encoding: "utf8",
      timeout: 20000,
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("already exists");
  });

  it("new-market.mjs requires code + country name", () => {
    const r = spawnSync("node", ["scripts/new-market.mjs", "PK"], {
      cwd: root,
      encoding: "utf8",
      timeout: 20000,
    });
    expect(r.status).toBe(1);
    expect(r.stderr ?? r.stdout).toContain("Usage");
  });

  it("the scaffold checklist names every registry a new market must touch", () => {
    const src = readFileSync(join(root, "scripts/new-market.mjs"), "utf8");
    for (const registry of [
      "MASONRY_MARKET_REGISTRY",
      "DRYWALL_MARKET_PROFILES",
      "CEMENT_BAG_WEIGHT_BY_MARKET",
      "WALLFIN_COUNTRY_PROFILES",
      "MARKET_BUNDLES",
    ]) {
      expect(src).toContain(registry);
    }
    // Honesty contract is stated in the scaffold itself
    expect(src).toContain("Never invent values");
  });

  it("validate-market.mjs checks all six verification sections", () => {
    const src = readFileSync(join(root, "scripts/validate-market.mjs"), "utf8");
    for (const section of [
      "1. Bundle presence and registration",
      "2. Scaffold TODOs cleared",
      "3. Engine registry entries",
      "4. Landing-page data",
      "5. Route / prerender / sitemap / SEO wiring",
      "6. Typecheck + CI gates",
    ]) {
      expect(src).toContain(section);
    }
    // it spawns the real gates, not a soft summary
    expect(src).toContain("tsc");
    expect(src).toContain("market-registry-completeness.test.ts");
  });

  it("the staging runbook documents the full Day 1-3 loop", () => {
    const doc = readFileSync(
      join(root, "docs/market-onboarding-runbook.md"),
      "utf8",
    );
    expect(doc).toContain("Day 1");
    expect(doc).toContain("Day 2");
    expect(doc).toContain("Day 3");
    expect(doc).toContain("validate-market.mjs");
    expect(doc).toContain("new-market.mjs");
    // prices stay in the database
    expect(doc.toLowerCase()).toContain("prices stay in the database");
  });
});
