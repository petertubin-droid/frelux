/**
 * Borehole & Autonomous Water Supply System Engineering Engine
 *
 * Full-cycle groundwater abstraction, hydraulic lift, multi-barrier treatment,
 * overhead peak storage buffering, automated sensor control, and gravity
 * reticulation distribution.
 *
 * Models the complete real-world engineering sequence:
 *  1. Geological Strata & Borehole Drilling
 *  2. Casing, Slotted Screen, Gravel Pack & Sanitary Annular Grout
 *  3. Submersible Pumping Hydraulics, Drop Pipe & Spring-Loaded Check Valves
 *  4. Water Quality Testing & Multi-Barrier Treatment (Sediment + Media + UV)
 *  5. Elevated Storage Tower & Morning Rush Peak Buffering
 *  6. Dual-Level Automation (Float Control & Dry-Run Protection)
 *  7. Buried Delivery Trenching & Hydrostatic Gravity Reticulation to Fixtures
 *
 * Follows international and local engineering standards:
 *  - Nigeria: NIS 554 (Drinking Water Quality), FMWR Borehole Code of Practice
 *  - United States: EPA Safe Drinking Water Act (SDWA), NGWA-01-14 Water Well Standard
 *  - United Kingdom / Europe: BS EN 806, Private Water Supplies Regulations 2016
 *  - South Africa: SANS 10299 (Water Well Construction), SANS 241
 *  - Kenya / East Africa: KEBS KS 05-459, WRA Groundwater Guidelines
 *  - Global: World Health Organization (WHO) Guidelines for Drinking-water Quality
 */

import { ceilU } from "./shared/purchase-rounding";

export type AquiferType =
  | "confined_sand"
  | "unconfined_gravel"
  | "fractured_basement"
  | "sedimentary_sandstone";

export type CasingMaterial = "upvc" | "steel";

export type ConsumptionTier =
  | "rural_basic" // 80 L/capita/day
  | "suburban_standard" // 150 L/capita/day
  | "urban_high" // 250 L/capita/day
  | "custom";

export type PowerSupply =
  "single_phase_220v" | "three_phase_380v" | "single_phase_110v" | "solar_dc";

export interface WaterQualityInput {
  turbidityNtu?: number; // NTU, standard <= 5, target < 1
  ironMgL?: number; // mg/L, standard <= 0.3
  manganeseMgL?: number; // mg/L, standard <= 0.1
  hardnessMgL?: number; // mg/L as CaCO3, soft <60, hard >120
  tdsMgL?: number; // mg/L (ppm), standard <= 1000, target < 500
  ph?: number; // standard 6.5 - 8.5
  coliformBacteriaTested?: boolean;
  coliformDetected?: boolean; // E. coli / fecal coliforms present
}

export interface BoreholeSystemInputs {
  /** Total drilling depth, meters. Range: 10 - 300 m. */
  drillingDepthMeters: number;
  /** Static water level below ground surface, meters. */
  staticWaterLevelMeters: number;
  /** Well safe yield, m³/hour. Range: 0.5 - 20 m³/h. */
  expectedYieldM3PerHour: number;
  /** Borehole drilled diameter, mm. Default 200mm (8 inch). */
  boreholeDiameterMm?: number;
  /** Casing outer diameter, mm. Default 140mm (5.5 inch). */
  casingDiameterMm?: number;
  /** Casing material: uPVC or mild/stainless steel. */
  casingMaterial?: CasingMaterial;
  /** Target aquifer hydrogeology. */
  aquiferType?: AquiferType;

  /** Elevation from wellhead to inlet of storage tank, meters. */
  surfaceElevationMeters?: number;
  /** Horizontal pipe distance from wellhead to storage tank, meters. */
  horizontalRunMeters?: number;
  /** Buried distribution pipe distance from tank to house manifold, meters. */
  buriedDeliveryRunMeters?: number;

  /** Number of occupants served. */
  householdOccupants: number;
  /** Consumption pattern per capita. */
  consumptionTier?: ConsumptionTier;
  /** Custom total daily demand in liters (if consumptionTier === 'custom'). */
  customDailyDemandLiters?: number;
  /** Emergency reserve days (typically 1 - 3 days). */
  reserveDays?: number;

  /** Overhead storage tower height, meters. (e.g. 3m - 12m). */
  tankElevationMeters?: number;
  /** Storage tank construction material. */
  tankMaterial?: "polyethylene" | "stainless_steel" | "galvanized_steel";

  /** Water quality lab assay / field test results. */
  waterQuality?: WaterQualityInput;

  /** Available electrical power system. */
  powerSupply?: PowerSupply;
  /** Market code (e.g. 'NG', 'US', 'GB', 'ZA', 'KE'). */
  marketCode?: string;
  /** Unit system preference. */
  unitSystem?: "metric" | "imperial";
}

export interface GeologicalStratum {
  depthFromM: number;
  depthToM: number;
  stratumName: string;
  description: string;
  recommendedBit: string;
}

export interface CheckValveItem {
  locationMetersFromPump: number;
  nominalDiameterMm: number;
  description: string;
}

export interface TreatmentStage {
  id: string;
  stageNumber: number;
  name: string;
  purpose: string;
  equipmentSpecification: string;
  recommended: boolean;
  reason: string;
}

export interface BoreholeInstallationStep {
  id: string;
  title: string;
  detail: string;
  check: string;
  safetyNote?: string;
}

export interface BOQItem {
  category:
    | "Drilling & Well Construction"
    | "Submersible Pumping & Riser Hydraulics"
    | "Water Quality & Treatment Plant"
    | "Storage Tank & Tower Buffering"
    | "Electrical, Automation & Level Controls"
    | "Plumbing Reticulation & Fixture Delivery";
  item: string;
  specification: string;
  quantity: number;
  unit: string;
  notes: string;
}

export interface BoreholeSystemResult {
  inputs: Required<
    Omit<
      BoreholeSystemInputs,
      "waterQuality" | "customDailyDemandLiters" | "marketCode" | "unitSystem"
    >
  > & {
    waterQuality: WaterQualityInput;
    marketCode: string;
    unitSystem: "metric" | "imperial";
  };

  /** Strata and well completion metrics */
  well: {
    totalDepthMeters: number;
    plainCasingMeters: number;
    screenMeters: number;
    screenSlotSizeMm: number;
    gravelPackDepthMeters: number;
    gravelPackVolumeM3: number;
    gravelPackBags25kg: number;
    sanitaryGroutDepthMeters: number;
    sanitaryGroutVolumeM3: number;
    sanitaryGroutCementBags50kg: number;
    bentoniteSealKg: number;
    casingOuterDiameterMm: number;
    boreholeDrilledDiameterMm: number;
    strataProfile: GeologicalStratum[];
    wellCapSpec: string;
  };

