/**
 * FRELUX market bundle: NZ.
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

export const NZ: MarketBundle = {
  code: "NZ",
  electrical: {
    marketCode: "NZ",
    name: "New Zealand (AS/NZS 3000 Wiring Rules)",
    standardsRef:
      "AS/NZS 3000:2018 (Australian/New Zealand Wiring Rules) + Electrical (Safety) Regulations",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "TPS (PVC-sheathed flat cable) through timber framing; conduit where exposed or underground",
    lightingConductorSize: "1.5 mm² Cu TPS",
    socketConductorSize: "2.5 mm² Cu TPS radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu TPS (oven, hob, heat pump)",
    boxType: "Flush or surface PVC boxes in framing; ceiling rose junctions",
    protectionDevices:
      "RCDs (30mA) on final subcircuits plus MCBs per AS/NZS 3000",
    cableReelSize: "100 m coils",
    conduitRequired: false,
    notes:
      "Preliminary takeoff only. TPS in framing cavities is standard; RCDs are required on final subcircuits. Type I (flat-pin) plugs. Work must be certified by a licensed electrician under NZ regulations.",
  },
  plumbing: {
    marketCode: "NZ",
    name: "New Zealand (AS/NZS 3500)",
    standardsRef:
      "AS/NZS 3500.1 (water services) & AS/NZS 3500.2 (sanitary plumbing and drainage)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PEX-A (AS/NZS 2492) or copper tube (AS 1432) with crimp/compression fittings",
    drainageDwvMaterial: "PVC-U DWV pipes and fittings (AS/NZS 1260)",
    typicalColdSupplyPipeSize:
      "DN20 (20 mm) risers, DN15 (15 mm) fixture branches",
    typicalHotSupplyPipeSize:
      "DN15 / DN20 with mandated cylinder-pipe insulation per AS/NZS 3500.4",
    typicalBranchWastePipeSize: "32 mm and 40 mm DWV",
    typicalSoilDrainPipeSize: "100 mm DWV soil stack",
    drainageSlopeRule:
      "1:100 (1%) minimum for 100 mm DWV; 1:60 (1.7%) for 80 mm per AS/NZS 3500.2",
    standardPipePurchasingLength:
      "3 m copper lengths; 50 m PEX coils; PVC DWV in cut lengths",
    notes:
      "Preliminary takeoff only. Mains-pressure systems are standard; sanitary plumbing must be done by a licensed certifying plumber under NZ rules.",
  },
  masonry: MASONRY_MARKET_REGISTRY["NZ"],
  drywall: DRYWALL_MARKET_PROFILES["NZ"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["NZ"],
  wallFinishing: WALLFIN_COUNTRY_MAP["NZ"],
};
