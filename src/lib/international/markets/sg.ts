/**
 * FRELUX market bundle: SG.
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

export const SG: MarketBundle = {
  code: "SG",
  electrical: {
    marketCode: "SG",
    name: "Singapore (SS 638 / Energy Market Authority)",
    standardsRef:
      "SS 638:2018 (formerly CP 5 - Code of practice for electrical installations) & SS 246",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "PVC insulated Cu cables (SS 358-3 / BS 6004) enclosed in surface or concealed high-impact uPVC/steel conduit",
    lightingConductorSize: "1.5 mm² single-core Cu in conduit (SS 358-3)",
    socketConductorSize:
      "2.5 mm² single-core Cu in conduit (typically 32A ring final or 20A radial)",
    dedicatedConductorSize:
      "4.0 mm² to 10.0 mm² Cu (air-con compressor, induction hob, storage water heater)",
    boxType:
      "Galvanized steel flush boxes or surface uPVC patress boxes (SS 246)",
    protectionDevices:
      "Consumer unit with 30mA Type A/AC RCCB and miniature circuit breakers (MCBs)",
    cableReelSize: "100 m coil",
    conduitRequired: true,
    notes:
      "Singapore EMA regulations mandate all concealed and surface residential wiring be drawn through conduit or trunking. HDB renovations strictly prohibit hacking of structural precast walls.",
  },
  plumbing: {
    marketCode: "SG",
    name: "Singapore (PUB Code of Practice on Water Services / SS 675)",
    standardsRef:
      "PUB Singapore Public Utilities (Water Supply) Regulations, SS 675 / SS 213 (Sanitary drainage)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Copper pipe (SS 245 / BS EN 1057) or Stainless steel Grade 316 (SS 508 / BS EN 10312)",
    drainageDwvMaterial:
      "uPVC soil and waste pipe (SS 213 / BS EN 1329) or cast iron for commercial discharge stacks",
    typicalColdSupplyPipeSize:
      "Ø22 mm main incoming to consumer gate valve, Ø15 mm branch runs to fittings",
    typicalHotSupplyPipeSize:
      "Ø15 mm or Ø22 mm copper / stainless steel pipe with thermal lagging",
    typicalBranchWastePipeSize:
      "Ø32 mm (wash basin), Ø40 mm (kitchen sink), Ø50 mm (floor trap waste discharge)",
    typicalSoilDrainPipeSize:
      "Ø100 mm / Ø110 mm uPVC discharge pipe connected to ventilated soil stack",
    drainageSlopeRule:
      "1:40 to 1:60 fall (minimum 1.6% to 2.5% gradient per SS 675 Code of Practice)",
    standardPipePurchasingLength:
      "6 m lengths for copper/stainless steel or 5.8 m for uPVC drainage pipes",
    notes:
      "Strict PUB water efficiency labelling scheme (WELS) mandatory for all sanitary fitting discharge rates. HDB flats require specific approved coring locations and floor trap connections.",
  },
  masonry: MASONRY_MARKET_REGISTRY["SG"],
  drywall: DRYWALL_MARKET_PROFILES["SG"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["SG"],
  wallFinishing: WALLFIN_COUNTRY_MAP["SG"],
};
