/**
 * FRELUX market bundle: SE.
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

export const SE: MarketBundle = {
  code: "SE",
  electrical: {
    marketCode: "SE",
    name: "Sweden (SS 436 04 00 / ESS)",
    standardsRef:
      "SS 436 04 00 (Elinstallationsreglerna / ESS), IEC 60364-based",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu conductors in embedded PVC conduit (elläror) or screened YY cable in stud walls",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType:
      "Flush boxes (inbyggnadsdosor) with shuttered type C/F socket frames",
    protectionDevices:
      "30mA jordfelsbrytare (RCD) - mandatory per ESS - plus MCBs",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. 30mA RCD protection is mandatory on final circuits under ESS. Consult a licensed electrician (elinstallatör).",
  },
  plumbing: {
    marketCode: "SE",
    name: "Sweden (SS-EN 806 / BBR)",
    standardsRef: "SS-EN 806 / SS-EN 12056; Boverets byggregler (BBR)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PEX (SS-EN ISO 15875) dominant; PPR risers; Cu legacy",
    drainageDwvMaterial:
      "PP (SS-EN 1451) or PVC-U (SS-EN 1329); noise-rated soil stacks common",
    typicalColdSupplyPipeSize: "16 mm PEX branches, 25 mm risers",
    typicalHotSupplyPipeSize:
      "16 mm / 20 mm insulated PEX (BBR energy requirements)",
    typicalBranchWastePipeSize: "32 mm, 40 mm and 50 mm waste",
    typicalSoilDrainPipeSize: "110 mm OD soil stack",
    drainageSlopeRule:
      "Minimum 1:100 (1%) for 110 mm soil; 1:50 (2%) for smaller branches per SS-EN 12056",
    standardPipePurchasingLength: "50 m / 100 m PEX coils; 3 m PP/PVC bars",
    notes:
      "Preliminary takeoff only. Verify with a licensed plumber (VVS-installatör).",
  },
  masonry: MASONRY_MARKET_REGISTRY["SE"],
  drywall: DRYWALL_MARKET_PROFILES["SE"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["SE"],
  wallFinishing: WALLFIN_COUNTRY_MAP["SE"],
};
