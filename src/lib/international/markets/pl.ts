/**
 * FRELUX market bundle: PL.
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

export const PL: MarketBundle = {
  code: "PL",
  electrical: {
    marketCode: "PL",
    name: "Poland (PN-HD 60364 national adoption)",
    standardsRef:
      "PN-HD 60364 series (Polish national adoption of IEC 60364); Warunki Techniczne",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu singles in embedded PVC conduit in concrete/blockwork, or flat sheathed cable (YDY) in stud walls",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType: "Flush plastic boxes (puszki) with type E socket frames",
    protectionDevices:
      "30mA RCD (wyłącznik różnicowoprądowy) plus MCB panel per PN-HD 60364-4-41",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Embedded conduit in monolithic RC construction is standard Polish practice; type E (French) sockets dominate. Consult a licensed SEP-certified electrician.",
  },
  plumbing: {
    marketCode: "PL",
    name: "Poland (PN-EN 806 / Warunki Techniczne)",
    standardsRef:
      "PN-EN 806 (drinking-water installations); PN-EN 12056 drainage; WT technical conditions",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PPR (PN-EN ISO 15874) heat-fusion or PVC-Al-PEX multilayer (PN-EN ISO 21003)",
    drainageDwvMaterial: "PVC-U (PN-EN 1401 / PN-EN 1329) or PP (PN-EN 1451)",
    typicalColdSupplyPipeSize: "20 mm / 25 mm OD PPR",
    typicalHotSupplyPipeSize:
      "20 mm / 25 mm OD insulated PPR (circulation per WT)",
    typicalBranchWastePipeSize: "40 mm and 50 mm waste",
    typicalSoilDrainPipeSize: "110 mm OD PVC-U soil",
    drainageSlopeRule: "Minimum 2% (1:50) per PN-EN 12056",
    standardPipePurchasingLength: "4 m PPR bars; 3 m / 6 m PVC",
    notes:
      "Preliminary takeoff only. Verify with a licensed local plumber (hydraulik).",
  },
  masonry: MASONRY_MARKET_REGISTRY["PL"],
  drywall: DRYWALL_MARKET_PROFILES["PL"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["PL"],
  wallFinishing: WALLFIN_COUNTRY_MAP["PL"],
};
