// =========================================================
// Global Settings Engine
//
// One resolver decides how FRELUX talks about numbers, money and measurements
// for a given person. Calculators never hold their own copy of these rules:
// they read this, and they keep calculating in one internal unit set (metres,
// square metres, kilograms, litres) regardless of what the visitor sees.
//
// Precedence is fixed and testable:
//   explicit user override  >  saved account preference  >  country default
// The store decides which layer it feeds in; this module only resolves.
// =========================================================

import {
  SUPPORTED_COUNTRIES,
  countryDefaultsOrFallback,
  findCountryDefaults,
  type CountryDefaults,
  type MeasurementSystem,
  type NumberFormatDefaults,
  type RegionalConventions,
} from "./countries";

export const GLOBAL_SETTINGS_VERSION = 1;

export interface SettingsOverrides {
  countryCode?: string;
  measurementSystem?: MeasurementSystem;
  currencyCode?: string;
  language?: string;
  numberFormat?: Partial<NumberFormatDefaults>;
  regional?: Partial<RegionalConventions>;
}

export interface GlobalSettings {
  version: number;
  countryCode: string;
  countryName: string;
  marketCode?: string;
  measurementSystem: MeasurementSystem;
  currencyCode: string;
  language: string;
  numberFormat: NumberFormatDefaults;
  regional: RegionalConventions;
  /** Field names the user has taken control of, for the UI to show. */
  overridden: string[];
  /** What the country would have chosen, so the UI can offer a reset. */
  countryDefaults: CountryDefaults;
}

const DEFAULT_LANGUAGE = "en";

function cleanCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(trimmed) ? trimmed : undefined;
}

function cleanSystem(value: unknown): MeasurementSystem | undefined {
  return value === "metric" || value === "imperial" ? value : undefined;
}

function cleanCurrency(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(trimmed) ? trimmed : undefined;
}

function cleanLanguage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  return /^[a-z]{2}(-[a-z]{2})?$/.test(trimmed) ? trimmed : undefined;
}

function cleanPositive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

/**
 * Turns whatever came out of storage into a settings patch. localStorage and
 * database rows are both editable by hand and survive app upgrades, so nothing
 * here trusts the shape it is given.
 */
export function sanitizeOverrides(input: unknown): SettingsOverrides {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const clean: SettingsOverrides = {};

  const countryCode = cleanCode(raw.countryCode ?? raw.country_code);
  if (countryCode && findCountryDefaults(countryCode))
    clean.countryCode = countryCode;

  const measurementSystem = cleanSystem(
    raw.measurementSystem ?? raw.measurement_system,
  );
  if (measurementSystem) clean.measurementSystem = measurementSystem;

  const currencyCode = cleanCurrency(raw.currencyCode ?? raw.currency_code);
  if (currencyCode) clean.currencyCode = currencyCode;

  const language = cleanLanguage(raw.language);
  if (language) clean.language = language;

  const formatRaw = raw.numberFormat ?? raw.number_format;
  if (formatRaw && typeof formatRaw === "object") {
    const format = formatRaw as Record<string, unknown>;
    const numberFormat: Partial<NumberFormatDefaults> = {};
    if (typeof format.group === "string" && format.group.length <= 2)
      numberFormat.group = format.group;
    if (
      typeof format.decimal === "string" &&
      (format.decimal === "." || format.decimal === ",")
    ) {
      numberFormat.decimal = format.decimal;
    }
    const decimals = format.decimals;
    if (
      typeof decimals === "number" &&
      Number.isInteger(decimals) &&
      decimals >= 0 &&
      decimals <= 4
    ) {
      numberFormat.decimals = decimals;
    }
    const currencyDecimals =
      format.currencyDecimals ?? format.currency_decimals;
    if (
      typeof currencyDecimals === "number" &&
      Number.isInteger(currencyDecimals) &&
      currencyDecimals >= 0 &&
      currencyDecimals <= 4
    ) {
      numberFormat.currencyDecimals = currencyDecimals;
    }
    if (Object.keys(numberFormat).length > 0) clean.numberFormat = numberFormat;
  }

  const regionalRaw = raw.regional ?? raw.regionalConventions;
  if (regionalRaw && typeof regionalRaw === "object") {
    const regionalRawObj = regionalRaw as Record<string, unknown>;
    const regional: Partial<RegionalConventions> = {};
    const bagKg = cleanPositive(regionalRawObj.bagKg ?? regionalRawObj.bag_kg);
    if (bagKg) regional.bagKg = bagKg;
    const packs =
      regionalRawObj.paintBucketLitres ?? regionalRawObj.paint_bucket_litres;
    if (Array.isArray(packs)) {
      const litres = packs
        .map((value) => (typeof value === "number" ? value : Number(value)))
        .filter((value) => Number.isFinite(value) && value > 0 && value <= 1000)
        .slice(0, 6);
      if (litres.length > 0) regional.paintBucketLitres = litres;
    }
    const aggregate =
      regionalRawObj.aggregateUnit ?? regionalRawObj.aggregate_unit;
    if (
      aggregate === "tonne" ||
      aggregate === "short ton" ||
      aggregate === "tonne bag" ||
      aggregate === "cubic yard"
    ) {
      regional.aggregateUnit = aggregate;
    }
    if (
      typeof regionalRawObj.landUnit === "string" &&
      regionalRawObj.landUnit.length <= 40
    ) {
      regional.landUnit = regionalRawObj.landUnit;
    }
    if (Object.keys(regional).length > 0) clean.regional = regional;
  }

  return clean;
}

