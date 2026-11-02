/**
 * FRELUX market bundle: IT.
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

export const IT: MarketBundle = {
  code: "IT",
  electrical: {
    marketCode: "IT",
    name: "Italy (CEI 64-8)",
    standardsRef:
      "Norma CEI 64-8 (Impianti elettrici utilizzatori a tensione nominale non superiore a 1000V)",
    nominalVoltage: "230V single-phase / 400V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Unipolar flexible copper wire FS18 / FG16 (CPR compliant) drawn inside corrugated PVC conduit (Tubo corrugato pieghevole) embedded in floors and walls",
    lightingConductorSize: "1.5 mm² Cu (Interruttore magnetotermico 10A)",
    socketConductorSize:
      "2.5 mm² Cu (Interruttore magnetotermico 16A per prese 10/16A Bipasso e Schuko tipo L/F)",
    dedicatedConductorSize:
      "4.0 mm² Cu (Climatizzatori, lavatrice), 6.0 mm² Cu (Piano cottura a induzione 32A)",
    boxType:
      "Scatole di derivazione e scatole portafrutti a 3 o 4 moduli tipo 503 / 504 per serie civili",
    protectionDevices:
      "Quadro elettrico con interruttore generale differenziale puro 30mA (Tipo A/F) e interruttori magnetotermici (MT 10A e 16A) separati luce/forza",
    cableReelSize: "100 m matassa",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Standard Italian Livello 1/2/3 classification per CEI 64-8. Mandatory Dichiarazione di Conformità (Di.Co.) per DM 37/08 is legally required.",
  },
  plumbing: {
    marketCode: "IT",
    name: "Italy (UNI 9182 / UNI EN 12056)",
    standardsRef:
      "Norma UNI 9182 (Impianti di alimentazione e distribuzione d'acqua fredda e calda) & UNI EN 12056",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Tubo multistrato PE-RT/AL/PE-RT con anima in alluminio e raccordi a pressare, o rame coibentato",
    drainageDwvMaterial:
      "Tubi in PVC rigido serie scarico o tubi silenziati a innesto in polipropilene (PP insonorizzato)",
    typicalColdSupplyPipeSize:
      "Ø16 mm / Ø20 mm multistrato con guaina corrugata da collettore complanare",
    typicalHotSupplyPipeSize:
      "Ø16 mm / Ø20 mm multistrato isolato termicamente con spessore anticondensa",
    typicalBranchWastePipeSize:
      "Ø40 mm (lavabo/bidet), Ø50 mm (scarico doccia e cucina)",
    typicalSoilDrainPipeSize:
      "Ø90 mm o Ø110 mm per vaso WC e colonna di scarico principale",
    drainageSlopeRule:
      "Pendenza costante minima dell'1,5% - 2% (1,5 - 2 cm per metro lineare)",
    standardPipePurchasingLength:
      "Verghe da 4 m per tubi di scarico; rotoli da 50 m per tubo multistrato",
    notes:
      "Preliminary takeoff only. Central manifold system (collettore complanare di distribuzione) inside wall inspection box. Dichiarazione di Conformità (DM 37/08) required.",
  },
  masonry: MASONRY_MARKET_REGISTRY["IT"],
  drywall: DRYWALL_MARKET_PROFILES["IT"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["IT"],
  wallFinishing: WALLFIN_COUNTRY_MAP["IT"],
};
