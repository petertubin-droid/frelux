/**
 * FRELUX market bundle: US.
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

export const US: MarketBundle = {
  code: "US",
  electrical: {
    marketCode: "US",
    name: "United States (NEC / NFPA 70)",
    standardsRef: "NFPA 70 (National Electrical Code 2023)",
    nominalVoltage: "120V / 240V split-phase",
    frequencyHz: 60,
    measurementSystem: "imperial",
    runDistanceUnit: "ft",
    primaryWiringMethod:
      "Non-metallic sheathed cable (Type NM-B / Romex) in stud cavities",
    lightingConductorSize: "14 AWG Cu (15A circuit)",
    socketConductorSize: "12 AWG Cu (20A small appliance/branch)",
    dedicatedConductorSize: "10 AWG to 6 AWG Cu (30A-50A HVAC, range, dryer)",
    boxType: "Non-metallic (PVC/fiberglass) nail-on boxes or metal handy boxes",
    protectionDevices: "Combination AFCI / GFCI dual-function circuit breakers",
    cableReelSize: "250 ft (76.2 m) or 1000 ft spools",
    conduitRequired: false,
    notes:
      "Conduit is generally not required for concealed residential timber-stud runs under NEC Art. 334.",
  },
  plumbing: {
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
  masonry: MASONRY_MARKET_REGISTRY["US"],
  drywall: DRYWALL_MARKET_PROFILES["US"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["US"],
  wallFinishing: WALLFIN_COUNTRY_MAP["US"],
};
