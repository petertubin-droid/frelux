/**
 * FRELUX market bundle: AU.
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

export const AU: MarketBundle = {
  code: "AU",
  electrical: {
    marketCode: "AU",
    name: "Australia (AS/NZS 3000 Wiring Rules)",
    standardsRef: "AS/NZS 3000:2018 (Wiring Rules)",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Flat TPS (thermoplastic sheathed) cable run in cavity or ceiling space",
    lightingConductorSize: "1.5 mm² Cu TPS (10A/16A circuit)",
    socketConductorSize: "2.5 mm² Cu TPS (16A/20A radial circuit)",
    dedicatedConductorSize: "4.0 mm² to 10.0 mm² Cu TPS (air-con, oven)",
    boxType: "Plaster brackets (C-clips) or standard PVC mounting blocks",
    protectionDevices: "RCBO protection mandatory on all final sub-circuits",
    cableReelSize: "100 m reels",
    conduitRequired: false,
    notes:
      "AS/NZS 3000 requires 30mA RCD/RCBO protection across all sub-circuits.",
  },
  plumbing: {
    marketCode: "AU",
    name: "Australia (AS/NZS 3500)",
    standardsRef:
      "AS/NZS 3500 (Plumbing and Drainage Standard) & National Construction Code (NCC)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PEX tubing (AS/NZS 2492) or Type B Copper Tube (AS 1432)",
    drainageDwvMaterial: "DWV PVC-U Pipe and fittings (AS/NZS 1260)",
    typicalColdSupplyPipeSize: "DN 20 (20 mm OD) main feed; DN 16 branch feeds",
    typicalHotSupplyPipeSize: "DN 20 main feed; DN 16 branch feeds (insulated)",
    typicalBranchWastePipeSize: "DN 40 / DN 50 DWV PVC pipe",
    typicalSoilDrainPipeSize: "DN 100 DWV PVC sewer pipe",
    drainageSlopeRule:
      "1:60 (1.65%) for DN 100; 1:40 (2.5%) for DN 40/50 fixture discharges",
    standardPipePurchasingLength:
      "6 m straight lengths for DWV PVC; 50 m / 100 m coils for PEX",
    notes:
      "Preliminary takeoff only. Hydraulic sizing must comply with AS/NZS 3500 loading units. Licensed plumbing contractor sign-off and WaterMark-certified fittings are mandatory.",
  },
  masonry: MASONRY_MARKET_REGISTRY["AU"],
  drywall: DRYWALL_MARKET_PROFILES["AU"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["AU"],
  wallFinishing: WALLFIN_COUNTRY_MAP["AU"],
};
