/**
 * FRELUX market bundle: EG.
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

export const EG: MarketBundle = {
  code: "EG",
  electrical: {
    marketCode: "EG",
    name: "Egypt (Ministry of Electricity code / IEC 60364-aligned)",
    standardsRef:
      "Egyptian Electrical Installation Code; IEC 60364-aligned practice",
    nominalVoltage: "220V single-phase / 380V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu singles in embedded PVC conduit within reinforced concrete and blockwork",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu (water heater, AC)",
    boxType: "Flush PVC or steel boxes cast into walls",
    protectionDevices: "30mA RCD (mandatory for bathrooms) plus MCB panel",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Embedded conduit in RC construction is standard Egyptian practice; Type C/E/F plugs are common. Consult a licensed local electrician for design.",
  },
  plumbing: {
    marketCode: "EG",
    name: "Egypt (Egyptian Code of Building practice)",
    standardsRef:
      "Egyptian Code of Building Requirements - sanitary chapters; EN ISO 15874 / EN 1329 pipe practice",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PPR PN20 heat-fusion pipes (EN ISO 15874); CPVC alternative in retrofit",
    drainageDwvMaterial:
      "uPVC soil and waste pipes (EN 1329/1401) with seal sockets",
    typicalColdSupplyPipeSize: "25 mm OD PPR trunk, 20 mm fixture branches",
    typicalHotSupplyPipeSize: "25 mm OD PN20 insulated PPR",
    typicalBranchWastePipeSize: "40 mm and 50 mm uPVC waste",
    typicalSoilDrainPipeSize: "110 mm OD uPVC soil pipe",
    drainageSlopeRule: "1:50 (2%) minimum fall",
    standardPipePurchasingLength: "4 m PPR lengths; 3 m uPVC",
    notes:
      "Preliminary takeoff only. Rooftop storage tanks are standard Egyptian practice for intermittent supply; confirm tank sizing and booster requirements with a local plumber.",
  },
  masonry: MASONRY_MARKET_REGISTRY["EG"],
  drywall: DRYWALL_MARKET_PROFILES["EG"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["EG"],
  wallFinishing: WALLFIN_COUNTRY_MAP["EG"],
};