  /** Hydraulic pumping and motor specifications */
  pumping: {
    staticWaterLevelMeters: number;
    drawdownMeters: number;
    dynamicWaterLevelMeters: number;
    pumpSettingDepthMeters: number;
    elevationHeadMeters: number;
    riserFrictionLossMeters: number;
    surfaceFrictionLossMeters: number;
    fittingsLossMeters: number;
    residualPressureHeadMeters: number;
    totalDynamicHeadMeters: number;
    totalDynamicHeadFeet: number;
    designFlowRateM3PerHour: number;
    designFlowRateGpm: number;
    hydraulicPowerKw: number;
    motorElectricalPowerKw: number;
    motorHorsepowerHp: number;
    recommendedMotorHp: number;
    checkValveCount: number;
    checkValves: CheckValveItem[];
    submersibleCableMm2: number;
    voltageDropPercent: number;
    safetyRopeBreakingLoadKn: number;
    riserPipeDiameterMm: number;
    /** Site checks that limited or changed the pump selection. */
    warnings: string[];
  };

  /** Multi-barrier water treatment specification */
  treatment: {
    stages: TreatmentStage[];
    isPotableWithoutTreatment: boolean;
    coliformAlert: boolean;
    ironAlert: boolean;
    manganeseAlert: boolean;
    hardnessAlert: boolean;
    turbidityAlert: boolean;
    phAlert: boolean;
    complianceSummary: string;
  };

  /** Peak consumption, morning rush buffering and tank sizing */
  storage: {
    dailyTotalDemandLiters: number;
    dailyTotalDemandUsGal: number;
    perCapitaLitersPerDay: number;
    peakFactor: number;
    peakRushDurationHours: number;
    peakRushDemandLitersPerHour: number;
    pumpHourlyOutputLiters: number;
    peakRushDeficitLitersPerHour: number;
    rushBufferNeededLiters: number;
    emergencyReserveLiters: number;
    totalRecommendedStorageLiters: number;
    commercialTankSizeLiters: number;
    commercialTankSizeUsGal: number;
    overflowPipeDiameterMm: number;
    drainWashoutDiameterMm: number;
  };

  /** Automation, sensors and motor protection */
  automation: {
    overheadDualFloatSensors: boolean;
    boreholeDryRunProbes: boolean;
    controlPanelType: string;
    surgeProtection: boolean;
    operationMode: "fully_automated_closed_loop";
  };

  /** Delivery piping and hydrostatic pressure at fixtures */
  distribution: {
    towerHeightMeters: number;
    groundHydrostaticPressureBar: number;
    groundHydrostaticPressurePsi: number;
    pressureAdequacy: "adequate" | "marginal" | "booster_recommended";
    buriedTrenchDepthMeters: number;
    buriedPipeDiameterMm: number;
    buriedTrenchLengthMeters: number;
    beddingSandM3: number;
  };

  /** Sequence of execution matching the physical process */
  installationSteps: BoreholeInstallationStep[];

  /** Complete Itemized Bill of Quantities */
  billOfQuantities: BOQItem[];

  /** Relevant jurisdictional engineering standards */
  standardsCited: string[];
}

// ─────────────────────────────────────────────
// Engineering Constants & Presets
// ─────────────────────────────────────────────

export const STANDARD_MOTOR_HP_STEPS = [
  0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 7.5, 10.0, 15.0, 20.0,
];

export const COMMERCIAL_TANK_SIZES_LITERS = [
  1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000,
];

/** Hazen-Williams friction loss calculation:
 *  h_f = 10.67 * L * Q^1.852 / (C^1.852 * D^4.87)
 *  L in m, Q in m³/s, D in m. C=140 for uPVC/HDPE smooth pipe.
 */
export function calculateHazenWilliamsFrictionHead(
  lengthMeters: number,
  flowRateM3PerHour: number,
  innerDiameterMm: number,
  cFactor: number = 140,
): number {
  if (lengthMeters <= 0 || flowRateM3PerHour <= 0 || innerDiameterMm <= 0) {
    return 0;
  }
  const Q_m3s = flowRateM3PerHour / 3600;
  const D_m = innerDiameterMm / 1000;
  const numerator = 10.67 * lengthMeters * Math.pow(Q_m3s, 1.852);
  const denominator = Math.pow(cFactor, 1.852) * Math.pow(D_m, 4.87);
  return numerator / denominator;
}

/**
 * Main Calculation Engine
 */
