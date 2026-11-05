/**
 * Window blind types and the price bands behind the blind estimator.
 *
 * Every band below is the TOP of what the local market actually quotes, taken
 * from a price scan of Nigerian sellers in November 2026: vendor price lists,
 * Jiji listings and market posts. A high end figure is deliberate. Under
 * quoting a blind costs the installer money, so the estimator stays at the top
 * of the verified band and says so rather than splitting the difference.
 *
 * Only Nigeria carries a verified band. Every other market returns a manual
 * price request, because inventing a local figure is worse than admitting we do
 * not have one.
 *
 * No AI reads this file. The engine multiplies geometry by these numbers.
 */

export type BlindTypeKey =
  | "roller"
  | "day-night"
  | "zebra"
  | "vertical"
  | "venetian-25"
  | "venetian-50"
  | "roman"
  | "faux-wood"
  | "wooden"
  | "pleated"
  | "bamboo";

export interface BlindTypeDefinition {
  key: BlindTypeKey;
  label: string;
  /** How the trade describes it, shown under the name. */
  family: string;
  /** What the price scan found, lowest rate to highest, for transparency. */
  observedBand: string;
  /** Rigid slats tolerate less cutting waste than fabric. */
  wastage: number;
  /** Sample window this type is usually sold against, in metres. */
  sample: { widthM: number; heightM: number };
  /** Anything the reader should know before trusting the number. */
  note: string;
}

export const BLIND_TYPES: BlindTypeDefinition[] = [
  {
    key: "roller",
    label: "Roller",
    family: "Fabric, plain",
    observedBand: "8,500 to 12,500 per m2",
    wastage: 0.1,
    sample: { widthM: 1.219, heightM: 1.219 },
    note: "Sold per window as often as per metre. Wide drops and blackout fabric sit above this band.",
  },
  {
    key: "day-night",
    label: "Day and night",
    family: "Double fabric, alternating stripes",
    observedBand: "8,000 to 13,500 per m2",
    wastage: 0.1,
    sample: { widthM: 1.219, heightM: 1.219 },
    note: "Premium prints quote 20,000 to 38,000 per window, so grade matters more than size here.",
  },
  {
    key: "zebra",
    label: "Zebra",
    family: "Striped sheer and opaque",
    observedBand: "8,000 to 12,500 per m2",
    wastage: 0.1,
    sample: { widthM: 1.219, heightM: 1.219 },
    note: "Priced with day and night in most Nigerian shops.",
  },
  {
    key: "vertical",
    label: "Vertical",
    family: "Fabric louvres on a track",
    observedBand: "15,000 to 18,000 per m2",
    wastage: 0.12,
    sample: { widthM: 1.83, heightM: 2.13 },
    note: "Track and louvre count drive the price, so wide openings climb faster than tall ones.",
  },
  {
    key: "venetian-25",
    label: "Venetian, 25 mm",
    family: "Aluminium mini slat",
    observedBand: "4,500 to 6,000 per m2",
    wastage: 0.08,
    sample: { widthM: 1.219, heightM: 1.219 },
    note: "The cheapest type per metre, and the one most often quoted with a minimum charge.",
  },
  {
    key: "venetian-50",
    label: "Venetian, 50 mm",
    family: "Aluminium wide slat",
    observedBand: "6,500 to 8,000 per m2",
    wastage: 0.08,
    sample: { widthM: 1.219, heightM: 1.219 },
    note: "Wide slats span further before sagging, so they suit large windows better.",
  },
  {
    key: "roman",
    label: "Roman",
    family: "Folded fabric on a batten",
    observedBand: "12,000 to 15,000 per m2",
    wastage: 0.15,
    sample: { widthM: 1.219, heightM: 1.219 },
    note: "Fold allowance is the reason roman blinds waste more fabric than a roller.",
  },
  {
    key: "faux-wood",
    label: "Faux wood",
    family: "Composite slat",
    observedBand: "15,000 to 20,000 per m2",
    wastage: 0.08,
    sample: { widthM: 1.219, heightM: 1.219 },
    note: "Handles humidity better than real timber, at roughly half the cost.",
  },
  {
    key: "wooden",
    label: "Wooden",
    family: "Real timber slat",
    observedBand: "15,000 to 25,000 per m2",
    wastage: 0.08,
    sample: { widthM: 1.219, heightM: 1.219 },
    note: "Least standardised category in the market. Sellers quote 33,000 to 75,000 per window instead.",
  },
  {
    key: "pleated",
    label: "Pleated",
    family: "Honeycomb or folded speciality",
    observedBand: "40,000 per m2, single vendor",
    wastage: 0.12,
    sample: { widthM: 1.219, heightM: 1.219 },
    note: "One seller only. Treat as indicative until a second source agrees.",
  },
  {
    key: "bamboo",
    label: "Bamboo",
    family: "Woven natural roll up",
    observedBand: "Import resale only, 21,000 to 128,000 per piece",
    wastage: 0.1,
    sample: { widthM: 1.83, heightM: 2.13 },
    note: "No reliable local per metre rate. The estimator asks for a manual price instead of guessing.",
  },
];

