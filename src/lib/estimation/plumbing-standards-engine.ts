/**
 * FRELUX International Plumbing Standards Engine
 *
 * Implements deterministic fixture unit and hydraulic sizing methods for:
 * 1. North American IPC (International Plumbing Code) / UPC (Uniform Plumbing Code)
 *    - Drainage Fixture Units (DFU) & Building Drain sizing (IPC Table 710.1(1) / UPC Table 703.2)
 *    - Water Supply Fixture Units (WSFU) & Hunter's curve flow estimation (IPC Appendix E / UPC Appendix A)
 * 2. European EN 12056-2 (Gravity drainage systems inside buildings - Sanitary pipework)
 *    - Discharge Units (DU in L/s) & simultaneity discharge rate Qww = K * sqrt(sum DU)
 *    - Minimum stack & drain sizing (EN 12056-2 Table 11)
 *
 * Honesty contract:
 * - Preliminary sizing checks for planning and material takeoff, NOT certified mechanical engineering design.
 * - Minimum slopes and code requirements are disclosed directly in results.
 */

// ── IPC / UPC Sizing Models ──

export interface UpcIpcFixtureCounts {
  water_closets?: number; // 3.0 DFU (gravity tank 1.6 gpf)
  lavatories?: number; // 1.0 DFU
  showers?: number; // 2.0 DFU (min 2" trap)
  bathtubs?: number; // 2.0 DFU
  kitchen_sinks?: number; // 2.0 DFU
  dishwashers?: number; // 2.0 DFU
  clothes_washers?: number; // 2.0 DFU (min 2" standpipe)
  floor_drains?: number; // 2.0 DFU
}

export interface UpcIpcDrainageResult {
  total_dfu: number;
  recommended_drain_size_inches: string;
  minimum_slope_inch_per_ft: string;
  minimum_slope_percent: number;
  max_capacity_dfu: number;
  standards_reference: string;
  fixture_breakdown: Array<{
    fixture: string;
    count: number;
    unit_dfu: number;
    total_dfu: number;
  }>;
  notes: string[];
}

export const IPC_UPC_DFU_VALUES: Record<
  keyof UpcIpcFixtureCounts,
  { label: string; dfu: number; wsfu: number }
> = {
  water_closets: { label: "Water Closet (Flush Tank)", dfu: 3.0, wsfu: 2.2 },
  lavatories: { label: "Lavatory / Bathroom Sink", dfu: 1.0, wsfu: 1.0 },
  showers: { label: "Shower Stall", dfu: 2.0, wsfu: 1.4 },
  bathtubs: { label: "Bathtub (with/without shower)", dfu: 2.0, wsfu: 1.4 },
  kitchen_sinks: { label: "Kitchen Sink", dfu: 2.0, wsfu: 1.4 },
  dishwashers: { label: "Dishwasher", dfu: 2.0, wsfu: 1.4 },
  clothes_washers: { label: "Clothes Washing Machine", dfu: 2.0, wsfu: 1.4 },
  floor_drains: { label: "Floor Drain / Emergency Drain", dfu: 2.0, wsfu: 0.0 },
};

/**
 * Sizes building drain per IPC Table 710.1(1) and UPC Table 703.2
 * At standard 1/4 inch per foot (2.08%) slope:
 * - 2" pipe: max 6 DFU horizontal
 * - 2-1/2" pipe: max 12 DFU horizontal
 * - 3" pipe: max 42 DFU horizontal
 * - 4" pipe: max 216 DFU horizontal
 * - 6" pipe: max 840 DFU horizontal
 */
