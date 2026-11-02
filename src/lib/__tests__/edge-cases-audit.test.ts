import { describe, expect, it } from "vitest";
import { calculateDrywallTakeoff } from "@/lib/estimation/drywall-standalone-engine";
import { calculateDrainageTakeoff } from "@/lib/estimation/drainage-standalone-engine";
import { calculateTemporaryWorksTakeoff } from "@/lib/estimation/temporary-works-standalone-engine";
import { calculateDemolitionTakeoff } from "@/lib/estimation/demolition-standalone-engine";
import { calculateMasonryTakeoff } from "@/lib/estimation/masonry-standalone-engine";
import { calculateSepticSizing } from "@/lib/estimation/septic-sizing-engine";
import { calculateIncrete } from "@/lib/estimation/increte-engine";
import { calculatePlasteringTakeoff } from "@/lib/estimation/plastering-standalone-engine";
import { calculatePavingTakeoff } from "@/lib/estimation/paving-standalone-engine";
import { calculateSteelBeam } from "@/lib/estimation/steel-beam-engine";
import { calculateRetainingWall } from "@/lib/estimation/retaining-wall-engine";
import { calculateMargin } from "@/lib/estimation/margin-engine";
import { calculateCashFlow } from "@/lib/estimation/cash-flow-engine";
import { calculateInsulationTakeoff } from "@/lib/estimation/insulation-standalone-engine";
import { calculateWaterproofing } from "@/lib/estimation/waterproofing-engine";
import { calculateSoffitGutter } from "@/lib/estimation/soffit-gutter-engine";
import { calculateConduitWiring } from "@/lib/estimation/conduit-wiring-engine";

function hasNanOrInf(obj: unknown, path = ""): string[] {
  const bad: string[] = [];
  if (obj === null || obj === undefined) return bad;
  if (typeof obj === "number") {
    if (isNaN(obj)) bad.push(`${path}: NaN`);
    if (!isFinite(obj)) bad.push(`${path}: Infinity`);
  } else if (typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      bad.push(...hasNanOrInf(record[key], path ? `${path}.${key}` : key));
    }
  }
  return bad;
}