export function resolveGlobalSettings(
  overrides: SettingsOverrides = {},
): GlobalSettings {
  const safe = sanitizeOverrides(overrides);
  const countryCode =
    safe.countryCode ?? countryDefaultsOrFallback(undefined).code;
  const countryDefaults = countryDefaultsOrFallback(countryCode);

  const numberFormat: NumberFormatDefaults = {
    ...countryDefaults.numberFormat,
    ...(safe.numberFormat ?? {}),
  };
  const regional: RegionalConventions = {
    ...countryDefaults.regional,
    ...(safe.regional ?? {}),
  };

  const overridden: string[] = [];
  if (safe.measurementSystem) overridden.push("measurementSystem");
  if (safe.currencyCode) overridden.push("currencyCode");
  if (safe.language) overridden.push("language");
  if (safe.numberFormat && Object.keys(safe.numberFormat).length > 0)
    overridden.push("numberFormat");
  if (safe.regional && Object.keys(safe.regional).length > 0)
    overridden.push("regional");

  return {
    version: GLOBAL_SETTINGS_VERSION,
    countryCode: countryDefaults.code,
    countryName: countryDefaults.name,
    marketCode: countryDefaults.marketCode,
    measurementSystem:
      safe.measurementSystem ?? countryDefaults.measurementSystem,
    currencyCode: safe.currencyCode ?? countryDefaults.currencyCode,
    language: safe.language ?? DEFAULT_LANGUAGE,
    numberFormat,
    regional,
    overridden,
    countryDefaults,
  };
}

// ---------------------------------------------------------------- formatting

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
  CAD: "CA$",
  AUD: "A$",
  CNY: "¥",
  AED: "AED ",
  MXN: "MX$",
  KES: "KSh ",
  ZAR: "R ",
  INR: "₹",
  JPY: "¥",
};

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code.toUpperCase()] ?? `${code.toUpperCase()} `;
}

/**
 * Applies the visitor's separators to a number. Grouping is done by hand
 * rather than through Intl so a German visitor sees 1.234,56 and a South
 * African sees 1 234,56 on every device, whatever locale the browser ships.
 */
export function formatNumberValue(
  settings: Pick<GlobalSettings, "numberFormat">,
  value: number,
  options: { decimals?: number; trimTrailingZeros?: boolean } = {},
): string {
  if (!Number.isFinite(value)) return "n/a";
  const decimals = options.decimals ?? settings.numberFormat.decimals;
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(Math.max(0, Math.min(6, decimals)));
  const [whole, fractionRaw] = fixed.split(".");
  let fraction = fractionRaw ?? "";
  if (options.trimTrailingZeros && fraction) {
    fraction = fraction.replace(/0+$/, "");
  }
  const grouped = whole.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    settings.numberFormat.group,
  );
  const body = fraction
    ? `${grouped}${settings.numberFormat.decimal}${fraction}`
    : grouped;
  return negative ? `-${body}` : body;
}

