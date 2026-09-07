// =========================================================
// PROJECT AGENT — GLOBAL & REGIONAL VALIDATION TESTS (Stage 11)
//
// Spec: test the agent against multiple regional profiles —
// minimum Nigeria, United Kingdom, United States, and one
// additional supported region — verifying:
//   currency, units, terminology, construction conventions,
//   regional assumptions, market-data availability.
//
// HARD RULE under test: never silently substitute Nigerian data
// for another region; an unsupported or unavailable regional
// data point must produce an EXPLICIT unavailable state.
// =========================================================

import { describe, it, expect } from "vitest";
import {
  resolveMarket,
  formatMoney,
  formatSignedMoney,
  marketNote,
} from "./region";
import {
  createDefaultRegistry,
  createNigeriaProfile,
  createUKProfile,
  createUSProfile,
  createGhanaProfile,
  getProfile,
  type MarketProfileRegistry,
} from "@/lib/measurement/market-profile";

// ---------------------------------------------------------
// The four minimum regions + one additional supported region.
// ---------------------------------------------------------

const REQUIRED_REGIONS = ["NG", "GB", "US", "GH"] as const;

describe("market profile registry — the minimum regions (§Stage 11)", () => {
  it("registers NG, GB, US and GH (all inactive markets except Nigeria)", () => {
    const registry = createDefaultRegistry();
    for (const code of REQUIRED_REGIONS) {
      const p = registry.profiles.get(code);
      expect(p, `market ${code} must be registered`).toBeDefined();
    }
    // Nigeria is the active default; the others are registered for
    // regional validation but inactive until launch.
    expect(registry.profiles.get("NG")!.isActive).toBe(true);
    expect(registry.profiles.get("GB")!.isActive).toBe(false);
    expect(registry.profiles.get("US")!.isActive).toBe(false);
  });

  it("each region declares its own currency, units, and conventions", () => {
    const ng = createNigeriaProfile();
    const gb = createUKProfile();
    const us = createUSProfile();
    const gh = createGhanaProfile();

    // Currency — never shared by accident.
    expect(ng.currency).toBe("NGN");
    expect(ng.currencySymbol).toBe("₦");
    expect(gb.currency).toBe("GBP");
    expect(gb.currencySymbol).toBe("£");
    expect(us.currency).toBe("USD");
    expect(us.currencySymbol).toBe("$");
    expect(gh.currency).toBe("GHS");
    expect(gh.currencySymbol).toBe("₵");

    // Units / construction conventions.
    expect(us.unitSystem).toBe("imperial");
    expect(us.defaultLengthUnit).toBe("feet");
    expect(us.defaultPackageSizes.paint.unit).toBe("gallons");
    expect(gb.unitSystem).toBe("metric");
    expect(gb.defaultLengthUnit).toBe("meters");
    expect(ng.unitSystem).toBe("metric");

    // Terminology / locale.
    expect(ng.locale).toBe("en-NG");
    expect(gb.locale).toBe("en-GB");
    expect(us.locale).toBe("en-US");

    // Regional assumptions differ per market (package sizes).
    expect(ng.defaultPackageSizes.cement.size).toBe(50);
    expect(gh.defaultPackageSizes.cement.size).toBe(42.5);
    expect(us.defaultPackageSizes.cement.unit).toBe("lb");
  });

  it("adding a market is configuration, not code changes (architecture rule)", () => {
    // A future market joins by registering a profile — the
    // resolution layer picks it up with zero engine changes.
    const registry: MarketProfileRegistry = createDefaultRegistry();
    const custom = {
      ...createKenyaLikeProfile(),
      marketCode: "ZA",
      currency: "ZAR",
      currencySymbol: "R",
    };
    const updated = {
      profiles: new Map(registry.profiles).set("ZA", custom),
      defaultMarketCode: registry.defaultMarketCode,
    };
    expect(updated.profiles.get("ZA")!.currencySymbol).toBe("R");
    expect(getProfile(updated, "ZA")!.currency).toBe("ZAR");
  });
});

