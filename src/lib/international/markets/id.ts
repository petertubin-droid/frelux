/**
 * FRELUX market bundle: ID.
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

export const ID: MarketBundle = {
  code: "ID",
  electrical: {
    marketCode: "ID",
    name: "Indonesia (PUIL 2011 / SNI 0225)",
    standardsRef:
      "Persyaratan Umum Instalasi Listrik (PUIL 2011) & SNI 0225:2011",
    nominalVoltage: "220V single-phase / 380V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "NYM cable (sheathed copper PVC) surface/clipped or NYA single-core copper wire inside rigid PVC conduit embedded in masonry",
    lightingConductorSize: "1.5 mm² Cu (NYA / NYM 1.5 mm², 10A MCB)",
    socketConductorSize:
      "2.5 mm² Cu (NYA / NYM 2.5 mm², 16A MCB for Schuko Type C/F grounded wall outlets)",
    dedicatedConductorSize:
      "4.0 mm² Cu (AC split units and water heaters), 6.0 mm² Cu (Main intake from PLN kWh meter)",
    boxType: "Plastic inbow doos (junction box) for embedded flush mounting",
    protectionDevices:
      "Consumer unit box equipped with PLN-standard miniature circuit breakers (MCB) and 30mA Earth Leakage Circuit Breaker (ELCB)",
    cableReelSize: "50 m / 100 m roll",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Installations must comply with Perusahaan Listrik Negara (PLN) grid connection standards and Sertifikat Laik Operasi (SLO) certification.",
  },
  plumbing: {
    marketCode: "ID",
    name: "Indonesia (SNI 03-6481 / SNI 03-7065)",
    standardsRef:
      "SNI 03-6481-2000 (Sistem Plambing) & SNI 03-7065-2005 (Tata Cara Perencanaan Sistem Plambing)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Pipa PVC Kelas AW (tekanan tinggi 10 kg/cm²) atau pipa PPR-C PN-16/PN-20",
    drainageDwvMaterial:
      "Pipa PVC Kelas D (drainase air kotor/buangan) atau PVC Kelas AW untuk pipa tanah",
    typicalColdSupplyPipeSize:
      "Pipa PVC AW 3/4 inch (26 mm OD) atau PPR 25 mm OD",
    typicalHotSupplyPipeSize:
      "PPR PN-20 25 mm OD terisolasi untuk jalur pemanas air (water heater)",
    typicalBranchWastePipeSize:
      "Pipa PVC D 1.5 inch (48 mm OD) dan 2 inch (60 mm OD) untuk air bekas",
    typicalSoilDrainPipeSize:
      "Pipa PVC D / AW 4 inch (114 mm OD) untuk air kotor/tinja ke septic tank",
    drainageSlopeRule:
      "Kemiringan minimum 2% (1:50) untuk pipa buangan air kotor",
    standardPipePurchasingLength:
      "Batang 4 meter untuk seluruh pipa PVC dan PPR di pasaran lokal",
    notes:
      "Preliminary takeoff only. Standar instalasi umum melibatkan tangki tandon air (Toren / Profil Tank) di atas dak beton dengan sistem otomatis pelampung radar.",
  },
  masonry: MASONRY_MARKET_REGISTRY["ID"],
  drywall: DRYWALL_MARKET_PROFILES["ID"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["ID"],
  wallFinishing: WALLFIN_COUNTRY_MAP["ID"],
};
