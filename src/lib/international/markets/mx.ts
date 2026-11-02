/**
 * FRELUX market bundle: MX.
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

export const MX: MarketBundle = {
  code: "MX",
  electrical: {
    marketCode: "MX",
    name: "Mexico (NOM-001-SEDE-2018)",
    standardsRef:
      "NOM-001-SEDE-2018 (Instalaciones Eléctricas - Utilización) & NMX-J",
    nominalVoltage: "127V single-phase / 220V two-phase / 220V three-phase",
    frequencyHz: 60,
    measurementSystem: "imperial",
    runDistanceUnit: "ft",
    primaryWiringMethod:
      "THW-2-LS copper conductors drawn through flexible corrugated conduit (poliducto naranja / verde) or thin-wall metallic conduit (tubo conduit pared delgada)",
    lightingConductorSize: "14 AWG Cu (Interruptor termomagnético 15A)",
    socketConductorSize:
      "12 AWG Cu (Interruptor termomagnético 20A para contactos polarizados con tierra NEMA 5-15R)",
    dedicatedConductorSize:
      "10 AWG Cu (Aires acondicionados minisplit, microondas), 8 AWG Cu (Alimentador principal)",
    boxType:
      "Cajas metálicas galvanizadas cuadradas de 4x4 pulgadas con reducción a chalupa de 2x4 pulgadas",
    protectionDevices:
      "Centro de carga (Load center tipo QO) con interruptor principal y disyuntores termomagnéticos enchufables de 1 polo y 2 polos",
    cableReelSize: "100 m roll",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Uses North American AWG sizing and 127V 60Hz. Large voltage drop on long 127V circuits requires upsizing to 12 AWG minimum for all branch receptacles.",
  },
  plumbing: {
    marketCode: "MX",
    name: "Mexico (NOM-001-CONAGUA / NTC-Plomería)",
    standardsRef:
      "NOM-001-CONAGUA-2011 (Sistemas de agua potable y alcantarillado) & NMX-E-181-CNCP",
    measurementSystem: "imperial",
    runDistanceUnit: "ft",
    nominalSizingFormat: "imperial_nominal_cts",
    waterSupplyMaterial:
      "Tubería de CPVC (FlowGuard Gold) o polipropileno copolímero aleatorio (Tuboplus PPR termofusión)",
    drainageDwvMaterial:
      "Tubería de PVC sanitario blanco para desagüe y ventilación (NMX-E-199)",
    typicalColdSupplyPipeSize:
      "1/2 pulgada (13 mm) o 3/4 pulgada (19 mm) CPVC / Tuboplus 20/25 mm",
    typicalHotSupplyPipeSize:
      "1/2 pulgada o 3/4 pulgada CPVC alta temperatura / Tuboplus PN-20",
    typicalBranchWastePipeSize:
      "2 pulgadas (50 mm) PVC sanitario para lavabos, regaderas y fregaderos",
    typicalSoilDrainPipeSize:
      "4 pulgadas (100 mm) PVC sanitario para bajadas de inodoros (WC)",
    drainageSlopeRule:
      "2% uniforme (2 cm de desnivel por cada metro de longitud)",
    standardPipePurchasingLength:
      "Tramos rectos de 3.05 m o 6.0 m para CPVC y PVC sanitario",
    notes:
      "Preliminary takeoff only. Standard Mexican residential systems incorporate an underground cistern (cisterna de 2500L-5000L) with submerged or surface pump, lifting water to a rooftop gravity tinaco (Rotoplas 750L-1100L).",
  },
  masonry: MASONRY_MARKET_REGISTRY["MX"],
  drywall: DRYWALL_MARKET_PROFILES["MX"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["MX"],
  wallFinishing: WALLFIN_COUNTRY_MAP["MX"],
};
