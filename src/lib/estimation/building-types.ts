// =========================================================
// BUILDING TYPES
//
// The estimator used to offer seven types: bungalow, duplex, two_storey,
// apartment, office, shop, custom. Seven does not describe what people actually
// build, and none of them carried an opening schedule, so every project started
// from the same four doors and six windows.
//
// Each type here carries what a takeoff needs before the user measures
// anything: storeys, typical gross floor area, wall and roof assumptions, and
// an opening profile split the way a schedule is split (windows, internal
// doors, entrance/security doors).
//
// Location awareness: a type is listed for the regions where it is commonly
// built, and the opening profile varies by region, because a four-bedroom
// bungalow in Lagos and in Houston do not have the same door count or the same
// door sizes. Sizes come from the shared openings model, not from here.
//
// These are starting points, labelled as such. A user's own schedule always
// overrides them, and nothing here claims to be a code requirement.
// =========================================================

import type { OpeningCategory } from "@/lib/estimation/openings";

export type BuildingTypeId =
  | "bungalow"
  | "duplex"
  | "two_storey"
  | "three_storey"
  | "semi_detached"
  | "terraced"
  | "apartment_block"
  | "apartment"
  | "office"
  | "shop"
  | "school"
  | "clinic"
  | "warehouse"
  | "hotel"
  | "custom";

export type RegionId =
  | "africa"
  | "north_america"
  | "europe"
  | "uk_ie"
  | "oceania"
  | "south_asia"
  | "mena"
  | "latam"
  | "east_asia";

export type OpeningCounts = Record<OpeningCategory, number>;

export interface BuildingTypeDefinition {
  id: BuildingTypeId;
  label: string;
  /** One line a user can recognise themselves in. */
  description: string;
  /** Storeys above ground for a typical instance. */
  storeys: number;
  /** Typical gross floor area, used only as a starting value. */
  typicalFloorAreaM2: number;
  /** Regions where this type is commonly built. */
  regions: RegionId[];
  /** Opening counts for a typical instance, before regional adjustment. */
  openings: OpeningCounts;
  /** Regional adjustments, where the local form genuinely differs. */
  regionalOpenings?: Partial<Record<RegionId, Partial<OpeningCounts>>>;
}