export const BLIND_TYPE_BY_KEY: Record<BlindTypeKey, BlindTypeDefinition> =
  BLIND_TYPES.reduce(
    (acc, type) => ({ ...acc, [type.key]: type }),
    {} as Record<BlindTypeKey, BlindTypeDefinition>,
  );

export interface BlindPriceBand {
  perM2: number;
  /** Small windows never fall below this, which is how shops actually quote. */
  minimumPerWindow: number;
}

export interface BlindMarketBook {
  currency: string;
  currencySymbol: string;
  /** Fitting a finished blind, from service listings in the market. */
  installPerWindow: number;
  /** Types with a verified band. A missing type needs a manual price. */
  types: Partial<Record<BlindTypeKey, BlindPriceBand>>;
  source: string;
}

export const BLIND_PRICE_BOOKS: Record<string, BlindMarketBook> = {
  NG: {
    currency: "NGN",
    currencySymbol: "₦",
    installPerWindow: 5000,
    source:
      "Nigerian vendor price lists and Jiji listings scanned November 2026, top of each observed band",
    types: {
      roller: { perM2: 12500, minimumPerWindow: 16000 },
      "day-night": { perM2: 13500, minimumPerWindow: 15500 },
      zebra: { perM2: 12500, minimumPerWindow: 15500 },
      vertical: { perM2: 18000, minimumPerWindow: 25000 },
      "venetian-25": { perM2: 6000, minimumPerWindow: 15000 },
      "venetian-50": { perM2: 8000, minimumPerWindow: 32000 },
      roman: { perM2: 15000, minimumPerWindow: 21000 },
      "faux-wood": { perM2: 20000, minimumPerWindow: 33000 },
      wooden: { perM2: 25000, minimumPerWindow: 75000 },
      pleated: { perM2: 40000, minimumPerWindow: 40000 },
    },
  },
};

/** The market carries a book at all, even if the type is missing from it. */
export function blindBookFor(market: string): BlindMarketBook | null {
  return BLIND_PRICE_BOOKS[(market ?? "").toUpperCase()] ?? null;
}

/**
 * Markets the estimator will open in. Only NG has a verified price book; the
 * rest are here so the page asks a Nairobi or Manchester installer for their
 * own rate instead of pretending Lagos prices apply to them.
 */
export interface BlindMarketOption {
  code: string;
  name: string;
  currencySymbol: string;
  /** How blinds are usually measured and sold in that market. */
  defaultUnit: "m" | "ft";
  priced: boolean;
}

