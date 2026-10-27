/**
 * FRELUX market bundle: AE.
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

export const AE: MarketBundle = {
  code: "AE",
  electrical: {
    marketCode: "AE",
    name: "United Arab Emirates (DEWA / ADDC)",
    standardsRef:
      "DEWA Regulations for Electrical Installations & BS 7671 / IEC 60364",
    nominalVoltage: "230V single-phase / 400V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Single-core copper conductors (Low Smoke Zero Halogen - LSZH / LSF 450/750V) drawn in rigid high-impact PVC conduits embedded in concrete",
    lightingConductorSize: "2.5 mm² Cu (10A / 16A MCB)",
    socketConductorSize:
      "4.0 mm² Cu (32A ring circuit or 20A radial circuit feeding BS 1363 Type G sockets)",
    dedicatedConductorSize:
      "6.0 mm² to 10.0 mm² Cu (Direct expansion A/C split units and kitchen appliances)",
    boxType:
      "Class 4 corrosion-resistant galvanized steel boxes (BS 4662) with grounding screw",
    protectionDevices:
      "Split-bus distribution board with separate 30mA RCDs for power sockets and 100mA/300mA for lighting and HVAC",
    cableReelSize: "100 m coil",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. High ambient temperature derating is mandatory. Installations require inspection and energization clearance by DEWA (Dubai) or ADDC (Abu Dhabi).",
  },
  plumbing: {
    marketCode: "AE",
    name: "United Arab Emirates (Dubai Building Code / BS EN 12056)",
    standardsRef:
      "Dubai Building Code 2021 (Part H Plumbing) & BS EN 806 / BS EN 12056",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PPR-C Type 3 or multi-layer PEX-Al-PEX / Copper tubes (BS EN 1057)",
    drainageDwvMaterial:
      "Acoustic uPVC / mineral-reinforced polypropylene (PP-MD) silent drainage pipes",
    typicalColdSupplyPipeSize: "25 mm OD (PN 20) PPR / DN 20 multi-layer pipe",
    typicalHotSupplyPipeSize:
      "25 mm OD insulated PPR / DN 20 insulated multi-layer pipe",
    typicalBranchWastePipeSize: "40 mm / 50 mm OD uPVC acoustic waste pipes",
    typicalSoilDrainPipeSize:
      "110 mm OD acoustic soil stack and underground drainage pipe",
    drainageSlopeRule:
      "1:50 (2%) minimum slope for branch pipes; 1:60 to 1:100 for main collection headers",
    standardPipePurchasingLength:
      "4 m lengths for PPR; 3 m / 5 m lengths for acoustic drainage pipes",
    notes:
      "Preliminary takeoff only. Cold water supply requires temperature regulation / chiller loop integration to prevent tap water exceeding 35°C in summer.",
  },
  masonry: MASONRY_MARKET_REGISTRY["AE"],
  drywall: DRYWALL_MARKET_PROFILES["AE"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["AE"],
  wallFinishing: WALLFIN_COUNTRY_MAP["AE"],
};