export function calculateUpcIpcDrainage(
  fixtures: UpcIpcFixtureCounts,
  slopeInchPerFt: "1/8" | "1/4" = "1/4",
): UpcIpcDrainageResult {
  let totalDfu = 0;
  const breakdown: UpcIpcDrainageResult["fixture_breakdown"] = [];

  for (const [key, spec] of Object.entries(IPC_UPC_DFU_VALUES)) {
    const count = Math.max(
      0,
      Number(fixtures[key as keyof UpcIpcFixtureCounts]) || 0,
    );
    if (count > 0) {
      const lineDfu = count * spec.dfu;
      totalDfu += lineDfu;
      breakdown.push({
        fixture: spec.label,
        count,
        unit_dfu: spec.dfu,
        total_dfu: lineDfu,
      });
    }
  }

  let recommendedSize = '4"';
  let maxDfu = 216;

  if (slopeInchPerFt === "1/4") {
    if (totalDfu <= 6) {
      recommendedSize = '2"';
      maxDfu = 6;
    } else if (totalDfu <= 12) {
      recommendedSize = '2-1/2"';
      maxDfu = 12;
    } else if (totalDfu <= 42) {
      recommendedSize = '3"';
      maxDfu = 42;
    } else if (totalDfu <= 216) {
      recommendedSize = '4"';
      maxDfu = 216;
    } else {
      recommendedSize = '6"';
      maxDfu = 840;
    }
  } else {
    // 1/8 inch per foot (1.04% slope)
    if (totalDfu <= 20) {
      recommendedSize = '3"';
      maxDfu = 20;
    } else if (totalDfu <= 160) {
      recommendedSize = '4"';
      maxDfu = 160;
    } else {
      recommendedSize = '6"';
      maxDfu = 620;
    }
  }

  const slopePercent = slopeInchPerFt === "1/4" ? 2.08 : 1.04;

  return {
    total_dfu: totalDfu,
    recommended_drain_size_inches: recommendedSize,
    minimum_slope_inch_per_ft: `${slopeInchPerFt} in/ft`,
    minimum_slope_percent: slopePercent,
    max_capacity_dfu: maxDfu,
    standards_reference: "IPC 2024 Table 710.1(1) / UPC 2024 Table 703.2",
    fixture_breakdown: breakdown,
    notes: [
      `Sized for ${totalDfu} total drainage fixture units at ${slopeInchPerFt} in/ft slope.`,
      "Water closet branches must connect with a minimum 3-inch pipe diameter under IPC 704.1.",
      "Cleanouts must be provided at intervals not exceeding 100 ft and at each change of direction greater than 45°.",
    ],
  };
}

// ── European EN 12056-2 Sizing Models ──

export interface En12056FixtureCounts {
  wash_basins?: number; // 0.5 DU (L/s)
  bidets?: number; // 0.5 DU
  showers?: number; // 0.8 DU
  baths?: number; // 0.8 DU
  kitchen_sinks?: number; // 0.8 DU
  washing_machines?: number; // 0.8 DU
  dishwashers?: number; // 0.8 DU
  wcs_6l?: number; // 1.8 DU (6L/4L cistern)
  wcs_9l?: number; // 2.0 DU (9L cistern)
}

export type BuildingUsageClass =
  | "residential_intermittent" // K = 0.5 (dwellings, flats)
  | "commercial_regular" // K = 0.7 (offices, hotels, restaurants)
  | "public_frequent" // K = 1.0 (hospitals, schools)
  | "heavy_congested"; // K = 1.2 (public arenas, stadiums)

export const USAGE_K_FACTORS: Record<
  BuildingUsageClass,
  { k: number; label: string }
> = {
  residential_intermittent: {
    k: 0.5,
    label: "Residential dwellings / flats (intermittent use)",
  },
  commercial_regular: {
    k: 0.7,
    label: "Commercial offices, hotels, restaurants (regular use)",
  },
  public_frequent: {
    k: 1.0,
    label: "Hospitals, schools, department stores (frequent use)",
  },
  heavy_congested: {
    k: 1.2,
    label: "Public venues, entertainment centers (congested use)",
  },
};

export const EN_12056_DU_VALUES: Record<
  keyof En12056FixtureCounts,
  { label: string; du: number }
> = {
  wash_basins: { label: "Wash Basin / Bidet", du: 0.5 },
  bidets: { label: "Bidet", du: 0.5 },
  showers: { label: "Shower", du: 0.8 },
  baths: { label: "Bath", du: 0.8 },
  kitchen_sinks: { label: "Kitchen Sink", du: 0.8 },
  washing_machines: { label: "Domestic Washing Machine", du: 0.8 },
  dishwashers: { label: "Domestic Dishwasher", du: 0.8 },
  wcs_6l: { label: "WC with 4.0 / 6.0 L cistern", du: 1.8 },
  wcs_9l: { label: "WC with 9.0 L cistern", du: 2.0 },
};