export const BLIND_MARKETS: BlindMarketOption[] = [
  {
    code: "NG",
    name: "Nigeria",
    currencySymbol: "₦",
    defaultUnit: "ft",
    priced: true,
  },
  {
    code: "GH",
    name: "Ghana",
    currencySymbol: "GH₵",
    defaultUnit: "ft",
    priced: false,
  },
  {
    code: "KE",
    name: "Kenya",
    currencySymbol: "KSh",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "ZA",
    name: "South Africa",
    currencySymbol: "R",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "EG",
    name: "Egypt",
    currencySymbol: "E£",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "GB",
    name: "United Kingdom",
    currencySymbol: "£",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "US",
    name: "United States",
    currencySymbol: "$",
    defaultUnit: "ft",
    priced: false,
  },
  {
    code: "CA",
    name: "Canada",
    currencySymbol: "C$",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "AU",
    name: "Australia",
    currencySymbol: "A$",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "IN",
    name: "India",
    currencySymbol: "₹",
    defaultUnit: "ft",
    priced: false,
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    currencySymbol: "AED",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    currencySymbol: "SAR",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "TR",
    name: "Türkiye",
    currencySymbol: "₺",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "FR",
    name: "France",
    currencySymbol: "€",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "DE",
    name: "Germany",
    currencySymbol: "€",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "NL",
    name: "Netherlands",
    currencySymbol: "€",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "ES",
    name: "Spain",
    currencySymbol: "€",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "BR",
    name: "Brazil",
    currencySymbol: "R$",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "MX",
    name: "Mexico",
    currencySymbol: "MX$",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "ID",
    name: "Indonesia",
    currencySymbol: "Rp",
    defaultUnit: "m",
    priced: false,
  },
  {
    code: "PH",
    name: "Philippines",
    currencySymbol: "₱",
    defaultUnit: "m",
    priced: false,
  },
];

/**
 * Grade. The scan found the same window priced threefold apart by grade alone:
 * a 6 by 4 day and night quotes around 8,000 to 13,500 per m2 as standard, and
 * the premium print lists run 20,000 for a 3 by 4 up to 38,000 for a 6 by 4,
 * which is 17,000 to 18,000 per m2. Standard is the top of the ordinary band,
 * as the owner asked. Premium is that same top multiplied by 1.4, because the
 * premium lists work out at roughly that much above it.
 */
export type BlindGradeKey = "standard" | "premium";

export interface BlindGradeDefinition {
  key: BlindGradeKey;
  label: string;
  multiplier: number;
  note: string;
}

export const BLIND_GRADES: BlindGradeDefinition[] = [
  {
    key: "standard",
    label: "Standard",
    multiplier: 1,
    note: "Ordinary shop stock, priced at the top of the verified local band.",
  },
  {
    key: "premium",
    label: "Premium",
    multiplier: 1.4,
    note: "Premium prints and heavier fabric. Nigerian premium lists work out at about 17,000 to 18,000 per m2 against 8,000 to 13,500 standard.",
  },
];

export const BLIND_GRADE_BY_KEY: Record<BlindGradeKey, BlindGradeDefinition> =
  BLIND_GRADES.reduce(
    (acc, grade) => ({ ...acc, [grade.key]: grade }),
    {} as Record<BlindGradeKey, BlindGradeDefinition>,
  );

/**
 * Extras are priced by whoever quotes them, never by this file. A motor, a
 * cassette headrail and taking down old blinds vary too much by supplier to
 * carry a made up figure, so the estimator takes the owner's number and does
 * the arithmetic.
 */
export const BLIND_EXTRAS = [
  {
    key: "motorPerWindow",
    label: "Motorised",
    detail: "Per window, motor and remote",
  },
  {
    key: "cassettePerWindow",
    label: "Cassette headrail",
    detail: "Per window, enclosed top box",
  },
  {
    key: "removeOldPerWindow",
    label: "Remove old blinds",
    detail: "Per window, take down and dispose",
  },
] as const;

export type BlindExtraKey = (typeof BLIND_EXTRAS)[number]["key"];
