/**
 * FRELUX market bundle: CI.
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

export const CI: MarketBundle = {
  code: "CI",
  electrical: {
    marketCode: "CI",
    name: "Côte d'Ivoire (NF C 15-100 heritage / IEC 60364)",
    standardsRef:
      "National electrical practice per Ministère de la Construction; NF C 15-100 heritage, IEC 60364-aligned",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu singles (U-1000 R2V or H07V-K) in embedded corrugated PVC conduit (gaine ICTA)",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType:
      "Flush junction boxes (boîtes d'encastrement) with type E socket frames",
    protectionDevices:
      "30mA interrupteur différentiel + disjoncteurs (MCB) per NF C 15-100 heritage",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. French-practice radial circuits with 30mA differential protection are standard. Consult a licensed local electrician.",
  },
  plumbing: {
    marketCode: "CI",
    name: "Côte d'Ivoire (NF heritage practice)",
    standardsRef:
      "National plumbing practice per Ministère de la Construction; NF EN 15874 / NF EN 12056 heritage",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PPR (NF EN ISO 15874) heat-fusion or multilayer PEX-Al-PEX (NF EN ISO 21003)",
    drainageDwvMaterial: "uPVC soil and waste pipes (NF EN 1329)",
    typicalColdSupplyPipeSize: "25 mm OD risers, 20 mm OD branches",
    typicalHotSupplyPipeSize: "20 mm / 25 mm OD insulated PPR",
    typicalBranchWastePipeSize: "40 mm and 50 mm uPVC waste",
    typicalSoilDrainPipeSize: "110 mm OD uPVC soil (NF EN 12056-2 practice)",
    drainageSlopeRule: "1:50 (2%) minimum, 1 cm per m typical",
    standardPipePurchasingLength: "4 m PPR bars; 3 m uPVC (barres de 3 m)",
    notes:
      "Preliminary takeoff only. Rooftop château d'eau storage tanks are standard for intermittent mains; verify with a local plumber (plombier).",
  },
  masonry: MASONRY_MARKET_REGISTRY["CI"],
  drywall: DRYWALL_MARKET_PROFILES["CI"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["CI"],
  wallFinishing: WALLFIN_COUNTRY_MAP["CI"],
};