export interface En12056DrainageResult {
  sum_du: number;
  frequency_factor_k: number;
  waste_water_flow_qww_lps: number;
  continuous_flow_qc_lps: number;
  total_design_flow_qtot_lps: number;
  recommended_stack_dn: string; // e.g. "DN 100" (110 mm OD)
  recommended_collector_dn: string;
  hydraulic_capacity_lps: number;
  standards_reference: string;
  notes: string[];
}

/**
 * Calculates EN 12056-2 sanitary drainage flow rate:
 * Qww = K * sqrt(sum DU)
 * Sizing according to Table 11 for ventilated stacks (System I):
 * - DN 70 (75 mm): max 1.5 L/s (no WC)
 * - DN 90 (90 mm): max 2.7 L/s (max 1 WC)
 * - DN 100 (110 mm): max 4.0 L/s (standard stack)
 * - DN 125 (125 mm): max 7.3 L/s
 * - DN 150 (160 mm): max 12.4 L/s
 */
export function calculateEn12056Drainage(
  fixtures: En12056FixtureCounts,
  usageClass: BuildingUsageClass = "residential_intermittent",
  continuousFlowLps: number = 0,
): En12056DrainageResult {
  let sumDu = 0;
  for (const [key, spec] of Object.entries(EN_12056_DU_VALUES)) {
    const count = Math.max(
      0,
      Number(fixtures[key as keyof En12056FixtureCounts]) || 0,
    );
    if (count > 0) {
      sumDu += count * spec.du;
    }
  }

  const k = USAGE_K_FACTORS[usageClass]?.k ?? 0.5;
  const qww = k * Math.sqrt(sumDu);
  const qtot = qww + Math.max(0, continuousFlowLps);

  // Stack sizing per EN 12056-2 Table 11 (System I, Primary ventilated stack):
  let stackDn = "DN 100 (110 mm OD)";
  let capacityLps = 4.0;

  if (
    qtot <= 1.5 &&
    (fixtures.wcs_6l ?? 0) === 0 &&
    (fixtures.wcs_9l ?? 0) === 0
  ) {
    stackDn = "DN 70 (75 mm OD)";
    capacityLps = 1.5;
  } else if (
    qtot <= 2.7 &&
    (fixtures.wcs_6l ?? 0) + (fixtures.wcs_9l ?? 0) <= 1
  ) {
    stackDn = "DN 90 (90 mm OD)";
    capacityLps = 2.7;
  } else if (qtot <= 4.0) {
    stackDn = "DN 100 (110 mm OD)";
    capacityLps = 4.0;
  } else if (qtot <= 7.3) {
    stackDn = "DN 125 (125 mm OD)";
    capacityLps = 7.3;
  } else {
    stackDn = "DN 150 (160 mm OD)";
    capacityLps = 12.4;
  }

  return {
    sum_du: Math.round(sumDu * 100) / 100,
    frequency_factor_k: k,
    waste_water_flow_qww_lps: Math.round(qww * 100) / 100,
    continuous_flow_qc_lps: Math.round(continuousFlowLps * 100) / 100,
    total_design_flow_qtot_lps: Math.round(qtot * 100) / 100,
    recommended_stack_dn: stackDn,
    recommended_collector_dn: stackDn,
    hydraulic_capacity_lps: capacityLps,
    standards_reference:
      "BS EN 12056-2:2000 (System I - Primary ventilated stack)",
    notes: [
      `Design flow Qww = ${k} × √(${sumDu.toFixed(1)}) = ${qww.toFixed(2)} L/s.`,
      `Stack ${stackDn} provides ${capacityLps} L/s hydraulic capacity.`,
      "All branches must maintain minimum self-cleansing velocity (>= 0.7 m/s) with adequate venting.",
    ],
  };
}

export interface UpcIpcWaterSupplyResult {
  total_wsfu: number;
  peak_flow_gpm: number;
  peak_flow_lps: number;
  system_type: "flush_tank" | "flushometer";
  recommended_service_pipe_inches: string;
  standards_reference: string;
  fixture_breakdown: Array<{
    fixture: string;
    count: number;
    unit_wsfu: number;
    total_wsfu: number;
  }>;
  notes: string[];
}

