/**
 * FRELUX market bundle: DE.
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

export const DE: MarketBundle = {
  code: "DE",
  electrical: {
    marketCode: "DE",
    name: "Germany (DIN VDE 0100)",
    standardsRef: "DIN VDE 0100 / DIN 18015",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "NYM-J sheathed cable installed under plaster or in flexible conduit (Leerrohr)",
    lightingConductorSize: "1.5 mm² NYM-J Cu",
    socketConductorSize:
      "2.5 mm² or 1.5 mm² NYM-J Cu (16A B-characteristic MCB)",
    dedicatedConductorSize: "2.5 mm² to 6.0 mm² NYM-J (Herdanschluss 5x2.5mm²)",
    boxType:
      "Gerätedosen (60mm / 68mm Kaiser hollow-wall or flush masonry boxes)",
    protectionDevices:
      "Verteiler with RCD (FI-Schalter 30mA) + Leitungsschutzschalter (MCB)",
    cableReelSize: "50 m or 100 m rings",
    conduitRequired: true,
    notes:
      "Installationszonen (DIN 18015-3) strictly prescribe horizontal and vertical wiring paths.",
  },
  plumbing: {
    marketCode: "DE",
    name: "Germany (DIN 1988 / DIN EN 12056)",
    standardsRef: "DIN 1988 (TRWI) & DIN EN 12056 / DIN 1986-100",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Mehrschichtverbundrohr (multi-layer composite pipe / PEX-Al-PEX) or Edelstahl (stainless steel)",
    drainageDwvMaterial:
      "HT-Rohr (Polypropylen Schwerentflammbar / DIN EN 1451-1) or Schallschutzrohr (silence pipe)",
    typicalColdSupplyPipeSize:
      "DN 15 (16x2.0 mm) / DN 20 (20x2.0 mm) Verbundrohr",
    typicalHotSupplyPipeSize: "DN 15 / DN 20 mit Isolierung nach GEG",
    typicalBranchWastePipeSize: "DN 40 / DN 50 HT-Rohr",
    typicalSoilDrainPipeSize: "DN 90 or DN 100 / 110 HT-Rohr Fallleitung",
    drainageSlopeRule:
      "Mindestgefälle 1:100 (1%) bis 1:50 (2%) nach DIN 1986-100",
    standardPipePurchasingLength:
      "0.25 m bis 2.0 m HT-Rohr Stangen; Verbundrohr in 50 m Ringen",
    notes:
      "Dämmung nach Gebäudeenergiegesetz (GEG) ist für Warm- und Kaltwasserleitungen vorgeschrieben.",
  },
  masonry: MASONRY_MARKET_REGISTRY["DE"],
  drywall: DRYWALL_MARKET_PROFILES["DE"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["DE"],
  wallFinishing: WALLFIN_COUNTRY_MAP["DE"],
};
