/**
 * All-markets end-to-end regression net (Phase 8: connect every
 * market to calculators/estimates/exports).
 *
 * For EACH country profile the default template must run the full
 * pipeline: spec → areas → quantities → roles → prices → labour →
 * costs, and the result must render into the report/BOQ/Excel
 * export shapes with the market's own currency. No market may be
 * a stub: a profile that cannot produce a costed estimate fails
 * here loudly.
 *
 * Honesty rule pinned at the end: with NO prices configured the
 * estimator must refuse (ok=false with unpriced errors) instead
 * of guessing — per-market absence stays explicit.
 */

import { describe, expect, it } from "vitest";
import { WALLFIN_COUNTRY_PROFILES } from "../countries";
import { estimateWallFinishingProject } from "../index";
import {
  buildWallFinSummaryRows,
  buildWallFinLayerRows,
  buildWallFinReportHtml,
} from "../report-export";
import type {
  WallSpec,
  WallFinProjectSpec,
  WallFinCountryProfile,
} from "@/types/wallfinishing";
import type { WallFinResolutionContext } from "../index";

function testWall(profile: WallFinCountryProfile): WallSpec {
  const systemId = profile.wallSystemIds[0];
  const assemblyId = profile.assemblyIds[0];
  return {
    id: "w1",
    label: "Test wall",
    lengthM: 4,
    heightM: 3,
    surface: "interior",
    wallSystemId: systemId,
    assemblyId,
    openings: [
      {
        id: "d1",
        type: "door",
        widthM: 0.9,
        heightM: 2.1,
        quantity: 1,
        revealDepthM: 0,
        deduct: true,
      },
    ],
    excludedAreaM2: 0,
  };
}

function specFor(profile: WallFinCountryProfile): WallFinProjectSpec {
  return {
    name: `${profile.code} e2e project`,
    countryCode: profile.code,
    region: "Test City",
    buildingType: "residential",
    rooms: [
      {
        id: "r1",
        name: "Living room",
        lengthM: 4,
        widthM: 4,
        heightM: 3,
        isWetArea: false,
        walls: [testWall(profile)],
      },
    ],
    extraCosts: [],
    contingencyPercent: 10,
  };
}

/** Context that prices EVERY role nominally (price=100, labour=10/m²). */
function nominalContext(currency: string): WallFinResolutionContext {
  return {
    currency,
    resolvePrice: (role) => ({
      materialName: `${role}-material`,
      unitPrice: 100,
      packUnits: null,
      purchaseLabel: null,
      currency,
      resolvedMarket: "NG",
      priceSource: "test",
      scanSource: null,
      priceDate: "2026-10-13",
      isManualPrice: false,
      unpriced: false,
    }),
    resolveLabour: (task) => ({
      taskKey: task,
      isEstimate: false,
      method: "per-m2",
      rate: 10,
      currency,
      outputPerWorkerDay: null,
      sourceReference: "test",
      effectiveDate: "2026-10-13",
    }),
  };
}

/** Context with NO prices and NO labour configured at all. */
function emptyContext(currency: string): WallFinResolutionContext {
  return {
    currency,
    resolvePrice: () => ({
      materialName: null,
      unitPrice: null,
      packUnits: null,
      purchaseLabel: null,
      currency,
      resolvedMarket: "NG",
      priceSource: null,
      scanSource: null,
      priceDate: null,
      isManualPrice: false,
      unpriced: true,
    }),
    resolveLabour: () => null,
  };
}

describe("Phase 8: every market runs the full estimate pipeline", () => {
  it("covers all twenty markets in the profile registry", () => {
    expect(WALLFIN_COUNTRY_PROFILES).toHaveLength(20);
    const codes = WALLFIN_COUNTRY_PROFILES.map((p) => p.code).sort();
    expect(codes).toEqual(
      [
        "AE",
        "AU",
        "BR",
        "CA",
        "DE",
        "FR",
        "GB",
        "GH",
        "IN",
        "JP",
        "KE",
        "NG",
        "SA",
        "US",
        "ZA",
        "CN",
        "ID",
        "MX",
        "KR",
        "IT",
      ].sort(),
    );
  });

  for (const profile of WALLFIN_COUNTRY_PROFILES) {
    it(`${profile.code}: default template estimates with prices, labour and exports`, async () => {
      const spec = specFor(profile);
      const result = await estimateWallFinishingProject(
        spec,
        nominalContext(profile.currency),
      );

      // 1. The estimate must succeed — no market is a stub.
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);

      // 2. Costs are in the market's own currency.
      expect(result.currency).toBe(profile.currency);
      expect(result.cost.total).toBeGreaterThan(0);
      expect(result.cost.materials).toBeGreaterThan(0);
      expect(result.cost.labour).toBeGreaterThan(0);

      // 3. Every layer resolved a price (no silent gaps).
      const layers = result.rooms[0].walls[0].layers;
      expect(layers.length).toBeGreaterThan(0);
      for (const layer of layers) {
        expect(layer.materialCost).not.toBeNull();
      }

      // 4. Export surfaces work for this market: summary rows,
      //    layer rows and the full HTML report.
      const summary = buildWallFinSummaryRows(spec, result);
      expect(summary.length).toBeGreaterThan(0);
      const layerRows = buildWallFinLayerRows(result);
      expect(layerRows.length).toBeGreaterThan(0);
      const html = buildWallFinReportHtml(spec, result);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain(profile.currency);
    });

    it(`${profile.code}: refuses honestly when nothing is priced (never guesses)`, async () => {
      const spec = specFor(profile);
      const result = await estimateWallFinishingProject(
        spec,
        emptyContext(profile.currency),
      );

      // With no market data configured the estimator must REFUSE
      // with explicit unpriced errors, never substitute a guess.
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => /price|priced|labour/i.test(e))).toBe(
        true,
      );
    });
  }
});