/**
 * Calculates water supply peak demand from Water Supply Fixture Units (WSFU)
 * using Hunter's Curve per IPC 2024 Appendix E and UPC 2024 Appendix A.
 */
export function calculateUpcIpcWaterSupply(
  fixtures: UpcIpcFixtureCounts,
  systemType: "flush_tank" | "flushometer" = "flush_tank",
): UpcIpcWaterSupplyResult {
  let totalWsfu = 0;
  const breakdown: UpcIpcWaterSupplyResult["fixture_breakdown"] = [];

  for (const [key, spec] of Object.entries(IPC_UPC_DFU_VALUES)) {
    const count = Math.max(
      0,
      Number(fixtures[key as keyof UpcIpcFixtureCounts]) || 0,
    );
    if (count > 0 && spec.wsfu > 0) {
      const lineWsfu = count * spec.wsfu;
      totalWsfu += lineWsfu;
      breakdown.push({
        fixture: spec.label,
        count,
        unit_wsfu: spec.wsfu,
        total_wsfu: lineWsfu,
      });
    }
  }

  // Hunter curve piecewise approximation (GPM from WSFU):
  let gpm = 0;
  if (totalWsfu > 0) {
    if (systemType === "flush_tank") {
      if (totalWsfu <= 10) {
        gpm = 3.0 + totalWsfu * 0.5;
      } else if (totalWsfu <= 30) {
        gpm = 8.0 + (totalWsfu - 10) * 0.6;
      } else if (totalWsfu <= 100) {
        gpm = 20.0 + (totalWsfu - 30) * 0.34;
      } else if (totalWsfu <= 250) {
        gpm = 44.0 + (totalWsfu - 100) * 0.21;
      } else {
        gpm = 75.0 + (totalWsfu - 250) * 0.20;
      }
    } else {
      // Flushometer valve system:
      if (totalWsfu <= 10) {
        gpm = 15.0 + totalWsfu * 1.2;
      } else if (totalWsfu <= 30) {
        gpm = 27.0 + (totalWsfu - 10) * 0.65;
      } else if (totalWsfu <= 100) {
        gpm = 40.0 + (totalWsfu - 30) * 0.36;
      } else if (totalWsfu <= 250) {
        gpm = 65.0 + (totalWsfu - 100) * 0.20;
      } else {
        gpm = 95.0 + (totalWsfu - 250) * 0.18;
      }
    }
  }

  const roundedGpm = Math.round(gpm * 10) / 10;
  // 1 US GPM = 0.0630902 L/s
  const flowLps = Math.round(roundedGpm * 0.06309 * 100) / 100;

  // Recommended service supply pipe size at ~8 ft/s (2.4 m/s) cold water limit:
  let recommendedPipe = '3/4"';
  if (roundedGpm <= 10) {
    recommendedPipe = '3/4"';
  } else if (roundedGpm <= 20) {
    recommendedPipe = '1"';
  } else if (roundedGpm <= 35) {
    recommendedPipe = '1-1/4"';
  } else if (roundedGpm <= 60) {
    recommendedPipe = '1-1/2"';
  } else if (roundedGpm <= 120) {
    recommendedPipe = '2"';
  } else {
    recommendedPipe = '2-1/2"';
  }

  return {
    total_wsfu: Math.round(totalWsfu * 10) / 10,
    peak_flow_gpm: roundedGpm,
    peak_flow_lps: flowLps,
    system_type: systemType,
    recommended_service_pipe_inches: recommendedPipe,
    standards_reference: "IPC 2024 Appendix E / UPC 2024 Appendix A",
    fixture_breakdown: breakdown,
    notes: [
      `Estimated peak demand flow is ${roundedGpm} GPM (${flowLps} L/s) for ${Math.round(totalWsfu * 10) / 10} WSFU.`,
      `Recommended service main: ${recommendedPipe} pipe at <= 8 ft/s (2.4 m/s) velocity.`,
      "Pressure loss through water meters, backflow preventers, and static elevation head must be subtracted from street supply pressure.",
    ],
  };
}
