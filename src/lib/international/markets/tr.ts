/**
 * FRELUX market bundle: TR.
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

export const TR: MarketBundle = {
  code: "TR",
  electrical: {
    marketCode: "TR",
    name: "Türkiye (IEC 60364-based national regulation)",
    standardsRef:
      "Elektrik İç Tesisleri Yönetmeliği (Electrical Internal Installations Regulation), IEC 60364-aligned",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu singles in embedded PVC conduit within RC construction and blockwork",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits (type F Schuko outlets)",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType: "Flush plastic boxes (gömme kutu) cast into walls",
    protectionDevices:
      "30mA artık akım rölesi (RCD) - mandatory for bathrooms - plus MCB panel",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Embedded conduit in reinforced concrete is standard Turkish practice. Consult a licensed local electrician (elektrik teknisyeni).",
  },
  plumbing: {
    marketCode: "TR",
    name: "Türkiye (TS EN standards)",
    standardsRef:
      "TS EN 806 / TS 9956 sanitary installation standards; TS EN 12056 drainage",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PPR (TS EN ISO 15874) heat-fusion - dominant; PEX alternative",
    drainageDwvMaterial: "PVC-U (TS EN 1329 / TS EN 1401) or PP silent",
    typicalColdSupplyPipeSize: "25 mm OD PPR trunk, 20 mm branches",
    typicalHotSupplyPipeSize: "25 mm OD PN20 insulated PPR",
    typicalBranchWastePipeSize: "40 mm and 50 mm waste",
    typicalSoilDrainPipeSize: "110 mm OD soil pipe",
    drainageSlopeRule: "Minimum 1:50 (2%)",
    standardPipePurchasingLength: "4 m PPR bars; 3 m PVC",
    notes:
      "Preliminary takeoff only. Rooftop tanks plus pressure systems are common; verify with a licensed local plumber (tesisatçı).",
  },
  masonry: MASONRY_MARKET_REGISTRY["TR"],
  drywall: DRYWALL_MARKET_PROFILES["TR"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["TR"],
  wallFinishing: WALLFIN_COUNTRY_MAP["TR"],
};
