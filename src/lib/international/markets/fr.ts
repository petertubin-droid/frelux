/**
 * FRELUX market bundle: FR.
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

export const FR: MarketBundle = {
  code: "FR",
  electrical: {
    marketCode: "FR",
    name: "France (NF C 15-100)",
    standardsRef:
      "Norme NF C 15-100 (Installations électriques à basse tension)",
    nominalVoltage: "230V single-phase / 400V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Rigid single-core H07V-U conductors pre-drawn in corrugated ICTA conduit (gaine ICTA) embedded in screed, partitions, or suspended ceilings",
    lightingConductorSize:
      "1.5 mm² Cu (Disjoncteur 16A, max 8 socles/points lumineux par circuit)",
    socketConductorSize:
      "2.5 mm² Cu (Disjoncteur 20A, max 12 prises de courant Type E)",
    dedicatedConductorSize:
      "2.5 mm² Cu (four, lave-vaisselle, lave-linge), 6.0 mm² Cu (plaque de cuisson 32A)",
    boxType:
      "Boîtes d'encastrement étanches à l'air (RT2012 / RE2020) type Batibox Ø67 mm",
    protectionDevices:
      "Tableau électrique avec interrupteurs différentiels 30mA (Type AC et Type A obligatoire) et disjoncteurs divisionnaires phase+neutre",
    cableReelSize: "100 m couronne",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Attestation de conformité Consuel (Comité National pour la Sécurité des Usagers de l'Électricité) is mandatory before ENEDIS grid connection.",
  },
  plumbing: {
    marketCode: "FR",
    name: "France (DTU 60.1 / DTU 60.11)",
    standardsRef:
      "NF DTU 60.1 (Plomberie sanitaire pour bâtiments) & NF DTU 60.11 (Règles de calcul)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Tubes multicouche PE-RT/AL/PE-RT avec raccords à sertir, ou cuivre écroui (NF EN 1057)",
    drainageDwvMaterial:
      "Tubes en PVC rigide assainissement / évacuation sans pression (NF Me)",
    typicalColdSupplyPipeSize:
      "DN 16/20 multicouche (16x2.0 mm / 20x2.0 mm) depuis collecteur nourrisse",
    typicalHotSupplyPipeSize:
      "DN 16/20 multicouche isolé thermiquement (gaine calorifuge)",
    typicalBranchWastePipeSize:
      "Ø32 mm (lavabo/bidet), Ø40 mm (évier/douche/baignoire), Ø50 mm (collecteur secondaire)",
    typicalSoilDrainPipeSize:
      "Ø100 mm PVC évacuation pour WC et descente eaux vannes",
    drainageSlopeRule:
      "Pente minimale de 1 cm/m à 2 cm/m (1% à 2%) sans contre-pente",
    standardPipePurchasingLength:
      "Barres de 4 m pour tubes PVC et multicouche; couronnes de 25m/50m",
    notes:
      "Preliminary takeoff only. Sizing by unit loads (Unités de Débit per DTU 60.11). Anti-water-hammer devices and sanitary backflow prevention (Disconnecteur NF) required.",
  },
  masonry: MASONRY_MARKET_REGISTRY["FR"],
  drywall: DRYWALL_MARKET_PROFILES["FR"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["FR"],
  wallFinishing: WALLFIN_COUNTRY_MAP["FR"],
};
