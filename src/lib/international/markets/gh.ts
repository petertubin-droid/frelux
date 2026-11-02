/**
 * FRELUX market bundle: GH.
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

export const GH: MarketBundle = {
  code: "GH",
  electrical: {
    marketCode: "GH",
    name: "Ghana (Energy Commission / L.I. 2008)",
    standardsRef:
      "Ghana Electrical Wiring Regulations (L.I. 2008) & GS IEC 60364",
    nominalVoltage: "230V single-phase / 400V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Single-core PVC insulated copper conductors drawn into surface or concealed rigid high-impact PVC conduit",
    lightingConductorSize: "1.5 mm² Cu (10A circuit)",
    socketConductorSize:
      "2.5 mm² Cu (radial or ring branch to BS 1363 13A outlets)",
    dedicatedConductorSize:
      "4.0 mm² to 6.0 mm² Cu (A/C units, cooker units, water heaters)",
    boxType:
      "BS 4662 standard 3x3 inch galvanised steel knock-out boxes or PVC surface boxes",
    protectionDevices:
      "Type B/C MCBs with 30mA RCD / RCBO main incomer protection",
    cableReelSize: "100 m coil",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Certified Electrical Wiring Practitioner (CEWP) licensed by Energy Commission Ghana is legally required for installation and meter commissioning.",
  },
  plumbing: {
    marketCode: "GH",
    name: "Ghana (GS 522 / BS EN 12056)",
    standardsRef:
      "Ghana Standard GS 522, BS EN 806 (Water Supply) & BS EN 12056 (Drainage)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Polypropylene Random Copolymer (PPR-C Type 3) or HDPE pipes",
    drainageDwvMaterial: "uPVC solvent-weld soil, waste, and ventilating pipes",
    typicalColdSupplyPipeSize: "25 mm OD (PN 16 / PN 20) PPR pipe",
    typicalHotSupplyPipeSize: "25 mm OD (PN 20 / PN 25) insulated PPR pipe",
    typicalBranchWastePipeSize: "40 mm / 50 mm OD uPVC waste pipe",
    typicalSoilDrainPipeSize:
      "110 mm OD uPVC soil pipe (Class 4 / normal duty)",
    drainageSlopeRule:
      "1:50 (2.0%) minimum fall for underground drains and soil lines",
    standardPipePurchasingLength: "4 m straight lengths for PPR and uPVC",
    notes:
      "Preliminary takeoff only. Sizing accounts for gravity feed from elevated overhead poly tanks (e.g. PolyTank 1000L-3000L) common in Ghanaian water supply systems.",
  },
  masonry: MASONRY_MARKET_REGISTRY["GH"],
  drywall: DRYWALL_MARKET_PROFILES["GH"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["GH"],
  wallFinishing: WALLFIN_COUNTRY_MAP["GH"],
};
