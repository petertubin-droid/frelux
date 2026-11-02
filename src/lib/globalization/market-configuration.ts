import { BUILTIN_MARKET_PROFILES } from "@/lib/international/market-context";
import type { MarketProfile } from "@/types/international";

export type ConfigurationValueStatus = "verified" | "configurable" | "unverified" | "not_applicable";
export type DimensionKind = "nominal" | "actual" | "modular";
export interface MasonrySpecification { id: string; name: string; lengthMm: number; widthMm: number; heightMm: number; dimensionKind: DimensionKind; mortarAllowanceIncluded: boolean; status: ConfigurationValueStatus; source: string | null }
export interface BoardSpecification { id: string; name: string; lengthMm: number; widthMm: number; thicknessMm: number; productType: string; status: ConfigurationValueStatus; source: string | null }
export interface MarketConfigurationV1 {
  schemaVersion: 1; marketCode: string; countryName: string; locale: string; configurationVersion: string;
  currency: { code: string; symbol: string; placement: "prefix" | "suffix"; decimalSeparator: string; thousandsSeparator: string };
  measurement: { defaultSystem: "metric" | "imperial" | "mixed"; supportedSystems: readonly ("metric" | "imperial")[]; defaultLengthUnit: string; defaultAreaUnit: string };
  tax: { label: string | null; ratePercent: number | null; status: ConfigurationValueStatus };
  masonrySpecifications: readonly MasonrySpecification[]; boardSpecifications: readonly BoardSpecification[];
  reinforcement: { designationSystems: readonly string[]; status: ConfigurationValueStatus };
  supportedMaterialCategories: readonly string[]; terminology: Readonly<Record<string, string>>;
  provenance: { source: string; status: ConfigurationValueStatus; applicableFrom: string | null };
}
const LANGUAGES: Record<string, string> = { en: "en", de: "de", fr: "fr", ja: "ja", pt: "pt", id: "id", ko: "ko", it: "it", es: "es", zh: "zh" };
function fromProfile(profile: MarketProfile): MarketConfigurationV1 {
  const locale = `${LANGUAGES[profile.default_language] ?? "en"}-${profile.country_code}`;
  const numberParts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const currencyParts = new Intl.NumberFormat(locale, { style: "currency", currency: profile.currency_code }).formatToParts(1);
  const currencyIndex = currencyParts.findIndex((part) => part.type === "currency");
  const integerIndex = currencyParts.findIndex((part) => part.type === "integer");
  return {
    schemaVersion: 1, marketCode: profile.country_code, countryName: profile.country_name, locale, configurationVersion: profile.profile_version,
    currency: { code: profile.currency_code, symbol: profile.currency_symbol, placement: currencyIndex <= integerIndex ? "prefix" : "suffix", decimalSeparator: numberParts.find((part) => part.type === "decimal")?.value ?? ".", thousandsSeparator: numberParts.find((part) => part.type === "group")?.value ?? "," },
    measurement: { defaultSystem: profile.default_measurement_system, supportedSystems: profile.default_measurement_system === "mixed" ? ["metric", "imperial"] : [profile.default_measurement_system], defaultLengthUnit: profile.default_length_unit, defaultAreaUnit: profile.default_area_unit },
    tax: { label: null, ratePercent: null, status: "configurable" },
    // No dimensions are asserted as regional standards without an approved source-backed record.
    masonrySpecifications: [], boardSpecifications: [], reinforcement: { designationSystems: [], status: "configurable" },
    supportedMaterialCategories: [], terminology: profile.local_terminology ?? {},
    provenance: { source: "Existing FRELUX market profile; tax and material standards are not independently verified here.", status: "configurable", applicableFrom: null },
  };
}
export const DEFAULT_MARKET_CONFIGURATIONS: readonly MarketConfigurationV1[] = Object.freeze(BUILTIN_MARKET_PROFILES.map(fromProfile));
export function getDefaultMarketConfiguration(code: string): MarketConfigurationV1 | undefined { return DEFAULT_MARKET_CONFIGURATIONS.find((entry) => entry.marketCode === code.toUpperCase()); }
export type ConfigurationValidation = { ok: true; value: MarketConfigurationV1 } | { ok: false; errors: string[] };
export function validateMarketConfiguration(input: unknown): ConfigurationValidation {
  const errors: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, errors: ["Configuration must be an object."] };
  const value = input as Partial<MarketConfigurationV1>;
  if (value.schemaVersion !== 1) errors.push("Unsupported market configuration schema version.");
  if (typeof value.marketCode !== "string" || !/^[A-Z]{2}$/.test(value.marketCode)) errors.push("Market code must be a two-letter uppercase code.");
  if (typeof value.configurationVersion !== "string" || !value.configurationVersion.trim()) errors.push("Configuration version is required.");
  if (typeof value.locale !== "string" || !value.locale.includes("-")) errors.push("A locale including a region is required.");
  if (!value.currency || !/^[A-Z]{3}$/.test(value.currency.code) || !value.currency.symbol) errors.push("Currency requires a three-letter code and symbol.");
  if (value.tax?.ratePercent !== null && value.tax?.ratePercent !== undefined && (!Number.isFinite(value.tax.ratePercent) || value.tax.ratePercent < 0 || value.tax.ratePercent > 100)) errors.push("Tax rate must be 0–100 or null when unknown.");
  if (!Array.isArray(value.masonrySpecifications) || !Array.isArray(value.boardSpecifications)) errors.push("Material specification collections must be arrays.");
  for (const spec of value.masonrySpecifications ?? []) if (![spec.lengthMm, spec.widthMm, spec.heightMm].every((n) => Number.isFinite(n) && n > 0) || !["verified", "configurable", "unverified", "not_applicable"].includes(spec.status)) errors.push(`Masonry specification ${spec.id || "(unnamed)"} has invalid dimensions or status.`);
  for (const spec of value.boardSpecifications ?? []) if (![spec.lengthMm, spec.widthMm, spec.thicknessMm].every((n) => Number.isFinite(n) && n > 0)) errors.push(`Board specification ${spec.id || "(unnamed)"} has invalid dimensions.`);
  return errors.length ? { ok: false, errors } : { ok: true, value: value as MarketConfigurationV1 };
}
export function formatMarketCurrency(amount: number, configuration: MarketConfigurationV1): string { return Number.isFinite(amount) ? new Intl.NumberFormat(configuration.locale, { style: "currency", currency: configuration.currency.code }).format(amount) : "—"; }
