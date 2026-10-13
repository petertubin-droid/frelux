/**
 * Market-scoped residential building typologies for the timeline estimator
 * and estimator pages. The NG option list is preserved exactly (baseline).
 * Every other market gets the typologies that actually dominate its housing
 * stock, with the source that verifies it. Labels are the market's local
 * terminology (e.g. DE Einfamilienhaus, ID Rumah, BR Sobrado).
 */

export interface TypologyOption {
  typeCode: string;
  label: string;
}

export interface TypologyProfile {
  marketCode: string;
  typologies: TypologyOption[];
  defaultType: string;
  note: string;
  source: string;
  confidence: "verified" | "industry_standard" | "pending_verification";
}

const P = (
  marketCode: string,
  typologies: TypologyOption[],
  defaultType: string,
  note: string,
  source: string,
  confidence: TypologyProfile["confidence"],
): TypologyProfile => ({
  marketCode,
  typologies,
  defaultType,
  note,
  source,
  confidence,
});

const PROFILES: Record<string, TypologyProfile> = {
  NG: P(
    "NG",
    [
      { typeCode: "bungalow", label: "Bungalow" },
      { typeCode: "duplex", label: "Duplex" },
      { typeCode: "two_storey", label: "Two Storey" },
      { typeCode: "apartment", label: "Apartment" },
      { typeCode: "office", label: "Office" },
      { typeCode: "shop", label: "Shop" },
    ],
    "bungalow",
    "Standard Nigerian residential typologies (baseline, unchanged)",
    "Established Frelux NG methodology baseline",
    "verified",
  ),
  US: P(
    "US",
    [
      { typeCode: "single_family", label: "Single-family home" },
      { typeCode: "ranch", label: "Ranch (single storey)" },
      { typeCode: "two_storey", label: "Two-story home" },
      { typeCode: "townhouse", label: "Townhouse" },
      { typeCode: "condo", label: "Condominium / apartment" },
    ],
    "single_family",
    "Single-family detached homes dominate the US housing stock; ranch is the most-searched style",
    "US housing market references (ranch most requested style 2024; single-family detached dominant)",
    "verified",
  ),
  GB: P(
    "GB",
    [
      { typeCode: "semi_detached", label: "Semi-detached house" },
      { typeCode: "terraced", label: "Terraced house" },
      { typeCode: "detached", label: "Detached house" },
      { typeCode: "bungalow", label: "Bungalow" },
      { typeCode: "flat", label: "Flat / apartment" },
    ],
    "semi_detached",
    "Semi-detached and terraced houses dominate the UK housing stock",
    "UK housing stock structure (semi-detached 24.6%+ terraces; detached 17.9%; flats 22%; bungalows 7.7%)",
    "verified",
  ),
  DE: P(
    "DE",
    [
      { typeCode: "einfamilienhaus", label: "Einfamilienhaus (single-family house)" },
      { typeCode: "reihenhaus", label: "Reihenhaus (row house)" },
      { typeCode: "zweifamilienhaus", label: "Zweifamilienhaus (two-family house)" },
      { typeCode: "mehrfamilienhaus", label: "Mehrfamilienhaus (multi-family)" },
    ],
    "einfamilienhaus",
    "Single-family houses dominate the existing stock; multi-family is the majority of new builds (58%)",
    "German housing stock research (multi-family share of new builds rose to 58%); German housing vocabulary references",
    "verified",
  ),
  FR: P(
    "FR",
    [
      { typeCode: "maison_individuelle", label: "Maison individuelle / pavillon" },
      { typeCode: "maison_mitoyenne", label: "Maison mitoyenne (semi-detached)" },
      { typeCode: "appartement", label: "Appartement" },
    ],
    "maison_individuelle",
    "Individual ownership of detached pavillons accounts for the majority of French residential value",
    "French housing vocabulary and stock references (maison individuelle, pavillon; INSEE 38.4M units 2025)",
    "verified",
  ),
  IT: P(
    "IT",
    [
      { typeCode: "casa_indipendente", label: "Casa indipendente / villetta" },
      { typeCode: "casa_schiera", label: "Casa a schiera (row house)" },
      { typeCode: "appartamento", label: "Appartamento" },
    ],
    "casa_indipendente",
    "Villette and independent houses are the standard Italian residential build; apartments dominate city centres",
    "Italian residential practice (villetta/casa a schiera terminology; urban apartment stock)",
    "industry_standard",
  ),
  JP: P(
    "JP",
    [
      { typeCode: "detached_house", label: "Detached two-storey house (wooden)" },
      { typeCode: "mansion", label: "Mansion (condominium)" },
    ],
    "detached_house",
    "62.3% of Japanese own a detached two-storey house; ~61% of new homes are wooden",
    "Housing in Japan (62.3% detached two-storey); Brookings Japan rental housing (78% of new ownership units detached); Wood Central Japan housing starts (61% wood)",
    "verified",
  ),
  KR: P(
    "KR",
    [
      { typeCode: "apartment", label: "Apartment (RC wall-panel tower)" },
      { typeCode: "villa", label: "Villa (low-rise multi-family)" },
      { typeCode: "detached_house", label: "Detached house" },
    ],
    "apartment",
    "Apartments are the dominant Korean residential typology (RC wall-panel construction)",
    "Korean apartment typology analyses (MDPI; Hyundai apartment heritage; PC modular news)",
    "verified",
  ),
  CA: P(
    "CA",
    [
      { typeCode: "single_detached", label: "Single detached house" },
      { typeCode: "semi_detached", label: "Semi-detached house" },
      { typeCode: "row_house", label: "Row house" },
      { typeCode: "condo", label: "Condominium / apartment" },
    ],
    "single_detached",
    "Single detached houses dominate the Canadian housing stock",
    "NRCan residential housing stock by building type (single detached 8.4M of 15.6M dwellings)",
    "verified",
  ),
  AU: P(
    "AU",
    [
      { typeCode: "separate_house", label: "Separate house" },
      { typeCode: "townhouse", label: "Townhouse" },
      { typeCode: "apartment", label: "Apartment / unit" },
    ],
    "separate_house",
    "70% of Australian dwellings are separate houses; 13% townhouses, 17% apartments",
    "ABS Census 2021 dwelling structure (70% separate houses, 13% townhouses, 17% apartments)",
    "verified",
  ),
  IN: P(
    "IN",
    [
      { typeCode: "independent_house", label: "Independent house" },
      { typeCode: "bungalow", label: "Bungalow" },
      { typeCode: "duplex", label: "Duplex" },
      { typeCode: "row_house", label: "Row house" },
      { typeCode: "flat", label: "Flat / builder floor" },
    ],
    "independent_house",
    "Flats and independent houses dominate Indian urban housing; burnt brick the leading wall material (~45%)",
    "India housing type guides (flats, duplex, bungalow, row house); Census 2001 wall material distribution (45% burnt brick)",
    "industry_standard",
  ),
  BR: P(
    "BR",
    [
      { typeCode: "casa", label: "Casa (single-storey house)" },
      { typeCode: "sobrado", label: "Sobrado (two-storey house)" },
      { typeCode: "apartamento", label: "Apartamento" },
    ],
    "casa",
    "84.8% of Brazilians live in casas; 12.5% in apartments (Censo 2022)",
    "IBGE Censo 2022 dwelling types (59.6M casas, 84.8% of population in casas)",
    "verified",
  ),
  MX: P(
    "MX",
    [
      { typeCode: "casa", label: "Casa independiente" },
      { typeCode: "departamento", label: "Departamento" },
      { typeCode: "oficina", label: "Oficina / local" },
    ],
    "casa",
    "Independent houses are the dominant Mexican dwelling type; 59.4% of households own their home",
    "INEGI ENIGH 2024 (59.4% home ownership; dwelling stock references)",
    "industry_standard",
  ),
  ZA: P(
    "ZA",
    [
      { typeCode: "house", label: "House (separate stand)" },
      { typeCode: "townhouse", label: "Townhouse" },
      { typeCode: "duplex", label: "Duplex" },
      { typeCode: "flat", label: "Flat / apartment" },
    ],
    "house",
    "88.5% of households live in formal dwellings (2022); houses on separate stands dominate",
    "Stats SA (formal dwellings 88.5% in 2022); dwelling type distributions (Statista 2022)",
    "verified",
  ),
  ID: P(
    "ID",
    [
      { typeCode: "rumah_1", label: "Rumah 1 lantai (single-storey house)" },
      { typeCode: "rumah_2", label: "Rumah 2 lantai (two-storey house)" },
      { typeCode: "rumah_susun", label: "Rumah susun (apartment)" },
    ],
    "rumah_1",
    "Single-storey rumah dominates Indonesian residential construction; rumah susun is the urban multi-storey form",
    "Indonesian housing law UU 20/2011 (rumah susun); Indonesian residential practice (rumah 1-2 lantai)",
    "industry_standard",
  ),
  SA: P(
    "SA",
    [
      { typeCode: "villa", label: "Villa (detached house)" },
      { typeCode: "townhouse", label: "Townhouse" },
      { typeCode: "apartment", label: "Apartment" },
    ],
    "villa",
    "Villas are the standard Saudi residential build; apartments serve the urban multi-storey market",
    "Saudi housing market practice (villa-dominant residential construction; concrete block/AAC wall profiles)",
    "industry_standard",
  ),
  AE: P(
    "AE",
    [
      { typeCode: "villa", label: "Villa (detached house)" },
      { typeCode: "townhouse", label: "Townhouse" },
      { typeCode: "apartment", label: "Apartment" },
    ],
    "villa",
    "Villas are the standard UAE residential build (RC frame + block work)",
    "UAE residential construction practice (villa block work; Abu Dhabi block works listings)",
    "industry_standard",
  ),
  CN: P(
    "CN",
    [
      { typeCode: "apartment", label: "Apartment (commercial housing)" },
      { typeCode: "self_built_house", label: "Self-built house (砖混 masonry)" },
    ],
    "apartment",
    "Commercial apartments dominate urban China; self-built 砖混 masonry houses are the rural standard",
    "China housing practice (商品房 apartment stock; 砖混 brick-concrete self-built housing)",
    "industry_standard",
  ),
  GH: P(
    "GH",
    [
      { typeCode: "bungalow", label: "Bungalow" },
      { typeCode: "storey_building", label: "Storey building (multi-storey)" },
      { typeCode: "compound_house", label: "Compound house" },
      { typeCode: "apartment", label: "Apartment" },
    ],
    "bungalow",
    "Bungalows, storey buildings and compound houses are the standard Ghanaian residential forms",
    "Ghana housing style references (compound houses, bungalows, storey buildings; sandcrete block studies)",
    "industry_standard",
  ),
  KE: P(
    "KE",
    [
      { typeCode: "bungalow", label: "Bungalow" },
      { typeCode: "maisonette", label: "Maisonette" },
      { typeCode: "apartment", label: "Apartment" },
      { typeCode: "bedsitter_block", label: "Bedsitter block" },
    ],
    "bungalow",
    "Bungalows and maisonettes are the standard Kenyan build; apartments and bedsitter blocks serve urban rental",
    "Kenya real estate market references (maisonette/bungalow plans, apartments, bedsitters; machine-cut stone walling)",
    "industry_standard",
  ),
};

/** Generic fallback for markets not yet profiled — explicitly UNVERIFIED. */
export function resolveTypologyProfile(marketCode: string): TypologyProfile {
  return (
    PROFILES[marketCode] ?? {
      marketCode,
      typologies: [
        { typeCode: "bungalow", label: "Bungalow" },
        { typeCode: "two_storey", label: "Two Storey" },
        { typeCode: "apartment", label: "Apartment" },
        { typeCode: "office", label: "Office" },
      ],
      defaultType: "bungalow",
      note: "Market typologies not yet profiled — generic options (unverified for this market)",
      source: "No market-specific typology verified yet",
      confidence: "pending_verification",
    }
  );
}

export function listTypologyMarkets(): { code: string; profiled: boolean }[] {
  return Object.keys(PROFILES).map((code) => ({ code, profiled: true }));
}