function createKenyaLikeProfile() {
  return createGhanaProfile();
}

// ---------------------------------------------------------
// Resolution — explicit unavailable states, never substitution.
// ---------------------------------------------------------

describe("resolveMarket — the honest resolution contract (§Stage 11)", () => {
  it("resolves each minimum region to its own profile", () => {
    expect(resolveMarket("NG")).toMatchObject({
      status: "supported",
      isDefault: false,
    });
    const symbols = (["NG", "GB", "US", "GH"] as const).map((code) => {
      const r = resolveMarket(code);
      return r.status === "supported" ? r.profile.currencySymbol : `UNSUPPORTED:${code}`;
    });
    expect(symbols).toEqual(["₦", "£", "$", "₵"]);
  });

  it("case/whitespace normalised; no market recorded -> platform default (stated, not silent)", () => {
    const r = resolveMarket(" gb ");
    expect(r.status).toBe("supported");
    if (r.status === "supported") {
      expect(r.isDefault).toBe(false);
      expect(r.profile.marketCode).toBe("GB");
    }
    const d = resolveMarket(null);
    expect(d.status).toBe("supported");
    if (d.status === "supported") {
      expect(d.isDefault).toBe(true);
      expect(d.profile.marketCode).toBe("NG");
    }
  });

  it("an UNSUPPORTED market produces an explicit unavailable state — never a silent fallback to Nigeria", () => {
    const r = resolveMarket("AU"); // not registered
    expect(r.status).toBe("unsupported");
    if (r.status === "unsupported") {
      expect(r.marketCode).toBe("AU");
      // The resolution carries NO profile — no NG data anywhere.
      expect("profile" in r).toBe(false);
    }
  });
});

// ---------------------------------------------------------
// Currency formatting per region.
// ---------------------------------------------------------

describe("formatMoney — the project's market, never another region's symbol (§Stage 11)", () => {
  it("formats the same amount in each region's currency", () => {
    expect(formatMoney(12_500, "NG")).toMatch(/^₦[\d,]+$/);
    expect(formatMoney(12_500, "GB")).toMatch(/^£[\d,]+$/);
    expect(formatMoney(12_500, "US")).toMatch(/^\$[\d,]+$/);
    expect(formatMoney(12_500, "GH")).toMatch(/^₵[\d,]+$/);
  });

  it("no market recorded -> the platform default (Nigeria), stated openly", () => {
    expect(formatMoney(1_500, null)).toBe("₦1,500");
    expect(formatMoney(1_500, undefined)).toBe("₦1,500");
  });

  it("an unsupported market NEVER gets a substituted currency symbol", () => {
    const out = formatMoney(1_500, "AU");
    expect(out).not.toContain("₦");
    expect(out).not.toContain("$");
    expect(out).not.toContain("£");
    expect(out).toContain("1,500");
    expect(out).toContain("unavailable");
    expect(out).toContain("AU");
  });

  it("signed money keeps its sign; decimals are honest", () => {
    expect(formatSignedMoney(1_000, "NG")).toBe("+₦1,000");
    expect(formatSignedMoney(-800, "US")).toBe("-$800");
    expect(formatMoney(49.5, "NG")).toBe("₦49.5");
  });
});

// ---------------------------------------------------------
// The market note — terminology that states defaults honestly.
// ---------------------------------------------------------

describe("marketNote — honest terminology (§Stage 11)", () => {
  it("empty for a confirmed market; explicit for default and unsupported", () => {
    expect(marketNote("US")).toBe("");
    const d = marketNote(null);
    expect(d).toContain("No market recorded");
    expect(d).toContain("Nigeria");
    const u = marketNote("AU");
    expect(u).toContain("AU");
    expect(u).toContain("not supported");
    expect(u).toContain("no other region's data has been substituted");
  });
});

// ---------------------------------------------------------
// End-to-end: agent output for each region honours its market.
// ---------------------------------------------------------