describe("engine audit edge cases", () => {
  it("handles omitted drywall dimensions as zero", () => {
    const result = calculateDrywallTakeoff({ marketCode: "US" } as never);
    expect(result.grossWallAreaM2).toBe(0);
    expect(result.boardSheets).toBe(0);
  });

  it("calculates drywall quantities from directly supplied wall area", () => {
    const result = calculateDrywallTakeoff({ marketCode: "US", wallAreaM2: 20 } as never);
    expect(result.grossWallAreaM2).toBe(20);
    expect(result.netWallAreaM2).toBe(20);
    expect(result.boardSheets).toBeGreaterThan(0);
  });

  it("guards invalid and omitted drywall openings", () => {
    const result = calculateDrywallTakeoff({
      marketCode: "US", wallLengthM: 4, wallHeightM: 3,
      openings: [{ id: "bad", widthM: Number.NaN, heightM: 2, quantity: Number.NaN }],
    });
    expect(Number.isFinite(result.openingsAreaM2)).toBe(true);
  });

  it("returns an empty drainage takeoff when runs are omitted", () => {
    const result = calculateDrainageTakeoff({ marketCode: "US" } as never);
    expect(result.totalPipeLengthM).toBe(0);
    expect(result.runs).toEqual([]);
    expect(Number.isFinite(result.beddingVolumeM3)).toBe(true);
  });

  it("calculates drainage excavation from shortcut trench dimensions", () => {
    const result = calculateDrainageTakeoff({
      marketCode: "US", trenchLengthM: 12, trenchWidthM: 0.5, trenchDepthM: 0.8,
    });
    expect(result.totalPipeLengthM).toBe(0);
    expect(result.excavationVolumeM3).toBe(4.8);
  });

  it("guards invalid drainage diameter and run dimensions", () => {
    const result = calculateDrainageTakeoff({
      marketCode: "US", runs: [{ lengthM: Number.NaN, pipeDiameterMm: Number.NaN, fallMmPerM: Number.NaN }],
    });
    expect(result.totalPipeLengthM).toBe(0);
    expect(result.runs[0].diameterMm).toBe(0);
    expect(result.runs[0].fallTotalMm).toBe(0);
  });

  it("returns safe temporary-works totals when elements are omitted", () => {
    const result = calculateTemporaryWorksTakeoff({ marketCode: "US" } as never);
    expect(result.formContactAreaM2).toBe(0);
    expect(Number.isFinite(result.grossFormworkSheetAreaM2)).toBe(true);
  });

  it("coerces invalid temporary-works dimensions to zero", () => {
    const result = calculateTemporaryWorksTakeoff({
      marketCode: "US", elements: [{ type: "slab", lengthM: Number.NaN, widthM: 3, depthOrHeightM: 0 }],
    });
    expect(result.formContactAreaM2).toBe(0);
  });

  it("returns zero demolition volume when items are omitted", () => {
    const result = calculateDemolitionTakeoff({ marketCode: "US" } as never);
    expect(result.inPlaceVolumeM3).toBe(0);
    expect(result.looseDebrisVolumeM3).toBe(0);
  });

  it("coerces invalid demolition dimensions without NaN", () => {
    const result = calculateDemolitionTakeoff({
      marketCode: "US", items: [{ type: "wall", lengthM: Number.NaN, widthM: 2, thicknessM: 0.2 }],
    });
    expect(result.inPlaceVolumeM3).toBe(0);
  });

  it("coerces invalid masonry dimensions and opening widths", () => {
    const result = calculateMasonryTakeoff({
      marketCode: "US", wallLengthM: Number.NaN, wallHeightM: 3,
      openings: [{ id: "o", description: "opening", widthM: Number.NaN, heightM: 2, quantity: 1 }],
    });
    expect(result.grossWallAreaM2).toBe(0);
    expect(result.openingsAreaM2).toBe(0);
  });

  it("handles empty septic numeric inputs without NaN", () => {
    const result = calculateSepticSizing({
      marketCode: "US", occupants: Number.NaN, designFlowLitresPerPersonPerDay: Number.NaN,
      retentionDays: Number.NaN, acceptedSoilLoadingRateLitresPerM2PerDay: Number.NaN,
    });
    expect(result.dailyDesignFlowLitres).toBe(0);
    expect(result.tankTotalVolumeM3).toBe(0);
    expect(result.soakawayRequiredAbsorptionAreaM2).toBeNull();
  });

  it("keeps invalid soil loading rates from creating invalid soakaway output", () => {
    const result = calculateSepticSizing({
      marketCode: "US", occupants: 4, designFlowLitresPerPersonPerDay: 100,
      retentionDays: 1, acceptedSoilLoadingRateLitresPerM2PerDay: 0,
    });
    expect(result.soakawayRequiredAbsorptionAreaM2).toBeNull();
    expect(result.indicativeSoakawayDiameterM).toBeNull();
  });

  it("handles omitted Increte products safely", () => {
    const result = calculateIncrete({
      marketCode: "US", length: 10, width: 10, areaUnit: "m2", thickness: null,
      thicknessUnit: "mm", labourRatePerM2: null, currencyCode: "USD",
    } as never);
    expect(result.areaM2).toBe(100);
    expect(result.lines).toEqual([]);
    expect(result.materialTotal).toBeNull();
  });

  it("marks invalid Increte area input as incomplete", () => {
    const result = calculateIncrete({
      marketCode: "US", length: Number.NaN, width: 10, areaUnit: "m2", thickness: null,
      thicknessUnit: "mm", labourRatePerM2: null, products: [], currencyCode: "USD",
    });
    expect(result.areaM2).toBe(0);
    expect(result.complete).toBe(false);
  });
});

