/**
 * Auditable market observations for bagged cement packaging.
 * These are product listings/manufacturer observations, not national standards.
 * Markets with no source are intentionally left unavailable rather than inferred.
 */
export type PackagingEvidenceStatus =
  "source_observed" | "planning_assumption" | "not_available";

export interface PackagingSource {
  url: string;
  publisher: string;
  sourceType: "manufacturer" | "retailer" | "trade-publication";
  observedPackSizesKg: number[];
  scopeNote: string;
}

export interface PackagingEvidence {
  marketCode: string;
  item: string;
  quantityKg: number | null;
  status: PackagingEvidenceStatus;
  label: string;
  guidance: string;
  observedPackSizesKg: number[];
  sources: PackagingSource[];
}

// Checked 2026-10-22. A product size is evidence that at least one product was
// listed in that size, not that every supplier or region uses it.
export const CEMENT_PACKAGING_SOURCES: Record<string, PackagingSource[]> = {
  NG: [
    {
      url: "https://buildmart.dirigible.com.ng/product/dangote-3x-42-5n/",
      publisher: "BuildMart / Dangote product listing",
      sourceType: "retailer",
      observedPackSizesKg: [50],
      scopeNote:
        "One Dangote product listing; another listed BUA product is 51 kg. Confirm selected brand and bag label.",
    },
  ],
  US: [
    {
      url: "https://www.quikrete.com/pdfs/data_sheet-portlandcement.pdf",
      publisher: "QUIKRETE product data sheet",
      sourceType: "manufacturer",
      observedPackSizesKg: [14, 21.3, 40, 42, 42.6],
      scopeNote:
        "Manufacturer lists multiple bag sizes; regional availability varies.",
    },
  ],
  GB: [
    {
      url: "https://www.wickes.co.uk/Blue-Circle-General-Purpose-Cement---25kg/p/224661",
      publisher: "Wickes / Blue Circle listing",
      sourceType: "retailer",
      observedPackSizesKg: [25],
      scopeNote:
        "One current retail product listing; not a nationwide market rule.",
    },
  ],
  CA: [
    {
      url: "https://interlinehardware.ca/products/stubbes-portland-cement-40kg",
      publisher: "Interline Wholesale Hardware / Stubbe's listing",
      sourceType: "retailer",
      observedPackSizesKg: [20, 30, 40],
      scopeNote:
        "One supplier lists three sizes; regional availability varies.",
    },
  ],
  AU: [
    {
      url: "https://adelaidebrighton.com.au/our-products/packaged-products/",
      publisher: "Adbri Cement",
      sourceType: "manufacturer",
      observedPackSizesKg: [20],
      scopeNote:
        "South Australian packaged range; availability and product family vary by location.",
    },
  ],
  NZ: [
    {
      url: "https://atlasconcrete.co.nz/building-materials/bagged-goods/",
      publisher: "Atlas Concrete",
      sourceType: "retailer",
      observedPackSizesKg: [25, 40],
      scopeNote:
        "Supplier says its bagged cement is available in 25 kg or 40 kg bags.",
    },
  ],
  DE: [
    {
      url: "https://www.bauhaus.info/zement-moertel/zement/p/13887110",
      publisher: "BAUHAUS Germany",
      sourceType: "retailer",
      observedPackSizesKg: [25],
      scopeNote: "One listed Portland cement product; not a national standard.",
    },
  ],
  FR: [
    {
      url: "https://www.lafarge.fr/ciment-original",
      publisher: "Lafarge France",
      sourceType: "manufacturer",
      observedPackSizesKg: [25, 35],
      scopeNote: "Lafarge L'Original lists 25 kg and 35 kg packaging.",
    },
  ],
  IT: [
    {
      url: "https://ditarantomaterialiedili.it/malte/140-cemento-25-kg-italcementi-materiali-edili-.html",
      publisher: "Di Taranto Materiali Edili / Italcementi listing",
      sourceType: "manufacturer",
      observedPackSizesKg: [25],
      scopeNote:
        "One Italian bagged product; confirm cement-specific product and supplier.",
    },
  ],
  ES: [
    {
      url: "https://consydecor.com/es/cementos-y-morteros/20-cemento-gris-cem-ii-325-r.html",
      publisher: "Consydecor / cement product listing",
      sourceType: "retailer",
      observedPackSizesKg: [25],
      scopeNote: "One listed CEMEX product; not a national standard.",
    },
  ],
  NL: [
    {
      url: "https://www.stiho.nl/producten/ruwbouw/zakkengoed/cement-kalk-zakkengoed/",
      publisher: "Stiho",
      sourceType: "retailer",
      observedPackSizesKg: [20, 25],
      scopeNote:
        "Retail category includes 20 kg and 25 kg cement/mortar products; check exact material type.",
    },
  ],
  PL: [
    {
      url: "https://www.heidelbergmaterials.pl/pl/cement-portlandzki-pn-en-197-1-cem-i-425r",
      publisher: "Heidelberg Materials Poland",
      sourceType: "manufacturer",
      observedPackSizesKg: [25],
      scopeNote: "Manufacturer lists CEM I 42.5R in 25 kg bags.",
    },
  ],
  SE: [
    {
      url: "https://bolist.se/produkt/byggcement-25kg-finja/",
      publisher: "BOLIST / Finja listing",
      sourceType: "retailer",
      observedPackSizesKg: [25],
      scopeNote:
        "One listed product; manufacturer page also describes 20 kg cement use, so verify brand and current pack.",
    },
  ],
  CH: [
    {
      url: "https://www.fischer-ag.ch/de/item/portland-zement-cem-i-cem-ii/PC25N",
      publisher: "Fischer & Cie AG",
      sourceType: "retailer",
      observedPackSizesKg: [25],
      scopeNote: "Listed Portland cement products in 25 kg bags.",
    },
  ],
  IN: [
    {
      url: "https://nclind.com/nagarjuna-cement/",
      publisher: "NCL Industries / Nagarjuna Cement",
      sourceType: "manufacturer",
      observedPackSizesKg: [50],
      scopeNote:
        "Manufacturer lists its products in 50 kg bags; not all brands or retail SKUs.",
    },
  ],
  ZA: [
    {
      url: "https://carrimonline.co.za/product/ppc-cement-42-5n-surebuild-50kg/",
      publisher: "Carrim Online / PPC listing",
      sourceType: "retailer",
      observedPackSizesKg: [50],
      scopeNote:
        "Manufacturer page provides bagged cement storage guidance; retail listings confirm 50 kg product examples.",
    },
  ],
  KE: [
    {
      url: "https://devkigroupkenya.com/companies/national-cement",
      publisher: "Devki Group / National Cement listing",
      sourceType: "retailer",
      observedPackSizesKg: [50],
      scopeNote:
        "Brand product listings; confirm selected grade and bag label.",
    },
  ],
  GH: [
    {
      url: "https://www.ghacem.com/en/products",
      publisher: "Ghacem",
      sourceType: "manufacturer",
      observedPackSizesKg: [50],
      scopeNote: "Manufacturer lists multiple product grades in 50 kg bags.",
    },
  ],
  TZ: [
    {
      url: "https://www.camelcement.com/cart",
      publisher: "Camel Cement",
      sourceType: "manufacturer",
      observedPackSizesKg: [50],
      scopeNote:
        "Manufacturer sales page states all grades are supplied in 50 kg bags.",
    },
  ],
  CI: [
    {
      url: "https://www.legrandbatiment.ci/576-cimenterie",
      publisher: "Le Grand Bâtiment retailer",
      sourceType: "retailer",
      observedPackSizesKg: [50],
      scopeNote:
        "Abidjan retailer lists BIG CIM and Dangote products in 50 kg bags; not country-wide evidence.",
    },
  ],
  ET: [
    {
      url: "https://habeshacement.com/",
      publisher: "Habesha Cement",
      sourceType: "manufacturer",
      observedPackSizesKg: [50],
      scopeNote: "Manufacturer states OPC and PPC available in 50 kg bags.",
    },
  ],
  EG: [
    {
      url: "https://www.heidelbergmaterials.eg/en/suez-opc",
      publisher: "Heidelberg Materials Egypt",
      sourceType: "manufacturer",
      observedPackSizesKg: [50],
      scopeNote:
        "Manufacturer lists a 50 kg bag option alongside big bags and bulk.",
    },
  ],
  SA: [
    {
      url: "https://www.tcc-sa.com/en/products/",
      publisher: "Tabuk Cement Company",
      sourceType: "manufacturer",
      observedPackSizesKg: [50],
      scopeNote: "Manufacturer lists 50 kg bags and bulk loading.",
    },
  ],
  AE: [
    {
      url: "https://www.rashidcocement.com/",
      publisher: "Rashidco Cement Supplier",
      sourceType: "retailer",
      observedPackSizesKg: [50],
      scopeNote:
        "Supplier listing shows 50 kg bags; confirm brand and location.",
    },
  ],
  TR: [
    {
      url: "https://www.nuhcimento.com.tr/cimento/",
      publisher: "Nuh Çimento",
      sourceType: "manufacturer",
      observedPackSizesKg: [50],
      scopeNote:
        "Manufacturer lists 50 kg bagged products as well as big bags and bulk.",
    },
  ],
  JP: [
    {
      url: "https://www.askul.co.jp/p/KP36762/",
      publisher: "ASKUL / Taiheiyo Cement listing",
      sourceType: "retailer",
      observedPackSizesKg: [25],
      scopeNote: "One listed product; check product and delivery region.",
    },
  ],
  KR: [
    {
      url: "https://www.uiiik.co.kr/product/SC070CMNT/?ki=",
      publisher: "Uiiik retailer listing",
      sourceType: "retailer",
      observedPackSizesKg: [40],
      scopeNote:
        "One domestic Portland cement listing; confirm product label and supplier.",
    },
  ],
  CN: [
    {
      url: "https://e.huaxincem.com/product/productdetailshow.html?p_id=808",
      publisher: "Huaxin Cement store",
      sourceType: "manufacturer",
      observedPackSizesKg: [50],
      scopeNote:
        "Huaxin listing shows a 50 kg product in specified regions; not all brands or provinces.",
    },
  ],
  ID: [
    {
      url: "https://www.cemindo.com/en/our-business/products/semen-merah-putih",
      publisher: "Cemindo Gemilang",
      sourceType: "manufacturer",
      observedPackSizesKg: [40, 50],
      scopeNote:
        "Manufacturer lists 40 kg and 50 kg packs, with distribution in major cities.",
    },
  ],
  BR: [
    {
      url: "https://www.votorantimcimentos.com.br/produtos/cimentos/todas-as-obras/",
      publisher: "Votorantim Cimentos",
      sourceType: "manufacturer",
      observedPackSizesKg: [25, 42.5, 50],
      scopeNote:
        "Manufacturer lists 25 kg, 42.5 kg and 50 kg, subject to regional availability.",
    },
  ],
  MX: [
    {
      url: "https://revistafortuna.com.mx/2024/04/03/cementos-moctezuma-comercializa-sacos-de-25-kilos/",
      publisher: "Revista Fortuna reporting Cementos Moctezuma",
      sourceType: "trade-publication",
      observedPackSizesKg: [25, 50],
      scopeNote:
        "Reports transition from 50 kg to 25 kg product bags; 25 kg availability was stated at 80% of territory in 2024. Confirm current regional stock.",
    },
  ],
  SG: [
    {
      url: "https://acelink.sg/product/onoda-cement/",
      publisher: "Acelink retailer",
      sourceType: "retailer",
      observedPackSizesKg: [50],
      scopeNote:
        "One Onoda cement product listing; confirm current availability and grade.",
    },
  ],
};

