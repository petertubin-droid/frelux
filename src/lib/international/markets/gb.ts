/**
 * FRELUX market bundle: GB.
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

export const GB: MarketBundle = {
  code: "GB",
  electrical: {
    marketCode: "GB",
    name: "United Kingdom (BS 7671 / IET 18th Edition)",
    standardsRef: "BS 7671:2018+A2:2022 (IET Wiring Regulations)",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Flat twin & earth (6242Y PVC/PVC) clipped direct or capped",
    lightingConductorSize: "1.0 mm² or 1.5 mm² 6242Y Cu",
    socketConductorSize: "2.5 mm² 6242Y Cu (32A ring final circuit)",
    dedicatedConductorSize: "4.0 mm² to 10.0 mm² 6242Y Cu (cooker, shower)",
    boxType: "Galvanized steel flush knockout boxes (25mm/35mm/47mm depth)",
    protectionDevices: "Consumer unit with Type A RCBOs or dual RCD split-load",
    cableReelSize: "50 m or 100 m drums",
    conduitRequired: false,
    notes:
      "Socket circuits typically wired as 32A ring finals; lighting as radial circuits.",
  },
  plumbing: {
    marketCode: "GB",
    name: "United Kingdom (BS EN 806 / BS EN 12056)",
    standardsRef:
      "BS EN 806 (Water services) & BS EN 12056 (Gravity drainage systems)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Copper pipe (BS EN 1057) or Barrier PB/PEX push-fit (BS 7291)",
    drainageDwvMaterial:
      "uPVC solvent-weld or push-fit waste pipe & soil stack (BS EN 1329 / BS EN 1453)",
    typicalColdSupplyPipeSize:
      "22 mm main / unvented cylinder, 15 mm fixture runs",
    typicalHotSupplyPipeSize: "22 mm distribution, 15 mm fixture runs",
    typicalBranchWastePipeSize:
      "32 mm (basin) to 40 mm (sink/shower) or 50 mm (long runs)",
    typicalSoilDrainPipeSize: "110 mm push-fit or solvent-weld uPVC soil stack",
    drainageSlopeRule:
      "18 mm/m to 44 mm/m fall (typically 1:40 to 1:80 gradient per BS EN 12056-2)",
    standardPipePurchasingLength:
      "3 m standard lengths (push-fit/copper) or 25m/50m coils for barrier pipe",
    notes: "Unvented hot water systems require certified G3 installation.",
  },
  masonry: MASONRY_MARKET_REGISTRY["GB"],
  drywall: DRYWALL_MARKET_PROFILES["GB"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["GB"],
  wallFinishing: WALLFIN_COUNTRY_MAP["GB"],
};
