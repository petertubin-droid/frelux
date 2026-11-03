import type { SpaceType } from "./types";
import type { BuildingPreset, PresetRoom } from "./building-presets";

/**
 * Building type catalogue.
 *
 * The hand-written presets in building-presets.ts describe what each market
 * actually builds. This catalogue adds the rest of the range every market
 * expects to see: the missing house types plus the non-residential buildings a
 * contractor is asked to price (shop, office, school block, clinic, warehouse,
 * guest house, place of worship, mixed use).
 *
 * Every programme is written once in reference metres and compiled per housing
 * profile by scaling each space family, so a Lagos shop and a London shop are
 * the same plan at different sizes instead of two copies of the same numbers.
 * The compiled rooms are only a starting point: the calculators always expose
 * length, width and height as editable inputs.
 */

/** How the picker groups building types. */
export type BuildingCategory =
  "residential" | "commercial" | "hospitality" | "institutional" | "industrial";

export const BUILDING_CATEGORY_LABELS: Record<BuildingCategory, string> = {
  residential: "Residential",
  commercial: "Commercial",
  hospitality: "Hospitality & leisure",
  institutional: "Institutional",
  industrial: "Industrial & agricultural",
};

/** Space families that scale together within a market profile. */
export type SpaceFamily =
  "bedroom" | "living" | "kitchen" | "wet" | "service" | "commercial";

/** One room in a reference programme, in metres. */
export interface ProgrammeRoom {
  family: SpaceFamily;
  spaceType: SpaceType;
  label: string;
  /** Reference length in metres. */
  l: number;
  /** Reference width in metres. */
  w: number;
  quantity?: number;
  doors?: number;
  windows?: number;
}

/** A building type, expressed once and compiled for each market. */
export interface BuildingTypeProgramme {
  /** Stable key, also the preset id suffix. */
  key: string;
  label: string;
  description: string;
  /** Bedrooms; 0 for non-residential buildings. */
  bedrooms: number;
  /** True for houses and flats, false for commercial and institutional. */
  residential: boolean;
  /** Grouping used by the picker. */
  category: BuildingCategory;
  /**
   * Shape signature used to avoid adding a type a market already covers,
   * e.g. "3|bungalow" or "0|shop".
   */
  signature: string;
  /** Reference wall height in metres. */
  wallHeightM: number;
  rooms: ProgrammeRoom[];
}

/** Per-profile multipliers applied to each space family. */
export interface ProfileScale {
  bedroom: number;
  living: number;
  kitchen: number;
  wet: number;
  service: number;
  commercial: number;
  wallHeight: number;
}

const r = (
  family: SpaceFamily,
  spaceType: SpaceType,
  label: string,
  l: number,
  w: number,
  opts: Partial<Pick<ProgrammeRoom, "quantity" | "doors" | "windows">> = {},
): ProgrammeRoom => ({ family, spaceType, label, l, w, ...opts });

/**
 * The catalogue. Commercial and institutional types come first so every market
 * gets them before the residential fill, which is where markets differ.
 */
