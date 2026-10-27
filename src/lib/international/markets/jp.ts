/**
 * FRELUX market bundle: JP.
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

export const JP: MarketBundle = {
  code: "JP",
  electrical: {
    marketCode: "JP",
    name: "Japan (DENAN Law / JIS C 8305)",
    standardsRef:
      "Electrical Appliance and Material Safety Law (DENAN), JIS C 8305 & JIS C 3342",
    nominalVoltage:
      "100V single-phase (100V/200V split-phase for air conditioners)",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Flat vinyl insulated vinyl sheathed cable (Type VVF 600V) stapled directly inside timber post-and-beam frame cavities",
    lightingConductorSize: "1.6 mm solid copper conductor (15A circuit)",
    socketConductorSize:
      "2.0 mm solid copper conductor (20A branch circuit for 100V Type A/B JIS outlets)",
    dedicatedConductorSize:
      "2.6 mm solid or 5.5 mm² stranded Cu (200V high-capacity heat pump / induction cooker)",
    boxType:
      "Synthetic resin modular switch boxes (JIS C 8435) with slide-in brackets",
    protectionDevices:
      "Residential distribution board with high-speed earth leakage breaker (ELB 30mA) and 20A compact branch breakers",
    cableReelSize: "100 m coil",
    conduitRequired: false,
    notes:
      "Preliminary takeoff only. Low voltage 100V systems require higher amperage conductors (solid 1.6mm/2.0mm) to minimize voltage drop. Licensed Electrician (Dai-ni-shu Denki Kojishi) is mandatory.",
  },
  plumbing: {
    marketCode: "JP",
    name: "Japan (JIS S 3200 / SHASE-S 206)",
    standardsRef:
      "JIS S 3200 (Water Supply Equipment), SHASE-S 206 & Waterworks Law (Suido-ho)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Cross-linked polyethylene pipe (JIS K 6769 PEX) with central header distribution (Sayakan header system)",
    drainageDwvMaterial:
      "Rigid polyvinyl chloride pipe for drainage (JIS K 6741 VP / VU pipe) or fire-resistant soundproof VP pipes",
    typicalColdSupplyPipeSize: "13A (13 mm ID) PEX branch pipe from 20A header",
    typicalHotSupplyPipeSize:
      "13A (13 mm ID) insulated PEX branch pipe from 20A header",
    typicalBranchWastePipeSize: "40A / 50A rigid VP drainage pipe",
    typicalSoilDrainPipeSize: "75A or 100A rigid VU/VP drainage pipe",
    drainageSlopeRule:
      "1:50 (2%) for sizes <= 50A; 1:100 (1%) for sizes >= 75A",
    standardPipePurchasingLength:
      "4 m straight lengths for VP/VU pipes; 30 m / 60 m coils with pre-sheathed CD pipe for PEX",
    notes:
      "Preliminary takeoff only. Central manifold / header plumbing system (Sayakan header method) enables easy renewal and prevents pipe joints under slab. Designated Water Supply Works Contractor certification is mandatory.",
  },
  masonry: MASONRY_MARKET_REGISTRY["JP"],
  drywall: DRYWALL_MARKET_PROFILES["JP"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["JP"],
  wallFinishing: WALLFIN_COUNTRY_MAP["JP"],
};
