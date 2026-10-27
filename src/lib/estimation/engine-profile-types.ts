/**
 * FRELUX international MEP engine profile types.
 *
 * Shared home for the electrical and plumbing market-profile interfaces
 * so per-market bundle files (src/lib/international/markets/<code>.ts)
 * and the composed registries can import them without cycles.
 */
export interface ElectricalMarketProfile {
  marketCode: string;
  name: string;
  standardsRef: string;
  nominalVoltage: string;
  frequencyHz: number;
  measurementSystem: "metric" | "imperial";
  runDistanceUnit: "m" | "ft";
  primaryWiringMethod: string;
  lightingConductorSize: string;
  socketConductorSize: string;
  dedicatedConductorSize: string;
  boxType: string;
  protectionDevices: string;
  cableReelSize: string;
  conduitRequired: boolean;
  notes: string;
}

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
