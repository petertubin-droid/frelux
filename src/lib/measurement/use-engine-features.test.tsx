import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            then: vi.fn((cb) => cb({ data: null })),
          })),
        })),
      })),
    })),
  },
}));

import { useEngineFeatures } from "@/lib/measurement/use-engine-features";

describe("useEngineFeatures", () => {
  it("returns loading state initially", () => {
    const { result } = renderHook(() =>
      useEngineFeatures({ calculatorType: "painting" }),
    );
    expect(typeof result.current.loading).toBe("boolean");
  });

  it("returns fallback waste resolution when no DB data", async () => {
    const { result } = renderHook(() =>
      useEngineFeatures({
        calculatorType: "painting",
        fallbackWastePercent: 15,
      }),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.wasteResolution.wastePercent).toBe(15);
    expect(result.current.wasteResolution.source).toBe("fallback");
    expect(result.current.wasteResolution.isOverride).toBe(false);
  });

  it("userWaste overrides resolution", async () => {
    const { result } = renderHook(() =>
      useEngineFeatures({
        calculatorType: "painting",
        fallbackWastePercent: 10,
      }),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    act(() => result.current.setUserWaste(25));
    expect(result.current.wasteResolution.wastePercent).toBe(25);
    expect(result.current.wasteResolution.source).toBe("user");
    expect(result.current.wasteResolution.isOverride).toBe(true);
  });

  it("buildExplanation includes waste in notes", async () => {
    const { result } = renderHook(() =>
      useEngineFeatures({
        calculatorType: "painting",
        fallbackWastePercent: 10,
      }),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const explanation = result.current.buildExplanation({
      subject: "Wall Area",
      resultSummary: "35 m²",
      steps: [{ description: "Perimeter × Height", value: "14 × 2.5" }],
    });
    expect(explanation.subject).toBe("Wall Area");
    expect(explanation.resultSummary).toBe("35 m²");
    expect(explanation.steps).toHaveLength(1);
    expect(
      explanation.notes.some((n) => n.includes("Waste allowance: 10%")),
    ).toBe(true);
  });

  describe("assessConfidence", () => {
    it("returns high when all factors pass", async () => {
      const { result } = renderHook(() =>
        useEngineFeatures({ calculatorType: "painting" }),
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      const conf = result.current.assessConfidence({
        ruleValid: true,
        inputComplete: true,
        materialSpecComplete: true,
        marketPriceAvailable: true,
        sourceReliability: "verified",
        productMatched: true,
      });
      expect(conf.level).toBe("high");
      expect(conf.factors).toHaveLength(6);
      expect(conf.recommendations).toHaveLength(0);
    });

    it("returns review_required when all fail", async () => {
      const { result } = renderHook(() =>
        useEngineFeatures({ calculatorType: "painting" }),
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      const conf = result.current.assessConfidence({
        ruleValid: false,
        inputComplete: false,
        materialSpecComplete: false,
        marketPriceAvailable: false,
        sourceReliability: "disputed",
        productMatched: false,
      });
      expect(conf.level).toBe("review_required");
    });

    it("returns medium for 3-4 passing factors", async () => {
      const { result } = renderHook(() =>
        useEngineFeatures({ calculatorType: "painting" }),
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      const conf = result.current.assessConfidence({
        ruleValid: true,
        inputComplete: true,
        materialSpecComplete: true,
        marketPriceAvailable: false,
        sourceReliability: "unverified",
        productMatched: false,
      });
      expect(conf.level).toBe("medium");
      expect(conf.recommendations.length).toBeGreaterThan(0);
    });

    it("generates recommendations for missing data", async () => {
      const { result } = renderHook(() =>
        useEngineFeatures({ calculatorType: "painting" }),
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      const conf = result.current.assessConfidence({
        ruleValid: true,
        inputComplete: true,
        materialSpecComplete: false,
        marketPriceAvailable: false,
        sourceReliability: "trusted",
        productMatched: false,
      });
      expect(
        conf.recommendations.some((r) => r.includes("market prices")),
      ).toBe(true);
      expect(
        conf.recommendations.some((r) => r.includes("material specification")),
      ).toBe(true);
      expect(
        conf.recommendations.some((r) => r.includes("Match products")),
      ).toBe(true);
    });
  });

  describe("applyAlreadyHave", () => {
    it("calculates purchase = required - alreadyHave", async () => {
      const { result } = renderHook(() =>
        useEngineFeatures({ calculatorType: "painting" }),
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      const r = result.current.applyAlreadyHave(10, 3);
      expect(r.required).toBe(10);
      expect(r.alreadyHave).toBe(3);
      expect(r.purchase).toBe(7);
      expect(r.hasEnough).toBe(false);
    });

    it("returns 0 purchase when alreadyHave >= required", async () => {
      const { result } = renderHook(() =>
        useEngineFeatures({ calculatorType: "painting" }),
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      const r = result.current.applyAlreadyHave(5, 8);
      expect(r.purchase).toBe(0);
      expect(r.hasEnough).toBe(true);
    });
  });

  describe("buildMaterialSummary", () => {
    it("wraps entries with totalEntries count", async () => {
      const { result } = renderHook(() =>
        useEngineFeatures({ calculatorType: "painting" }),
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      const entries = [
        {
          materialId: "m1",
          productName: "Paint",
          totalQuantity: 10,
          quantityUnit: "gallons",
          spaceIds: ["s1"],
        },
        {
          materialId: "m2",
          productName: "Primer",
          totalQuantity: 5,
          quantityUnit: "gallons",
          spaceIds: ["s1", "s2"],
        },
      ];
      const summary = result.current.buildMaterialSummary(entries);
      expect(summary.entries).toHaveLength(2);
      expect(summary.totalEntries).toBe(2);
    });
  });

  describe("buildEstimateReport", () => {
    it("builds report with total from unitPrices × quantities", async () => {
      const { result } = renderHook(() =>
        useEngineFeatures({ calculatorType: "painting" }),
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      const report = result.current.buildEstimateReport({
        projectName: "Test Project",
        materials: [
          {
            materialId: "m1",
            productName: "Paint",
            totalQuantity: 10,
            quantityUnit: "gallons",
            spaceIds: [],
          },
        ],
        unitPrices: [{ material: "Paint", unitPrice: 5000, currency: "NGN" }],
      });
      expect(report.projectName).toBe("Test Project");
      expect(report.total).toBe(50000);
      expect(report.currency).toBe("NGN");
      expect(report.measurementSystem).toBe("metric");
      expect(report.date).toBeTruthy();
    });

    it("defaults to NGN currency", async () => {
      const { result } = renderHook(() =>
        useEngineFeatures({ calculatorType: "painting" }),
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      const report = result.current.buildEstimateReport({
        projectName: "Empty",
      });
      expect(report.currency).toBe("NGN");
      expect(report.total).toBe(0);
    });
  });

  it("getSettingValue returns default when key not found", async () => {
    const { result } = renderHook(() =>
      useEngineFeatures({ calculatorType: "painting" }),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current.getSettingValue("nonexistent", "default")).toBe(
      "default",
    );
  });
});
