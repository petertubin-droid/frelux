/**
 * FRELUX market bundle: TZ.
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

export const TZ: MarketBundle = {
  code: "TZ",
  electrical: {
    marketCode: "TZ",
    name: "Tanzania (TANESCO supply / BS-influenced practice)",
    standardsRef:
      "TANESCO supply rules; IEC 60364 / BS 7671-influenced wiring practice",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu singles or flat twin-and-earth in embedded conduit / capped chase (masonry)",
    lightingConductorSize: "1.0 mm² or 1.5 mm² Cu radial",
    socketConductorSize:
      "2.5 mm² Cu radial circuits (BS 1363 13A socket outlets common)",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType:
      "Flush steel/PVC boxes in blockwork; surface boxes on painted walls",
    protectionDevices: "30mA RCD on socket circuits plus MCB consumer unit",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. British-legacy BS 1363 sockets and radial (not ring) circuits are typical. Verify with a licensed local electrician.",
  },
  plumbing: {
    marketCode: "TZ",
    name: "Tanzania (TBS / TZS pipe standards)",
    standardsRef:
      "TBS TZS plastics piping standards; BS EN 1329 / BS EN 12056 drainage practice",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PPR (EN ISO 15874) heat-fusion or HDPE PN16 supply mains",
    drainageDwvMaterial:
      "uPVC soil and waste pipes (BS EN 1329 heritage sizing)",
    typicalColdSupplyPipeSize: "25 mm OD PPR trunk, 20 mm branches",
    typicalHotSupplyPipeSize: "25 mm OD insulated PPR (PN20)",
    typicalBranchWastePipeSize: "40 mm and 50 mm uPVC waste",
    typicalSoilDrainPipeSize: "110 mm OD uPVC soil pipe",
    drainageSlopeRule: "1:50 (2%) typical fall per BS EN 12056 influence",
    standardPipePurchasingLength: "4 m PPR; 3 m or 6 m uPVC",
    notes:
      "Preliminary takeoff only. Overhead tanks plus pressure pumps are standard practice; verify with a licensed local plumber.",
  },
  masonry: MASONRY_MARKET_REGISTRY["TZ"],
  drywall: DRYWALL_MARKET_PROFILES["TZ"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["TZ"],
  wallFinishing: WALLFIN_COUNTRY_MAP["TZ"],
};
