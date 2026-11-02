/**
 * FRELUX market bundle: NG.
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

export const NG: MarketBundle = {
  code: "NG",
  electrical: {
    marketCode: "NG",
    name: "Nigeria (NEMSA / NBC)",
    standardsRef:
      "NEMSA Electrical Regulations & Nigerian National Building Code",
    nominalVoltage: "230V single-phase / 415V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Single-core pure copper wire drawn in recessed PVC conduit embedded in chased sandcrete walls",
    lightingConductorSize: "1.5 mm² single-core Cu",
    socketConductorSize:
      "2.5 mm² single-core Cu (radial 13A British socket circuits)",
    dedicatedConductorSize:
      "4.0 mm² to 10.0 mm² single-core Cu (AC, water heater, pumping machine)",
    boxType:
      "Steel galvanised or rigid plastic 1-gang/2-gang recessed boxes (pattress boxes)",
    protectionDevices:
      "Main distribution board with changeover switch, ELCB/RCD, and individual MCBs",
    cableReelSize:
      "100 m standard coil length (Coleman, Cutix, Nigerchin or equivalent pure copper)",
    conduitRequired: true,
    notes:
      "Chased conduit in sandcrete/concrete with individual conductors pulled after plastering.",
  },
  plumbing: {
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
  masonry: MASONRY_MARKET_REGISTRY["NG"],
  drywall: DRYWALL_MARKET_PROFILES["NG"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["NG"],
  wallFinishing: WALLFIN_COUNTRY_MAP["NG"],
};
