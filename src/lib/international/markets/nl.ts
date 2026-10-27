/**
 * FRELUX market bundle: NL.
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

export const NL: MarketBundle = {
  code: "NL",
  electrical: {
    marketCode: "NL",
    name: "Netherlands (NEN 1010)",
    standardsRef:
      "NEN 1010 (Dutch national electrical safety standard, IEC 60364-based)",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu wiring pulled through floor conduit systems (broedplaatsen) and embedded wall conduit to central ceiling boxes",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType: "Flush mounting boxes (inbouwdozen) with shuttered socket frames",
    protectionDevices:
      "30mA aardlekschakelaar (RCD) plus MCB consumer unit per NEN 1010",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Dutch practice routes wiring through accessible floor conduit to central connection points; RCD protection is mandatory. Consult a licensed installer (installateur).",
  },
  plumbing: {
    marketCode: "NL",
    name: "Netherlands (NEN 1006 / Waterwerkbladen)",
    standardsRef: "NEN 1006 + Kiwa Waterwerkbladen; NEN-EN 806, NEN-EN 12056",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PEX (NEN-EN ISO 15875) or multilayer (ISO 21003), sleeved in walls/floors",
    drainageDwvMaterial:
      "PVC-U waste (NEN-EN 1329); PP silent soil (NEN-EN 1451)",
    typicalColdSupplyPipeSize: "16 mm PEX branches, 20 mm risers",
    typicalHotSupplyPipeSize: "16 mm / 20 mm insulated PEX",
    typicalBranchWastePipeSize: "40 mm and 50 mm PVC-U waste",
    typicalSoilDrainPipeSize: "110 mm OD soil stack",
    drainageSlopeRule:
      "Minimum 1:50 (2%) or self-cleaning velocity per NEN-EN 12056",
    standardPipePurchasingLength: "50 m / 100 m PEX coils; 3 m PVC bars",
    notes:
      "Preliminary takeoff only. Dutch practice sleeves supply piping in walls and floors for replaceability; verify with a licensed installer (installateur).",
  },
  masonry: MASONRY_MARKET_REGISTRY["NL"],
  drywall: DRYWALL_MARKET_PROFILES["NL"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["NL"],
  wallFinishing: WALLFIN_COUNTRY_MAP["NL"],
};
