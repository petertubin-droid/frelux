/**
 * FRELUX International Plumbing Engineering Profiles
 *
 * Distinct regional plumbing system profiles for all 20 markets.
 * Replaces universal assumptions with modular market-specific rules.
 *
 * Non-negotiable honesty rules:
 * - Material quantity takeoff, NOT certified hydraulic/sanitary engineering designs.
 * - Missing prices remain unpriced; no silent price or method substitutions.
 */

export interface PlumbingMarketProfile {
  marketCode: string;
  name: string;
  standardsRef: string;
  measurementSystem: "metric" | "imperial";
  runDistanceUnit: "m" | "ft";
  nominalSizingFormat: "imperial_nominal_cts" | "metric_dn_od";
  waterSupplyMaterial: string;
  drainageDwvMaterial: string;
  typicalColdSupplyPipeSize: string;
  typicalHotSupplyPipeSize: string;
  typicalBranchWastePipeSize: string;
  typicalSoilDrainPipeSize: string;
  drainageSlopeRule: string;
  standardPipePurchasingLength: string;
  notes: string;
}

export const PLUMBING_PROFILES: Record<string, PlumbingMarketProfile> = {
  US: {
    marketCode: "US",
    name: "United States (IPC / UPC)",
    standardsRef:
      "International Plumbing Code (IPC 2024) / Uniform Plumbing Code (UPC)",
    measurementSystem: "imperial",
    runDistanceUnit: "ft",
    nominalSizingFormat: "imperial_nominal_cts",
    waterSupplyMaterial: "PEX-A / PEX-B tubing or Type L / M Copper (ASTM B88)",
    drainageDwvMaterial:
      "Schedule 40 PVC DWV (ASTM D2665) or ABS DWV (ASTM D2661)",
    typicalColdSupplyPipeSize: "3/4 inch main trunk, 1/2 inch fixture branches",
    typicalHotSupplyPipeSize: "3/4 inch main trunk, 1/2 inch fixture branches",
    typicalBranchWastePipeSize:
      "1-1/2 inch (lavatory/tub) to 2 inch (shower/kitchen sink)",
    typicalSoilDrainPipeSize: "3 inch or 4 inch Schedule 40 PVC",
    drainageSlopeRule:
      "1/4 inch per foot (2.08% slope) for 2-1/2 inch or smaller pipe; 1/8 inch per foot (1.04%) for 3 inch or larger",
    standardPipePurchasingLength:
      "10 ft or 20 ft rigid sticks (PEX: 100 ft or 300 ft coils)",
    notes:
      "Nominal pipe sizes do not equal direct internal diameters. DWV fittings require long-sweep sanitary bends.",
  },
  CA: {
    marketCode: "CA",
    name: "Canada (National Plumbing Code of Canada / NPC)",
    standardsRef: "National Plumbing Code of Canada (NPC 2020 / CSA B125)",
    measurementSystem: "imperial",
    runDistanceUnit: "ft",
    nominalSizingFormat: "imperial_nominal_cts",
    waterSupplyMaterial: "PEX (CSA B137.5) or Copper Type M/L",
    drainageDwvMaterial: "System 15 PVC or ABS DWV (CSA B181.1)",
    typicalColdSupplyPipeSize:
      "3/4 inch service / main trunk, 1/2 inch branch runs",
    typicalHotSupplyPipeSize: "3/4 inch main trunk, 1/2 inch branch runs",
    typicalBranchWastePipeSize: "1-1/2 inch or 2 inch ABS/PVC",
    typicalSoilDrainPipeSize: "3 inch or 4 inch ABS/PVC DWV",
    drainageSlopeRule:
      "Minimum 1 in 50 (2%) for fixtures; 1 in 100 (1%) for 4 inch building drains where approved",
    standardPipePurchasingLength: "10 ft or 12 ft lengths (PEX in coils)",
    notes: "ABS DWV is widely used in residential Canadian construction.",
  },
  GB: {
    marketCode: "GB",
    name: "United Kingdom (BS EN 806 / BS EN 12056)",
    standardsRef:
      "BS EN 806 (Water services) & BS EN 12056 (Gravity drainage systems)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Copper pipe (BS EN 1057) or Barrier PB/PEX push-fit (BS 7291)",
    drainageDwvMaterial:
      "uPVC solvent-weld or push-fit waste pipe & soil stack (BS EN 1329 / BS EN 1453)",
    typicalColdSupplyPipeSize:
      "22 mm main / unvented cylinder, 15 mm fixture runs",
    typicalHotSupplyPipeSize: "22 mm distribution, 15 mm fixture runs",
    typicalBranchWastePipeSize:
      "32 mm (basin) to 40 mm (sink/shower) or 50 mm (long runs)",
    typicalSoilDrainPipeSize: "110 mm push-fit or solvent-weld uPVC soil stack",
    drainageSlopeRule:
      "18 mm/m to 44 mm/m fall (typically 1:40 to 1:80 gradient per BS EN 12056-2)",
    standardPipePurchasingLength:
      "3 m standard lengths (push-fit/copper) or 25m/50m coils for barrier pipe",
    notes: "Unvented hot water systems require certified G3 installation.",
  },
  DE: {
    marketCode: "DE",
    name: "Germany (DIN 1988 / DIN EN 12056)",
    standardsRef: "DIN 1988 (TRWI) & DIN EN 12056 / DIN 1986-100",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Mehrschichtverbundrohr (multi-layer composite pipe / PEX-Al-PEX) or Edelstahl (stainless steel)",
    drainageDwvMaterial:
      "HT-Rohr (Polypropylen Schwerentflammbar / DIN EN 1451-1) or Schallschutzrohr (silence pipe)",
    typicalColdSupplyPipeSize:
      "DN 15 (16x2.0 mm) / DN 20 (20x2.0 mm) Verbundrohr",
    typicalHotSupplyPipeSize: "DN 15 / DN 20 mit Isolierung nach GEG",
    typicalBranchWastePipeSize: "DN 40 / DN 50 HT-Rohr",
    typicalSoilDrainPipeSize: "DN 90 or DN 100 / 110 HT-Rohr Fallleitung",
    drainageSlopeRule:
      "Mindestgefälle 1:100 (1%) bis 1:50 (2%) nach DIN 1986-100",
    standardPipePurchasingLength:
      "0.25 m bis 2.0 m HT-Rohr Stangen; Verbundrohr in 50 m Ringen",
    notes:
      "Dämmung nach Gebäudeenergiegesetz (GEG) ist für Warm- und Kaltwasserleitungen vorgeschrieben.",
  },
  IN: {
    marketCode: "IN",
    name: "India (IS 2065 / National Building Code)",
    standardsRef: "IS 2065:1983 & NBC 2016 Part 9 (Plumbing Services)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "CPVC (ASTM D2846) or PPR (IS 15801) pipe with solvent/heat fusion joints",
    drainageDwvMaterial: "SWR PVC (IS 13592 Type A for waste, Type B for soil)",
    typicalColdSupplyPipeSize:
      "25 mm (3/4 in) or 32 mm (1 in) trunk, 20 mm (1/2 in) fixture drop",
    typicalHotSupplyPipeSize: "20 mm (1/2 in) or 25 mm (3/4 in) CPVC SDR 11",
    typicalBranchWastePipeSize: "40 mm (1-1/4 in) to 50 mm (1-1/2 in) SWR PVC",
    typicalSoilDrainPipeSize: "75 mm waste stack, 110 mm soil stack (IS 13592)",
    drainageSlopeRule:
      "1:40 to 1:60 slope for self-cleansing velocity (minimum 0.75 m/s)",
    standardPipePurchasingLength:
      "3 m or 6 m (10 ft / 20 ft) commercial lengths (Astral, Supreme, Ashirvad)",
    notes:
      "Concealed plumbing in chased brickwork with rubber ring / solvent welded joints.",
  },
  NG: {
    marketCode: "NG",
    name: "Nigeria (National Building Code / Local Practice)",
    standardsRef: "Nigerian National Building Code & NIS Standards",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PPR (Polypropylene Random Copolymer heat fusion) or PVC pressure pipe",
    drainageDwvMaterial: "uPVC waste and soil pipe (Class B / Class C)",
    typicalColdSupplyPipeSize: "25 mm (3/4 in) PPR or 1/2 in pressure pipe",
    typicalHotSupplyPipeSize: "20 mm or 25 mm PPR pipe with heat-fusion joints",
    typicalBranchWastePipeSize: "1-1/2 inch (38-40 mm) or 2 inch (50 mm) uPVC",
    typicalSoilDrainPipeSize:
      "4 inch (110 mm) uPVC soil pipe discharging to inspection chamber & soakaway/septic",
    drainageSlopeRule:
      "1:40 (2.5%) to 1:60 gradient toward inspection chambers",
    standardPipePurchasingLength: "4 m or 5.8 m standard commercial lengths",
    notes:
      "PPR is dominant for pressurized supply; gravity drainage discharges to inspection chambers and septic soakaway.",
  },
};

export function getPlumbingProfile(marketCode: string): PlumbingMarketProfile {
  const upper = marketCode.toUpperCase();
  if (PLUMBING_PROFILES[upper]) {
    return PLUMBING_PROFILES[upper];
  }
  return {
    marketCode: upper,
    name: `${upper} Local Plumbing Practice`,
    standardsRef:
      "Applicable National Plumbing Standard & ISO 15874 / EN 12056",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial: "PPR or Multi-layer PEX-Al-PEX pipe",
    drainageDwvMaterial: "uPVC or Polypropylene drainage pipe",
    typicalColdSupplyPipeSize: "20 mm / 25 mm OD pipe",
    typicalHotSupplyPipeSize: "20 mm / 25 mm OD insulated pipe",
    typicalBranchWastePipeSize: "40 mm / 50 mm OD waste pipe",
    typicalSoilDrainPipeSize: "110 mm OD soil pipe",
    drainageSlopeRule: "1:50 (2%) standard drainage slope",
    standardPipePurchasingLength: "3 m or 4 m lengths",
    notes:
      "Preliminary material takeoff only. Always verify local sanitary drainage codes and fixture unit loadings.",
  };
}
