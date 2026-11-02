/**
 * FRELUX market bundle: SA.
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

export const SA: MarketBundle = {
  code: "SA",
  electrical: {
    marketCode: "SA",
    name: "Saudi Arabia (SBC 401 / SASO)",
    standardsRef:
      "Saudi Building Code (SBC 401 Electrical) & SASO 2203 / IEC 60364",
    nominalVoltage: "220V / 380V (or updated 230V / 400V) 60Hz",
    frequencyHz: 60,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Single-core PVC or XLPE insulated flame retardant copper wire pulled through rigid heavy-duty PVC or EMT conduits",
    lightingConductorSize: "2.5 mm² Cu (16A MCB)",
    socketConductorSize:
      "4.0 mm² Cu (20A / 32A circuit feeding SASO 2203 / BS 1363 13A shuttered receptacles)",
    dedicatedConductorSize:
      "6.0 mm² Cu (High ambient temperature split A/C units and water heaters)",
    boxType:
      "BS standard 75 x 75 mm galvanized steel back boxes with brass terminal lug",
    protectionDevices:
      "Main distribution board with 100A main circuit breaker, 30mA ELCB / RCD, and thermal-magnetic MCBs",
    cableReelSize: "100 m coil",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Due to extreme ambient temperatures (>50°C), thermal derating factors are applied, mandating 2.5 mm² for lighting and 4.0 mm² for socket circuits.",
  },
  plumbing: {
    marketCode: "SA",
    name: "Saudi Arabia (SBC 701)",
    standardsRef:
      "Saudi Building Code (SBC 701 Plumbing) & SASO / ASTM standards",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PPR-C (DIN 8077/8078) or CPVC Schedule 80 (ASTM F441) pipe and fittings",
    drainageDwvMaterial:
      "uPVC Schedule 40 or Class 4 rubber-ring solvent-weld drainage pipes",
    typicalColdSupplyPipeSize: "25 mm OD (PN20) or 32 mm OD PPR pipe",
    typicalHotSupplyPipeSize: "25 mm OD (PN25) insulated PPR pipe",
    typicalBranchWastePipeSize: "50 mm (2-inch) uPVC waste pipe",
    typicalSoilDrainPipeSize:
      "110 mm (4-inch) or 160 mm uPVC underground drainage pipe",
    drainageSlopeRule:
      "1:50 (2%) minimum uniform gradient for 110 mm soil pipes",
    standardPipePurchasingLength: "4 m straight lengths for PPR and uPVC",
    notes:
      "Preliminary takeoff only. Installations include insulated underground storage tanks and rooftop transfer pumps to combat extreme ambient heating.",
  },
  masonry: MASONRY_MARKET_REGISTRY["SA"],
  drywall: DRYWALL_MARKET_PROFILES["SA"],
  cementBagWeightKg: CEMENT_BAG_WEIGHT_BY_MARKET["SA"],
  wallFinishing: WALLFIN_COUNTRY_MAP["SA"],
};