export function getPackagingEvidence(
  marketCode: string,
  item: string,
  quantityKg: number | undefined,
): PackagingEvidence {
  const market = (marketCode || "UNSPECIFIED").toUpperCase();
  const valid = Number.isFinite(quantityKg) && (quantityKg ?? 0) > 0;
  const sources =
    item.toLowerCase() === "cement"
      ? (CEMENT_PACKAGING_SOURCES[market] ?? [])
      : [];
  const observedPackSizesKg = [
    ...new Set(sources.flatMap((source) => source.observedPackSizesKg)),
  ].sort((a, b) => a - b);
  const packKg = valid ? quantityKg! : null;
  const supported = packKg !== null && observedPackSizesKg.includes(packKg);
  const status: PackagingEvidenceStatus = supported
    ? "source_observed"
    : packKg === null
      ? "not_available"
      : "planning_assumption";
  const label = supported
    ? "Source-observed product size · verify local supplier"
    : packKg === null
      ? "Package size not verified"
      : "Planning assumption · supplier confirmation required";
  const observed = observedPackSizesKg.length
    ? ` Sources located for ${market} list ${observedPackSizesKg.join(", ")} kg pack size${observedPackSizesKg.length === 1 ? "" : "s"}. This is product-level evidence, not a country-wide standard.${sources.map((source) => ` ${source.scopeNote}`).join("")}`
    : ` No packaging source is recorded for ${market}.`;
  const guidance =
    packKg === null
      ? `No package size is available for ${item} in ${market}. Enter the actual product pack size before estimating purchase quantities.${observed}`
      : supported
        ? `${packKg} kg ${item} pack is supported by at least one listed source for ${market}; product, grade, region, and current stock may differ. Confirm the actual product label and supplier before ordering.${observed}`
        : `${packKg} kg ${item} pack is not supported by the currently recorded sources for ${market}; the calculator value remains a planning assumption. Confirm the product label and supplier pack size before ordering.${observed}`;
  return {
    marketCode: market,
    item,
    quantityKg: packKg,
    status,
    label,
    guidance,
    observedPackSizesKg,
    sources,
  };
}
