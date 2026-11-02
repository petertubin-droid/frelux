/**
 * FRELUX market bundle: ZA.
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

export const ZA: MarketBundle = {
  code: "ZA",
  electrical: {
    marketCode: "ZA",
    name: "South Africa (SANS 10142-1)",
    standardsRef:
      "SANS 10142-1 (The Wiring of Premises Part 1: Low-voltage installations)",
    nominalVoltage: "230V single-phase / 400V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Flat twin and earth (Surfix) clipped directly, or GP single-core wire in PVC / Bosch conduit",
    lightingConductorSize: "1.5 mm² Cu (10A / 16A breaker)",
    socketConductorSize:
      "2.5 mm² Cu (20A circuit feeding SANS 164-1 16A and SANS 164-2 sockets)",
    dedicatedConductorSize:
      "4.0 mm² Cu (Geyser / water heater), 6.0 mm² Cu (Stove / Hob)",
    boxType:
      "100 x 50 mm and 100 x 100 mm galvanized steel / PVC switch and socket boxes",
    protectionDevices:
      "Distribution board with 63A main switch, 30mA Earth Leakage Relay (ELR/RCD), and curve-1 / curve-2 MCBs",
    cableReelSize: "100 m roll",
    conduitRequired: false,
    notes:
      "Preliminary takeoff only. Mandatory Certificate of Compliance (CoC) issued by an accredited Department of Labour registered electrical contractor is legally required.",
  },
  plumbing: {
    marketCode: "ZA",
    name: "South Africa (SANS 10252)",
    standardsRef:
      "SANS 10252-1 (Water Supply) & SANS 10252-2 (Drainage Installations)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Class 0 / Class 1 Copper tube (SANS 460) or Multi-layer PEX-Al-PEX / Polycop",
    drainageDwvMaterial:
      "uPVC solvent-weld or rubber-ring soil and vent pipe (SANS 967)",
    typicalColdSupplyPipeSize: "22 mm OD copper / 20 mm multi-layer pipe",
    typicalHotSupplyPipeSize:
      "22 mm OD copper / 20 mm multi-layer insulated pipe",
    typicalBranchWastePipeSize: "40 mm / 50 mm uPVC waste pipe",
    typicalSoilDrainPipeSize:
      "110 mm uPVC heavy-duty underground drain pipe (SANS 791)",
    drainageSlopeRule:
      "1:60 (1.67%) for 110 mm soil pipes; 1:40 (2.5%) for 40/50 mm waste pipes",
    standardPipePurchasingLength:
      "6 m straight lengths for copper and uPVC; 50 m rolls for multi-layer",
    notes:
      "Preliminary takeoff only. Plumbing installations must be registered and issued with a PIRB (Plumbing Industry Registration Board) Compliance Certificate.",
  },
  masonry: MASONRY_MARKET_REGISTRY["ZA"],
  drywall: DRYWALL_MARKET_PROFILES["ZA"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["ZA"],
  wallFinishing: WALLFIN_COUNTRY_MAP["ZA"],
};
