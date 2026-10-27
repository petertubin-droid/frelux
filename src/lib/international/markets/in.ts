/**
 * FRELUX market bundle: IN.
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

export const IN: MarketBundle = {
  code: "IN",
  electrical: {
    marketCode: "IN",
    name: "India (IS 732 / NBC 2016)",
    standardsRef: "IS 732:2019 / National Building Code of India",
    nominalVoltage: "230V single-phase / 415V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Single-core FRLS (flame retardant low smoke) copper wire drawn in concealed rigid PVC conduit",
    lightingConductorSize: "1.5 mm² FRLS Cu",
    socketConductorSize: "2.5 mm² or 4.0 mm² FRLS Cu (6A/16A power points)",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² FRLS Cu (AC, geyser)",
    boxType:
      "GI (galvanized iron) concealed metal modular switch boxes (1-18 module)",
    protectionDevices: "Distribution board with ELCB/RCCB (30mA) + MCBs",
    cableReelSize: "90 m standard coil length (IS 694)",
    conduitRequired: true,
    notes:
      "Wires are sold in 90-meter coils. Concealed medium/heavy duty PVC conduits embedded in chased masonry.",
  },
  plumbing: {
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
  masonry: MASONRY_MARKET_REGISTRY["IN"],
  drywall: DRYWALL_MARKET_PROFILES["IN"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["IN"],
  wallFinishing: WALLFIN_COUNTRY_MAP["IN"],
};
