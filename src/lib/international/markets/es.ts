/**
 * FRELUX market bundle: ES.
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

export const ES: MarketBundle = {
  code: "ES",
  electrical: {
    marketCode: "ES",
    name: "Spain (REBT / IEC 60364-aligned)",
    standardsRef:
      "REBT - Real Decreto 842/2002 (Reglamento Electrotécnico para Baja Tensión) + ITC-BT notes",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu singles (H07V-K / RZ1-K) in embedded corrugated PVC conduit (tubo empotrado) or surface conduit",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu (hob, oven, AC)",
    boxType: "Flush PVC junction and socket boxes (cajas de derivación)",
    protectionDevices:
      "Interruptor diferencial 30mA + PIA magnetotérmicos (per REBT ITC-BT 24/28)",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. REBT mandates 30mA differential protection and radial (not ring) circuits; Boletín B1 certification by an instalador autorizado is required to energise.",
  },
  plumbing: {
    marketCode: "ES",
    name: "Spain (CTE DB-HS5)",
    standardsRef:
      "Código Técnico de la Edificación - DB HS-5 (CTE); UNE-EN 806, UNE-EN 12056",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Multilayer PEX-Al-PEX (UNE-EN ISO 21003) or PEX-b (UNE-EN ISO 15875) with press/compression fittings",
    drainageDwvMaterial:
      "PVC-U evacuación (UNE-EN 1329) or silent-core PP (UNE-EN 1451)",
    typicalColdSupplyPipeSize: "20 mm multilayer branches, 25 mm risers",
    typicalHotSupplyPipeSize:
      "20 mm / 25 mm insulated (recirculation loops common)",
    typicalBranchWastePipeSize: "40 mm and 50 mm waste",
    typicalSoilDrainPipeSize: "110 mm OD soil pipe (bajante general)",
    drainageSlopeRule:
      "Minimum 2% (1:50) horizontal branches per CTE / UNE-EN 12056",
    standardPipePurchasingLength:
      "3 m or 5 m straight bars; 50 m / 100 m PEX coils",
    notes:
      "Preliminary takeoff only (cálculo orientativo). Isolating valves at each derivation (llaves de corte) are standard CTE practice; verify with a local installer.",
  },
  masonry: MASONRY_MARKET_REGISTRY["ES"],
  drywall: DRYWALL_MARKET_PROFILES["ES"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["ES"],
  wallFinishing: WALLFIN_COUNTRY_MAP["ES"],
};
