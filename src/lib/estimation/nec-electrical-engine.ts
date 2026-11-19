/**
 * North American electrical preliminary estimator.
 * This is a planning helper with a small, explicitly bounded NEC 2023 reference
 * dataset. It is not a code compliance or cable-design tool.
 */

import { minimumCableSize, type CableSizingVerdict } from "./electrical-engine";

export type NorthAmericanSystem =
  "120V_single" | "240V_single" | "208V_three" | "240V_three" | "480V_three";

export interface AWGCableOption {
  awg: string;
  copper_area_mm2: number;
  ampacity_60c_a: number;
  ampacity_75c_a: number;
  ampacity_90c_a: number;
}

/**
 * NEC 2023 Table 310.16 copper conductor ampacity reference.
 * 60/75/90 C columns are listed; actual termination ratings and installation
 * corrections govern. Small conductor protection limits are not applied here.
 */
export const NEC_COPPER_AWG: readonly AWGCableOption[] = [
  {
    awg: "14 AWG",
    copper_area_mm2: 2.08,
    ampacity_60c_a: 15,
    ampacity_75c_a: 20,
    ampacity_90c_a: 25,
  },
  {
    awg: "12 AWG",
    copper_area_mm2: 3.31,
    ampacity_60c_a: 20,
    ampacity_75c_a: 25,
    ampacity_90c_a: 30,
  },
  {
    awg: "10 AWG",
    copper_area_mm2: 5.26,
    ampacity_60c_a: 30,
    ampacity_75c_a: 35,
    ampacity_90c_a: 40,
  },
  {
    awg: "8 AWG",
    copper_area_mm2: 8.37,
    ampacity_60c_a: 40,
    ampacity_75c_a: 50,
    ampacity_90c_a: 55,
  },
  {
    awg: "6 AWG",
    copper_area_mm2: 13.3,
    ampacity_60c_a: 55,
    ampacity_75c_a: 65,
    ampacity_90c_a: 75,
  },
  {
    awg: "4 AWG",
    copper_area_mm2: 21.2,
    ampacity_60c_a: 70,
    ampacity_75c_a: 85,
    ampacity_90c_a: 95,
  },
  {
    awg: "3 AWG",
    copper_area_mm2: 26.7,
    ampacity_60c_a: 85,
    ampacity_75c_a: 100,
    ampacity_90c_a: 115,
  },
  {
    awg: "2 AWG",
    copper_area_mm2: 33.6,
    ampacity_60c_a: 95,
    ampacity_75c_a: 115,
    ampacity_90c_a: 130,
  },
  {
    awg: "1 AWG",
    copper_area_mm2: 42.4,
    ampacity_60c_a: 110,
    ampacity_75c_a: 130,
    ampacity_90c_a: 145,
  },
  {
    awg: "1/0 AWG",
    copper_area_mm2: 53.5,
    ampacity_60c_a: 125,
    ampacity_75c_a: 150,
    ampacity_90c_a: 170,
  },
  {
    awg: "2/0 AWG",
    copper_area_mm2: 67.4,
    ampacity_60c_a: 145,
    ampacity_75c_a: 175,
    ampacity_90c_a: 195,
  },
  {
    awg: "3/0 AWG",
    copper_area_mm2: 85.0,
    ampacity_60c_a: 165,
    ampacity_75c_a: 200,
    ampacity_90c_a: 225,
  },
  {
    awg: "4/0 AWG",
    copper_area_mm2: 107.2,
    ampacity_60c_a: 195,
    ampacity_75c_a: 230,
    ampacity_90c_a: 260,
  },
];

const systemSpec: Record<
  NorthAmericanSystem,
  { voltage: number; phase: "single" | "three" }
> = {
  "120V_single": { voltage: 120, phase: "single" },
  "240V_single": { voltage: 240, phase: "single" },
  "208V_three": { voltage: 208, phase: "three" },
  "240V_three": { voltage: 240, phase: "three" },
  "480V_three": { voltage: 480, phase: "three" },
};

export interface NecPreliminaryCableRequest {
  load_watts: number;
  run_ft: number;
  system: NorthAmericanSystem;
  power_factor?: number;
  lighting_dominant?: boolean;
  design_current_a?: number;
  termination_temperature_c?: 60 | 75 | 90;
}

export interface NecPreliminaryCableResult {
  system: NorthAmericanSystem;
  nominal_voltage_v: number;
  run_ft: number;
  run_m: number;
  design_current_a: number;
  selected_awg: string | null;
  selected_ampacity_a: number | null;
  voltage_drop: CableSizingVerdict;
  candidate_table: Array<
    AWGCableOption & { voltage_drop_percent: number; passes: boolean }
  >;
  standards_reference: string;
  limitations: string[];
}

export function calculateNecPreliminaryCable(
  request: NecPreliminaryCableRequest,
): NecPreliminaryCableResult {
  const spec = systemSpec[request.system];
  const runM = request.run_ft * 0.3048;
  const designCurrent =
    request.design_current_a && request.design_current_a > 0
      ? request.design_current_a
      : request.load_watts /
        (spec.voltage *
          (spec.phase === "three" ? Math.sqrt(3) : 1) *
          Math.min(1, Math.max(0.1, request.power_factor ?? 1)));
  const tempColumn =
    request.termination_temperature_c === 60
      ? "ampacity_60c_a"
      : request.termination_temperature_c === 90
        ? "ampacity_90c_a"
        : "ampacity_75c_a";
  const candidates = NEC_COPPER_AWG.map((cable) => {
    // The metric helper may not offer the exact AWG area; compute the voltage
    // drop from copper area using the same operating-temperature resistivity.
    const current = designCurrent;
    const loopFactor = spec.phase === "three" ? Math.sqrt(3) : 2;
    const dropV =
      (loopFactor * runM * current * 0.0225) / cable.copper_area_mm2;
    const dropPercent = spec.voltage > 0 ? (dropV / spec.voltage) * 100 : 0;
    const ampacity = cable[tempColumn];
    const limit = request.lighting_dominant ? 3 : 5;
    return {
      ...cable,
      voltage_drop_percent: dropPercent,
      passes: ampacity >= designCurrent && dropPercent <= limit,
    };
  });
  const chosen = candidates.find((candidate) => candidate.passes) ?? null;
  const genericDrop = minimumCableSize({
    load_watts: request.load_watts,
    voltage: spec.voltage,
    run_m: runM,
    system: spec.phase,
    power_factor: request.power_factor,
    lighting_dominant: request.lighting_dominant,
    design_current_a: designCurrent,
  });
  return {
    system: request.system,
    nominal_voltage_v: spec.voltage,
    run_ft: request.run_ft,
    run_m: Math.round(runM * 1000) / 1000,
    design_current_a: Math.round(designCurrent * 100) / 100,
    selected_awg: chosen?.awg ?? null,
    selected_ampacity_a: chosen?.[tempColumn] ?? null,
    voltage_drop: genericDrop,
    candidate_table: candidates,
    standards_reference:
      "NEC 2023 Table 310.16 (copper ampacity), preliminary reference only",
    limitations: [
      "Not a code compliance or installation design; confirm the adopted NEC edition and local amendments.",
      "Ampacity corrections for ambient temperature, conductor bundling, raceway fill, cable type, terminations and continuous loads are not applied.",
      "Voltage drop uses copper resistivity at 70 C and simplified conductor geometry; verify with conductor-specific manufacturer data.",
      "No aluminum conductor options, overcurrent protection, grounding/bonding, motor rules, or small-conductor protection limits are evaluated.",
    ],
  };
}
