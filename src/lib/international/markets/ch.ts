/**
 * FRELUX market bundle: CH.
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

export const CH: MarketBundle = {
  code: "CH",
  electrical: {
    marketCode: "CH",
    name: "Switzerland (NIN 4638 / SN 4638)",
    standardsRef:
      "NIN 4638 (SN 4638) Niederspannungsinstallationen; IEC 60364-based",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu conductors in embedded conduit/tubes or planning cable within stud and blockwork",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits (10A Swiss circuits)",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType:
      "Flush junction boxes (Abzweigdosen) with SEV 1011 type J 3-pin socket frames",
    protectionDevices: "FI-Schutzschalter (RCD) 30mA plus MCB panel per NIN",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Swiss installations use the SEV 1011 3-pin socket format and 10A circuits; consult a licensed installer (Elektroinstallateur).",
  },
  plumbing: {
    marketCode: "CH",
    name: "Switzerland (SVGW W3 / SIA 385)",
    standardsRef:
      "SVGW W3 (Leitfaden Wasser); SIA 385; SN EN 806 / SN EN 12056",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PEX (SN EN ISO 15875) or multilayer (ISO 21003); Cu legacy",
    drainageDwvMaterial: "PP silent-core (SN EN 1451) or PVC-U (SN EN 1329)",
    typicalColdSupplyPipeSize: "16 mm / 20 mm branches, 25 mm risers",
    typicalHotSupplyPipeSize:
      "16 mm / 20 mm insulated (legionella-safe circulation per SIA 385)",
    typicalBranchWastePipeSize: "40 mm and 50 mm waste",
    typicalSoilDrainPipeSize: "110 mm OD soil stack",
    drainageSlopeRule: "Minimum 1:50 (2%) per SN EN 12056",
    standardPipePurchasingLength: "PEX coils; 3 m PP/PVC bars",
    notes:
      "Preliminary takeoff only. Verify with a licensed plumber (Sanitärinstallateur).",
  },
  masonry: MASONRY_MARKET_REGISTRY["CH"],
  drywall: DRYWALL_MARKET_PROFILES["CH"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["CH"],
  wallFinishing: WALLFIN_COUNTRY_MAP["CH"],
};
