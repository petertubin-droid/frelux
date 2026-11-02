/**
 * FRELUX market bundle: BR.
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

export const BR: MarketBundle = {
  code: "BR",
  electrical: {
    marketCode: "BR",
    name: "Brazil (ABNT NBR 5410)",
    standardsRef: "ABNT NBR 5410 (Instalações elétricas de baixa tensão)",
    nominalVoltage: "127V / 220V (regional dual voltage) 60Hz",
    frequencyHz: 60,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Flexible thermoplastic copper conductors (Cabo flexível 750V / 1000V) drawn in yellow/orange corrugated PVC conduit (Eletroduto corrugado flexível)",
    lightingConductorSize: "1.5 mm² Cu (Disjuntor 10A / 15A)",
    socketConductorSize:
      "2.5 mm² Cu (Tomadas de Uso Geral - TUG 10A / 20A per NBR 14136)",
    dedicatedConductorSize:
      "4.0 mm² ou 6.0 mm² Cu (Tomadas de Uso Específico - TUE, especialmente Chuveiro Elétrico 5500W-7500W)",
    boxType:
      "Caixas de embutir 4x2 polegadas e 4x4 polegadas termoplásticas amarelas",
    protectionDevices:
      "Quadro de distribuição com disjuntor geral DIN, dispositivo DR (Diferencial Residual 30mA) e DPS (Dispositivo de Proteção contra Surtos)",
    cableReelSize: "100 m rolo",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Dual 127V/220V regional systems require explicit circuit separation. High current draws for electric showers (chuveiro elétrico) require dedicated 4-6 mm² circuits.",
  },
  plumbing: {
    marketCode: "BR",
    name: "Brazil (ABNT NBR 5626 / NBR 8160)",
    standardsRef:
      "ABNT NBR 5626 (Instalação predial de água fria) & ABNT NBR 8160 (Esgoto sanitário)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Tubos e conexões de PVC soldável marrom (água fria) e CPVC / PPR termofusão (água quente)",
    drainageDwvMaterial:
      "Tubos de PVC rígido série normal branco para esgoto e ventilação (NBR 5688)",
    typicalColdSupplyPipeSize:
      "DN 25 mm (3/4 inch) e DN 32 mm (1 inch) tubulação marrom soldável",
    typicalHotSupplyPipeSize: "DN 22 mm / DN 28 mm CPVC ou PPR termofusão",
    typicalBranchWastePipeSize:
      "DN 40 mm (ramal de descarga pia/lavatório) e DN 50 mm (ramal ralo sinfonado)",
    typicalSoilDrainPipeSize:
      "DN 100 mm (tubo de queda e ramal de bacia sanitária)",
    drainageSlopeRule:
      "2% para tubulações de diâmetro <= 75 mm; 1% para diâmetro de 100 mm",
    standardPipePurchasingLength:
      "Varas de 6 m ou 3 m para PVC soldável e esgoto",
    notes:
      "Preliminary takeoff only. Standard gravity water storage tank (Caixa d'água de 500L a 1000L em polietileno) installed in ceiling roof space is standard in Brazilian residences.",
  },
  masonry: MASONRY_MARKET_REGISTRY["BR"],
  drywall: DRYWALL_MARKET_PROFILES["BR"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["BR"],
  wallFinishing: WALLFIN_COUNTRY_MAP["BR"],
};
