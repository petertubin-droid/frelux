// =========================================================
// FRELUX Wall Finishing — country profiles.
//
// Starting templates for seven initial markets, from the
// worldwide finishing-sequence research table. A country
// profile is a STARTING TEMPLATE, never a universal
// building code — users always select/replace systems.
// New countries: add a profile + wall systems + assemblies
// here; the engines and UI never change.
// =========================================================

import type { WallFinCountryProfile } from "@/types/wallfinishing";

export const WALLFIN_COUNTRY_PROFILES: WallFinCountryProfile[] = [
  {
    code: "NG",
    name: "Nigeria",
    flag: "🇳🇬",
    currency: "NGN",
    currencySymbol: "₦",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["ng-sandcrete-block", "ng-concrete-frame-block"],
    assemblyIds: ["ng-interior-block-paint", "ng-exterior-block-render-paint"],
    defaultWastePercent: { paint: 10, plaster: 15, putty: 10, mortar: 15 },
    templateNotice:
      "Typical Nigerian practice: sandcrete blockwork finished with cement-sand render and screeding/putty before paint. Confirm the actual specification with your builder — this is a starting template, not a building code.",
  },
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    currency: "USD",
    currencySymbol: "$",
    measurement: "imperial",
    defaultLengthUnit: "feet",
    defaultAreaUnit: "sqft",
    wallSystemIds: [
      "us-timber-stud-drywall",
      "us-steel-stud-drywall",
      "us-masonry-veneer",
    ],
    assemblyIds: ["us-interior-drywall-paint", "us-exterior-masonry-paint"],
    defaultWastePercent: { paint: 10, plaster: 10, putty: 10, mortar: 10 },
    templateNotice:
      "Typical US practice: timber or steel framing with drywall internally and masonry/concrete externally. Joint tape, compound and sanding precede drywall primer and paint. Confirm with your contractor — this is a starting template, not a building code.",
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    currency: "GBP",
    currencySymbol: "£",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: [
      "gb-brick-block",
      "gb-timber-frame-dryline",
      "gb-solid-masonry",
    ],
    assemblyIds: [
      "gb-interior-block-skim-paint",
      "gb-interior-plasterboard-paint",
      "gb-exterior-render-paint",
    ],
    defaultWastePercent: { paint: 10, plaster: 12, putty: 8, mortar: 12 },
    templateNotice:
      "Typical UK practice: brick/block masonry with undercoat plaster where required, then skim plaster, mist coat and paint. Confirm with your plasterer — this is a starting template, not a building code.",
  },
  {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    currency: "EUR",
    currencySymbol: "€",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: [
      "de-masonry-gypsum",
      "de-blockwork-lime",
      "de-drywall-metal-stud",
    ],
    assemblyIds: ["de-interior-masonry-paint", "de-exterior-render-paint"],
    defaultWastePercent: { paint: 8, plaster: 10, putty: 8, mortar: 10 },
    templateNotice:
      "Typical German practice: masonry or blockwork finished with base/render or gypsum plaster, fine finish, primer (Tiefgrund) and paint. Confirm with your Malerbetrieb — this is a starting template, not a building code.",
  },
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    currency: "INR",
    currencySymbol: "₹",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: [
      "in-brick-block-plaster",
      "in-aac-block",
      "in-rcc-frame-brick",
    ],
    assemblyIds: ["in-interior-brick-paint", "in-exterior-render-paint"],
    defaultWastePercent: { paint: 10, plaster: 15, putty: 10, mortar: 15 },
    templateNotice:
      "Typical Indian practice: brick/block masonry finished with cement-sand plaster, wall putty, primer and paint. Confirm with your contractor — this is a starting template, not a building code.",
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    currency: "CAD",
    currencySymbol: "C$",
    measurement: "imperial",
    defaultLengthUnit: "feet",
    defaultAreaUnit: "sqft",
    wallSystemIds: [
      "ca-wood-frame-drywall",
      "ca-steel-frame-drywall",
      "ca-icf",
    ],
    assemblyIds: ["ca-interior-drywall-paint", "ca-exterior-masonry-paint"],
    defaultWastePercent: { paint: 10, plaster: 10, putty: 10, mortar: 10 },
    templateNotice:
      "Typical Canadian practice: wood framing with drywall, tape, joint compound, sanding, primer and paint. Confirm with your contractor — this is a starting template, not a building code.",
  },
  {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    currency: "AUD",
    currencySymbol: "A$",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: [
      "au-brick-veneer-plasterboard",
      "au-double-brick",
      "au-light-steel-frame",
    ],
    assemblyIds: ["au-interior-plasterboard-paint", "au-exterior-render-paint"],
    defaultWastePercent: { paint: 10, plaster: 12, putty: 8, mortar: 12 },
    templateNotice:
      "Typical Australian practice: brick veneer or masonry with plasterboard, jointing/setting compound, sanding, sealer and paint. Confirm with your plasterer — this is a starting template, not a building code.",
  },
];

export const WALLFIN_COUNTRY_MAP: Record<string, WallFinCountryProfile> =
  Object.fromEntries(WALLFIN_COUNTRY_PROFILES.map((p) => [p.code, p]));

export function getWallFinCountry(code: string): WallFinCountryProfile | null {
  return WALLFIN_COUNTRY_MAP[code] ?? null;
}

/**
 * Markets WITHOUT a dedicated wall-finishing profile inherit the
 * NG reference through market_profiles.inherits_from — reported,
 * never silently swapped.
 */
export const WALLFIN_FALLBACK_COUNTRY: WallFinMarketCodeLike = "NG";
type WallFinMarketCodeLike = "NG";
