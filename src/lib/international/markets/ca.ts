/**
 * FRELUX market bundle: CA.
 *
 * One-file authoring surface for this market's static building-practice
 * data. Electrical and plumbing profiles are defined here; masonry,
 * drywall, plastering and wall-finishing are referenced from their
 * engine registries so the bundle is the complete single view.
 */
import type { MarketBundle } from "./types";
import { MASONRY_MARKET_REGISTRY } from "@/lib/estimation/masonry-standalone-engine";
import { DRYWALL_MARKET_PROFILES } from "@/lib/estimation/drywall-standalone-engine";
import { CEMENT_BAG_WEIGHT_BY_MARKET } from "@/lib/estimation/plastering-standalone-engine";
import { WALLFIN_COUNTRY_MAP } from "@/lib/wallfinishing/countries";

export const CA: MarketBundle = {
  code: "CA",
  electrical: {
    marketCode: "CA",
    name: "Canada (Canadian Electrical Code / CSA C22.1)",
    standardsRef: "CSA C22.1:24 (Canadian Electrical Code)",
    nominalVoltage: "120V / 240V split-phase",
    frequencyHz: 60,
    measurementSystem: "imperial",
    runDistanceUnit: "ft",
    primaryWiringMethod: "Type NMD90 (Loomex) non-metallic sheathed cable",
    lightingConductorSize: "14 AWG Cu (15A circuit)",
    socketConductorSize: "14 AWG / 12 AWG Cu (15A/20A branch circuits)",
    dedicatedConductorSize: "10 AWG to 6 AWG Cu",
    boxType:
      "Sectional metal device boxes or non-metallic boxes with internal clamps",
    protectionDevices: "AFCI / GFCI breakers per CEC Section 26",
    cableReelSize: "75 m (approx 246 ft) or 150 m coils",
    conduitRequired: false,
    notes: "NMD90 is the dominant Canadian residential cable format.",
  },
  plumbing: {
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
  masonry: MASONRY_MARKET_REGISTRY["CA"],
  drywall: DRYWALL_MARKET_PROFILES["CA"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["CA"],
  wallFinishing: WALLFIN_COUNTRY_MAP["CA"],
};