export const BUILDING_TYPES: readonly BuildingTypeDefinition[] = [
  {
    id: "bungalow",
    label: "Bungalow (single storey)",
    description: "One storey, detached, family house.",
    storeys: 1,
    typicalFloorAreaM2: 150,
    regions: [
      "africa",
      "north_america",
      "europe",
      "uk_ie",
      "oceania",
      "south_asia",
      "mena",
      "latam",
      "east_asia",
    ],
    openings: { window: 12, internal_door: 6, entrance_door: 1 },
    regionalOpenings: {
      // Warmer climates ventilate through more openings; colder markets
      // concentrate glazing and add a second exterior door.
      africa: { window: 14, internal_door: 6, entrance_door: 1 },
      south_asia: { window: 14, internal_door: 6, entrance_door: 1 },
      north_america: { window: 14, internal_door: 8, entrance_door: 2 },
      europe: { window: 11, internal_door: 8, entrance_door: 2 },
      uk_ie: { window: 10, internal_door: 7, entrance_door: 2 },
    },
  },
  {
    id: "duplex",
    label: "Duplex",
    description: "Two-storey detached house, often semi-detached in form.",
    storeys: 2,
    typicalFloorAreaM2: 250,
    regions: [
      "africa",
      "north_america",
      "europe",
      "uk_ie",
      "oceania",
      "south_asia",
      "mena",
      "latam",
    ],
    openings: { window: 20, internal_door: 10, entrance_door: 1 },
    regionalOpenings: {
      africa: { window: 22, internal_door: 10, entrance_door: 1 },
      north_america: { window: 22, internal_door: 12, entrance_door: 2 },
      europe: { window: 18, internal_door: 12, entrance_door: 2 },
    },
  },
  {
    id: "two_storey",
    label: "Two-storey building",
    description:
      "Two storeys, general purpose, residential or light commercial.",
    storeys: 2,
    typicalFloorAreaM2: 220,
    regions: [
      "africa",
      "north_america",
      "europe",
      "uk_ie",
      "oceania",
      "south_asia",
      "mena",
      "latam",
      "east_asia",
    ],
    openings: { window: 18, internal_door: 9, entrance_door: 1 },
  },
  {
    id: "three_storey",
    label: "Three-storey building",
    description: "Three storeys, walk-up or with a single core.",
    storeys: 3,
    typicalFloorAreaM2: 330,
    regions: [
      "africa",
      "europe",
      "uk_ie",
      "south_asia",
      "mena",
      "latam",
      "east_asia",
      "oceania",
    ],
    openings: { window: 27, internal_door: 14, entrance_door: 1 },
  },
  {
    id: "semi_detached",
    label: "Semi-detached house",
    description: "Two-storey house sharing one party wall.",
    storeys: 2,
    typicalFloorAreaM2: 130,
    regions: ["uk_ie", "europe", "north_america", "oceania"],
    openings: { window: 10, internal_door: 7, entrance_door: 2 },
    regionalOpenings: {
      uk_ie: { window: 9, internal_door: 7, entrance_door: 2 },
      north_america: { window: 12, internal_door: 9, entrance_door: 2 },
    },
  },
  {
    id: "terraced",
    label: "Terraced house",
    description: "Row house sharing two party walls, two or three storeys.",
    storeys: 2,
    typicalFloorAreaM2: 95,
    regions: ["uk_ie", "europe", "north_america", "latam"],
    openings: { window: 8, internal_door: 6, entrance_door: 2 },
  },
  {
    id: "apartment_block",
    label: "Apartment block",
    description: "Multi-storey flats with a shared core and common areas.",
    storeys: 4,
    typicalFloorAreaM2: 600,
    regions: [
      "africa",
      "europe",
      "uk_ie",
      "north_america",
      "oceania",
      "south_asia",
      "mena",
      "latam",
      "east_asia",
    ],
    openings: { window: 40, internal_door: 24, entrance_door: 2 },
    regionalOpenings: {
      africa: { window: 44, internal_door: 24, entrance_door: 2 },
      north_america: { window: 40, internal_door: 28, entrance_door: 3 },
    },
  },
  {
    id: "apartment",
    label: "Apartment unit",
    description: "A single flat within a block.",
    storeys: 1,
    typicalFloorAreaM2: 90,
    regions: [
      "africa",
      "europe",
      "uk_ie",
      "north_america",
      "oceania",
      "south_asia",
      "mena",
      "latam",
      "east_asia",
    ],
    openings: { window: 6, internal_door: 4, entrance_door: 1 },
  },
  {
    id: "office",
    label: "Office building",
    description: "Office floors with a core, glazed or partly glazed.",
    storeys: 3,
    typicalFloorAreaM2: 450,
    regions: [
      "africa",
      "europe",
      "uk_ie",
      "north_america",
      "oceania",
      "south_asia",
      "mena",
      "latam",
      "east_asia",
    ],
    openings: { window: 30, internal_door: 16, entrance_door: 2 },
  },
  {
    id: "shop",
    label: "Shop / retail unit",
    description:
      "Single-storey retail with a shopfront and a store at the rear.",
    storeys: 1,
    typicalFloorAreaM2: 120,
    regions: [
      "africa",
      "europe",
      "uk_ie",
      "north_america",
      "oceania",
      "south_asia",
      "mena",
      "latam",
      "east_asia",
    ],
    openings: { window: 6, internal_door: 3, entrance_door: 2 },
  },
  {
    id: "school",
    label: "School block",
    description: "Classroom block with a corridor and shared washrooms.",
    storeys: 1,
    typicalFloorAreaM2: 400,
    regions: [
      "africa",
      "europe",
      "uk_ie",
      "north_america",
      "oceania",
      "south_asia",
      "mena",
      "latam",
      "east_asia",
    ],
    openings: { window: 36, internal_door: 14, entrance_door: 4 },
  },
  {
    id: "clinic",
    label: "Clinic / health centre",
    description: "Consulting rooms, treatment and waiting areas.",
    storeys: 1,
    typicalFloorAreaM2: 250,
    regions: [
      "africa",
      "europe",
      "uk_ie",
      "north_america",
      "oceania",
      "south_asia",
      "mena",
      "latam",
    ],
    openings: { window: 20, internal_door: 12, entrance_door: 2 },
  },
  {
    id: "warehouse",
    label: "Warehouse / industrial shed",
    description: "Single-storey storage or light industrial, large spans.",
    storeys: 1,
    typicalFloorAreaM2: 800,
    regions: [
      "africa",
      "europe",
      "uk_ie",
      "north_america",
      "oceania",
      "south_asia",
      "mena",
      "latam",
      "east_asia",
    ],
    openings: { window: 10, internal_door: 4, entrance_door: 3 },
  },
  {
    id: "hotel",
    label: "Hotel / guest house",
    description: "Guest rooms off a corridor, with a lobby and service rooms.",
    storeys: 3,
    typicalFloorAreaM2: 700,
    regions: [
      "africa",
      "europe",
      "uk_ie",
      "north_america",
      "oceania",
      "south_asia",
      "mena",
      "latam",
      "east_asia",
    ],
    openings: { window: 48, internal_door: 30, entrance_door: 3 },
  },
  {
    id: "custom",
    label: "Custom / other",
    description: "Anything the list does not cover. Starts empty.",
    storeys: 1,
    typicalFloorAreaM2: 120,
    regions: [
      "africa",
      "north_america",
      "europe",
      "uk_ie",
      "oceania",
      "south_asia",
      "mena",
      "latam",
      "east_asia",
    ],
    openings: { window: 0, internal_door: 0, entrance_door: 0 },
  },
] as const;