describe("comprehensive multi-engine edge-case assertions", () => {
  it("plastering engine handles normal, zero, and negative wall areas", () => {
    for (const v of [50, 0, -10]) {
      const res = calculatePlasteringTakeoff({
        grossWallAreaM2: v,
        openingsAreaM2: v > 0 ? 5 : 0,
        thicknessMm: 15,
        includeCeiling: false,
        ceilingAreaM2: 0,
        mixRatio: "1:4",
        coats: 1,
        wastePercent: 10,
        marketCode: "NG",
      });
      expect(hasNanOrInf(res)).toEqual([]);
    }
  });

  it("paving engine handles edge cases", () => {
    for (const v of [100, 0, -10]) {
      const res = calculatePavingTakeoff({
        areaM2: v,
        paverThicknessMm: 60,
        sandBedDepthMm: 50,
        jointSandKgPerM2: 3,
        wastePercent: 5,
        marketCode: "NG",
      });
      expect(hasNanOrInf(res)).toEqual([]);
    }
  });

  it("steel beam engine handles edge cases", () => {
    for (const v of [4.5, 0, -2]) {
      const res = calculateSteelBeam({
        span_m: v,
        dead_load_kn_m: 10,
        live_load_kn_m: 15,
        selected_section_key: "UB_203_133_25",
        steel_grade: "S275",
        max_deflection_ratio: 360,
        marketCode: "NG",
      });
      expect(hasNanOrInf(res)).toEqual([]);
    }
  });

  it("retaining wall engine handles edge cases", () => {
    for (const v of [2.5, 0, -1]) {
      const res = calculateRetainingWall({
        wall_height_m: v,
        wall_length_m: 10,
        wall_type: "cantilever_concrete",
        stem_thickness_top_m: 0.25,
        stem_thickness_base_m: 0.35,
        base_width_m: 1.5,
        base_thickness_m: 0.35,
        soil_internal_friction_angle_deg: 30,
        soil_unit_weight_kn_m3: 18,
        marketCode: "NG",
      });
      expect(hasNanOrInf(res)).toEqual([]);
    }
  });

  it("margin engine handles edge cases", () => {
    for (const v of [100000, 0, -1000]) {
      const res = calculateMargin({
        direct_cost: v,
        markup_percent: 20,
        tax_percent: 7.5,
        contingency_percent: 5,
      });
      expect(hasNanOrInf(res)).toEqual([]);
    }
  });

  it("cash flow engine handles edge cases", () => {
    for (const v of [250000, 0, -50000]) {
      const res = calculateCashFlow({
        total_amount: v,
        start_date: "2026-01-01",
        milestones: [
          { label: "Stage 1", percent: 50, offset_months: 0 },
          { label: "Stage 2", percent: 50, offset_months: 1 },
        ],
        rules: [],
      });
      expect(hasNanOrInf(res)).toEqual([]);
    }
  });

  it("insulation engine handles edge cases", () => {
    for (const v of [120, 0, -20]) {
      const res = calculateInsulationTakeoff({
        areaM2: v,
        thicknessMm: 100,
        wastePercent: 10,
        marketCode: "NG",
      });
      expect(hasNanOrInf(res)).toEqual([]);
    }
  });

  it("waterproofing engine handles edge cases", () => {
    for (const v of [80, 0, -15]) {
      const res = calculateWaterproofing(
        {
          application: "roof_terrace",
          system: "torch_on_membrane",
          area_sqm: v,
          upstand_linear_m: 20,
          upstand_height_m: 0.3,
          primer_coats: 1,
          substrate_condition: "sound",
          labour: { mode: "none" },
        },
        {
          membrane_overlap_waste_pct: 10,
          liquid_waste_pct: 5,
          primer_coverage_sqm_per_litre: 5,
          gas_cylinders_per_100sqm: 1,
          protection_board_waste_pct: 5,
          torch_rolls_per_pallet: 25,
          primer_pack_size_litres: 20,
        },
        {},
      );
      expect(hasNanOrInf(res)).toEqual([]);
    }
  });

  it("soffit gutter engine handles edge cases", () => {
    for (const v of [30, 0, -5]) {
      const res = calculateSoffitGutter(
        {
          gutter_length_m: v,
          soffit_length_m: v,
          soffit_width_m: 0.6,
          downpipe_count: 3,
          downpipe_height_m: 3,
        },
        {
          gutter_section_length_m: 3,
          gutter_bracket_spacing_m: 0.6,
          soffit_panel_length_m: 3,
          soffit_panel_width_m: 0.3,
          fascia_board_length_m: 3,
          waste_pct: 10,
        },
        {},
      );
      expect(hasNanOrInf(res)).toEqual([]);
    }
  });

  it("conduit wiring engine handles edge cases", () => {
    for (const v of [50, 0, -10]) {
      const res = calculateConduitWiring(
        {
          circuit_count: 4,
          avg_run_length_m: v,
          conduit_type: "pvc_20mm",
          cable_spec: "2.5mm_twin_earth",
        },
        {
          conduit_length_m: 3,
          saddle_spacing_m: 1,
          cable_slack_waste_pct: 10,
        },
        {},
      );
      expect(hasNanOrInf(res)).toEqual([]);
    }
  });
});
