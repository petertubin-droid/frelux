/**
 * FRELUX market bundle: KR.
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

export const KR: MarketBundle = {
  code: "KR",
  electrical: {
    marketCode: "KR",
    name: "South Korea (KEC / KS C)",
    standardsRef: "Korea Electro-technical Code (KEC 2021) & KS C IEC 60364",
    nominalVoltage: "220V single-phase / 380V three-phase",
    frequencyHz: 60,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "HFIX (Halogen-free flame retardant polyolefin cross-linked insulated wire 450/750V) pulled into CD (combustible synthetic resin) conduit embedded in slabs",
    lightingConductorSize:
      "1.5 mm² or 2.5 mm² Cu (HFIX 1.5/2.5 mm², 15A/20A breaker)",
    socketConductorSize:
      "2.5 mm² Cu (HFIX 2.5 mm², 20A circuit for Type F 16A flush safety outlets)",
    dedicatedConductorSize:
      "4.0 mm² Cu (Induction cooktops, system air conditioners), 6.0 mm² Cu (Main distribution feeder)",
    boxType:
      "Steel / synthetic resin modular switch and outlet back boxes (Mae-ip-heung Sp-box)",
    protectionDevices:
      "Residential distribution panel equipped with main molded case circuit breaker (MCCB) and sensitive residual current breakers (ELB 30mA 0.03s)",
    cableReelSize: "100 m coil",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. KEC regulations require halogen-free HFIX wire in residential buildings to prevent toxic smoke in fire emergencies.",
  },
  plumbing: {
    marketCode: "KR",
    name: "South Korea (KCS 31 20 / KS B)",
    standardsRef:
      "Korean Construction Specification (KCS 31 20 Plumbing Work) & KS B 1538",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Polybutylene (PB) pipe or Cross-linked polyethylene (XL / PE-Xa) pipe with central distribution manifold",
    drainageDwvMaterial:
      "Rigid PVC pipe (VG1 / VG2) or cast iron drain pipe with acoustic clamp joints",
    typicalColdSupplyPipeSize: "16 mm OD (PB 15A / 16A) pipe from manifold",
    typicalHotSupplyPipeSize:
      "16 mm OD insulated (PB 15A / 16A) pipe from boiler manifold",
    typicalBranchWastePipeSize: "50 mm OD (VG2 50A) PVC waste pipe",
    typicalSoilDrainPipeSize: "100 mm OD (VG1 100A) thick-wall PVC soil pipe",
    drainageSlopeRule:
      "1:50 (2%) slope for pipe diameters <= 65 mm; 1:100 (1%) for 100 mm",
    standardPipePurchasingLength:
      "4 m straight lengths for PVC; 100 m coils for PB / XL pipes",
    notes:
      "Preliminary takeoff only. Hot water supply is centrally coupled with individual gas boiler hydronic floor heating (Ondol) manifolds.",
  },
  masonry: MASONRY_MARKET_REGISTRY["KR"],
  drywall: DRYWALL_MARKET_PROFILES["KR"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["KR"],
  wallFinishing: WALLFIN_COUNTRY_MAP["KR"],
};