export function calculateBoreholeWaterSystem(
  rawInputs: BoreholeSystemInputs,
): BoreholeSystemResult {
  // Input validation with clear, explanatory messages
  if (
    !Number.isFinite(rawInputs.drillingDepthMeters) ||
    rawInputs.drillingDepthMeters < 10
  ) {
    throw new RangeError(
      `Drilling depth must be at least 10 meters (received: ${rawInputs.drillingDepthMeters}).`,
    );
  }
  if (
    !Number.isFinite(rawInputs.staticWaterLevelMeters) ||
    rawInputs.staticWaterLevelMeters < 0 ||
    rawInputs.staticWaterLevelMeters >= rawInputs.drillingDepthMeters
  ) {
    throw new RangeError(
      `Static water level must be between 0 and drilling depth (${rawInputs.drillingDepthMeters}m).`,
    );
  }
  if (
    !Number.isFinite(rawInputs.householdOccupants) ||
    rawInputs.householdOccupants < 1
  ) {
    throw new RangeError(
      `Household occupants must be at least 1 person (received: ${rawInputs.householdOccupants}).`,
    );
  }

  const depth = rawInputs.drillingDepthMeters;
  const staticLevel = rawInputs.staticWaterLevelMeters;
  const yieldM3h = Math.max(0.5, rawInputs.expectedYieldM3PerHour ?? 2.5);
  const holeDiaMm = rawInputs.boreholeDiameterMm ?? 200; // 8" standard drill
  const casingDiaMm = rawInputs.casingDiameterMm ?? 140; // 5.5" standard casing
  const casingMaterial: CasingMaterial = rawInputs.casingMaterial ?? "upvc";
  const aquifer: AquiferType = rawInputs.aquiferType ?? "fractured_basement";
  const surfaceElevation = Math.max(0, rawInputs.surfaceElevationMeters ?? 6.0);
  const horizRun = Math.max(0, rawInputs.horizontalRunMeters ?? 15.0);
  const buriedRun = Math.max(0, rawInputs.buriedDeliveryRunMeters ?? 25.0);
  const occupants = Math.round(rawInputs.householdOccupants);
  const tier: ConsumptionTier =
    rawInputs.consumptionTier ?? "suburban_standard";
  const reserveDays = Math.max(1, rawInputs.reserveDays ?? 1.5);
  const towerElevation = Math.max(2, rawInputs.tankElevationMeters ?? 6.0);
  const tankMat = rawInputs.tankMaterial ?? "polyethylene";
  const power: PowerSupply = rawInputs.powerSupply ?? "single_phase_220v";
  const marketCode = (rawInputs.marketCode ?? "NG").toUpperCase();
  const unitSystem =
    rawInputs.unitSystem ?? (marketCode === "US" ? "imperial" : "metric");

  const wq: WaterQualityInput = rawInputs.waterQuality ?? {
    turbidityNtu: 3.5,
    ironMgL: 0.25,
    manganeseMgL: 0.05,
    hardnessMgL: 110,
    tdsMgL: 280,
    ph: 7.1,
    coliformBacteriaTested: true,
    coliformDetected: false,
  };

  // ─────────────────────────────────────────────
  // 1. Geological Strata & Well Construction
  // ─────────────────────────────────────────────
  // Aquifer thickness model based on depth & geology
  let screenLength = 0;
  if (aquifer === "confined_sand" || aquifer === "sedimentary_sandstone") {
    screenLength = Math.max(6, Math.min(18, Math.round(depth * 0.2)));
  } else if (aquifer === "unconfined_gravel") {
    screenLength = Math.max(4, Math.min(12, Math.round(depth * 0.18)));
  } else {
    // Fractured basement complex (crystalline rock)
    screenLength = Math.max(6, Math.min(15, Math.round(depth * 0.15)));
  }
  const plainCasingLength = Math.max(4, depth - screenLength);

  // Strata profile generation
  const strataProfile: GeologicalStratum[] = [
    {
      depthFromM: 0,
      depthToM: Math.min(3, Math.round(depth * 0.05)),
      stratumName: "Topsoil & Organic Loam",
      description:
        "Loose surface soil vulnerable to surface runoff and microbial contamination.",
      recommendedBit: "Drag Bit / Auger",
    },
    {
      depthFromM: Math.min(3, Math.round(depth * 0.05)),
      depthToM: Math.min(18, Math.round(depth * 0.25)),
      stratumName: "Clayey Alluvium & Weathered Silt",
      description:
        "Low-permeability cohesive layer acting as an impermeable confining aquitard.",
      recommendedBit: "Roller Cone Tricone Bit (Mud Rotary)",
    },
    {
      depthFromM: Math.min(18, Math.round(depth * 0.25)),
      depthToM: plainCasingLength,
      stratumName:
        aquifer === "fractured_basement"
          ? "Transition Saprolite / Weathered Rock"
          : "Medium to Coarse Sand & Pebble Beds",
      description:
        "Semi-consolidated transitional zone requiring permanent casing support.",
      recommendedBit: "Tricone TCI (Tungsten Carbide Insert)",
    },
    {
      depthFromM: plainCasingLength,
      depthToM: depth,
      stratumName:
        aquifer === "fractured_basement"
          ? "Fractured Crystalline Bedrock (Aquifer Target)"
          : "Water-Bearing Coarse Aquifer Sand & Gravel",
      description:
        "Primary water-yielding zone. High transmissivity and clean water recharge.",
      recommendedBit: "DTH (Down-the-Hole) Air Hammer with Button Bit",
    },
  ];

  // Annular volumes
  const holeRadiusM = holeDiaMm / 2000;
  const casingRadiusM = casingDiaMm / 2000;
  const annularAreaM2 =
    Math.PI * (holeRadiusM * holeRadiusM - casingRadiusM * casingRadiusM);

  // Sanitary surface grout: minimum 6m (or 20ft as per NGWA and NIS standards)
  const sanitaryGroutDepthM = Math.min(
    plainCasingLength,
    Math.max(6, Math.round(depth * 0.1)),
  );
  const sanitaryGroutVolM3 = annularAreaM2 * sanitaryGroutDepthM;
  // Neat cement grout: ~33 standard 50kg bags per m³ of grout + 5% bentonite powder
  const cementBags50kg = ceilU(sanitaryGroutVolM3 * 33 * 1.15); // with 15% wastage allowance
  const bentoniteSealKg = Math.round(cementBags50kg * 50 * 0.05);

  // Gravel pack around screen: fills annular space from bottom of casing to 2m above screen
  const gravelPackHeightM = screenLength + 2;
  const gravelPackVolM3 = annularAreaM2 * gravelPackHeightM;
  // Graded silica gravel bulk density ~1600 kg/m³, 25kg bags
  const gravelPackBags25kg = ceilU(((gravelPackVolM3 * 1600) / 25) * 1.1);

  const screenSlotSizeMm =
    aquifer === "unconfined_gravel"
      ? 1.0
      : aquifer === "confined_sand"
        ? 0.5
        : 0.75;
  const wellCapSpec = `Cast aluminium / heavy gauge stainless steel sanitary sanitary well cap with 1.5" threaded drop pipe adapter, neoprene gasket seal, screened air breather vent, and rubber cable compression gland.`;

  // ─────────────────────────────────────────────
  // 2. Submersible Pump & Hydraulic Head
  // ─────────────────────────────────────────────
  // Estimated drawdown based on safe yield and aquifer specific capacity
  // Average specific capacity: 0.25 - 0.6 m³/(h·m) for basement, 1.0 - 2.5 for sand/gravel
  const specificCapacity =
    aquifer === "confined_sand"
      ? 1.8
      : aquifer === "unconfined_gravel"
        ? 2.2
        : 0.55;
  // Drawdown is clamped at zero: a well cannot have a negative drawdown, and the
  // earlier formula returned one when the screen sat deep in a shallow hole.
  const drawdownHeadroomM = Math.max(0, depth - staticLevel - screenLength - 2);
  const drawdownM = Math.max(
    0,
    Math.min(drawdownHeadroomM, yieldM3h / specificCapacity),
  );
  const dynamicWaterLevelM = staticLevel + drawdownM;

  // Pump setting depth: 5 m below the pumping water level, never past the cased
  // section of the hole.
  const desiredSettingM = Math.round(dynamicWaterLevelM + 5);
  const pumpSettingDepthM = Math.min(plainCasingLength - 2, desiredSettingM);

  // Riser pipe: DN32 (1.25" / inner 27mm) for yield <= 3m³/h; DN40 (1.5" / inner 35mm) for yield > 3m³/h
  const riserDiameterMm = yieldM3h > 3.5 ? 40 : 32;
  const riserInnerMm = yieldM3h > 3.5 ? 35 : 27;

  // Friction loss calculation using Hazen-Williams
  const riserFriction = calculateHazenWilliamsFrictionHead(
    pumpSettingDepthM,
    yieldM3h,
    riserInnerMm,
    140,
  );
  const surfaceFriction = calculateHazenWilliamsFrictionHead(
    horizRun,
    yieldM3h,
    riserInnerMm,
    140,
  );
  // Fittings loss allowance (check valves, bends, gate valve, meter): approx 10% of pipe friction + 1m
  const fittingsLoss = (riserFriction + surfaceFriction) * 0.12 + 0.8;

  // Static lift from pump setting depth up to overhead tank inlet
  const staticLift = pumpSettingDepthM + surfaceElevation;
  // Residual pressure at tank discharge nozzle (0.5 bar = ~5.1m water head)
  const residualPressure = 5.0;

  const totalDynamicHeadM =
    staticLift +
    riserFriction +
    surfaceFriction +
    fittingsLoss +
    residualPressure;
  const totalDynamicHeadFt = totalDynamicHeadM * 3.28084;

  // Power calculation
  // Hydraulic power (kW) = rho * g * Q * TDH / 1000
  const rho = 1000; // kg/m³
  const g = 9.80665;
  const Q_m3s = yieldM3h / 3600;
  const hydraulicKw = (rho * g * Q_m3s * totalDynamicHeadM) / 1000;

  // Pump hydraulic efficiency ~60-68%, motor efficiency ~80-85%
  const pumpEfficiency = 0.62;
  const motorEfficiency = 0.82;
  const motorElectricalKw = hydraulicKw / (pumpEfficiency * motorEfficiency);
  const motorHp = motorElectricalKw * 1.34102;

  // Site checks on the pump setting itself. These are reported rather than
  // silently corrected, because they change what the driller has to do.
  const pumpingWarnings: string[] = [];
  if (pumpSettingDepthM < desiredSettingM) {
    pumpingWarnings.push(
      `The cased section is too shallow to set the pump ${desiredSettingM} m down. It is set at ${pumpSettingDepthM} m instead, which is only ${(pumpSettingDepthM - dynamicWaterLevelM).toFixed(1)} m below the pumping water level. Deepen the casing or accept a lower pump setting.`,
    );
  }
  if (pumpSettingDepthM <= dynamicWaterLevelM + 2) {
    pumpingWarnings.push(
      `The pump setting leaves less than 2 m of submergence below the pumping water level (${dynamicWaterLevelM.toFixed(1)} m). Risk of the pump breaking suction at peak drawdown.`,
    );
  }
  if (pumpSettingDepthM <= staticLevel + screenLength) {
    pumpingWarnings.push(
      `The pump is set at ${pumpSettingDepthM} m, at or below the top of the screen. Move it up so it does not sit in the gravel pack.`,
    );
  }

  // Find standard commercial motor rating. When the required power sits above
  // the largest stocked motor the result must say so: the old loop silently
  // returned the top step and under specified the pump.
  const largestStockedHp =
    STANDARD_MOTOR_HP_STEPS[STANDARD_MOTOR_HP_STEPS.length - 1];
  let recommendedMotorHp = STANDARD_MOTOR_HP_STEPS[0];
  for (const step of STANDARD_MOTOR_HP_STEPS) {
    if (step >= motorHp) {
      recommendedMotorHp = step;
      break;
    }
    recommendedMotorHp = step;
  }
  if (motorHp > largestStockedHp) {
    pumpingWarnings.push(
      `Required motor power is ${motorHp.toFixed(1)} HP, above the largest standard rating of ${largestStockedHp} HP. Split the duty across two pumps or specify a larger commercial motor.`,
    );
  }

  // Check valve schedule, placed by riser length because that is where water
  // hammer acts:
  // - 1 immediately at the pump discharge collar
  // - an intermediate valve once the riser passes 55 m
  // - a second once it passes 110 m
  const checkValves: CheckValveItem[] = [
    {
      locationMetersFromPump: 0,
      nominalDiameterMm: riserDiameterMm,
      description:
        "Heavy-duty spring-loaded non-return valve directly mounted on pump discharge collar.",
    },
  ];
  if (pumpSettingDepthM > 55) {
    checkValves.push({
      locationMetersFromPump: 45,
      nominalDiameterMm: riserDiameterMm,
      description:
        "Intermediate spring-loaded check valve on column pipe to absorb hydraulic shock and eliminate water hammer.",
    });
  }
  if (pumpSettingDepthM > 110) {
    checkValves.push({
      locationMetersFromPump: 95,
      nominalDiameterMm: riserDiameterMm,
      description:
        "Second intermediate spring-loaded check valve for deep well column protection.",
    });
  }

  // Electrical drop cable sizing based on current & 3% voltage drop
  const voltage =
    power === "single_phase_110v"
      ? 110
      : power === "three_phase_380v"
        ? 380
        : 230;
  const cosPhi = 0.85;
  const currentAmps =
    power === "three_phase_380v"
      ? (motorElectricalKw * 1000) / (Math.sqrt(3) * voltage * cosPhi)
      : (motorElectricalKw * 1000) / (voltage * cosPhi);

  // Copper resistivity rho = 0.0175 ohm·mm²/m
  // Voltage drop V_drop = 2 * L * I * rho / A <= 0.03 * V
  const maxDropVolts = 0.03 * voltage;
  const cableLengthM = pumpSettingDepthM + horizRun + 10;
  const minCableAreaMm2 =
    power === "three_phase_380v"
      ? (Math.sqrt(3) * cableLengthM * currentAmps * 0.0175) / maxDropVolts
      : (2 * cableLengthM * currentAmps * 0.0175) / maxDropVolts;

  const standardCableSizes = [1.5, 2.5, 4.0, 6.0, 10.0, 16.0];
  const submersibleCableMm2 =
    standardCableSizes.find((s) => s >= minCableAreaMm2) ?? 4.0;
  const actualVoltageDrop =
    power === "three_phase_380v"
      ? (Math.sqrt(3) * cableLengthM * currentAmps * 0.0175) /
        submersibleCableMm2
      : (2 * cableLengthM * currentAmps * 0.0175) / submersibleCableMm2;
  const voltageDropPercent = Number(
    ((actualVoltageDrop / voltage) * 100).toFixed(2),
  );

  // Safety wire rope: 316 Marine Grade Stainless Steel
  // Dead weight: Pump (~18kg) + motor (~14kg) + water-filled column pipe (~2.5kg/m * depth)
  const deadWeightKg = 32 + pumpSettingDepthM * 2.5;
  const safetyRopeBreakingLoadKn = Number(
    ((deadWeightKg * 9.81 * 5) / 1000).toFixed(1),
  ); // 5x safety factor

  // ─────────────────────────────────────────────
  // 3. Water Quality & Multi-Barrier Treatment
  // ─────────────────────────────────────────────
  const stages: TreatmentStage[] = [];

  // Stage 1: Coarse sediment / spin-down sand filter (Always recommended for borehole)
  stages.push({
    id: "stage-1-sediment",
    stageNumber: 1,
    name: "Coarse Disc / Spin-Down Sediment Filter (50–100 μm)",
    purpose:
      "Stops sand grains, silt, and drilling fines before they foul valves or media vessels.",
    equipmentSpecification:
      '1" or 1.5" bronze/composite spin-down sediment filter with manual purge valve.',
    recommended: true,
    reason:
      "Standard protection for pump and downstream treatment valves against abrasive sand fines.",
  });

  // Stage 2: Media Filtration Vessel
  const needsIronRemoval =
    (wq.ironMgL ?? 0) > 0.3 || (wq.manganeseMgL ?? 0) > 0.1;
  const needsHardnessSoftening = (wq.hardnessMgL ?? 0) > 120;
  const _needsCarbonFilter =
    (wq.tdsMgL ?? 0) > 500 || (wq.turbidityNtu ?? 0) > 5;

  if (needsIronRemoval) {
    stages.push({
      id: "stage-2-iron",
      stageNumber: 2,
      name: "Catalytic Iron & Manganese Removal Pressure Vessel",
      purpose:
        "Oxidizes and filters dissolved ferrous iron and manganese to prevent staining and metallic taste.",
      equipmentSpecification:
        '10" x 54" FRP pressure vessel with Birm / Greensand Plus catalytic media and automatic backwash control valve.',
      recommended: true,
      reason: `Raw water iron (${wq.ironMgL ?? 0} mg/L) or manganese (${wq.manganeseMgL ?? 0} mg/L) exceeds WHO/NIS limit of 0.3/0.1 mg/L.`,
    });
  } else if (needsHardnessSoftening) {
    stages.push({
      id: "stage-2-softener",
      stageNumber: 2,
      name: "Ion-Exchange Water Softener Resin Vessel",
      purpose:
        "Exchanges calcium and magnesium hardness ions with sodium, preventing scale in geysers and pipes.",
      equipmentSpecification:
        '10" x 54" FRP vessel with food-grade strong acid cation resin, automatic regenerator valve, and 70L brine tank.',
      recommended: true,
      reason: `Water hardness (${wq.hardnessMgL ?? 0} mg/L CaCO₃) exceeds moderate limit of 120 mg/L, causing scaling.`,
    });
  } else {
    stages.push({
      id: "stage-2-multimedia",
      stageNumber: 2,
      name: "Multi-Media & Activated Carbon Filter Vessel",
      purpose:
        "Polishes water, removes organic traces, neutralizes odor, and removes colloidal particles.",
      equipmentSpecification:
        '10" x 54" FRP composite tank with dual-layer graded silica sand, anthracite, and acid-washed activated carbon.',
      recommended: true,
      reason:
        "General clarification, taste improvement, and organic filtration.",
    });
  }

  // Stage 3: Fine Polishing Cartridge Filter
  stages.push({
    id: "stage-3-polisher",
    stageNumber: 3,
    name: "Fine 5-Micron Melt-Blown Polypropylene Polishing Cartridge",
    purpose:
      "Captures microscopic sediment particles and protects UV disinfection chamber quartz sleeve from fouling.",
    equipmentSpecification:
      '20" Big Blue (BB) polypropylene filter housing with 5-micron melt-blown polypropylene cartridge.',
    recommended: true,
    reason:
      "Ensures high optical transmittance (UVT > 90%) for the ultraviolet disinfection chamber.",
  });

  // Stage 4: Ultraviolet (UV) Disinfection Sterilizer
  const coliformRisk =
    wq.coliformDetected === true || wq.coliformBacteriaTested === false;
  stages.push({
    id: "stage-4-uv",
    stageNumber: 4,
    name: "Ultraviolet (UV-C 254nm) Disinfection Sterilizer",
    purpose:
      "Destroys bacterial DNA, inactivates pathogens, coliforms, and viruses without chemical residual.",
    equipmentSpecification:
      "304/316 Stainless Steel UV reactor chamber with high-output 254nm UV lamp, electronic ballast, and audible ballast lamp-failure alarm. Rated dosage >= 35 mJ/cm² at design flow.",
    recommended: true,
    reason: coliformRisk
      ? "Coliform bacteria detected or unverified. UV sterilizer is mandatory for microbiological safety."
      : "Multi-barrier microbial safeguard ensuring potable water at all times.",
  });

  const isPotable =
    (wq.turbidityNtu ?? 0) <= 5 &&
    (wq.ironMgL ?? 0) <= 0.3 &&
    (wq.manganeseMgL ?? 0) <= 0.1 &&
    (wq.hardnessMgL ?? 0) <= 200 &&
    (wq.tdsMgL ?? 0) <= 1000 &&
    (wq.ph ?? 7.0) >= 6.5 &&
    (wq.ph ?? 7.0) <= 8.5 &&
    wq.coliformDetected !== true;

  // ─────────────────────────────────────────────
  // 4. Storage & Peak Buffering Engine
  // ─────────────────────────────────────────────
  let perCapitaLpd = 150;
  if (tier === "rural_basic") perCapitaLpd = 80;
  else if (tier === "urban_high") perCapitaLpd = 250;

  const dailyDemandLiters =
    tier === "custom" &&
    rawInputs.customDailyDemandLiters &&
    rawInputs.customDailyDemandLiters > 0
      ? rawInputs.customDailyDemandLiters
      : occupants * perCapitaLpd;

  // Peak factor for morning rush: typically 2.5x to 3.0x average hourly rate
  const peakFactor = 2.8;
  const peakRushHours = 2.0; // Morning rush 6:30am - 8:30am
  const avgHourlyLph = dailyDemandLiters / 24;
  const peakDemandLph = avgHourlyLph * peakFactor;

  // Pump hourly output (Liters/hour)
  const pumpHourlyOutputL = yieldM3h * 1000;

  // If everyone opens their taps at once, peak demand can exceed pump yield
  // Peak rush deficit: difference between peak demand and pump delivery during rush window
  const rushDeficitLph = Math.max(0, peakDemandLph - pumpHourlyOutputL);
  const rushBufferNeededL = rushDeficitLph * peakRushHours;

  // Emergency storage reserve (for power outages, maintenance, etc.)
  const emergencyReserveL = dailyDemandLiters * reserveDays;
  const totalRecommendedStorageL = rushBufferNeededL + emergencyReserveL;

  // Find standard commercial tank size
  const commercialTankL =
    COMMERCIAL_TANK_SIZES_LITERS.find(
      (size) => size >= totalRecommendedStorageL,
    ) ?? ceilU(totalRecommendedStorageL / 1000) * 1000;

  // Overflow pipe must be larger than inlet pipe to avoid pressure burst
  const overflowDiaMm = riserDiameterMm <= 32 ? 50 : 63;
  const drainDiaMm = riserDiameterMm <= 32 ? 32 : 40;

  // ─────────────────────────────────────────────
  // 5. Reticulation & Hydrostatic Gravity Head
  // ─────────────────────────────────────────────
  // Hydrostatic pressure at ground level tap: P = rho * g * H
  // 1 meter of water column = 0.0980665 bar = 1.42233 psi
  const hydrostaticPressureBar = Number(
    ((rho * g * towerElevation) / 100000).toFixed(2),
  );
  const hydrostaticPressurePsi = Number(
    (hydrostaticPressureBar * 14.5038).toFixed(1),
  );

  let pressureAdequacy: "adequate" | "marginal" | "booster_recommended" =
    "adequate";
  if (hydrostaticPressureBar < 0.5) {
    pressureAdequacy = "booster_recommended";
  } else if (hydrostaticPressureBar < 0.8) {
    pressureAdequacy = "marginal";
  }

  // Distribution pipe sizing: DN25 (1") or DN32 (1.25")
  const buriedPipeDiaMm = occupants > 8 ? 32 : 25;
  const trenchDepthM = marketCode === "US" || marketCode === "GB" ? 1.0 : 0.6; // frost line vs tropical
  const trenchWidthM = 0.4;
  const beddingSandVolM3 = Number((buriedRun * trenchWidthM * 0.15).toFixed(2));

  // ─────────────────────────────────────────────
  // 6. Installation Steps (Matching Video Flow)
  // ─────────────────────────────────────────────
  const installationSteps: BoreholeInstallationStep[] = [
    {
      id: "drilling-aquifer",
      title: "Drill Through Geological Strata to Aquifer",
      detail: `Mobilize drilling rig (mud rotary or DTH air hammer). Drill ${holeDiaMm} mm hole through topsoil, clay, and weathered rock to depth of ${depth} m until reaching sustainable groundwater recharge zone (${aquifer.replace("_", " ")}).`,
      check: `Measure static water level at ${staticLevel} m and test aquifer recovery rate before withdrawing drill string.`,
      safetyNote:
        "Maintain borehole wall stability with bentonite drilling mud to prevent loose ground collapse.",
    },
    {
      id: "casing-screen-grout",
      title: "Install Casing, Slotted Screen & Sanitary Surface Grout",
      detail: `Lower ${casingDiaMm} mm ${casingMaterial.toUpperCase()} casing down the hole. Set ${screenLength} m of precision slotted screen (${screenSlotSizeMm} mm slots) across the water column. Pour ${gravelPackBags25kg} bags (${gravelPackVolM3.toFixed(2)} m³) of graded silica gravel envelope around the screen. Seal the top ${sanitaryGroutDepthM} m annular gap with ${cementBags50kg} bags of cement-bentonite sanitary grout to block surface runoff contamination. Install sanitary wellhead seal cap.`,
      check: `Verify that gravel pack level reaches 2m above screen and annular grout cures at surface before installing pump.`,
      safetyNote:
        "Never leave the annular gap unsealed: contaminated lawn runoff will pollute the drinking aquifer.",
    },
    {
      id: "submersible-pump-valve",
      title: "Lower Submersible Pump with Spring-Loaded Check Valves",
      detail: `Suspend ${recommendedMotorHp} HP multi-stage submersible borehole pump at ${pumpSettingDepthM} m depth using ${riserDiameterMm} mm column pipe and ${safetyRopeBreakingLoadKn} kN stainless steel safety wire rope. Install spring-loaded non-return check valves at pump discharge collar${checkValves.length > 1 ? " and intermediate riser" : ""} to prevent water column drain-back and hydraulic water hammer when motor stops. Connect ${submersibleCableMm2} mm² submersible drop cable.`,
      check: `Perform electrical insulation resistance test (Megger >= 20 MΩ) and confirm check valve orientation before descending.`,
    },
    {
      id: "water-quality-treatment",
      title: "Test Water Quality & Commission Multi-Barrier Filtration",
      detail: `Conduct certified laboratory water assay (TDS, iron, manganese, hardness, coliform bacteria). Connect multi-barrier treatment train: coarse 50 μm spin-down sand separator, ${stages.find((s) => s.stageNumber === 2)?.name ?? "media filter vessel"}, 5-micron Big Blue polishing cartridge, and UV-C 254nm disinfection sterilizer chamber.`,
      check: `Verify zero water leaks under 4 bar operating pressure and confirm UV ballast indicator lamp is green.`,
      safetyNote:
        "Clear water does not mean safe water: pathogenic bacteria and dissolved heavy metals require certified testing.",
    },
    {
      id: "tower-storage-buffering",
      title: "Construct Overhead Water Tower & Storage Tank",
      detail: `Erect elevated structural water tower staging at ${towerElevation} m height. Mount ${commercialTankL} Liters (${Math.round(commercialTankL * 0.264172)} US Gal) UV-stabilized storage tank. The storage buffers the morning rush (${peakDemandLph.toFixed(0)} L/h peak vs ${pumpHourlyOutputL} L/h pump capacity) and provides ${reserveDays} days of emergency reserve. Fit ${overflowDiaMm} mm overflow pipe and ${drainDiaMm} mm washout valve.`,
      check: `Confirm staging structural footings are cured and platform joists fully support the tank base flat.`,
    },
    {
      id: "automation-level-sensors",
      title: "Wire Dual Float Sensors & Borehole Dry-Run Protection",
      detail: `Install dual level sensors in overhead tank: top float switch halts pump automatically to prevent overflow; lower float switch triggers pump start when water level drops. Install downhole electrode sensor probes above pump suction to shut down motor if borehole water table recedes, preventing dry-run motor burnout. Wire into central control panel with surge arrester.`,
      check: `Simulate high water level and dry well condition to verify both automated cut-off relays operate instantly.`,
    },
    {
      id: "buried-trench-reticulation",
      title: "Bury Distribution Pipes & Reticulate to House Fixtures",
      detail: `Excavate ${trenchDepthM} m deep delivery trench from tower to building. Lay ${buriedPipeDiaMm} mm PN10/PN16 pipe in 150 mm bedding sand and backfill. Connect to household plumbing manifold: ${hydrostaticPressureBar} bar (${hydrostaticPressurePsi} psi) hydrostatic gravity pressure delivers clean water straight to kitchen sink taps, bathrooms, and appliances. Open tap and commission system.`,
      check: `Pressure-test buried line at 6 bar for 30 minutes without pressure drop before final backfill.`,
    },
  ];

  // ─────────────────────────────────────────────
  // 7. Comprehensive Bill of Quantities (BOQ)
  // ─────────────────────────────────────────────
  const boq: BOQItem[] = [
    // Category 1: Drilling & Well Construction
    {
      category: "Drilling & Well Construction",
      item: "Borehole Drilling to Aquifer",
      specification: `${holeDiaMm} mm diameter drilling through overburden, clay, and rock formations to target aquifer`,
      quantity: depth,
      unit: "meters",
      notes:
        "Includes rig mobilization, drilling consumables, and geological strata logging",
    },
    {
      category: "Drilling & Well Construction",
      item: "Borehole Plain Casing Pipe",
      specification: `${casingDiaMm} mm OD ${casingMaterial.toUpperCase()} Class 9/12 threaded casing`,
      quantity: plainCasingLength,
      unit: "meters",
      notes: "Maintains borehole opening and prevents wall collapse",
    },
    {
      category: "Drilling & Well Construction",
      item: "Slotted Well Screen",
      specification: `${casingDiaMm} mm OD slotted ${casingMaterial.toUpperCase()} screen with ${screenSlotSizeMm} mm slots`,
      quantity: screenLength,
      unit: "meters",
      notes: "Permits groundwater inflow while excluding sand particles",
    },
    {
      category: "Drilling & Well Construction",
      item: "Graded Silica Gravel Filter Pack",
      specification:
        "2.0 mm - 4.0 mm washed and graded round silica gravel (25 kg bags)",
      quantity: gravelPackBags25kg,
      unit: "bags",
      notes: `Fills annular envelope around ${screenLength}m screen + 2m collar`,
    },
    {
      category: "Drilling & Well Construction",
      item: "Portland Cement for Sanitary Grout",
      specification:
        "Grade 42.5N Portland Cement for annular seal (50 kg bags)",
      quantity: cementBags50kg,
      unit: "bags",
      notes: `Seals top ${sanitaryGroutDepthM}m against surface water runoff contamination`,
    },
    {
      category: "Drilling & Well Construction",
      item: "Sodium Bentonite Powder",
      specification:
        "High-yield sodium bentonite powder additive for impermeable seal",
      quantity: bentoniteSealKg,
      unit: "kg",
      notes: "Blended with cement grout to prevent shrinkage cracks",
    },
    {
      category: "Drilling & Well Construction",
      item: "Sanitary Wellhead Seal Cap",
      specification: wellCapSpec,
      quantity: 1,
      unit: "set",
      notes: "Seals well collar against insects, dirt, and vermin",
    },

    // Category 2: Pumping & Hydraulics
    {
      category: "Submersible Pumping & Riser Hydraulics",
      item: "Multi-Stage Submersible Well Pump & Motor",
      specification: `${recommendedMotorHp} HP, ${power.replace(/_/g, " ").toUpperCase()}, rated ${yieldM3h} m³/h at ${Math.round(totalDynamicHeadM)} m TDH`,
      quantity: 1,
      unit: "unit",
      notes: "Stainless steel wet end and water-lubricated motor",
    },
    {
      category: "Submersible Pumping & Riser Hydraulics",
      item: "Drop Column Riser Pipe",
      specification: `${riserDiameterMm} mm OD uPVC/HDPE PN16 threaded column riser pipe`,
      quantity: pumpSettingDepthM,
      unit: "meters",
      notes: "High tensile drop pipe carrying pump discharge to wellhead",
    },
    {
      category: "Submersible Pumping & Riser Hydraulics",
      item: "Spring-Loaded Check Valve",
      specification: `${riserDiameterMm} mm brass/stainless steel non-return check valve (PN25 rated)`,
      quantity: checkValves.length,
      unit: "pieces",
      notes: "Prevents column backdrain and water hammer shock waves",
    },
    {
      category: "Submersible Pumping & Riser Hydraulics",
      item: "Submersible Electrical Drop Cable",
      specification: `3-Core + Earth flat submersible cable (${submersibleCableMm2} mm² copper)`,
      quantity: pumpSettingDepthM + horizRun + 10,
      unit: "meters",
      notes: `Waterproof rubber jacket, verified < 3% voltage drop (${voltageDropPercent}%)`,
    },
    {
      category: "Submersible Pumping & Riser Hydraulics",
      item: "Stainless Steel Safety Suspension Wire",
      specification: `Grade 316 Stainless steel wire rope (breaking load ${safetyRopeBreakingLoadKn} kN) with 4x cable clamps`,
      quantity: pumpSettingDepthM + 6,
      unit: "meters",
      notes: "Independent safety tether preventing pump loss down borehole",
    },

    // Category 3: Water Treatment Plant
    ...stages.map((st) => ({
      category: "Water Quality & Treatment Plant" as const,
      item: st.name,
      specification: st.equipmentSpecification,
      quantity: 1,
      unit: "system",
      notes: st.purpose,
    })),

    // Category 4: Storage & Tower Buffering
    {
      category: "Storage Tank & Tower Buffering",
      item: "Overhead Water Storage Tank",
      specification: `${commercialTankL} Liters (${Math.round(commercialTankL * 0.264172)} US Gal) ${tankMat.replace("_", " ").toUpperCase()} cylindrical tank with inspection lid`,
      quantity: 1,
      unit: "unit",
      notes: `Buffers ${rushBufferNeededL.toFixed(0)}L peak morning rush and supplies ${reserveDays} days reserve`,
    },
    {
      category: "Storage Tank & Tower Buffering",
      item: "Tank Overflow Assembly",
      specification: `${overflowDiaMm} mm PVC pipe with insect-proof stainless steel mesh screen`,
      quantity: towerElevation + 2,
      unit: "meters",
      notes:
        "Safely discharges excess water if level sensor is ever overridden",
    },
    {
      category: "Storage Tank & Tower Buffering",
      item: "Tank Washout & Drain Valve",
      specification: `${drainDiaMm} mm full-port brass gate/ball valve with drain spigot`,
      quantity: 1,
      unit: "piece",
      notes: "For annual tank desiltation and sediment purging",
    },

    // Category 5: Electrical & Automation
    {
      category: "Electrical, Automation & Level Controls",
      item: "Automatic Overhead Float Switch Kit",
      specification:
        "Heavy-duty dual microswitch liquid level float controller with counterweight and 15m cable",
      quantity: 1,
      unit: "kit",
      notes: "Automatically shuts off pump when full and restarts on low level",
    },
    {
      category: "Electrical, Automation & Level Controls",
      item: "Borehole Dry-Run Electrode Probe Kit",
      specification:
        "3-wire stainless steel borehole water-level electrode sensors with DIN-rail relay module",
      quantity: 1,
      unit: "kit",
      notes: "Protects pump motor from burning out when water table recedes",
    },
    {
      category: "Electrical, Automation & Level Controls",
      item: "Automated Pump Control Panel",
      specification: `Direct-on-Line (DOL) / Soft-starter control panel with thermal overload relay, phase-failure protector, and lightning surge arrestor`,
      quantity: 1,
      unit: "unit",
      notes: "Central automated control box housing contactor and relay logic",
    },

    // Category 6: Underground Reticulation
    {
      category: "Plumbing Reticulation & Fixture Delivery",
      item: "Buried Underground Distribution Pipe",
      specification: `${buriedPipeDiaMm} mm OD PN12/PN16 HDPE / Schedule 40 PVC pressure pipe`,
      quantity: buriedRun,
      unit: "meters",
      notes: `Delivers water from elevated tank base to house intake manifold at ${hydrostaticPressureBar} bar`,
    },
    {
      category: "Plumbing Reticulation & Fixture Delivery",
      item: "Trenching & Pipe Bedding Sand",
      specification: `Fine river sand for 150mm pipe bedding and surround in ${trenchDepthM}m deep trench`,
      quantity: beddingSandVolM3,
      unit: "m³",
      notes:
        "Cushions buried distribution pipe against sharp rocks and ground movement",
    },
    {
      category: "Plumbing Reticulation & Fixture Delivery",
      item: "Main Isolation Gate Valves & Fittings",
      specification: `${buriedPipeDiaMm} mm full-flow bronze gate valves, unions, and transition adaptors`,
      quantity: 2,
      unit: "sets",
      notes: "Isolates storage tower and house plumbing independently",
    },
  ];

  // ─────────────────────────────────────────────
  // 8. Relevant Regional Standards
  // ─────────────────────────────────────────────
  const standardsCited: string[] = [
    "WHO Guidelines for Drinking-water Quality (4th Edition)",
    "NIS 554: 2015 - Nigerian Standard for Drinking Water Quality (SON / NWRI)",
    "FMWR Code of Practice for Water Well Drilling (Federal Ministry of Water Resources)",
    "NGWA-01-14: Water Well Construction Standard (National Ground Water Association)",
    "EPA Safe Drinking Water Act (SDWA) Guidelines for Private Groundwater Systems",
    "BS EN 806: Specifications for Installations Inside Buildings Conveying Water for Human Consumption",
    "SANS 10299: Development, Maintenance and Management of Groundwater Resources",
  ];

  return {
    inputs: {
      drillingDepthMeters: depth,
      staticWaterLevelMeters: staticLevel,
      expectedYieldM3PerHour: yieldM3h,
      boreholeDiameterMm: holeDiaMm,
      casingDiameterMm: casingDiaMm,
      casingMaterial,
      aquiferType: aquifer,
      surfaceElevationMeters: surfaceElevation,
      horizontalRunMeters: horizRun,
      buriedDeliveryRunMeters: buriedRun,
      householdOccupants: occupants,
      consumptionTier: tier,
      reserveDays,
      tankElevationMeters: towerElevation,
      tankMaterial: tankMat,
      powerSupply: power,
      waterQuality: wq,
      marketCode,
      unitSystem,
    },
    well: {
      totalDepthMeters: depth,
      plainCasingMeters: plainCasingLength,
      screenMeters: screenLength,
      screenSlotSizeMm,
      gravelPackDepthMeters: gravelPackHeightM,
      gravelPackVolumeM3: Number(gravelPackVolM3.toFixed(3)),
      gravelPackBags25kg,
      sanitaryGroutDepthMeters: sanitaryGroutDepthM,
      sanitaryGroutVolumeM3: Number(sanitaryGroutVolM3.toFixed(3)),
      sanitaryGroutCementBags50kg: cementBags50kg,
      bentoniteSealKg,
      casingOuterDiameterMm: casingDiaMm,
      boreholeDrilledDiameterMm: holeDiaMm,
      strataProfile,
      wellCapSpec,
    },
    pumping: {
      staticWaterLevelMeters: staticLevel,
      drawdownMeters: Number(drawdownM.toFixed(2)),
      dynamicWaterLevelMeters: Number(dynamicWaterLevelM.toFixed(2)),
      pumpSettingDepthMeters: pumpSettingDepthM,
      elevationHeadMeters: surfaceElevation,
      riserFrictionLossMeters: Number(riserFriction.toFixed(2)),
      surfaceFrictionLossMeters: Number(surfaceFriction.toFixed(2)),
      fittingsLossMeters: Number(fittingsLoss.toFixed(2)),
      residualPressureHeadMeters: residualPressure,
      totalDynamicHeadMeters: Number(totalDynamicHeadM.toFixed(2)),
      totalDynamicHeadFeet: Number(totalDynamicHeadFt.toFixed(1)),
      designFlowRateM3PerHour: yieldM3h,
      designFlowRateGpm: Number((yieldM3h * 4.40287).toFixed(1)),
      hydraulicPowerKw: Number(hydraulicKw.toFixed(2)),
      motorElectricalPowerKw: Number(motorElectricalKw.toFixed(2)),
      motorHorsepowerHp: Number(motorHp.toFixed(2)),
      recommendedMotorHp,
      checkValveCount: checkValves.length,
      checkValves,
      submersibleCableMm2,
      voltageDropPercent,
      safetyRopeBreakingLoadKn,
      riserPipeDiameterMm: riserDiameterMm,
      warnings: pumpingWarnings,
    },
    treatment: {
      stages,
      isPotableWithoutTreatment: isPotable,
      coliformAlert: coliformRisk,
      ironAlert: needsIronRemoval,
      manganeseAlert: (wq.manganeseMgL ?? 0) > 0.1,
      hardnessAlert: needsHardnessSoftening,
      turbidityAlert: (wq.turbidityNtu ?? 0) > 5,
      phAlert: (wq.ph ?? 7.0) < 6.5 || (wq.ph ?? 7.0) > 8.5,
      complianceSummary: isPotable
        ? "Raw water meets standard potability baseline; multi-barrier sediment & UV disinfection installed as protective safety barriers."
        : "Raw water requires active multi-barrier treatment (iron/hardness/microbial reduction) before sending to household taps.",
    },
    storage: {
      dailyTotalDemandLiters: Math.round(dailyDemandLiters),
      dailyTotalDemandUsGal: Math.round(dailyDemandLiters * 0.264172),
      perCapitaLitersPerDay: perCapitaLpd,
      peakFactor,
      peakRushDurationHours: peakRushHours,
      peakRushDemandLitersPerHour: Number(peakDemandLph.toFixed(0)),
      pumpHourlyOutputLiters: pumpHourlyOutputL,
      peakRushDeficitLitersPerHour: Number(rushDeficitLph.toFixed(0)),
      rushBufferNeededLiters: Number(rushBufferNeededL.toFixed(0)),
      emergencyReserveLiters: Math.round(emergencyReserveL),
      totalRecommendedStorageLiters: Math.round(totalRecommendedStorageL),
      commercialTankSizeLiters: commercialTankL,
      commercialTankSizeUsGal: Math.round(commercialTankL * 0.264172),
      overflowPipeDiameterMm: overflowDiaMm,
      drainWashoutDiameterMm: drainDiaMm,
    },
    automation: {
      overheadDualFloatSensors: true,
      boreholeDryRunProbes: true,
      controlPanelType: "DOL Starter with Phase & Surge Protection",
      surgeProtection: true,
      operationMode: "fully_automated_closed_loop",
    },
    distribution: {
      towerHeightMeters: towerElevation,
      groundHydrostaticPressureBar: hydrostaticPressureBar,
      groundHydrostaticPressurePsi: hydrostaticPressurePsi,
      pressureAdequacy,
      buriedTrenchDepthMeters: trenchDepthM,
      buriedPipeDiameterMm: buriedPipeDiaMm,
      buriedTrenchLengthMeters: buriedRun,
      beddingSandM3: beddingSandVolM3,
    },
    installationSteps,
    billOfQuantities: boq,
    standardsCited,
  };
}
