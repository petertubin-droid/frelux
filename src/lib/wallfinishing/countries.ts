// =========================================================
// FRELUX Wall Finishing - country profiles.
//
// Starting templates for seven initial markets, from the
// worldwide finishing-sequence research table. A country
// profile is a STARTING TEMPLATE, never a universal
// building code - users always select/replace systems.
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
      "Typical Nigerian practice: sandcrete blockwork finished with cement-sand render and screeding/putty before paint. Confirm the actual specification with your builder: this is a starting template, not a building code.",
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
      "Typical US practice: timber or steel framing with drywall internally and masonry/concrete externally. Joint tape, compound and sanding precede drywall primer and paint. Confirm with your contractor: this is a starting template, not a building code.",
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
      "Typical UK practice: brick/block masonry with undercoat plaster where required, then skim plaster, mist coat and paint. Confirm with your plasterer: this is a starting template, not a building code.",
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
      "Typical German practice: masonry or blockwork finished with base/render or gypsum plaster, fine finish, primer (Tiefgrund) and paint. Confirm with your Malerbetrieb: this is a starting template, not a building code.",
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
      "Typical Indian practice: brick/block masonry finished with cement-sand plaster, wall putty, primer and paint. Confirm with your contractor: this is a starting template, not a building code.",
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
      "Typical Canadian practice: wood framing with drywall, tape, joint compound, sanding, primer and paint. Confirm with your contractor: this is a starting template, not a building code.",
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
      "Typical Australian practice: brick veneer or masonry with plasterboard, jointing/setting compound, sanding, sealer and paint. Confirm with your plasterer: this is a starting template, not a building code.",
  },

  // ── 2026-10-13 expansion: five new markets + three African
  // markets promoted from surrogate templates ──────────────
  {
    code: "JP",
    name: "Japan",
    flag: "\u{1F1EF}\u{1F1F5}",
    currency: "JPY",
    currencySymbol: "\u00a5",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["jp-timber-frame-gypsum", "jp-rc-alc-panel"],
    assemblyIds: ["jp-interior-gypsum-paint", "jp-exterior-alc-paint"],
    defaultWastePercent: { paint: 8, plaster: 10, putty: 8, mortar: 10 },
    templateNotice:
      "Typical Japanese practice: timber-frame or RC/ALC construction lined with gypsum board, joint putty and sanding, then primer and emulsion paint. Confirm with your daiku: this is a starting template, not a building code.",
  },
  {
    code: "FR",
    name: "France",
    flag: "\u{1F1EB}\u{1F1F7}",
    currency: "EUR",
    currencySymbol: "\u20ac",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["fr-masonry-plaster", "fr-drywall-metal-stud"],
    assemblyIds: ["fr-interior-masonry-paint", "fr-exterior-render-paint"],
    defaultWastePercent: { paint: 8, plaster: 12, putty: 8, mortar: 12 },
    templateNotice:
      "Pratique francaise typique : maconnerie (parpaing/brique) finie a l'enduit de platre ou plaques de platre BA13, enduit de lissage, sous-couche puis peinture. Confirmez avec votre plaquiste : ceci est un point de depart, pas un DTU.",
  },
  {
    code: "BR",
    name: "Brazil",
    flag: "\u{1F1E7}\u{1F1F7}",
    currency: "BRL",
    currencySymbol: "R$",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["br-brick-plaster", "br-drywall-steel-stud"],
    assemblyIds: ["br-interior-massa-paint", "br-exterior-render-paint"],
    defaultWastePercent: { paint: 10, plaster: 15, putty: 12, mortar: 15 },
    templateNotice:
      "Pratica brasileira tipica: alvenaria de tijolo/bloco com reboco, massa corrida, selador e tinta acrilica; ou drywall com fita e massa de juncao. Confirme com seu pintor: este e um ponto de partida, nao uma norma tecnica.",
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    flag: "\u{1F1F8}\u{1F1E6}",
    currency: "SAR",
    currencySymbol: "\uFDFC",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["sa-block-gypsum-plaster", "sa-drywall-partition"],
    assemblyIds: ["sa-interior-gypsum-paint", "sa-exterior-render-paint"],
    defaultWastePercent: { paint: 10, plaster: 12, putty: 10, mortar: 12 },
    templateNotice:
      "Typical Saudi practice: concrete frame with block infill finished with machine-applied gypsum plaster, or gypsum board partitions with jointing compound, then primer and paint. Confirm with your contractor: this is a starting template, not a building code.",
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    flag: "\u{1F1E6}\u{1F1EA}",
    currency: "AED",
    currencySymbol: "\u062f.\u0625",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["ae-rc-block-gypsum", "ae-drywall-partition"],
    assemblyIds: ["ae-interior-gypsum-paint", "ae-exterior-render-paint"],
    defaultWastePercent: { paint: 10, plaster: 12, putty: 10, mortar: 12 },
    templateNotice:
      "Typical UAE practice: RC frame with blockwork infill finished with machine-applied gypsum plaster, or gypsum board partitions with jointing compound, then primer and paint. Confirm with your contractor: this is a starting template, not a building code.",
  },
  {
    code: "GH",
    name: "Ghana",
    flag: "\u{1F1EC}\u{1F1ED}",
    currency: "GHS",
    currencySymbol: "GH\u20b5",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["gh-sandcrete-render", "gh-timber-frame-gypsum"],
    assemblyIds: ["gh-interior-block-paint", "gh-exterior-render-paint"],
    defaultWastePercent: { paint: 10, plaster: 15, putty: 10, mortar: 15 },
    templateNotice:
      "Typical Ghanaian practice: sandcrete or block walls with cement-sand render, gypsum putty or skim, primer and emulsion paint. Confirm with your mason: this is a starting template, not a building code.",
  },
  {
    code: "KE",
    name: "Kenya",
    flag: "\u{1F1F0}\u{1F1EA}",
    currency: "KES",
    currencySymbol: "KSh",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["ke-stone-render", "ke-block-render"],
    assemblyIds: ["ke-interior-stone-paint", "ke-exterior-render-paint"],
    defaultWastePercent: { paint: 10, plaster: 15, putty: 10, mortar: 15 },
    templateNotice:
      "Typical Kenyan practice: machine-cut stone or blockwork with cement-sand render, skim/putty, primer and emulsion paint. Confirm with your fundi: this is a starting template, not a building code.",
  },
  {
    code: "ZA",
    name: "South Africa",
    flag: "\u{1F1FF}\u{1F1E6}",
    currency: "ZAR",
    currencySymbol: "R",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["za-brick-plaster", "za-drywall-metal-stud"],
    assemblyIds: ["za-interior-skim-paint", "za-exterior-render-paint"],
    defaultWastePercent: { paint: 10, plaster: 12, putty: 8, mortar: 12 },
    templateNotice:
      "Typical South African practice: clay brick or block walls with cement render and RhinoLite gypsum skim, or drywall with jointing compound, then bonding liquid/undercoat and paint. Confirm with your plasterer: this is a starting template, not a building code.",
  },
];

export const WALLFIN_COUNTRY_MAP: Record<string, WallFinCountryProfile> =
  Object.fromEntries(WALLFIN_COUNTRY_PROFILES.map((p) => [p.code, p]));

export function getWallFinCountry(code: string): WallFinCountryProfile | null {
  return WALLFIN_COUNTRY_MAP[code] ?? null;
}

/**
 * Markets WITHOUT a dedicated wall-finishing profile inherit the
 * NG reference through market_profiles.inherits_from - reported,
 * never silently swapped.
 */
export const WALLFIN_FALLBACK_COUNTRY: WallFinMarketCodeLike = "NG";
type WallFinMarketCodeLike = "NG";
