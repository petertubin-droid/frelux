export type MarketCode =
  | "NG"
  | "US"
  | "GB"
  | "CA"
  | "AU"
  | "DE"
  | "IN"
  | "GH"
  | "KE"
  | "ZA"
  | "JP"
  | "FR"
  | "BR"
  | "SA"
  | "AE"
  | "CN"
  | "ID"
  | "MX"
  | "KR"
  | "IT";

export type EngineClassification =
  | "independent_engine"
  | "sub_engine"
  | "shared_service"
  | "workflow_orchestration"
  | "ai_pipeline"
  | "intelligence_crawler";

export type MarketSupportStatus =
  | "verified"
  | "partially_verified"
  | "requires_local_inputs"
  | "unpriced"
  | "not_implemented"
  | "unavailable"
  | "requires_verification";

export interface MarketEngineSupport {
  status: MarketSupportStatus;
  notes: string;
  standardRef?: string;
  constructionMethod?: string;
}

export interface EngineInventoryItem {
  id: string;
  name: string;
  category:
    | "finishing"
    | "structural"
    | "mep"
    | "costing_commercial"
    | "ai_measurement"
    | "intelligence";
  classification: EngineClassification;
  sourceFiles: string[];
  consumers: string[];
  dependencies: string[];
  calculationPurpose: string;
  keyFormulas: string;
  marketAssumptions: string;
  internationalizationStatus:
    | "verified_full"
    | "verified_15_markets"
    | "partially_verified"
    | "requires_local_inputs"
    | "market_method_bound"
    | "requires_verification";
  marketMatrix: Record<MarketCode, MarketEngineSupport>;
}

export const ALL_20_MARKETS: readonly MarketCode[] = [
  "NG",
  "US",
  "GB",
  "CA",
  "AU",
  "DE",
  "IN",
  "GH",
  "KE",
  "ZA",
  "JP",
  "FR",
  "BR",
  "SA",
  "AE",
  "CN",
  "ID",
  "MX",
  "KR",
  "IT",
];
