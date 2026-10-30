// =========================================================
// Country catalogue for the Global Settings Engine
//
// One row per country FRELUX operates in. A row is a set of DEFAULTS, not a
// cage: every value here can be overridden by the user, and an override always
// wins over the country suggestion.
//
// Regional values are trade conventions, and they differ in ways that matter.
// A 50 kg cement bag is standard in Nigeria, Kenya and the Gulf, 25 kg in the
// UK and Germany, 20 kg in Australia, 80 lb in the United States. Paint comes
// in 20 L, 10 L and 4 L buckets in Nigeria and in gallons elsewhere. Those
// numbers are quoted so a calculator never applies one country's packaging to
// another's market.
// =========================================================

export type MeasurementSystem = "metric" | "imperial";

export interface NumberFormatDefaults {
  /** Thousands separator, e.g. "," or "." or a space. */
  group: string;
  /** Decimal separator, e.g. "." or ",". */
  decimal: string;
  /** Decimal places used for measurements. */
  decimals: number;
  /** Decimal places used for money. */
  currencyDecimals: number;
}

export interface RegionalConventions {
  /** How bulk aggregate is bought and sold locally. */
  aggregateUnit: "tonne" | "short ton" | "tonne bag" | "cubic yard";
  /** Standard bag weight for cement and bagged aggregate, in kilograms. */
  bagKg: number;
  /** Paint or liquid pack sizes sold locally, in litres, largest first. */
  paintBucketLitres: number[];
  /** Local land unit, when the market sells land by something other than m². */
  landUnit?: string;
  /** Free text note shown beside the settings, so assumptions are visible. */
  note: string;
}

export interface CountryDefaults {
  /** ISO 3166-1 alpha-2, or "ZZ" for the catch-all international row. */
  code: string;
  name: string;
  /** FRELUX market profile this country maps to, when one exists. */
  marketCode?: string;
  measurementSystem: MeasurementSystem;
  currencyCode: string;
  numberFormat: NumberFormatDefaults;
  regional: RegionalConventions;
}

const METRIC_DOT: NumberFormatDefaults = {
  group: ",",
  decimal: ".",
  decimals: 2,
  currencyDecimals: 2,
};
const METRIC_COMMA: NumberFormatDefaults = {
  group: ".",
  decimal: ",",
  decimals: 2,
  currencyDecimals: 2,
};
const METRIC_SPACE: NumberFormatDefaults = {
  group: " ",
  decimal: ",",
  decimals: 2,
  currencyDecimals: 2,
};
const IMPERIAL_DOT: NumberFormatDefaults = {
  group: ",",
  decimal: ".",
  decimals: 2,
  currencyDecimals: 2,
};