import { evaluateMonitoringAlerts } from "./monitoring";
import type { PredictiveProjectSnapshot } from "@/lib/predictive-intelligence/types";

function snapshotForRegion(
  marketCode: string | null,
): PredictiveProjectSnapshot {
  return {
    projectId: "proj-1",
    now: "2026-09-07T12:00:00.000Z",
    project: {
      id: "proj-1",
      name: "Test Project",
      status: "active",
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-07T10:00:00.000Z",
    },
    stages: [],
    shoppingItems: [
      {
        id: "s1",
        name: "Cement",
        category: "materials",
        quantity: 10,
        unit: "bags",
        estimated_price: 6250,
        actual_price: 7000,
        total_price: 62500,
        is_purchased: false,
        supplier: null,
        sort_order: 0,
        updated_at: "2026-09-07T09:00:00.000Z",
      },
    ],
    calculations: [
      {
        id: "c1",
        title: "Initial estimate",
        calculatorType: "painting",
        estimatedTotal: 50_000,
        createdAt: "2026-09-02T10:00:00.000Z",
      },
    ],
    priceHistory: [],
    marketPrices: [],
    visualObservations: [],
    region: { marketCode, countryCode: marketCode, city: null },
  } as unknown as PredictiveProjectSnapshot;
}

describe("agent output honours each region — end to end (§Stage 11)", () => {
  const NOW = "2026-09-07T12:00:00.000Z";

  it("Nigeria project → ₦ in alerts", () => {
    const alerts = evaluateMonitoringAlerts(snapshotForRegion("NG"), null, NOW);
    const overrun = alerts.find((a) => a.alertKey === "budget:overrun");
    expect(overrun).toBeDefined();
    expect(overrun!.condition).toContain("₦62,500");
  });

  it("UK project → £ in alerts — never ₦", () => {
    const alerts = evaluateMonitoringAlerts(snapshotForRegion("GB"), null, NOW);
    const overrun = alerts.find((a) => a.alertKey === "budget:overrun");
    expect(overrun).toBeDefined();
    expect(overrun!.condition).toContain("£62,500");
    expect(overrun!.condition).not.toContain("₦");
  });

  it("US project → $ in alerts — never ₦", () => {
    const alerts = evaluateMonitoringAlerts(snapshotForRegion("US"), null, NOW);
    const overrun = alerts.find((a) => a.alertKey === "budget:overrun");
    expect(overrun).toBeDefined();
    expect(overrun!.condition).toContain("$62,500");
    expect(overrun!.condition).not.toContain("₦");
  });

  it("Ghana project → ₵ in alerts — never ₦", () => {
    const alerts = evaluateMonitoringAlerts(snapshotForRegion("GH"), null, NOW);
    const overrun = alerts.find((a) => a.alertKey === "budget:overrun");
    expect(overrun).toBeDefined();
    expect(overrun!.condition).toContain("₵62,500");
    expect(overrun!.condition).not.toContain("₦");
  });

  it("unsupported region project → explicit unavailable state in agent output, never Nigerian data", () => {
    const alerts = evaluateMonitoringAlerts(snapshotForRegion("AU"), null, NOW);
    const overrun = alerts.find((a) => a.alertKey === "budget:overrun");
    expect(overrun).toBeDefined();
    const text = JSON.stringify(overrun);
    // The amount appears as a bare, honestly-marked number —
    // no ₦/$/£/₵ symbol was substituted.
    expect(text).not.toContain("₦");
    expect(text).toContain("unavailable");
    expect(text).toContain("AU");
  });

  it("no market recorded → the platform default (₦) is used", () => {
    const alerts = evaluateMonitoringAlerts(snapshotForRegion(null), null, NOW);
    const overrun = alerts.find((a) => a.alertKey === "budget:overrun");
    expect(overrun).toBeDefined();
    expect(overrun!.condition).toContain("₦62,500");
  });
});
