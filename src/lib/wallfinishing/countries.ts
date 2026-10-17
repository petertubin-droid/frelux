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
  {
    code: "CN",
    name: "China",
    flag: "\u{1F1E8}\u{1F1F3}",
    currency: "CNY",
    currencySymbol: "¥",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["cn-concrete-block-render", "cn-gypsum-board-metal-stud"],
    assemblyIds: ["cn-interior-putty-paint", "cn-drywall-paint"],
    defaultWastePercent: { paint: 10, plaster: 15, putty: 10, mortar: 12 },
    templateNotice:
      "Typical Chinese construction practice: masonry or concrete frame with cement-sand plaster, interior putty (腻子) and latex emulsion, or light steel stud gypsum drywall. This is a starting template, not a building code. Refer to GB 50210.",
  },
  {
    code: "ID",
    name: "Indonesia",
    flag: "\u{1F1EE}\u{1F1E9}",
    currency: "IDR",
    currencySymbol: "Rp",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["id-brick-plaster", "id-aac-block-render"],
    assemblyIds: [
      "id-interior-plaster-acian-paint",
      "id-exterior-plaster-paint",
    ],
    defaultWastePercent: { paint: 10, plaster: 15, putty: 10, mortar: 15 },
    templateNotice:
      "Typical Indonesian construction practice: clay brick (bata merah) or AAC lightweight block with cement-sand plesteran and acian skim before acrylic paint. This is a starting template, not a building code. Refer to SNI 03-6861.",
  },
  {
    code: "MX",
    name: "Mexico",
    flag: "\u{1F1F2}\u{1F1FD}",
    currency: "MXN",
    currencySymbol: "$",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["mx-concrete-block-plaster", "mx-red-brick-render"],
    assemblyIds: ["mx-interior-yeso-paint", "mx-exterior-repello-paint"],
    defaultWastePercent: { paint: 10, plaster: 15, putty: 10, mortar: 15 },
    templateNotice:
      "Typical Mexican construction practice: block de concreto or tabique rojo with repello cement plaster and interior yeso skim finish. This is a starting template, not a building code. Refer to NMX / RCDF guidelines.",
  },
  {
    code: "KR",
    name: "South Korea",
    flag: "\u{1F1F0}\u{1F1F7}",
    currency: "KRW",
    currencySymbol: "₩",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["kr-rc-wall-gypsum", "kr-drywall-steel-stud"],
    assemblyIds: ["kr-interior-putty-paint", "kr-drywall-paint"],
    defaultWastePercent: { paint: 10, plaster: 10, putty: 8, mortar: 10 },
    templateNotice:
      "Typical South Korean apartment construction practice: reinforced concrete bearing walls with direct plasterboard or skim putty and interior finish. This is a starting template, not a building code. Refer to KDS 41.",
  },
  {
    code: "IT",
    name: "Italy",
    flag: "\u{1F1EE}\u{1F1F9}",
    currency: "EUR",
    currencySymbol: "€",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["it-perforated-brick-plaster", "it-drywall-metal-stud"],
    assemblyIds: ["it-interior-intonaco-paint", "it-drywall-pittura"],
    defaultWastePercent: { paint: 10, plaster: 12, putty: 8, mortar: 12 },
    templateNotice:
      "Typical Italian construction practice: laterizio forato brickwork with intonaco di calce/cemento or cartongesso with stuccatura rasante and idropittura. This is a starting template, not a building code. Refer to UNI EN 998 / NTC 2018.",
  },

  // ── 2026-10-16 globalization wave: the final 12 markets get
  // native wall-finishing profiles (assemblyIds order:
  // interior first). Every website market now resolves natively.

  {
    code: "ET",
    name: "Ethiopia",
    flag: "\u{1F1EA}\u{1F1F9}",
    currency: "ETB",
    currencySymbol: "Br",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["et-hcb-frame-plaster", "et-solid-brick-plaster"],
    assemblyIds: ["et-interior-plaster-putty-paint", "et-exterior-render-paint"],
    defaultWastePercent: { paint: 10, plaster: 12, putty: 8, mortar: 12 },
    templateNotice:
      "Typical Ethiopian practice: hollow concrete block (HCB) infill in a reinforced-concrete frame, or solid fired-clay brick, finished with cement-sand plaster, putty skim and emulsion paint. This is a starting template, not a building code. Refer to the Ethiopian Building Code Standards (EBCS) and product data sheets.",
  },
  {
    code: "EG",
    name: "Egypt",
    flag: "\u{1F1EA}\u{1F1EC}",
    currency: "EGP",
    currencySymbol: "E£",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["eg-red-brick-plaster", "eg-aac-block-plaster"],
    assemblyIds: ["eg-interior-plaster-gypsum-paint", "eg-exterior-render-paint"],
    defaultWastePercent: { paint: 10, plaster: 12, putty: 8, mortar: 12 },
    templateNotice:
      "Typical Egyptian practice: red brick or AAC block masonry finished with cement plaster (morr elasar), gypsum skim coat and emulsion paint. This is a starting template, not a building code. Refer to the Egyptian Code of Practice (ECP) and product data sheets.",
  },
  {
    code: "TZ",
    name: "Tanzania",
    flag: "\u{1F1F9}\u{1F1FF}",
    currency: "TZS",
    currencySymbol: "TSh",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["tz-hollow-block-render", "tz-stone-masonry-render"],
    assemblyIds: ["tz-interior-render-putty-paint", "tz-exterior-render-paint"],
    defaultWastePercent: { paint: 10, plaster: 12, putty: 8, mortar: 12 },
    templateNotice:
      "Typical Tanzanian practice: hollow concrete block or quarry-stone masonry rendered with cement-sand mortar, skimmed with putty and painted with emulsion. This is a starting template, not a building code. Refer to Tanzania Bureau of Standards (TBS) specifications and product data sheets.",
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    flag: "\u{1F1E8}\u{1F1EE}",
    currency: "XOF",
    currencySymbol: "CFA",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["ci-parpaing-enduit", "ci-brique-cuite-enduit"],
    assemblyIds: ["ci-interior-enduit-peinture", "ci-exterior-enduit-peinture"],
    defaultWastePercent: { paint: 10, plaster: 12, putty: 8, mortar: 12 },
    templateNotice:
      "Pratique ivoirienne typique: maçonnerie en parpaings de ciment ou briques cuites, enduit de ciment, enduit de finition et peinture. This is a starting template, not a building code. Refer to NF DTU plastering practices as applied in Côte d'Ivoire and to product data sheets.",
  },
  {
    code: "ES",
    name: "Spain",
    flag: "\u{1F1EA}\u{1F1F8}",
    currency: "EUR",
    currencySymbol: "€",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["es-ladrillo-hueco-yeso", "es-pladur-metal-stud"],
    assemblyIds: ["es-interior-enlucido-paint", "es-exterior-monocapa-paint", "es-pladur-paint"],
    defaultWastePercent: { paint: 8, plaster: 12, putty: 8, mortar: 12 },
    templateNotice:
      "Práctica española típica: fábrica de ladrillo hueco o bloque cerámico con enlucido de yeso, o placas de pladur en perfilería, y pintura plástica. This is a starting template, not a building code. Refer to el Código Técnico de la Edificación (CTE) y a las fichas técnicas de producto.",
  },
  {
    code: "NL",
    name: "Netherlands",
    flag: "\u{1F1F3}\u{1F1F1}",
    currency: "EUR",
    currencySymbol: "€",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["nl-kalkzandsteen-pleister", "nl-gipsplaat-metal-stud"],
    assemblyIds: ["nl-interior-pleister-paint", "nl-exterior-pleister-paint", "nl-drywall-paint"],
    defaultWastePercent: { paint: 8, plaster: 10, putty: 8, mortar: 12 },
    templateNotice:
      "Typical Dutch practice: kalkzandsteen (calcium silicate) or clay brick masonry finished with gypsum pleisterwerk, or gipsplaten partitions on metal stud, with latex paint. This is a starting template, not a building code. Refer to the Bouwbesluit (Building Decree) and product data sheets.",
  },
  {
    code: "PL",
    name: "Poland",
    flag: "\u{1F1F5}\u{1F1F1}",
    currency: "PLN",
    currencySymbol: "zł",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["pl-beton-komorkowy-tynk", "pl-ceramic-brick-tynk"],
    assemblyIds: ["pl-interior-tynk-gladz-paint", "pl-exterior-tynk-paint"],
    defaultWastePercent: { paint: 8, plaster: 12, putty: 8, mortar: 12 },
    templateNotice:
      "Typical Polish practice: beton komórkowy (AAC) or ceramic brick walls with cement-lime tynk, finished with gładź gipsowa and latex paint. This is a starting template, not a building code. Refer to PN-EN 13914 and Warunki Techniczne and to product data sheets.",
  },
  {
    code: "SE",
    name: "Sweden",
    flag: "\u{1F1F8}\u{1F1EA}",
    currency: "SEK",
    currencySymbol: "kr",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["se-tegel-puts", "se-lattbetong-gips"],
    assemblyIds: ["se-interior-puts-paint", "se-exterior-puts-paint"],
    defaultWastePercent: { paint: 8, plaster: 12, putty: 8, mortar: 12 },
    templateNotice:
      "Typical Swedish practice: tegel (clay brick) or lättbetong (lightweight concrete) walls with putssystem (base and fine plaster) and latex paint. This is a starting template, not a building code. Refer to Boverket's BBR, SS 13 70 41 and product data sheets.",
  },
  {
    code: "CH",
    name: "Switzerland",
    flag: "\u{1F1E8}\u{1F1ED}",
    currency: "CHF",
    currencySymbol: "CHF",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["ch-backstein-kalkputz", "ch-gipsplatte-metal-stud"],
    assemblyIds: ["ch-interior-gipsputz-paint", "ch-exterior-kalkputz-paint", "ch-gipsplatte-paint"],
    defaultWastePercent: { paint: 8, plaster: 12, putty: 8, mortar: 12 },
    templateNotice:
      "Typical Swiss practice: backstein (brick) masonry with Kalkputz (lime render) or Gipsputz, or Gipsplatten on metal stud, with Dispersionfarbe. This is a starting template, not a building code. Refer to SIA standards and product data sheets.",
  },
  {
    code: "SG",
    name: "Singapore",
    flag: "\u{1F1F8}\u{1F1EC}",
    currency: "SGD",
    currencySymbol: "S$",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["sg-brick-infill-plaster", "sg-drywall-metal-stud"],
    assemblyIds: ["sg-interior-plaster-putty-paint", "sg-exterior-render-paint", "sg-drywall-paint"],
    defaultWastePercent: { paint: 8, plaster: 12, putty: 8, mortar: 12 },
    templateNotice:
      "Typical Singapore practice: brick or lightweight AAC infill in an RC frame, plastered, skimmed with putty and painted, or drywall partitions on metal stud. This is a starting template, not a building code. Refer to SS 84, SS 580 and BCA requirements and to product data sheets.",
  },
  {
    code: "TR",
    name: "Türkiye",
    flag: "\u{1F1F9}\u{1F1F7}",
    currency: "TRY",
    currencySymbol: "₺",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["tr-tugla-siva", "tr-alci-diyvar"],
    assemblyIds: ["tr-interior-siva-alci-paint", "tr-exterior-siva-paint", "tr-drywall-paint"],
    defaultWastePercent: { paint: 8, plaster: 12, putty: 8, mortar: 12 },
    templateNotice:
      "Typical Turkish practice: tuğla (fired clay brick) walls with çimento sıva (cement render), saten alçı (satin gypsum finish) and silikonlu boya, or alçı diyvar partitions. This is a starting template, not a building code. Refer to TS EN 13279, TS 825 and product data sheets.",
  },
  {
    code: "NZ",
    name: "New Zealand",
    flag: "\u{1F1F3}\u{1F1FF}",
    currency: "NZD",
    currencySymbol: "NZ$",
    measurement: "metric",
    defaultLengthUnit: "meters",
    defaultAreaUnit: "sqm",
    wallSystemIds: ["nz-timber-gib-plasterboard", "nz-brick-veneer-render"],
    assemblyIds: ["nz-interior-gib-paint", "nz-exterior-render-paint"],
    defaultWastePercent: { paint: 8, plaster: 10, putty: 8, mortar: 12 },
    templateNotice:
      "Typical New Zealand practice: timber-frame walls lined with Gib plasterboard, taped, jointed and painted, or brick veneer exteriors with render and paint. This is a starting template, not a building code. Refer to NZS 4258 and the NZ Building Code clause E3 and to product data sheets.",
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