export function formatMoney(
  settings: Pick<GlobalSettings, "numberFormat" | "currencyCode">,
  amount: number,
  options: { decimals?: number } = {},
): string {
  if (!Number.isFinite(amount)) return "n/a";
  const decimals = options.decimals ?? settings.numberFormat.currencyDecimals;
  return `${currencySymbol(settings.currencyCode)}${formatNumberValue(settings, amount, { decimals })}`;
}

/** Reads a number typed with the visitor's own separators. */
export function parseNumberValue(
  settings: Pick<GlobalSettings, "numberFormat">,
  input: string | number | null | undefined,
): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  let text = input.trim();
  if (text === "") return null;
  const { group, decimal } = settings.numberFormat;
  if (group && group.trim() !== "") {
    text = text.split(group).join("");
  }
  text = text.split(" ").join("");
  if (decimal === ",") {
    text = text.replace(/,/g, ".");
  }
  text = text.replace(/[^\d.-]/g, "");
  if (!/\d/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

// Display-only unit presentation. Internal maths is always metric.

export function formatLength(
  settings: Pick<GlobalSettings, "measurementSystem" | "numberFormat">,
  metres: number,
): string {
  if (!Number.isFinite(metres)) return "n/a";
  if (settings.measurementSystem === "imperial") {
    const feet = metres / 0.3048;
    if (feet >= 10)
      return `${formatNumberValue(settings, feet, { decimals: 1 })} ft`;
    const totalInches = metres / 0.0254;
    return `${formatNumberValue(settings, totalInches, { decimals: 1 })} in`;
  }
  if (Math.abs(metres) < 1)
    return `${formatNumberValue(settings, metres * 1000, { decimals: 0 })} mm`;
  return `${formatNumberValue(settings, metres, { decimals: 2 })} m`;
}

export function formatArea(
  settings: Pick<GlobalSettings, "measurementSystem" | "numberFormat">,
  sqMetres: number,
): string {
  if (!Number.isFinite(sqMetres)) return "n/a";
  if (settings.measurementSystem === "imperial") {
    return `${formatNumberValue(settings, sqMetres / 0.09290304, { decimals: 1 })} ft²`;
  }
  return `${formatNumberValue(settings, sqMetres, { decimals: 2 })} m²`;
}

export function formatWeight(
  settings: Pick<GlobalSettings, "measurementSystem" | "numberFormat">,
  kg: number,
): string {
  if (!Number.isFinite(kg)) return "n/a";
  if (settings.measurementSystem === "imperial") {
    return `${formatNumberValue(settings, kg / 0.45359237, { decimals: 1 })} lb`;
  }
  if (Math.abs(kg) >= 1000)
    return `${formatNumberValue(settings, kg / 1000, { decimals: 2 })} t`;
  return `${formatNumberValue(settings, kg, { decimals: 1 })} kg`;
}

export function formatVolume(
  settings: Pick<GlobalSettings, "measurementSystem" | "numberFormat">,
  litres: number,
): string {
  if (!Number.isFinite(litres)) return "n/a";
  if (settings.measurementSystem === "imperial") {
    return `${formatNumberValue(settings, litres / 3.785411784, { decimals: 1 })} US gal`;
  }
  return `${formatNumberValue(settings, litres, { decimals: 2 })} L`;
}

/** All supported countries, for the settings picker. */
export function countryOptions(): {
  code: string;
  name: string;
  currencyCode: string;
  measurementSystem: MeasurementSystem;
}[] {
  return SUPPORTED_COUNTRIES.map((country) => ({
    code: country.code,
    name: country.name,
    currencyCode: country.currencyCode,
    measurementSystem: country.measurementSystem,
  }));
}
