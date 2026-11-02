/**
 * FRELUX market bundle: KE.
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

export const KE: MarketBundle = {
  code: "KE",
  electrical: {
    marketCode: "KE",
    name: "Kenya (EPRA / KS IEC 60364)",
    standardsRef: "Energy Act 2019, KS IEC 60364 & BS 7671 (IET 18th Edition)",
    nominalVoltage: "240V single-phase / 415V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Single-core PVC insulated copper cables drawn into heavy-gauge PVC conduit embedded in masonry walls and concrete slabs",
    lightingConductorSize: "1.5 mm² Cu (10A breaker)",
    socketConductorSize: "2.5 mm² Cu (32A ring circuit or 20A radial circuit)",
    dedicatedConductorSize:
      "4.0 mm² Cu (Instant showers), 6.0 mm² Cu (cooker / master DB)",
    boxType: "Galvanised metal back boxes (BS 4662) with brass earth terminal",
    protectionDevices:
      "Consumer unit with 100A double-pole isolator, 30mA RCD, and MCBs",
    cableReelSize: "100 m coil",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Installation must be carried out by an EPRA (Energy and Petroleum Regulatory Authority) licensed electrician.",
  },
  plumbing: {
    marketCode: "KE",
    name: "Kenya (KS 06-149 / BS EN 12056)",
    standardsRef:
      "KS 06-149 (Plastics pipes for water supply), KS 06-150 & BS EN 12056",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PPR-C (DIN 8077/8078) heat-fusion welded pipes or HDPE PN16",
    drainageDwvMaterial:
      "Golden brown / grey uPVC soil and waste pipes (KS 06-150)",
    typicalColdSupplyPipeSize: "25 mm OD (PN16) PPR pipe",
    typicalHotSupplyPipeSize: "25 mm OD (PN20) insulated PPR pipe",
    typicalBranchWastePipeSize:
      "40 mm (1.5 inch) and 50 mm (2 inch) uPVC waste pipe",
    typicalSoilDrainPipeSize: "110 mm (4 inch) OD uPVC soil pipe",
    drainageSlopeRule:
      "1:50 (2%) minimum fall for soil pipes; 1:40 (2.5%) for waste lines",
    standardPipePurchasingLength:
      "4 m lengths for PPR; 3 m or 6 m lengths for uPVC",
    notes:
      "Preliminary takeoff only. Standard installation incorporates high-level rooftop break tanks and automated pressure booster pump sets.",
  },
  masonry: MASONRY_MARKET_REGISTRY["KE"],
  drywall: DRYWALL_MARKET_PROFILES["KE"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["KE"],
  wallFinishing: WALLFIN_COUNTRY_MAP["KE"],
};