export const BUILDING_TYPE_CATALOGUE: BuildingTypeProgramme[] = [
  {
    key: "office-suite",
    label: "Office Suite",
    description: "Open plan office with meeting rooms",
    bedrooms: 0,
    residential: false,
    category: "commercial",
    signature: "0|office",
    wallHeightM: 3.0,
    rooms: [
      r("commercial", "office", "Open Office", 8.0, 6.0, { windows: 4 }),
      r("commercial", "office", "Meeting Room", 4.0, 3.2),
      r("commercial", "office", "Manager's Office", 3.6, 3.0),
      r("commercial", "office", "Reception", 4.0, 3.0),
      r("wet", "toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 2 }),
      r("service", "corridor", "Corridor", 8.0, 1.5, { doors: 0 }),
    ],
  },
  {
    key: "shop-unit",
    label: "Shop Unit",
    description: "Retail floor with store and toilet",
    bedrooms: 0,
    residential: false,
    category: "commercial",
    signature: "0|shop",
    wallHeightM: 3.2,
    rooms: [
      r("commercial", "other", "Shop Floor", 6.0, 4.0, { windows: 2 }),
      r("commercial", "other", "Counter Area", 2.4, 1.2, { doors: 0 }),
      r("service", "store", "Store", 2.4, 2.0),
      r("wet", "toilet", "Toilet", 1.8, 1.2),
    ],
  },
  {
    key: "school-block",
    label: "School Block",
    description: "Four classrooms with staff room",
    bedrooms: 0,
    residential: false,
    category: "institutional",
    signature: "0|school",
    wallHeightM: 3.2,
    rooms: [
      r("commercial", "other", "Classroom", 8.0, 6.5, {
        quantity: 4,
        windows: 4,
      }),
      r("commercial", "office", "Staff Room", 5.0, 3.6),
      r("wet", "toilet", "Toilet Block", 4.0, 2.4, { quantity: 2 }),
      r("service", "corridor", "Verandah Walk", 24.0, 1.8, { doors: 0 }),
    ],
  },
  {
    key: "clinic",
    label: "Clinic",
    description: "Consulting rooms, treatment and waiting area",
    bedrooms: 0,
    residential: false,
    category: "institutional",
    signature: "0|clinic",
    wallHeightM: 3.0,
    rooms: [
      r("commercial", "office", "Consulting Room", 4.0, 3.4, { quantity: 2 }),
      r("commercial", "other", "Treatment Room", 4.4, 3.6),
      r("commercial", "other", "Waiting Area", 5.0, 4.0, { windows: 2 }),
      r("commercial", "office", "Reception", 3.6, 3.0),
      r("wet", "toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 2 }),
      r("service", "store", "Store", 2.4, 2.0),
    ],
  },
  {
    key: "warehouse",
    label: "Warehouse",
    description: "Storage floor with office and loading bay",
    bedrooms: 0,
    residential: false,
    category: "industrial",
    signature: "0|warehouse",
    wallHeightM: 5.0,
    rooms: [
      r("commercial", "other", "Warehouse Floor", 18.0, 10.0, { windows: 2 }),
      r("commercial", "office", "Site Office", 4.5, 3.5),
      r("wet", "toilet", "Toilet", 2.0, 1.5),
      r("service", "veranda", "Loading Bay", 6.0, 3.0, { doors: 0 }),
    ],
  },
  {
    key: "guest-house",
    label: "Guest House",
    description: "Ten letting rooms with lobby and kitchen",
    bedrooms: 0,
    residential: false,
    category: "hospitality",
    signature: "0|guest-house",
    wallHeightM: 3.0,
    rooms: [
      r("commercial", "parlour", "Lobby", 5.0, 4.0, { windows: 2 }),
      r("bedroom", "bedroom", "Standard Room", 4.2, 3.6, { quantity: 8 }),
      r("bedroom", "bedroom", "Suite", 5.0, 4.2, { quantity: 2, windows: 2 }),
      r("kitchen", "kitchen", "Kitchen", 4.0, 3.0),
      r("service", "store", "Laundry", 3.0, 2.4),
      r("wet", "toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 2 }),
    ],
  },
  {
    key: "place-of-worship",
    label: "Place of Worship",
    description: "Auditorium with vestibule and offices",
    bedrooms: 0,
    residential: false,
    category: "institutional",
    signature: "0|worship",
    wallHeightM: 5.0,
    rooms: [
      r("commercial", "other", "Auditorium", 18.0, 12.0, { windows: 6 }),
      r("commercial", "other", "Vestibule", 6.0, 4.0),
      r("commercial", "office", "Church Office", 4.0, 3.0),
      r("wet", "toilet", "Toilet & Bath", 2.4, 1.8, { quantity: 2 }),
      r("service", "store", "Store", 3.0, 2.4),
    ],
  },
  {
    key: "mixed-use-block",
    label: "Mixed Use Block",
    description: "Shops below, two bedroom flat above",
    bedrooms: 2,
    residential: false,
    category: "commercial",
    signature: "0|mixed-use",
    wallHeightM: 3.2,
    rooms: [
      r("commercial", "other", "Shop Floor", 5.0, 4.0, {
        quantity: 2,
        windows: 2,
      }),
      r("commercial", "office", "Office Floor", 5.0, 4.2),
      r("living", "living_room", "Living Room", 4.0, 3.6, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.6, 3.2, { quantity: 2 }),
      r("kitchen", "kitchen", "Kitchen", 2.8, 2.4),
      r("wet", "toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 2 }),
      r("service", "staircase", "Staircase", 2.8, 1.6, {
        doors: 0,
        windows: 0,
      }),
    ],
  },

  // ---- Residential additions -------------------------------------------
  {
    key: "1br-bungalow",
    label: "1 Bedroom Bungalow",
    description: "Single bedroom starter bungalow",
    bedrooms: 1,
    residential: true,
    category: "residential",
    signature: "1|bungalow",
    wallHeightM: 2.9,
    rooms: [
      r("bedroom", "bedroom", "Bedroom", 3.6, 3.3, { windows: 1 }),
      r("living", "living_room", "Living Room", 4.0, 3.6, { windows: 2 }),
      r("kitchen", "kitchen", "Kitchen", 2.8, 2.2),
      r("wet", "toilet", "Toilet & Bath", 2.0, 1.5),
      r("service", "corridor", "Lobby", 2.4, 1.2, { doors: 0 }),
    ],
  },
  {
    key: "2br-bungalow",
    label: "2 Bedroom Bungalow",
    description: "Compact two bedroom bungalow",
    bedrooms: 2,
    residential: true,
    category: "residential",
    signature: "2|bungalow",
    wallHeightM: 3.0,
    rooms: [
      r("bedroom", "bedroom", "Master Bedroom", 3.9, 3.6, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.4, 3.2),
      r("living", "parlour", "Living Room", 4.6, 4.0, { windows: 2 }),
      r("kitchen", "kitchen", "Kitchen", 3.0, 2.4),
      r("wet", "toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 2 }),
      r("service", "corridor", "Lobby", 3.0, 1.4, { doors: 0 }),
    ],
  },
  {
    key: "4br-bungalow",
    label: "4 Bedroom Bungalow",
    description: "Wide four bedroom family bungalow",
    bedrooms: 4,
    residential: true,
    category: "residential",
    signature: "4|bungalow",
    wallHeightM: 3.0,
    rooms: [
      r("bedroom", "bedroom", "Master Bedroom", 4.5, 4.0, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.7, 3.5, { quantity: 3 }),
      r("living", "parlour", "Parlour / Living Room", 5.4, 4.8, { windows: 2 }),
      r("living", "dining", "Dining", 3.4, 3.0),
      r("kitchen", "kitchen", "Kitchen", 3.6, 2.8),
      r("wet", "toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 3 }),
      r("service", "corridor", "Lobby", 4.0, 1.5, { doors: 0 }),
      r("service", "store", "Store", 1.8, 1.5),
    ],
  },
  {
    key: "2br-duplex",
    label: "2 Bedroom Duplex",
    description: "Two bedroom home over two floors",
    bedrooms: 2,
    residential: true,
    category: "residential",
    signature: "2|duplex",
    wallHeightM: 3.0,
    rooms: [
      r("bedroom", "bedroom", "Master Bedroom", 4.2, 3.9, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.6, 3.4),
      r("living", "living_room", "Living Room", 4.8, 4.2, { windows: 2 }),
      r("kitchen", "kitchen", "Kitchen", 3.0, 2.6),
      r("wet", "toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 2 }),
      r("service", "staircase", "Staircase", 2.8, 1.6, {
        doors: 0,
        windows: 0,
      }),
      r("service", "balcony", "Balcony", 3.0, 1.2, { doors: 0 }),
    ],
  },
  {
    key: "3br-duplex",
    label: "3 Bedroom Duplex",
    description: "Three bedroom duplex with family lounge",
    bedrooms: 3,
    residential: true,
    category: "residential",
    signature: "3|duplex",
    wallHeightM: 3.2,
    rooms: [
      r("bedroom", "bedroom", "Master Bedroom", 4.5, 4.2, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.7, 3.5, { quantity: 2 }),
      r("living", "parlour", "Parlour / Living Room", 5.2, 4.6, { windows: 2 }),
      r("living", "dining", "Dining", 3.4, 3.0),
      r("kitchen", "kitchen", "Kitchen", 3.4, 2.8),
      r("wet", "toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 3 }),
      r("service", "corridor", "Lobby", 4.0, 1.5, { doors: 0 }),
      r("service", "staircase", "Staircase", 3.0, 1.8, {
        doors: 0,
        windows: 0,
      }),
    ],
  },
  {
    key: "5br-duplex",
    label: "5 Bedroom Duplex",
    description: "Large five bedroom duplex",
    bedrooms: 5,
    residential: true,
    category: "residential",
    signature: "5|duplex",
    wallHeightM: 3.3,
    rooms: [
      r("bedroom", "bedroom", "Master Bedroom", 4.9, 4.5, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.8, 3.6, { quantity: 4 }),
      r("living", "parlour", "Parlour / Living Room", 6.0, 5.2, { windows: 3 }),
      r("living", "dining", "Dining", 3.8, 3.4),
      r("kitchen", "kitchen", "Kitchen", 3.8, 3.0),
      r("wet", "toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 4 }),
      r("service", "corridor", "Lobby", 4.5, 1.5, { doors: 0 }),
      r("service", "staircase", "Staircase", 3.0, 1.8, {
        doors: 0,
        windows: 0,
      }),
      r("service", "store", "Store", 1.8, 1.5),
    ],
  },
  {
    key: "2br-terrace",
    label: "2 Bedroom Terrace",
    description: "Narrow frontage terrace home",
    bedrooms: 2,
    residential: true,
    category: "residential",
    signature: "2|terrace",
    wallHeightM: 2.8,
    rooms: [
      r("living", "living_room", "Living Room", 4.2, 3.6, { windows: 2 }),
      r("kitchen", "kitchen", "Kitchen", 2.8, 2.4),
      r("bedroom", "bedroom", "Master Bedroom", 3.8, 3.4, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.2, 3.0),
      r("wet", "toilet", "Toilet & Bath", 1.9, 1.5, { quantity: 2 }),
      r("service", "corridor", "Landing", 3.0, 1.2, { doors: 0 }),
      r("service", "balcony", "Balcony", 2.6, 1.2, { doors: 0 }),
    ],
  },
  {
    key: "3br-terrace",
    label: "3 Bedroom Terrace",
    description: "Three bedroom terrace with study",
    bedrooms: 3,
    residential: true,
    category: "residential",
    signature: "3|terrace",
    wallHeightM: 2.9,
    rooms: [
      r("living", "living_room", "Living Room", 4.6, 3.8, { windows: 2 }),
      r("living", "dining", "Dining", 3.0, 2.8),
      r("kitchen", "kitchen", "Kitchen", 3.0, 2.6),
      r("bedroom", "bedroom", "Master Bedroom", 4.0, 3.6, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.3, 3.1, { quantity: 2 }),
      r("wet", "toilet", "Toilet & Bath", 1.9, 1.5, { quantity: 2 }),
      r("service", "corridor", "Landing", 3.4, 1.2, { doors: 0 }),
    ],
  },
  {
    key: "4br-terrace",
    label: "4 Bedroom Terrace",
    description: "Four bedroom terrace over three floors",
    bedrooms: 4,
    residential: true,
    category: "residential",
    signature: "4|terrace",
    wallHeightM: 2.9,
    rooms: [
      r("living", "living_room", "Living Room", 4.8, 4.0, { windows: 2 }),
      r("living", "dining", "Dining", 3.2, 2.8),
      r("kitchen", "kitchen", "Kitchen", 3.2, 2.6),
      r("bedroom", "bedroom", "Master Bedroom", 4.2, 3.8, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.4, 3.2, { quantity: 3 }),
      r("wet", "toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 3 }),
      r("service", "staircase", "Staircase", 2.8, 1.5, {
        doors: 0,
        windows: 0,
      }),
    ],
  },
  {
    key: "4br-semi-detached",
    label: "4 Bedroom Semi-Detached",
    description: "Semi-detached family house with garage",
    bedrooms: 4,
    residential: true,
    category: "residential",
    signature: "4|semi",
    wallHeightM: 3.1,
    rooms: [
      r("bedroom", "bedroom", "Master Bedroom", 4.8, 4.2, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.8, 3.6, { quantity: 3 }),
      r("living", "parlour", "Parlour / Living Room", 5.6, 5.0, { windows: 2 }),
      r("living", "dining", "Dining", 3.6, 3.2),
      r("kitchen", "kitchen", "Kitchen", 3.6, 3.0),
      r("wet", "toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 3 }),
      r("service", "corridor", "Lobby", 4.2, 1.5, { doors: 0 }),
      r("service", "staircase", "Staircase", 3.0, 1.8, {
        doors: 0,
        windows: 0,
      }),
      r("service", "garage", "Garage", 5.5, 3.0, { doors: 1, windows: 0 }),
    ],
  },
  {
    key: "5br-detached",
    label: "5 Bedroom Detached House",
    description: "Detached five bedroom house with study",
    bedrooms: 5,
    residential: true,
    category: "residential",
    signature: "5|detached",
    wallHeightM: 3.2,
    rooms: [
      r("bedroom", "bedroom", "Master Bedroom", 5.0, 4.5, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.9, 3.6, { quantity: 4 }),
      r("living", "parlour", "Parlour / Living Room", 6.2, 5.4, { windows: 3 }),
      r("living", "dining", "Dining", 4.0, 3.6),
      r("kitchen", "kitchen", "Kitchen", 4.0, 3.2),
      r("commercial", "office", "Study", 3.4, 3.0),
      r("wet", "toilet", "Toilet & Bath", 2.2, 1.6, { quantity: 4 }),
      r("service", "corridor", "Lobby", 5.0, 1.6, { doors: 0 }),
      r("service", "staircase", "Staircase", 3.0, 1.8, {
        doors: 0,
        windows: 0,
      }),
    ],
  },
  {
    key: "6br-mansion",
    label: "6 Bedroom Mansion",
    description: "Large detached home with guest wing",
    bedrooms: 6,
    residential: true,
    category: "residential",
    signature: "6|detached",
    wallHeightM: 3.4,
    rooms: [
      r("bedroom", "bedroom", "Master Suite", 5.6, 5.0, { windows: 3 }),
      r("bedroom", "bedroom", "Bedroom", 4.2, 3.8, { quantity: 5 }),
      r("living", "parlour", "Grand Living Room", 7.5, 6.0, { windows: 4 }),
      r("living", "dining", "Dining", 4.5, 4.0),
      r("kitchen", "kitchen", "Kitchen", 4.5, 3.6),
      r("commercial", "office", "Study", 3.8, 3.2),
      r("wet", "toilet", "Toilet & Bath", 2.4, 1.8, { quantity: 5 }),
      r("service", "corridor", "Lobby", 5.5, 1.8, { doors: 0 }),
      r("service", "staircase", "Staircase", 3.4, 2.0, {
        doors: 0,
        windows: 0,
      }),
      r("service", "garage", "Garage", 6.5, 3.2, { doors: 1, windows: 0 }),
    ],
  },
  {
    key: "3br-penthouse",
    label: "3 Bedroom Penthouse",
    description: "Top floor apartment with terrace",
    bedrooms: 3,
    residential: true,
    category: "residential",
    signature: "3|penthouse",
    wallHeightM: 2.9,
    rooms: [
      r("living", "living_room", "Living Room", 5.2, 4.4, { windows: 3 }),
      r("living", "dining", "Dining", 3.4, 3.0),
      r("kitchen", "kitchen", "Kitchen", 3.4, 3.0),
      r("bedroom", "bedroom", "Master Bedroom", 4.4, 4.0, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.6, 3.4, { quantity: 2 }),
      r("wet", "toilet", "Toilet & Bath", 2.2, 1.6, { quantity: 3 }),
      r("service", "balcony", "Roof Terrace", 6.0, 3.0, { doors: 0 }),
    ],
  },
  {
    key: "2br-maisonette",
    label: "2 Bedroom Maisonette",
    description: "Two bedroom home with rooms on both floors",
    bedrooms: 2,
    residential: true,
    category: "residential",
    signature: "2|maisonette",
    wallHeightM: 2.9,
    rooms: [
      r("living", "living_room", "Living Room", 4.4, 3.8, { windows: 2 }),
      r("kitchen", "kitchen", "Kitchen", 3.0, 2.6),
      r("bedroom", "bedroom", "Master Bedroom", 3.8, 3.6, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.3, 3.1),
      r("wet", "toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 2 }),
      r("service", "staircase", "Staircase", 2.6, 1.4, {
        doors: 0,
        windows: 0,
      }),
    ],
  },
  {
    key: "1br-apartment",
    label: "1 Bedroom Apartment",
    description: "One bedroom flat in a block",
    bedrooms: 1,
    residential: true,
    category: "residential",
    signature: "1|apartment",
    wallHeightM: 2.8,
    rooms: [
      r("living", "living_room", "Living Room", 4.0, 3.4, { windows: 2 }),
      r("kitchen", "kitchen", "Kitchen", 2.5, 2.1),
      r("bedroom", "bedroom", "Bedroom", 3.5, 3.2),
      r("wet", "toilet", "Toilet & Bath", 1.9, 1.4),
      r("service", "corridor", "Hallway", 2.6, 1.1, { doors: 0 }),
    ],
  },
  {
    key: "2br-apartment",
    label: "2 Bedroom Apartment",
    description: "Two bedroom flat with balcony",
    bedrooms: 2,
    residential: true,
    category: "residential",
    signature: "2|apartment",
    wallHeightM: 2.8,
    rooms: [
      r("living", "living_room", "Living Room", 4.4, 3.8, { windows: 2 }),
      r("kitchen", "kitchen", "Kitchen", 2.8, 2.4),
      r("bedroom", "bedroom", "Master Bedroom", 3.8, 3.4, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.2, 3.0),
      r("wet", "toilet", "Toilet & Bath", 1.9, 1.5, { quantity: 2 }),
      r("service", "balcony", "Balcony", 2.8, 1.2, { doors: 0 }),
    ],
  },
  {
    key: "3br-apartment",
    label: "3 Bedroom Apartment",
    description: "Three bedroom flat with two baths",
    bedrooms: 3,
    residential: true,
    category: "residential",
    signature: "3|apartment",
    wallHeightM: 2.9,
    rooms: [
      r("living", "living_room", "Living Room", 4.8, 4.0, { windows: 2 }),
      r("living", "dining", "Dining", 3.2, 2.8),
      r("kitchen", "kitchen", "Kitchen", 3.0, 2.6),
      r("bedroom", "bedroom", "Master Bedroom", 4.2, 3.8, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.4, 3.1, { quantity: 2 }),
      r("wet", "toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 2 }),
      r("service", "balcony", "Balcony", 3.2, 1.2, { doors: 0 }),
    ],
  },
  {
    key: "4br-townhouse",
    label: "4 Bedroom Townhouse",
    description: "Four bedroom townhouse on three floors",
    bedrooms: 4,
    residential: true,
    category: "residential",
    signature: "4|townhouse",
    wallHeightM: 2.9,
    rooms: [
      r("living", "living_room", "Living Room", 4.8, 4.0, { windows: 2 }),
      r("living", "dining", "Dining", 3.2, 2.8),
      r("kitchen", "kitchen", "Kitchen", 3.2, 2.6),
      r("bedroom", "bedroom", "Master Bedroom", 4.2, 3.8, { windows: 2 }),
      r("bedroom", "bedroom", "Bedroom", 3.4, 3.1, { quantity: 3 }),
      r("wet", "toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 3 }),
      r("service", "staircase", "Staircase", 2.8, 1.5, {
        doors: 0,
        windows: 0,
      }),
      r("service", "garage", "Garage", 5.5, 3.0, { doors: 1, windows: 0 }),
    ],
  },
  {
    key: "studio",
    label: "Studio Apartment",
    description: "Single room living with kitchenette",
    bedrooms: 1,
    residential: true,
    category: "residential",
    signature: "1|studio",
    wallHeightM: 2.7,
    rooms: [
      r("living", "living_room", "Living / Sleeping Area", 4.2, 3.6, {
        windows: 2,
      }),
      r("kitchen", "kitchen", "Kitchenette", 2.2, 1.8),
      r("wet", "toilet", "Shower Room", 1.8, 1.4),
    ],
  },

  // ---- Commercial additions --------------------------------------------
  {
    key: "restaurant",
    label: "Restaurant",
    description: "Dining floor with commercial kitchen",
    bedrooms: 0,
    residential: false,
    category: "hospitality",
    signature: "0|restaurant",
    wallHeightM: 3.2,
    rooms: [
      r("commercial", "other", "Dining Area", 10.0, 7.0, { windows: 4 }),
      r("commercial", "other", "Commercial Kitchen", 5.0, 4.0),
      r("commercial", "other", "Bar / Counter", 4.0, 1.5, { doors: 0 }),
      r("wet", "toilet", "Toilet", 2.4, 1.6, { quantity: 2 }),
      r("service", "store", "Dry Store", 2.6, 2.0),
    ],
  },
  {
    key: "supermarket",
    label: "Supermarket",
    description: "Retail floor with tills and cold store",
    bedrooms: 0,
    residential: false,
    category: "commercial",
    signature: "0|supermarket",
    wallHeightM: 3.6,
    rooms: [
      r("commercial", "other", "Sales Floor", 18.0, 12.0, { windows: 2 }),
      r("commercial", "other", "Till Area", 6.0, 2.0, { doors: 0 }),
      r("service", "store", "Stock Room", 5.0, 4.0),
      r("commercial", "other", "Cold Store", 3.0, 2.4),
      r("wet", "toilet", "Toilet", 2.0, 1.5, { quantity: 2 }),
    ],
  },
  {
    key: "showroom",
    label: "Showroom",
    description: "Display floor with sales office",
    bedrooms: 0,
    residential: false,
    category: "commercial",
    signature: "0|showroom",
    wallHeightM: 4.0,
    rooms: [
      r("commercial", "other", "Display Floor", 12.0, 8.0, { windows: 4 }),
      r("commercial", "office", "Sales Office", 4.0, 3.0),
      r("wet", "toilet", "Toilet", 2.0, 1.5),
      r("service", "store", "Store", 3.0, 2.4),
    ],
  },
  {
    key: "pharmacy",
    label: "Pharmacy",
    description: "Dispensary with counselling room",
    bedrooms: 0,
    residential: false,
    category: "commercial",
    signature: "0|pharmacy",
    wallHeightM: 3.0,
    rooms: [
      r("commercial", "other", "Dispensary Floor", 6.0, 5.0, { windows: 2 }),
      r("commercial", "other", "Counselling Room", 2.6, 2.2),
      r("service", "store", "Drug Store", 2.6, 2.0),
      r("wet", "toilet", "Toilet", 1.8, 1.2),
    ],
  },
  {
    key: "hotel",
    label: "Hotel",
    description: "Thirty room hotel with lobby and kitchen",
    bedrooms: 0,
    residential: false,
    category: "hospitality",
    signature: "0|hotel",
    wallHeightM: 3.1,
    rooms: [
      r("commercial", "parlour", "Lobby / Reception", 8.0, 6.0, { windows: 3 }),
      r("bedroom", "bedroom", "Standard Room", 4.4, 3.8, { quantity: 24 }),
      r("bedroom", "bedroom", "Executive Suite", 6.0, 4.6, {
        quantity: 6,
        windows: 2,
      }),
      r("commercial", "other", "Restaurant", 9.0, 6.0),
      r("kitchen", "kitchen", "Kitchen", 5.0, 4.0),
      r("service", "store", "Laundry", 4.0, 3.0),
      r("wet", "toilet", "Public Toilet", 3.0, 2.4, { quantity: 2 }),
    ],
  },
  {
    key: "bar-lounge",
    label: "Bar and Lounge",
    description: "Bar floor with outdoor terrace",
    bedrooms: 0,
    residential: false,
    category: "hospitality",
    signature: "0|bar",
    wallHeightM: 3.4,
    rooms: [
      r("commercial", "other", "Lounge Floor", 10.0, 7.0, { windows: 2 }),
      r("commercial", "other", "Bar Counter", 5.0, 1.6, { doors: 0 }),
      r("service", "store", "Drinks Store", 3.0, 2.4),
      r("wet", "toilet", "Toilet", 2.4, 1.6, { quantity: 2 }),
      r("service", "veranda", "Terrace", 8.0, 3.0, { doors: 0 }),
    ],
  },
  {
    key: "event-hall",
    label: "Event Hall",
    description: "Banquet hall with stage and service rooms",
    bedrooms: 0,
    residential: false,
    category: "hospitality",
    signature: "0|event-hall",
    wallHeightM: 5.5,
    rooms: [
      r("commercial", "other", "Banquet Hall", 22.0, 15.0, { windows: 6 }),
      r("commercial", "other", "Stage", 8.0, 4.0, { doors: 0 }),
      r("commercial", "other", "Foyer", 8.0, 5.0),
      r("wet", "toilet", "Toilet", 3.0, 2.4, { quantity: 2 }),
      r("service", "store", "Store", 4.0, 3.0),
    ],
  },
  {
    key: "laboratory",
    label: "Laboratory",
    description: "Science laboratory with prep room",
    bedrooms: 0,
    residential: false,
    category: "institutional",
    signature: "0|laboratory",
    wallHeightM: 3.3,
    rooms: [
      r("commercial", "other", "Laboratory Floor", 10.0, 7.0, { windows: 4 }),
      r("commercial", "office", "Prep Room", 4.0, 3.0),
      r("service", "store", "Chemical Store", 3.0, 2.4),
      r("wet", "toilet", "Toilet", 2.4, 1.8, { quantity: 2 }),
    ],
  },
  {
    key: "library",
    label: "Library",
    description: "Reading floor with stacks and office",
    bedrooms: 0,
    residential: false,
    category: "institutional",
    signature: "0|library",
    wallHeightM: 3.4,
    rooms: [
      r("commercial", "other", "Reading Floor", 14.0, 9.0, { windows: 5 }),
      r("commercial", "other", "Book Stacks", 8.0, 4.0),
      r("commercial", "office", "Librarian's Office", 3.6, 3.0),
      r("wet", "toilet", "Toilet", 2.4, 1.8, { quantity: 2 }),
    ],
  },
  {
    key: "hospital-ward",
    label: "Hospital Ward Block",
    description: "Twenty bed ward with nurses station",
    bedrooms: 0,
    residential: false,
    category: "institutional",
    signature: "0|ward",
    wallHeightM: 3.2,
    rooms: [
      r("commercial", "other", "Ward", 20.0, 8.0, { windows: 8, quantity: 2 }),
      r("commercial", "office", "Nurses Station", 4.0, 3.0),
      r("commercial", "office", "Doctor's Room", 4.0, 3.2),
      r("wet", "toilet", "Toilet & Bath", 2.6, 2.0, { quantity: 3 }),
      r("service", "store", "Supply Store", 3.0, 2.4),
      r("service", "corridor", "Corridor", 20.0, 2.0, { doors: 0 }),
    ],
  },
  {
    key: "hostel-block",
    label: "Hostel Block",
    description: "Ten bunk rooms with shared facilities",
    bedrooms: 0,
    residential: false,
    category: "institutional",
    signature: "0|hostel",
    wallHeightM: 3.0,
    rooms: [
      r("bedroom", "bedroom", "Bunk Room", 5.0, 3.6, {
        quantity: 10,
        windows: 2,
      }),
      r("wet", "toilet", "Shared Bathroom", 4.0, 3.0, { quantity: 2 }),
      r("wet", "toilet", "Shared Toilet", 3.0, 2.4, { quantity: 2 }),
      r("kitchen", "kitchen", "Common Kitchen", 5.0, 4.0),
      r("service", "corridor", "Corridor", 24.0, 1.8, { doors: 0 }),
      r("service", "store", "Store", 3.0, 2.4),
    ],
  },
  {
    key: "community-hall",
    label: "Community Hall",
    description: "Open hall with kitchenette and offices",
    bedrooms: 0,
    residential: false,
    category: "institutional",
    signature: "0|community-hall",
    wallHeightM: 4.5,
    rooms: [
      r("commercial", "other", "Main Hall", 16.0, 11.0, { windows: 6 }),
      r("kitchen", "kitchen", "Kitchenette", 4.0, 3.0),
      r("commercial", "office", "Committee Room", 4.0, 3.2),
      r("wet", "toilet", "Toilet", 2.6, 2.0, { quantity: 2 }),
      r("service", "store", "Store", 3.0, 2.4),
    ],
  },
  {
    key: "workshop",
    label: "Workshop",
    description: "Work bay with tool store and office",
    bedrooms: 0,
    residential: false,
    category: "industrial",
    signature: "0|workshop",
    wallHeightM: 4.5,
    rooms: [
      r("commercial", "other", "Work Bay", 12.0, 8.0, { windows: 4 }),
      r("commercial", "office", "Workshop Office", 3.6, 3.0),
      r("service", "store", "Tool Store", 3.0, 2.4),
      r("wet", "toilet", "Toilet", 2.0, 1.5),
    ],
  },
  {
    key: "factory-shed",
    label: "Factory Shed",
    description: "Production floor with stores and offices",
    bedrooms: 0,
    residential: false,
    category: "industrial",
    signature: "0|factory",
    wallHeightM: 6.0,
    rooms: [
      r("commercial", "other", "Production Floor", 30.0, 18.0, { windows: 6 }),
      r("commercial", "office", "Production Office", 5.0, 4.0),
      r("service", "store", "Raw Material Store", 8.0, 5.0),
      r("service", "store", "Finished Goods Store", 8.0, 5.0),
      r("wet", "toilet", "Toilet & Changing", 4.0, 3.0, { quantity: 2 }),
    ],
  },
  {
    key: "cold-store",
    label: "Cold Store",
    description: "Insulated cold room with ante room",
    bedrooms: 0,
    residential: false,
    category: "industrial",
    signature: "0|cold-store",
    wallHeightM: 3.6,
    rooms: [
      r("commercial", "other", "Cold Room", 8.0, 6.0),
      r("commercial", "other", "Ante Room", 3.0, 2.4),
      r("service", "store", "Packaging Store", 3.0, 2.4),
      r("wet", "toilet", "Toilet", 2.0, 1.5),
    ],
  },
  {
    key: "poultry-pen",
    label: "Poultry Pen",
    description: "Deep litter pen with feed store",
    bedrooms: 0,
    residential: false,
    category: "industrial",
    signature: "0|poultry",
    wallHeightM: 2.8,
    rooms: [
      r("commercial", "other", "Pen Floor", 20.0, 10.0, { windows: 6 }),
      r("service", "store", "Feed Store", 5.0, 4.0),
      r("service", "store", "Egg Room", 3.0, 2.4),
      r("wet", "toilet", "Staff Toilet", 2.0, 1.5),
    ],
  },
];

/** Signature of an existing hand-written preset, for de-duplication. */
export function presetSignature(label: string, bedrooms: number): string {
  const text = label.toLowerCase();
  if (/studio|bedsitter|bachelor/.test(text)) return `${bedrooms}|studio`;
  if (/penthouse/.test(text)) return `${bedrooms}|penthouse`;
  if (/maisonette/.test(text)) return `${bedrooms}|maisonette`;
  if (/town ?house/.test(text)) return `${bedrooms}|townhouse`;
  if (/terraced|terrace/.test(text)) return `${bedrooms}|terrace`;
  if (/semi[- ]?detached|\bsemi\b/.test(text)) return `${bedrooms}|semi`;
  if (/detached|villa|mansion|colonial|ranch/.test(text))
    return `${bedrooms}|detached`;
  if (/duplex|double[- ]storey/.test(text)) return `${bedrooms}|duplex`;
  if (/bungalow/.test(text)) return `${bedrooms}|bungalow`;
  if (/shop/.test(text)) return `${bedrooms}|shop`;
  if (/office/.test(text)) return `${bedrooms}|office`;
  if (/classroom|school/.test(text)) return `${bedrooms}|school`;
  if (/clinic/.test(text)) return `${bedrooms}|clinic`;
  if (/warehouse/.test(text)) return `${bedrooms}|warehouse`;
  if (/bhk|apartment|flat|condo|unit|house|home|room/.test(text))
    return `${bedrooms}|apartment`;
  return `${bedrooms}|other`;
}

/** Compile one programme into a preset for a market profile. */
export function compileProgramme(
  programme: BuildingTypeProgramme,
  scale: ProfileScale,
  idPrefix: string,
): BuildingPreset {
  const round = (value: number) => Math.round(value * 10) / 10;
  const rooms: PresetRoom[] = programme.rooms.map((room) => ({
    spaceType: room.spaceType,
    label: room.label,
    lengthM: round(room.l * scale[room.family]),
    widthM: round(room.w * scale[room.family]),
    heightM: round(programme.wallHeightM * scale.wallHeight),
    quantity: room.quantity ?? 1,
    doors:
      room.doors ??
      (room.spaceType === "corridor" ||
      room.spaceType === "staircase" ||
      room.spaceType === "balcony"
        ? 0
        : 1),
    windows:
      room.windows ??
      (room.spaceType === "staircase" || room.spaceType === "garage" ? 0 : 1),
  }));

  return {
    id: `${idPrefix}-${programme.key}`,
    label: programme.label,
    description: programme.description,
    bedrooms: programme.bedrooms,
    residential: programme.residential,
    category: programme.category,
    wallHeightM: round(programme.wallHeightM * scale.wallHeight),
    rooms,
  };
}

/**
 * Fill a market profile up to the target number of building types, never
 * repeating a shape the market already offers.
 */
export function fillWithCatalogue(
  existing: BuildingPreset[],
  scale: ProfileScale,
  idPrefix: string,
  target = BUILDING_TYPE_CATALOGUE.length + existing.length,
): BuildingPreset[] {
  const present = new Set(
    existing.map((preset) => presetSignature(preset.label, preset.bedrooms)),
  );
  const generated: BuildingPreset[] = [];
  for (const programme of BUILDING_TYPE_CATALOGUE) {
    if (existing.length + generated.length >= target) break;
    if (present.has(programme.signature)) continue;
    present.add(programme.signature);
    generated.push(compileProgramme(programme, scale, idPrefix));
  }
  return [...existing, ...generated];
}

/** Group presets for the picker, in catalogue order. */
export function groupBuildingPresets(presets: BuildingPreset[]): Array<{
  category: BuildingCategory;
  label: string;
  presets: BuildingPreset[];
}> {
  const order: BuildingCategory[] = [
    "residential",
    "commercial",
    "hospitality",
    "institutional",
    "industrial",
  ];
  return order
    .map((category) => ({
      category,
      label: BUILDING_CATEGORY_LABELS[category],
      presets: presets.filter(
        (preset) => (preset.category ?? "residential") === category,
      ),
    }))
    .filter((group) => group.presets.length > 0);
}

/**
 * Net internal floor area of a preset in m², counting identical rooms.
 * Used to show a template's size before it is applied.
 */
export function presetFloorAreaM2(preset: BuildingPreset): number {
  return preset.rooms.reduce(
    (total, room) => total + room.lengthM * room.widthM * room.quantity,
    0,
  );
}

/**
 * Wall area of a preset in m²: every room's perimeter times its own height,
 * counting identical rooms. Opening deductions are left to the calculator so a
 * template and a hand-entered room run through the same engine.
 */
export function presetWallAreaM2(preset: BuildingPreset): number {
  return preset.rooms.reduce((total, room) => {
    const height = room.heightM ?? preset.wallHeightM;
    const perimeter = 2 * (room.lengthM + room.widthM);
    return total + perimeter * height * room.quantity;
  }, 0);
}
