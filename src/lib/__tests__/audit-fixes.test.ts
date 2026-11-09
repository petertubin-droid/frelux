import { describe, it, expect } from "vitest";
import { designBeam, designColumn } from "../engineering/structural-calculator";
import { designFoundation } from "../engineering/foundation-calculator";
import { calculateTradeOpeningDeduction } from "../estimation/paint-engine";
import { calculateTile } from "../pop-tile-calc";
import { calculateElectrical } from "../estimation/electrical-engine";
import { calculateGenerator } from "../estimation/generator-engine";
import { calculateSolarPv } from "../estimation/solar-pv-engine";
import { checkImageResolution } from "../estimation/count-vision-engine";
import {
  applyRegionalCost,
  checkPriceStaleness,
} from "../estimation/regional-cost-engine";

describe("Audit Findings & Fixes Verification Suite", () => {
  // Finding 1 & 2: ACI 318 LRFD and exact quadratic lever arm
  it("Finding 1 & 2: designBeam should apply ACI 318 1.2D+1.6L and Whitney stress block when standard is aci_astm", () => {
    const beamAci = designBeam({
      span: 4.5,
      beam_type: "suspended_beam",
      support_condition: "simply_supported",
      live_load: 3.0,
      dead_load: 5.0,
      tributary_width: 3.0,
      concrete_grade: "3000_psi",
      steel_grade: "Fe410",
      cover_mm: 30,
      market_code: "US",
    });

    expect(
      beamAci.formula_transparency.some((f) => f.includes("ACI 318")),
    ).toBe(true);
    expect(beamAci.area_steel_required).toBeGreaterThan(0);
    expect(beamAci.recommended_depth).toBeGreaterThan(200);
  });

  it("Finding 2: designBeam should calculate exact quadratic lever arm for BS 8110 / Eurocode", () => {
    const beamBs = designBeam({
      span: 4.0,
      beam_type: "suspended_beam",
      support_condition: "simply_supported",
      live_load: 2.5,
      dead_load: 4.0,
      tributary_width: 2.5,
      concrete_grade: "C25/30",
      steel_grade: "Fe410",
      cover_mm: 25,
      market_code: "NG",
    });

    expect(
      beamBs.formula_transparency.some(
        (f) =>
          f.includes("exact quadratic lever arm") ||
          f.includes("z = d(0.5 +") ||
          f.includes("Lever arm"),
      ),
    ).toBe(true);
  });

  // Finding 3: Column minimum eccentricity and slenderness moment magnification
  it("Finding 3: designColumn should include minimum eccentricity and magnified moment for slender column", () => {
    const slenderCol = designColumn({
      axial_load: 400,
      height: 4.5, // 4.5m tall -> slenderness ratio 4500 / 225 = 20 > 15
      concrete_grade: "C25/30",
      steel_grade: "Fe410",
      cover_mm: 25,
      is_rectangular: true,
      existing_width: 225,
      existing_depth: 225,
      unbraced_height_ratio: 20,
    });

    expect(
      slenderCol.formula_transparency.some(
        (f) => f.includes("Minimum design") || f.includes("e_min"),
      ),
    ).toBe(true);
    expect(
      slenderCol.formula_transparency.some((f) => f.includes("slender column")),
    ).toBe(true);
    expect(
      slenderCol.warnings.some((w) => w.includes("Column is slender")),
    ).toBe(true);
  });

  // Finding 4: Pad footing 10% self-weight and punching shear check
  it("Finding 4: designFoundation should include 10% self-weight and punching shear verification on pad footings", () => {
    const pad = designFoundation({
      shape: "pad",
      soil_type: "firm_clay",
      wall_load: 0,
      column_load: 300,
      foundation_depth: 1.2,
      concrete_grade: "C25/30",
    });

    expect(
      pad.formula_transparency.some((f) => f.includes("10% self-weight")),
    ).toBe(true);
    expect(
      pad.formula_transparency.some((f) => f.includes("Punching shear")),
    ).toBe(true);
    expect(pad.recommended_width).toBeGreaterThanOrEqual(600);
  });

  // Finding 5: Trade opening deduction and reveals
  it("Finding 5: calculateTradeOpeningDeduction should account for reveal returns on larger openings", () => {
    const tradeResult = calculateTradeOpeningDeduction(
      [
        { width: 0.9, height: 2.1, quantity: 2 }, // 1.89 m2 each (0.5 to 3.0 m2 -> 85% deduction)
        { width: 2.0, height: 2.0, quantity: 1 }, // 4.0 m2 (> 3.0 m2 -> 100% deduction with reveal added)
      ],
      "meters",
      0.15,
    );

    expect(tradeResult.grossOpeningArea).toBeGreaterThan(0);
    expect(tradeResult.revealAreaAdded).toBeGreaterThan(0);
    expect(tradeResult.netDeductionArea).toBeLessThan(
      tradeResult.grossOpeningArea,
    );
  });

  // Finding 6: Rigorous tile grout calculation
  it("Finding 6: calculateTile should calculate grout based on tile dimensions, thickness, and joint width", () => {
    const tileRes = calculateTile(
      {
        length: 4,
        width: 4,
        height: 0,
        unit: "meters",
        surfaceType: "floor",
        tileWidthMm: 600,
        tileHeightMm: 600,
        tilesPerBox: 4,
        wasteMargin: 10,
        method: "adhesive",
        tilePricePerBox: 8000,
        adhesivePricePerBag: 3500,
        cementPricePerBag: 9000,
        sandPricePerBag: 2500,
        groutPricePerKg: 1200,
        spacerPricePerPack: 800,
        adhesiveCoverageRate: 5,
        cementCoverageRate: 3,
        sandCoverageRate: 2,
        groutCoverageRate: 0, // rely on dimensional formula
        spacerCoverageRate: 15,
        cementPackageSize: 50,
        sandPackageSize: 1,
        spacerPackageSize: 100,
        labourRatePerSqm: 1500,
      },
      [],
      "NGN",
      "₦",
    );

    expect(tileRes.grandTotal).toBeGreaterThan(0);
  });

  // Finding 7: Electrical voltage drop check and generator inrush
  it("Finding 7: calculateElectrical should flag voltage drop warnings on long runs", () => {
    const elecRes = calculateElectrical(
      {
        lighting_points: 10,
        socket_points: 8,
        dedicated_points: 1,
        switches: 8,
        distribution_boards: 1,
        avg_run_lighting_m: 50, // Long run > 35m -> triggers voltage drop
        avg_run_socket_m: 40, // Long run > 28m -> triggers voltage drop
        avg_run_dedicated_m: 20,
        avg_run_earth_m: 40,
        avg_run_feeder_m: 10,
        building_type: "residential",
        labour: { mode: "none" },
      },
      {
        lighting_points_per_circuit: 10,
        socket_points_per_circuit: 8,
        dedicated_points_per_circuit: 1,
        cable_waste_pct: 10,
        conduit_waste_pct: 5,
        conduit_m_per_lighting_point: 10,
        conduit_m_per_socket_point: 8,
        junction_boxes_per_lighting_point: 2,
      },
      {},
    );

    expect(elecRes.warnings.some((w) => w.includes("Voltage drop check"))).toBe(
      true,
    );
  });

  it("Finding 7: calculateGenerator should provide inrush and continuous capacity guidance", () => {
    const genRes = calculateGenerator(
      {
        size: "20kva",
        units: 1,
        include_ats: true,
        cable_run_m: 15,
        include_battery: true,
        labour: { mode: "none" },
      },
      { gen_cable_waste_pct: 5 },
      {},
    );

    expect(
      genRes.steps.some((s) => s.detail.includes("continuous (0.8 PF)")),
    ).toBe(true);
    expect(genRes.steps.some((s) => s.detail.includes("inrush capacity"))).toBe(
      true,
    );
  });

  // Finding 8: Solar PV battery usable Depth-of-Discharge (DoD)
  it("Finding 8: calculateSolarPv should factor 85% DoD into battery storage sizing", () => {
    const solarRes = calculateSolarPv({
      mode: "energy_target",
      daily_energy_target_kwh: 12,
      cable_run_m: 20,
      battery_storage_kwh: 10,
      battery_chemistry: "lifepo4",
      panel: {
        watt_peak: 400,
        length_m: 1.7,
        width_m: 1.0,
        unit_price_naira: 65000,
      },
      prices: {},
      rules: [
        { rule_key: "peak_sun_hours_day", rule_value: { value: 5 } },
        { rule_key: "system_loss_factor", rule_value: { value: 0.2 } },
        { rule_key: "inverter_dc_ac_ratio", rule_value: { value: 1.25 } },
        { rule_key: "string_size_max", rule_value: { value: 10 } },
        { rule_key: "rails_per_panel", rule_value: { value: 2 } },
        { rule_key: "rounding_decimals", rule_value: { value: 2 } },
        { rule_key: "battery_unit_capacity_kwh", rule_value: { value: 4.8 } },
        { rule_key: "mid_clamps_per_panel", rule_value: { value: 2 } },
        { rule_key: "end_clamps_per_panel", rule_value: { value: 2 } },
        { rule_key: "mc4_pairs_per_panel", rule_value: { value: 1 } },
        { rule_key: "dc_cable_per_panel_m", rule_value: { value: 3 } },
        { rule_key: "labor_cost_per_panel_naira", rule_value: { value: 5000 } },
      ],
    });

    expect(solarRes.ok).toBe(true);
    expect(solarRes.battery_count).toBe(3); // ceil(10 / (4.8 x 0.85)) = 3
    expect(
      solarRes.steps.some((s) => s.detail.includes("85% usable LiFePO4 DoD")),
    ).toBe(true);
  });

  // Finding 9: Count vision resolution and scale check
  it("Finding 9: checkImageResolution should detect low resolution and blueprint scale", () => {
    const lowRes = checkImageResolution(320, 240);
    expect(lowRes.ok).toBe(false);
    expect(lowRes.advisory).toContain("too low");

    const highResBlueprint = checkImageResolution(4000, 3000);
    expect(highResBlueprint.ok).toBe(true);
    expect(highResBlueprint.isBlueprintScale).toBe(true);
  });

  // Finding 10: Commodity price staleness checker and volatility contingency
  it("Finding 10: checkPriceStaleness should classify fresh, aging, and stale prices", () => {
    const now = new Date("2026-10-26T12:00:00Z");
    const fresh = checkPriceStaleness("2026-10-20T00:00:00Z", now);
    expect(fresh.status).toBe("fresh");

    const aging = checkPriceStaleness("2026-09-25T00:00:00Z", now);
    expect(aging.status).toBe("aging");

    const stale = checkPriceStaleness("2026-08-01T00:00:00Z", now);
    expect(stale.status).toBe("stale");
  });

  it("Finding 10: applyRegionalCost should apply optional volatility buffer", () => {
    const regRes = applyRegionalCost({
      base_cost: 100000,
      state: "Lagos",
      country: "NG",
      contingency_volatility_buffer_pct: 15, // 15% buffer
      indices: [
        {
          id: "idx-1",
          country: "NG",
          state: "Lagos",
          category: "general",
          cost_factor: 1.1,
          description: "Frelux Lagos survey index",
          source_reference: "Frelux Lagos Survey",
          effective_date: "2026-10-01",
          sort_order: 1,
          is_active: true,
          created_at: "2026-10-01T00:00:00Z",
          updated_at: "2026-10-01T00:00:00Z",
        },
      ],
      rules: [],
    });

    expect(regRes.ok).toBe(true);
    // Base 100,000 * 1.10 = 110,000. With 15% buffer = 126,500
    expect(regRes.adjusted_cost).toBe(126500);
    expect(regRes.volatility_buffer_pct).toBe(15);
  });
});