export const SUPPORTED_COUNTRIES: CountryDefaults[] = [
  {
    code: "NG",
    name: "Nigeria",
    marketCode: "NG",
    measurementSystem: "metric",
    currencyCode: "NGN",
    numberFormat: METRIC_DOT,
    regional: {
      aggregateUnit: "tonne",
      bagKg: 50,
      paintBucketLitres: [20, 10, 4],
      landUnit: "plot",
      note: "Land is sold in plots (60 x 120 ft or 50 x 100 ft), sand and granite by the tonne, cement in 50 kg bags, paint in 20 L, 10 L and 4 L buckets.",
    },
  },
  {
    code: "GB",
    name: "United Kingdom",
    marketCode: "GB",
    measurementSystem: "metric",
    currencyCode: "GBP",
    numberFormat: METRIC_DOT,
    regional: {
      aggregateUnit: "tonne",
      bagKg: 25,
      paintBucketLitres: [10, 5, 2.5],
      note: "Drawings are metric while road distances and some site talk stay imperial. Cement and plaster arrive in 25 kg bags.",
    },
  },
  {
    code: "US",
    name: "United States",
    marketCode: "US",
    measurementSystem: "imperial",
    currencyCode: "USD",
    numberFormat: IMPERIAL_DOT,
    regional: {
      aggregateUnit: "short ton",
      bagKg: 36.29,
      paintBucketLitres: [18.93, 11.36, 3.79],
      note: "Plans are in feet and inches, aggregate is bought by the short ton and aggregate volume by the cubic yard, concrete bags are 80 lb (36.3 kg).",
    },
  },
  {
    code: "CA",
    name: "Canada",
    marketCode: "CA",
    measurementSystem: "metric",
    currencyCode: "CAD",
    numberFormat: METRIC_DOT,
    regional: {
      aggregateUnit: "tonne",
      bagKg: 30,
      paintBucketLitres: [18.93, 3.79],
      note: "Metric in law and on drawings, imperial in day to day trade. Cement bags are commonly 30 kg.",
    },
  },
  {
    code: "AU",
    name: "Australia",
    marketCode: "AU",
    measurementSystem: "metric",
    currencyCode: "AUD",
    numberFormat: METRIC_DOT,
    regional: {
      aggregateUnit: "tonne",
      bagKg: 20,
      paintBucketLitres: [15, 10, 4],
      note: "Metric throughout. Cement and mortar bags are commonly 20 kg.",
    },
  },
  {
    code: "CN",
    name: "China",
    marketCode: "CN",
    measurementSystem: "metric",
    currencyCode: "CNY",
    numberFormat: METRIC_DOT,
    regional: {
      aggregateUnit: "tonne",
      bagKg: 50,
      paintBucketLitres: [18, 5],
      note: "Metric throughout, cement in 50 kg bags, materials commonly quoted per tonne.",
    },
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    marketCode: "AE",
    measurementSystem: "metric",
    currencyCode: "AED",
    numberFormat: METRIC_DOT,
    regional: {
      aggregateUnit: "tonne",
      bagKg: 50,
      paintBucketLitres: [18, 9, 4],
      note: "Metric throughout, aggregate by the tonne and cement in 50 kg bags.",
    },
  },
  {
    code: "MX",
    name: "Mexico",
    marketCode: "MX",
    measurementSystem: "metric",
    currencyCode: "MXN",
    numberFormat: METRIC_DOT,
    regional: {
      aggregateUnit: "tonne",
      bagKg: 50,
      paintBucketLitres: [19, 4],
      note: "Metric throughout, cement in 50 kg bags, block and brick sold by the piece.",
    },
  },
  {
    code: "KE",
    name: "Kenya",
    marketCode: "KE",
    measurementSystem: "metric",
    currencyCode: "KES",
    numberFormat: METRIC_DOT,
    regional: {
      aggregateUnit: "tonne",
      bagKg: 50,
      paintBucketLitres: [20, 4],
      landUnit: "plot",
      note: "Metric throughout, cement in 50 kg bags, land commonly sold in 50 x 100 ft plots.",
    },
  },
  {
    code: "ZA",
    name: "South Africa",
    marketCode: "ZA",
    measurementSystem: "metric",
    currencyCode: "ZAR",
    numberFormat: METRIC_SPACE,
    regional: {
      aggregateUnit: "tonne",
      bagKg: 50,
      paintBucketLitres: [20, 5],
      note: "Metric with a space as the thousands separator, cement in 50 kg bags, paint in 20 L and 5 L.",
    },
  },
  {
    code: "DE",
    name: "Germany",
    marketCode: "DE",
    measurementSystem: "metric",
    currencyCode: "EUR",
    numberFormat: METRIC_COMMA,
    regional: {
      aggregateUnit: "tonne",
      bagKg: 25,
      paintBucketLitres: [12.5, 5, 2.5],
      note: "Metric, decimal comma, cement and mortar in 25 kg bags.",
    },
  },
  {
    code: "FR",
    name: "France",
    marketCode: "FR",
    measurementSystem: "metric",
    currencyCode: "EUR",
    numberFormat: METRIC_SPACE,
    regional: {
      aggregateUnit: "tonne",
      bagKg: 25,
      paintBucketLitres: [15, 5, 2.5],
      note: "Metric, decimal comma with a space as the thousands separator, cement in 25 kg bags.",
    },
  },
  {
    code: "ZZ",
    name: "Other international market",
    measurementSystem: "metric",
    currencyCode: "USD",
    numberFormat: METRIC_DOT,
    regional: {
      aggregateUnit: "tonne",
      bagKg: 50,
      paintBucketLitres: [20, 10, 4],
      note: "Generic defaults for a market FRELUX has no local convention for. Set your own bag weight and pack sizes before relying on them.",
    },
  },
];

export const DEFAULT_COUNTRY_CODE = "NG";
export const OTHER_COUNTRY_CODE = "ZZ";

export function findCountryDefaults(
  code: string | null | undefined,
): CountryDefaults | null {
  if (!code) return null;
  const key = code.trim().toUpperCase();
  return SUPPORTED_COUNTRIES.find((country) => country.code === key) ?? null;
}

/** Fallback row so a missing or retired country never leaves the app undefined. */
export function countryDefaultsOrFallback(
  code: string | null | undefined,
): CountryDefaults {
  return (
    findCountryDefaults(code) ??
    findCountryDefaults(DEFAULT_COUNTRY_CODE) ??
    (SUPPORTED_COUNTRIES[SUPPORTED_COUNTRIES.length - 1] as CountryDefaults)
  );
}

/** Maps a FRELUX market code back to its country row, when one exists. */
export function countryForMarket(
  marketCode: string | null | undefined,
): CountryDefaults | null {
  if (!marketCode) return null;
  const key = marketCode.trim().toUpperCase();
  return (
    SUPPORTED_COUNTRIES.find((country) => country.marketCode === key) ?? null
  );
}
