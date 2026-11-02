/**
 * FRELUX market bundle: ET.
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

export const ET: MarketBundle = {
  code: "ET",
  electrical: {
    marketCode: "ET",
    name: "Ethiopia (EEU practice / IEC 60364-aligned)",
    standardsRef:
      "EEU (Ethiopian Electric Utility) supply rules; IEC 60364-aligned national code of practice",
    nominalVoltage: "220V single-phase / 380V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "PVC-insulated Cu singles in embedded or surface PVC conduit (masonry construction)",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType: "Flush galvanized steel or PVC boxes in blockwork",
    protectionDevices:
      "30mA RCD on socket circuits plus MCB distribution board",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Type C/F (European) plugs are common. Mains voltage dips and load shedding are frequent: confirm actual supply with a licensed local electrician before final circuit design.",
  },
  plumbing: {
    marketCode: "ET",
    name: "Ethiopia (EBCS plumbing services)",
    standardsRef:
      "Ethiopian Building Code of Standards (EBCS) - plumbing services; ES EN ISO 15874 (PPR), EN 1329 (uPVC)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PPR PN20 heat-fusion pipes (EN ISO 15874) or HDPE PN16 mains",
    drainageDwvMaterial:
      "uPVC soil and waste pipes (EN 1329) with rubber-seal sockets",
    typicalColdSupplyPipeSize: "25 mm OD (PN16/20) PPR trunk, 20 mm branches",
    typicalHotSupplyPipeSize: "25 mm OD PN20 insulated PPR",
    typicalBranchWastePipeSize:
      "40 mm (1.5 inch) and 50 mm (2 inch) uPVC waste",
    typicalSoilDrainPipeSize: "110 mm OD uPVC soil pipe",
    drainageSlopeRule: "1:50 (2%) minimum fall; 1:40 (2.5%) for branch waste",
    standardPipePurchasingLength: "4 m PPR lengths; 3 m or 6 m uPVC",
    notes:
      "Preliminary takeoff only. Rooftop break tanks plus booster pumps are standard due to intermittent mains supply; verify tank and pump requirements with a local plumber.",
  },
  masonry: MASONRY_MARKET_REGISTRY["ET"],
  drywall: DRYWALL_MARKET_PROFILES["ET"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["ET"],
  wallFinishing: WALLFIN_COUNTRY_MAP["ET"],
};