/** Market to region. Everything unlisted falls back to europe for conventions. */
export const MARKET_REGION: Record<string, RegionId> = {
  NG: "africa",
  GH: "africa",
  KE: "africa",
  ZA: "africa",
  UG: "africa",
  TZ: "africa",
  EG: "africa",
  US: "north_america",
  CA: "north_america",
  GB: "uk_ie",
  IE: "uk_ie",
  AU: "oceania",
  NZ: "oceania",
  IN: "south_asia",
  PK: "south_asia",
  BD: "south_asia",
  AE: "mena",
  SA: "mena",
  QA: "mena",
  DE: "europe",
  FR: "europe",
  NL: "europe",
  ES: "europe",
  IT: "europe",
  PT: "europe",
  PL: "europe",
  SE: "europe",
  NO: "europe",
  DK: "europe",
  MX: "latam",
  BR: "latam",
  AR: "latam",
  CL: "latam",
  CN: "east_asia",
  JP: "east_asia",
  KR: "east_asia",
  SG: "east_asia",
  MY: "east_asia",
  TR: "europe",
};

export function regionForMarket(
  marketCode: string | undefined | null,
): RegionId {
  if (!marketCode) return "europe";
  return MARKET_REGION[marketCode.toUpperCase()] ?? "europe";
}

export function buildingTypeById(id: string): BuildingTypeDefinition | null {
  return BUILDING_TYPES.find((t) => t.id === id) ?? null;
}

/**
 * Types commonly built in the user's region, with the region's own opening
 * counts. "custom" is always last and always available.
 */
export function buildingTypesForMarket(
  marketCode: string | undefined | null,
): BuildingTypeDefinition[] {
  const region = regionForMarket(marketCode);
  // "custom" is offered everywhere, so it must not be counted as a local type
  // and then appended again.
  const local = BUILDING_TYPES.filter(
    (t) => t.id !== "custom" && t.regions.includes(region),
  );
  const rest = BUILDING_TYPES.filter(
    (t) => !t.regions.includes(region) && t.id !== "custom",
  );
  const custom = BUILDING_TYPES.filter((t) => t.id === "custom");
  return [...local, ...rest, ...custom];
}

/** Opening counts for a type in a market: regional adjustment applied. */
export function openingCountsFor(
  buildingTypeId: string,
  marketCode: string | undefined | null,
): OpeningCounts {
  const type = buildingTypeById(buildingTypeId);
  if (!type) return { window: 0, internal_door: 0, entrance_door: 0 };
  const region = regionForMarket(marketCode);
  const regional = type.regionalOpenings?.[region] ?? {};
  return {
    window: regional.window ?? type.openings.window,
    internal_door: regional.internal_door ?? type.openings.internal_door,
    entrance_door: regional.entrance_door ?? type.openings.entrance_door,
  };
}
