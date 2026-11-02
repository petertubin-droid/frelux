/**
 * FRELUX market bundle: CN.
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

export const CN: MarketBundle = {
  code: "CN",
  electrical: {
    marketCode: "CN",
    name: "China (GB 50054 / GB 50303)",
    standardsRef:
      "GB 50054 (Code for Design of Low Voltage Electrical) & GB 50303 (Acceptance Code)",
    nominalVoltage: "220V single-phase / 380V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "BV single-core copper wire (flame retardant ZR-BV or WDZ-BYJ low smoke halogen-free) inside rigid cold-bend PVC-U conduit",
    lightingConductorSize: "1.5 mm² Cu (ZR-BV 1.5, 16A breaker)",
    socketConductorSize:
      "2.5 mm² Cu (ZR-BV 2.5, 20A breaker for standard 10A 5-hole combined sockets)",
    dedicatedConductorSize:
      "4.0 mm² Cu (Air conditioners 16A dedicated sockets), 6.0 mm² Cu (Main kitchen / instant water heater)",
    boxType:
      "Standard 86-type (86 mm x 86 mm) flame-retardant PVC switch and socket junction boxes (86-xing an-zhuang-he)",
    protectionDevices:
      "Household consumer distribution box with 2P main miniature circuit breaker, 30mA residual current circuit breakers (RCCB), and 1P+N branch breakers",
    cableReelSize: "100 m coil (Zheng-pan 100m)",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. National standards strictly mandate 86-type boxes and flame-retardant conduit. Certified electrician holding MoHRSS qualification is required.",
  },
  plumbing: {
    marketCode: "CN",
    name: "China (GB 50015)",
    standardsRef:
      "GB 50015 (Standard for Building Water Supply and Drainage Design) & CJ/T standards",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Polypropylene random copolymer pipe (PP-R GB/T 18742) or thin-walled stainless steel pipe",
    drainageDwvMaterial:
      "Rigid polyvinyl chloride drainage pipe (PVC-U GB/T 5836) with socket adhesive or spiral sound-reducing pipes",
    typicalColdSupplyPipeSize: "dn 25 (S3.2 / PN2.0 MPa) PP-R pipe",
    typicalHotSupplyPipeSize: "dn 25 (S2.5 / PN2.5 MPa) insulated PP-R pipe",
    typicalBranchWastePipeSize: "de 50 mm / de 75 mm PVC-U drainage pipe",
    typicalSoilDrainPipeSize:
      "de 110 mm PVC-U soil vertical stack and outfall pipe",
    drainageSlopeRule:
      "0.026 standard slope for de 50; 0.020 (1:50) standard slope for de 110",
    standardPipePurchasingLength:
      "4 m straight lengths for PP-R and PVC-U pipes",
    notes:
      "Preliminary takeoff only. Strict acoustic and anti-odor water seal (water trap depth >= 50 mm per GB 50015) requirements apply.",
  },
  masonry: MASONRY_MARKET_REGISTRY["CN"],
  drywall: DRYWALL_MARKET_PROFILES["CN"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["CN"],
  wallFinishing: WALLFIN_COUNTRY_MAP["CN"],
};
