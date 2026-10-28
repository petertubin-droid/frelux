/**
 * FRELUX BUILDING PRESETS — market-aware whole-house room sets.
 *
 * Serves the "House / Building" mode on the room-based calculators
 * (painting, screeding, tiling surfaces, ...). Instead of a blank
 * single-room form, the user picks a culturally correct house type for
 * THEIR market and gets a complete, editable room breakdown:
 * bedrooms, living room, kitchen, toilets & bathrooms, lobby, store...
 *
 * Architecture:
 * - All room dimensions are stored canonically in METRES (source of truth).
 * - At seed time they convert to the market's display unit
 *   (feet for imperial / Nigeria markets, metres elsewhere) via
 *   presetToRoomDrafts(). The user can then edit any dimension freely.
 * - Every housing profile is pure data; a market maps to a profile via
 *   HOUSING_PROFILE_BY_MARKET. All 32 FRELUX markets are covered.
 * - Reference figures per region: US avg home ~2,000 ft² (master bedroom
 *   ~12×14 ft, secondary ~10×12 ft); UK avg home 85–95 m² (semi-detached
 *   is the most common type, compact 2.4 m ceilings); Nigeria bungalows/
 *   duplexes on 50×100 ft plots (master bedroom ~4.5×4.5 m); India 1–3 BHK
 *   flats (bedrooms ~3.4×3 m); China ~89 m² 3BR apartments; Europe 75–100 m²
 *   homes with 2.6–2.7 m ceiling minimums; Australia among the world's
 *   largest homes (~214 m² avg).
 */

import type { MeasurementProject, SpaceType } from "./types";
import {
  createMeasurementEntry,
  createMeasurementGroup,
} from "./factory";

// =========================================================
// Types
// =========================================================

/** One room (or group of identical rooms) inside a preset. */
export interface PresetRoom {
  spaceType: SpaceType;
  /** Display label, e.g. "Bedroom", "Toilet & Bath". */
  label: string;
  /** Canonical length in metres. */
  lengthM: number;
  /** Canonical width in metres. */
  widthM: number;
  /** Number of identical rooms of this size. */
  quantity: number;
  /** Default door count for opening deductions. */
  doors: number;
  /** Default window count for opening deductions. */
  windows: number;
}

/** A complete house type preset, e.g. "3 Bedroom Bungalow". */
export interface BuildingPreset {
  /** Stable id, unique within its housing profile. */
  id: string;
  /** Market-facing label, e.g. "3 Bedroom Semi-Detached House". */
  label: string;
  /** One-line description shown under the label. */
  description: string;
  /** Number of bedrooms (used for sorting / display badges). */
  bedrooms: number;
  /** Default wall height in metres. */
  wallHeightM: number;
  /** Room set. */
  rooms: PresetRoom[];
}

export type HousingProfileId =
  | "west_africa"
  | "east_africa"
  | "north_africa"
  | "southern_africa"
  | "gulf"
  | "north_america"
  | "britain"
  | "oceania"
  | "south_asia"
  | "east_asia"
  | "europe"
  | "latam"
  | "southeast_asia";

export type RoomUnitChoice = "feet" | "meters";

/** A draft room row the calculator UI edits. Unit-dependent. */
export interface RoomDraft {
  id: string;
  spaceType: SpaceType;
  label: string;
  length: number;
  width: number;
  quantity: number;
  doors: number;
  windows: number;
}

// =========================================================
// Room builders (keep the preset tables readable)
// =========================================================

const M_TO_FT = 3.280839895;

function room(
  spaceType: SpaceType,
  label: string,
  lengthM: number,
  widthM: number,
  opts: Partial<Pick<PresetRoom, "quantity" | "doors" | "windows">> = {},
): PresetRoom {
  return {
    spaceType,
    label,
    lengthM,
    widthM,
    quantity: opts.quantity ?? 1,
    doors: opts.doors ?? (spaceType === "corridor" || spaceType === "staircase" ? 0 : 1),
    windows: opts.windows ?? (spaceType === "bathroom" || spaceType === "toilet" || spaceType === "store" ? 1 : 1),
  };
}

// =========================================================
// Housing profiles — one per housing culture, all 32 markets covered
// =========================================================

/**
 * WEST AFRICA (NG, GH, CI): bungalows and duplexes on 50×100 ft plots are
 * the reference stock; bedrooms are generous, parlour is the centrepiece.
 */
const WEST_AFRICA: BuildingPreset[] = [
  {
    id: "wa-2br-bungalow",
    label: "2 Bedroom Bungalow",
    description: "Compact family bungalow",
    bedrooms: 2,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Master Bedroom", 3.7, 3.5, { windows: 1 }),
      room("bedroom", "Bedroom", 3.7, 3.5, { quantity: 1 }),
      room("parlour", "Parlour / Living Room", 4.9, 4.3, { windows: 2 }),
      room("dining", "Dining", 3.4, 3.0),
      room("kitchen", "Kitchen", 3.4, 2.8),
      room("toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 1 }),
      room("corridor", "Lobby", 3.0, 1.5, { doors: 0 }),
      room("store", "Store", 1.8, 1.5),
    ],
  },
  {
    id: "wa-3br-bungalow",
    label: "3 Bedroom Bungalow",
    description: "The classic Nigerian family home",
    bedrooms: 3,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Master Bedroom", 4.2, 3.8, { windows: 2 }),
      room("bedroom", "Bedroom", 3.7, 3.5, { quantity: 2 }),
      room("parlour", "Parlour / Living Room", 5.2, 4.6, { windows: 2 }),
      room("dining", "Dining", 3.4, 3.0),
      room("kitchen", "Kitchen", 3.4, 2.8),
      room("toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 2 }),
      room("corridor", "Lobby", 3.6, 1.5, { doors: 0 }),
      room("store", "Store", 1.8, 1.5),
    ],
  },
  {
    id: "wa-4br-duplex",
    label: "4 Bedroom Duplex",
    description: "Two-storey family duplex",
    bedrooms: 4,
    wallHeightM: 3.3,
    rooms: [
      room("bedroom", "Master Bedroom", 4.5, 4.2, { windows: 2 }),
      room("bedroom", "Bedroom", 3.7, 3.5, { quantity: 3 }),
      room("parlour", "Parlour / Living Room", 5.5, 4.9, { windows: 2 }),
      room("dining", "Dining", 3.7, 3.4),
      room("kitchen", "Kitchen", 3.4, 2.8),
      room("toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 3 }),
      room("corridor", "Lobby", 4.2, 1.5, { doors: 0 }),
      room("staircase", "Staircase", 3.0, 1.8, { doors: 0, windows: 0 }),
      room("store", "Store", 1.8, 1.5),
    ],
  },
  {
    id: "wa-5br-duplex",
    label: "5 Bedroom Duplex",
    description: "Large two-storey family duplex",
    bedrooms: 5,
    wallHeightM: 3.3,
    rooms: [
      room("bedroom", "Master Bedroom", 4.9, 4.5, { windows: 2 }),
      room("bedroom", "Bedroom", 3.7, 3.5, { quantity: 4 }),
      room("parlour", "Parlour / Living Room", 6.1, 5.2, { windows: 3 }),
      room("dining", "Dining", 3.7, 3.4),
      room("kitchen", "Kitchen", 3.7, 3.0),
      room("toilet", "Toilet & Bath", 2.0, 1.5, { quantity: 4 }),
      room("corridor", "Lobby", 4.5, 1.5, { doors: 0 }),
      room("staircase", "Staircase", 3.0, 1.8, { doors: 0, windows: 0 }),
      room("store", "Store", 1.8, 1.5),
    ],
  },
  {
    id: "wa-2br-flat",
    label: "2 Bedroom Flat",
    description: "Self-contained apartment flat",
    bedrooms: 2,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Bedroom", 3.7, 3.5, { quantity: 2 }),
      room("living_room", "Living Room", 4.3, 3.7, { windows: 2 }),
      room("kitchen", "Kitchen", 2.8, 2.4),
      room("toilet", "Toilet & Bath", 2.0, 1.5),
      room("store", "Store", 1.5, 1.2),
    ],
  },
  {
    id: "wa-self-contained",
    label: "Mini Flat (Self-Contained)",
    description: "One-room self-contained unit",
    bedrooms: 1,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Room", 4.0, 3.5),
      room("kitchen", "Kitchenette", 2.4, 1.8),
      room("toilet", "Toilet & Bath", 1.8, 1.2),
    ],
  },
];

/**
 * EAST AFRICA (KE, TZ, ET): bungalows, maisonettes and apartments.
 */
const EAST_AFRICA: BuildingPreset[] = [
  {
    id: "ea-2br-bungalow",
    label: "2 Bedroom Bungalow",
    description: "Compact single-storey home",
    bedrooms: 2,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Master Bedroom", 3.5, 3.2),
      room("bedroom", "Bedroom", 3.2, 3.0),
      room("living_room", "Living Room", 4.0, 3.5, { windows: 2 }),
      room("dining", "Dining", 3.0, 3.0),
      room("kitchen", "Kitchen", 3.0, 2.5),
      room("bathroom", "Bathroom", 2.0, 1.5),
      room("corridor", "Hallway", 3.0, 1.2, { doors: 0 }),
    ],
  },
  {
    id: "ea-3br-bungalow",
    label: "3 Bedroom Bungalow",
    description: "Family bungalow",
    bedrooms: 3,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Master Bedroom", 3.8, 3.4),
      room("bedroom", "Bedroom", 3.2, 3.0, { quantity: 2 }),
      room("living_room", "Living Room", 4.5, 3.8, { windows: 2 }),
      room("dining", "Dining", 3.2, 3.0),
      room("kitchen", "Kitchen", 3.0, 2.5),
      room("bathroom", "Bathroom", 2.0, 1.5, { quantity: 2 }),
      room("corridor", "Hallway", 3.5, 1.2, { doors: 0 }),
    ],
  },
  {
    id: "ea-4br-maisonette",
    label: "4 Bedroom Maisonette",
    description: "Two-storey family home",
    bedrooms: 4,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Master Bedroom", 4.0, 3.5),
      room("bedroom", "Bedroom", 3.2, 3.0, { quantity: 3 }),
      room("living_room", "Living Room", 4.5, 4.0, { windows: 2 }),
      room("dining", "Dining", 3.4, 3.0),
      room("kitchen", "Kitchen", 3.2, 2.7),
      room("bathroom", "Bathroom", 2.0, 1.5, { quantity: 3 }),
      room("staircase", "Staircase", 2.7, 1.5, { doors: 0, windows: 0 }),
    ],
  },
  {
    id: "ea-3br-apartment",
    label: "3 Bedroom Apartment",
    description: "Multi-storey apartment unit",
    bedrooms: 3,
    wallHeightM: 2.6,
    rooms: [
      room("bedroom", "Master Bedroom", 3.5, 3.2),
      room("bedroom", "Bedroom", 3.0, 2.7, { quantity: 2 }),
      room("living_room", "Living Room", 4.2, 3.5, { windows: 2 }),
      room("kitchen", "Kitchen", 2.7, 2.4),
      room("bathroom", "Bathroom", 2.0, 1.5, { quantity: 2 }),
    ],
  },
  {
    id: "ea-bedsitter",
    label: "Bedsitter / Studio",
    description: "Single-room studio unit",
    bedrooms: 1,
    wallHeightM: 2.6,
    rooms: [
      room("bedroom", "Bedsitter", 4.0, 3.2, { windows: 2 }),
      room("kitchen", "Kitchenette", 2.0, 1.5),
      room("bathroom", "Bathroom", 1.8, 1.2),
    ],
  },
];

/**
 * NORTH AFRICA (EG): apartment buildings and villas with a reception salon.
 */
const NORTH_AFRICA: BuildingPreset[] = [
  {
    id: "na-2br-apartment",
    label: "2 Bedroom Apartment",
    description: "Typical city apartment",
    bedrooms: 2,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Master Bedroom", 3.6, 3.4),
      room("bedroom", "Bedroom", 3.2, 3.0),
      room("living_room", "Reception / Living Room", 4.5, 4.0, { windows: 2 }),
      room("dining", "Dining", 3.2, 3.0),
      room("kitchen", "Kitchen", 3.0, 2.5),
      room("bathroom", "Bathroom", 2.0, 1.6),
    ],
  },
  {
    id: "na-3br-apartment",
    label: "3 Bedroom Apartment",
    description: "Family apartment",
    bedrooms: 3,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Master Bedroom", 3.8, 3.6),
      room("bedroom", "Bedroom", 3.2, 3.0, { quantity: 2 }),
      room("living_room", "Reception / Living Room", 5.0, 4.2, { windows: 2 }),
      room("dining", "Dining", 3.4, 3.0),
      room("kitchen", "Kitchen", 3.0, 2.5),
      room("bathroom", "Bathroom", 2.0, 1.6, { quantity: 2 }),
    ],
  },
  {
    id: "na-4br-villa",
    label: "4 Bedroom Villa",
    description: "Standalone family villa",
    bedrooms: 4,
    wallHeightM: 3.2,
    rooms: [
      room("bedroom", "Master Bedroom", 4.2, 3.8),
      room("bedroom", "Bedroom", 3.2, 3.0, { quantity: 3 }),
      room("living_room", "Reception / Living Room", 5.5, 4.5, { windows: 3 }),
      room("dining", "Dining", 3.6, 3.2),
      room("kitchen", "Kitchen", 3.4, 2.8),
      room("bathroom", "Bathroom", 2.0, 1.6, { quantity: 3 }),
      room("staircase", "Staircase", 2.7, 1.5, { doors: 0, windows: 0 }),
    ],
  },
  {
    id: "na-3br-duplex",
    label: "3 Bedroom Duplex",
    description: "Two-storey family home",
    bedrooms: 3,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Master Bedroom", 4.0, 3.6),
      room("bedroom", "Bedroom", 3.2, 3.0, { quantity: 2 }),
      room("living_room", "Reception / Living Room", 5.0, 4.0, { windows: 2 }),
      room("dining", "Dining", 3.4, 3.0),
      room("kitchen", "Kitchen", 3.0, 2.5),
      room("bathroom", "Bathroom", 2.0, 1.6, { quantity: 2 }),
      room("staircase", "Staircase", 2.7, 1.5, { doors: 0, windows: 0 }),
    ],
  },
  {
    id: "na-studio",
    label: "Studio Apartment",
    description: "Single-room apartment",
    bedrooms: 1,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Studio Room", 4.0, 3.5, { windows: 2 }),
      room("kitchen", "Kitchenette", 2.2, 1.8),
      room("bathroom", "Bathroom", 1.8, 1.2),
    ],
  },
];

/**
 * SOUTHERN AFRICA (ZA): freestanding houses, townhouse clusters, apartments.
 */
const SOUTHERN_AFRICA: BuildingPreset[] = [
  {
    id: "sa-2br-apartment",
    label: "2 Bedroom Apartment",
    description: "Flat or simplex unit",
    bedrooms: 2,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Master Bedroom", 3.3, 3.0),
      room("bedroom", "Bedroom", 3.0, 2.7),
      room("living_room", "Lounge", 4.2, 3.6, { windows: 2 }),
      room("kitchen", "Kitchen", 3.0, 2.7),
      room("bathroom", "Bathroom", 2.2, 1.8),
    ],
  },
  {
    id: "sa-3br-house",
    label: "3 Bedroom House",
    description: "Freestanding family home",
    bedrooms: 3,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Master Bedroom", 3.6, 3.3),
      room("bedroom", "Bedroom", 3.3, 3.0, { quantity: 2 }),
      room("living_room", "Lounge", 4.5, 4.0, { windows: 2 }),
      room("dining", "Dining Room", 3.2, 2.8),
      room("kitchen", "Kitchen", 3.4, 3.0),
      room("bathroom", "Bathroom", 2.2, 1.8, { quantity: 2 }),
      room("corridor", "Passage", 3.5, 1.1, { doors: 0 }),
    ],
  },
  {
    id: "sa-4br-double-storey",
    label: "4 Bedroom Double-Storey House",
    description: "Large two-storey home",
    bedrooms: 4,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Master Bedroom", 4.0, 3.6),
      room("bedroom", "Bedroom", 3.3, 3.0, { quantity: 3 }),
      room("living_room", "Lounge", 5.0, 4.2, { windows: 2 }),
      room("dining", "Dining Room", 3.6, 3.2),
      room("kitchen", "Kitchen", 3.6, 3.0),
      room("bathroom", "Bathroom", 2.2, 1.8, { quantity: 3 }),
      room("staircase", "Staircase", 2.7, 1.5, { doors: 0, windows: 0 }),
    ],
  },
  {
    id: "sa-3br-townhouse",
    label: "3 Bedroom Townhouse",
    description: "Cluster / complex unit",
    bedrooms: 3,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Master Bedroom", 3.3, 3.0),
      room("bedroom", "Bedroom", 3.0, 2.7, { quantity: 2 }),
      room("living_room", "Lounge / Dining", 4.0, 3.5, { windows: 2 }),
      room("kitchen", "Kitchen", 3.0, 2.7),
      room("bathroom", "Bathroom", 2.0, 1.6, { quantity: 2 }),
    ],
  },
  {
    id: "sa-bachelor",
    label: "Bachelor Flat / Studio",
    description: "Single-room unit",
    bedrooms: 1,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Bachelor Unit", 3.8, 3.2, { windows: 1 }),
      room("kitchen", "Kitchenette", 2.2, 1.8),
      room("bathroom", "Bathroom", 1.8, 1.4),
    ],
  },
];

/**
 * GULF (AE, SA): spacious villas with a majlis salon, apartments for cities.
 */
const GULF: BuildingPreset[] = [
  {
    id: "gulf-3br-villa",
    label: "3 Bedroom Villa",
    description: "Family villa with majlis",
    bedrooms: 3,
    wallHeightM: 3.2,
    rooms: [
      room("bedroom", "Master Bedroom", 4.2, 4.0),
      room("bedroom", "Bedroom", 3.8, 3.5, { quantity: 2 }),
      room("living_room", "Majlis / Living Room", 5.5, 4.5, { windows: 2 }),
      room("dining", "Dining", 3.8, 3.2),
      room("kitchen", "Kitchen", 3.5, 3.0),
      room("bathroom", "Bathroom", 2.4, 2.0, { quantity: 2 }),
      room("corridor", "Hallway", 4.0, 1.4, { doors: 0 }),
    ],
  },
  {
    id: "gulf-5br-villa",
    label: "5 Bedroom Villa",
    description: "Large family villa",
    bedrooms: 5,
    wallHeightM: 3.2,
    rooms: [
      room("bedroom", "Master Bedroom", 5.0, 4.5),
      room("bedroom", "Bedroom", 3.8, 3.5, { quantity: 4 }),
      room("living_room", "Majlis / Living Room", 6.5, 5.0, { windows: 3 }),
      room("living_room", "Family Living Room", 5.0, 4.2, { windows: 2 }),
      room("dining", "Dining", 4.0, 3.5),
      room("kitchen", "Kitchen", 3.8, 3.2),
      room("bathroom", "Bathroom", 2.4, 2.0, { quantity: 4 }),
      room("staircase", "Staircase", 3.0, 1.8, { doors: 0, windows: 0 }),
    ],
  },
  {
    id: "gulf-4br-villa",
    label: "4 Bedroom Villa",
    description: "Spacious family villa",
    bedrooms: 4,
    wallHeightM: 3.2,
    rooms: [
      room("bedroom", "Master Bedroom", 4.5, 4.2),
      room("bedroom", "Bedroom", 3.8, 3.5, { quantity: 3 }),
      room("living_room", "Majlis / Living Room", 6.0, 4.8, { windows: 2 }),
      room("dining", "Dining", 4.0, 3.5),
      room("kitchen", "Kitchen", 3.6, 3.0),
      room("bathroom", "Bathroom", 2.4, 2.0, { quantity: 3 }),
      room("corridor", "Hallway", 4.0, 1.4, { doors: 0 }),
    ],
  },
  {
    id: "gulf-2br-apartment",
    label: "2 Bedroom Apartment",
    description: "City apartment",
    bedrooms: 2,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Master Bedroom", 4.0, 3.6),
      room("bedroom", "Bedroom", 3.4, 3.0),
      room("living_room", "Living Room", 4.5, 4.0, { windows: 2 }),
      room("kitchen", "Kitchen", 3.0, 2.7),
      room("bathroom", "Bathroom", 2.2, 1.8, { quantity: 2 }),
    ],
  },
  {
    id: "gulf-studio",
    label: "Studio Apartment",
    description: "Single-room unit",
    bedrooms: 1,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Studio Room", 4.5, 3.5, { windows: 2 }),
      room("kitchen", "Kitchenette", 2.4, 1.8),
      room("bathroom", "Bathroom", 2.0, 1.5),
    ],
  },
];

/**
 * NORTH AMERICA (US, CA): ranch homes, two-storey colonials, townhouses,
 * condos. Reference sizes: master ~12×14 ft, secondary ~10×12 ft,
 * living ~14×18 ft. Displayed in feet.
 */
const NORTH_AMERICA: BuildingPreset[] = [
  {
    id: "na3br-ranch",
    label: "3 Bedroom Ranch",
    description: "Single-storey family home",
    bedrooms: 3,
    wallHeightM: 2.44,
    rooms: [
      room("bedroom", "Primary Bedroom", 3.7, 3.4, { windows: 2 }),
      room("bedroom", "Bedroom", 3.4, 3.0, { quantity: 2 }),
      room("living_room", "Living Room", 5.5, 4.3, { windows: 2 }),
      room("dining", "Dining Room", 3.7, 3.0),
      room("kitchen", "Kitchen", 3.7, 3.0),
      room("bathroom", "Full Bathroom", 2.4, 2.1, { quantity: 2 }),
      room("corridor", "Hallway", 4.5, 1.2, { doors: 0 }),
    ],
  },
  {
    id: "na4br-colonial",
    label: "4 Bedroom Two-Storey Home",
    description: "Classic colonial-style home",
    bedrooms: 4,
    wallHeightM: 2.44,
    rooms: [
      room("bedroom", "Primary Bedroom", 4.3, 3.7, { windows: 2 }),
      room("bedroom", "Bedroom", 3.4, 3.0, { quantity: 3 }),
      room("living_room", "Living Room", 6.1, 4.3, { windows: 2 }),
      room("dining", "Dining Room", 4.0, 3.4),
      room("kitchen", "Kitchen", 4.0, 3.4),
      room("bathroom", "Full Bathroom", 2.4, 2.1, { quantity: 3 }),
      room("staircase", "Staircase", 2.7, 1.1, { doors: 0, windows: 0 }),
      room("corridor", "Hallway", 4.5, 1.2, { doors: 0 }),
    ],
  },
  {
    id: "na-2br-condo",
    label: "2 Bedroom Condo / Apartment",
    description: "Apartment unit",
    bedrooms: 2,
    wallHeightM: 2.6,
    rooms: [
      room("bedroom", "Primary Bedroom", 3.7, 3.4),
      room("bedroom", "Bedroom", 3.4, 3.0),
      room("living_room", "Living Room", 4.9, 3.7, { windows: 2 }),
      room("kitchen", "Kitchen", 3.4, 3.0),
      room("bathroom", "Bathroom", 2.4, 2.1, { quantity: 2 }),
    ],
  },
  {
    id: "na-3br-townhouse",
    label: "3 Bedroom Townhouse",
    description: "Multi-storey attached home",
    bedrooms: 3,
    wallHeightM: 2.44,
    rooms: [
      room("bedroom", "Primary Bedroom", 3.7, 3.4),
      room("bedroom", "Bedroom", 3.4, 3.0, { quantity: 2 }),
      room("living_room", "Living Room", 4.6, 3.7, { windows: 2 }),
      room("kitchen", "Kitchen", 3.4, 3.0),
      room("dining", "Dining Area", 3.4, 3.0),
      room("bathroom", "Bathroom", 2.4, 2.1, { quantity: 2 }),
      room("staircase", "Staircase", 2.7, 1.1, { doors: 0, windows: 0 }),
    ],
  },
  {
    id: "na-studio",
    label: "Studio Apartment",
    description: "Single-room unit",
    bedrooms: 1,
    wallHeightM: 2.6,
    rooms: [
      room("bedroom", "Studio", 4.6, 4.0, { windows: 2 }),
      room("kitchen", "Kitchenette", 2.7, 2.0),
      room("bathroom", "Bathroom", 2.1, 1.5),
    ],
  },
];

/**
 * BRITAIN (GB): terraced, semi-detached (most common type), detached houses,
 * bungalows and flats. Compact rooms, ~2.4 m ceilings.
 */
const BRITAIN: BuildingPreset[] = [
  {
    id: "uk-2br-terraced",
    label: "2 Bedroom Terraced House",
    description: "Classic mid-terrace",
    bedrooms: 2,
    wallHeightM: 2.4,
    rooms: [
      room("bedroom", "Main Bedroom", 3.4, 3.0),
      room("bedroom", "Second Bedroom", 3.0, 2.7),
      room("living_room", "Living Room", 4.0, 3.5, { windows: 1 }),
      room("kitchen", "Kitchen / Dining", 3.4, 3.0),
      room("bathroom", "Bathroom", 2.0, 1.8),
    ],
  },
  {
    id: "uk-3br-semi",
    label: "3 Bedroom Semi-Detached House",
    description: "Britain's most common home",
    bedrooms: 3,
    wallHeightM: 2.4,
    rooms: [
      room("bedroom", "Main Bedroom", 3.5, 3.4),
      room("bedroom", "Bedroom", 3.2, 2.7, { quantity: 2 }),
      room("living_room", "Living Room", 4.2, 3.6, { windows: 1 }),
      room("dining", "Dining Room", 3.2, 3.0),
      room("kitchen", "Kitchen", 3.2, 2.8),
      room("bathroom", "Bathroom", 2.0, 1.8),
      room("corridor", "Hallway", 3.5, 1.0, { doors: 0 }),
    ],
  },
  {
    id: "uk-4br-detached",
    label: "4 Bedroom Detached House",
    description: "Larger detached family home",
    bedrooms: 4,
    wallHeightM: 2.4,
    rooms: [
      room("bedroom", "Main Bedroom", 4.0, 3.5),
      room("bedroom", "Bedroom", 3.2, 3.0, { quantity: 3 }),
      room("living_room", "Living Room", 4.5, 4.0, { windows: 1 }),
      room("dining", "Dining Room", 3.4, 3.2),
      room("kitchen", "Kitchen / Breakfast", 4.0, 3.2),
      room("bathroom", "Bathroom", 2.2, 2.0, { quantity: 2 }),
      room("corridor", "Hallway", 4.0, 1.0, { doors: 0 }),
    ],
  },
  {
    id: "uk-2br-flat",
    label: "2 Bedroom Flat",
    description: "Apartment flat",
    bedrooms: 2,
    wallHeightM: 2.4,
    rooms: [
      room("bedroom", "Main Bedroom", 3.4, 3.0),
      room("bedroom", "Second Bedroom", 3.0, 2.7),
      room("living_room", "Living Room", 4.0, 3.5, { windows: 1 }),
      room("kitchen", "Kitchen", 2.7, 2.4),
      room("bathroom", "Bathroom", 2.0, 1.8),
    ],
  },
  {
    id: "uk-2br-bungalow",
    label: "2 Bedroom Bungalow",
    description: "Single-storey home",
    bedrooms: 2,
    wallHeightM: 2.4,
    rooms: [
      room("bedroom", "Main Bedroom", 3.6, 3.2),
      room("bedroom", "Second Bedroom", 3.2, 3.0),
      room("living_room", "Lounge", 4.2, 3.6, { windows: 1 }),
      room("kitchen", "Kitchen", 3.0, 2.7),
      room("bathroom", "Bathroom", 2.0, 1.8),
    ],
  },
];

/**
 * OCEANIA (AU, NZ): among the world's largest homes (~214 m² average).
 */
const OCEANIA: BuildingPreset[] = [
  {
    id: "oce-3br-house",
    label: "3 Bedroom House",
    description: "Single-storey family home",
    bedrooms: 3,
    wallHeightM: 2.4,
    rooms: [
      room("bedroom", "Main Bedroom", 3.8, 3.5),
      room("bedroom", "Bedroom", 3.3, 3.0, { quantity: 2 }),
      room("living_room", "Living Room", 5.0, 4.2, { windows: 2 }),
      room("dining", "Dining", 3.6, 3.2),
      room("kitchen", "Kitchen", 3.6, 3.0),
      room("bathroom", "Bathroom", 2.5, 2.0, { quantity: 2 }),
      room("corridor", "Hallway", 4.0, 1.1, { doors: 0 }),
    ],
  },
  {
    id: "oce-4br-double-storey",
    label: "4 Bedroom Double-Storey Home",
    description: "Two-storey family home",
    bedrooms: 4,
    wallHeightM: 2.4,
    rooms: [
      room("bedroom", "Main Bedroom", 4.2, 3.8),
      room("bedroom", "Bedroom", 3.3, 3.0, { quantity: 3 }),
      room("living_room", "Living Room", 5.5, 4.5, { windows: 2 }),
      room("dining", "Dining", 3.8, 3.4),
      room("kitchen", "Kitchen", 4.0, 3.2),
      room("bathroom", "Bathroom", 2.5, 2.0, { quantity: 3 }),
      room("staircase", "Staircase", 2.7, 1.2, { doors: 0, windows: 0 }),
    ],
  },
  {
    id: "oce-2br-unit",
    label: "2 Bedroom Unit / Apartment",
    description: "Apartment or unit",
    bedrooms: 2,
    wallHeightM: 2.4,
    rooms: [
      room("bedroom", "Main Bedroom", 3.5, 3.2),
      room("bedroom", "Second Bedroom", 3.2, 3.0),
      room("living_room", "Living Room", 4.2, 3.6, { windows: 2 }),
      room("kitchen", "Kitchen", 3.0, 2.7),
      room("bathroom", "Bathroom", 2.2, 1.8),
    ],
  },
  {
    id: "oce-1br-unit",
    label: "1 Bedroom Unit",
    description: "Compact apartment",
    bedrooms: 1,
    wallHeightM: 2.4,
    rooms: [
      room("bedroom", "Bedroom", 3.2, 3.0),
      room("living_room", "Living Room", 3.8, 3.4, { windows: 2 }),
      room("kitchen", "Kitchen", 2.7, 2.4),
      room("bathroom", "Bathroom", 2.0, 1.6),
    ],
  },
  {
    id: "oce-3br-townhouse",
    label: "3 Bedroom Townhouse",
    description: "Attached multi-storey home",
    bedrooms: 3,
    wallHeightM: 2.4,
    rooms: [
      room("bedroom", "Main Bedroom", 3.5, 3.2),
      room("bedroom", "Bedroom", 3.2, 3.0, { quantity: 2 }),
      room("living_room", "Living / Dining", 4.2, 3.6, { windows: 2 }),
      room("kitchen", "Kitchen", 3.2, 2.7),
      room("bathroom", "Bathroom", 2.2, 1.8, { quantity: 2 }),
      room("staircase", "Staircase", 2.7, 1.2, { doors: 0, windows: 0 }),
    ],
  },
];

/**
 * SOUTH ASIA (IN): 1–3 BHK flats and independent houses.
 * Reference: bedrooms ~11×11 ft, living ~12×11 ft, kitchen ~9×7 ft.
 */
const SOUTH_ASIA: BuildingPreset[] = [
  {
    id: "in-1bhk",
    label: "1 BHK Flat",
    description: "One bedroom, hall and kitchen",
    bedrooms: 1,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Bedroom", 3.4, 3.0),
      room("living_room", "Hall / Living Room", 3.7, 3.4, { windows: 1 }),
      room("kitchen", "Kitchen", 2.7, 2.1),
      room("bathroom", "Bathroom", 1.8, 1.5),
    ],
  },
  {
    id: "in-2bhk",
    label: "2 BHK Flat",
    description: "Two bedroom family flat",
    bedrooms: 2,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Master Bedroom", 3.7, 3.4),
      room("bedroom", "Bedroom", 3.4, 3.0),
      room("living_room", "Hall / Living Room", 4.0, 3.7, { windows: 1 }),
      room("dining", "Dining", 2.7, 2.4),
      room("kitchen", "Kitchen", 2.7, 2.1),
      room("bathroom", "Bathroom", 1.8, 1.5, { quantity: 2 }),
    ],
  },
  {
    id: "in-3bhk",
    label: "3 BHK Flat",
    description: "Three bedroom family flat",
    bedrooms: 3,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Master Bedroom", 4.0, 3.7),
      room("bedroom", "Bedroom", 3.4, 3.0, { quantity: 2 }),
      room("living_room", "Hall / Living Room", 4.3, 4.0, { windows: 1 }),
      room("dining", "Dining", 3.0, 2.7),
      room("kitchen", "Kitchen", 3.0, 2.4),
      room("bathroom", "Bathroom", 1.8, 1.5, { quantity: 3 }),
    ],
  },
  {
    id: "in-4bhk",
    label: "4 BHK Flat",
    description: "Large family flat",
    bedrooms: 4,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Master Bedroom", 4.3, 4.0),
      room("bedroom", "Bedroom", 3.4, 3.0, { quantity: 3 }),
      room("living_room", "Hall / Living Room", 4.6, 4.3, { windows: 1 }),
      room("dining", "Dining", 3.2, 3.0),
      room("kitchen", "Kitchen", 3.2, 2.7),
      room("bathroom", "Bathroom", 1.8, 1.5, { quantity: 4 }),
    ],
  },
  {
    id: "in-independent-house",
    label: "3 Bedroom Independent House",
    description: "Standalone family house",
    bedrooms: 3,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Master Bedroom", 4.0, 3.7),
      room("bedroom", "Bedroom", 3.4, 3.0, { quantity: 2 }),
      room("living_room", "Hall / Living Room", 4.6, 4.0, { windows: 2 }),
      room("dining", "Dining", 3.0, 2.7),
      room("kitchen", "Kitchen", 3.2, 2.7),
      room("bathroom", "Bathroom", 1.8, 1.5, { quantity: 3 }),
      room("store", "Store / Pooja", 1.8, 1.5),
    ],
  },
];

/**
 * EAST ASIA (CN, JP, KR, SG): apartment living dominates. Reference:
 * a ~89 m² 3BR Chinese apartment; compact kitchens and bathrooms.
 */
const EAST_ASIA: BuildingPreset[] = [
  {
    id: "ea2-1br-apartment",
    label: "1 Bedroom Apartment",
    description: "Compact city apartment",
    bedrooms: 1,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Bedroom", 3.3, 3.0),
      room("living_room", "Living / Dining", 3.9, 3.3, { windows: 1 }),
      room("kitchen", "Kitchen", 2.4, 1.8),
      room("bathroom", "Bathroom", 2.1, 1.5),
    ],
  },
  {
    id: "ea2-2br-apartment",
    label: "2 Bedroom Apartment",
    description: "Family apartment",
    bedrooms: 2,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Master Bedroom", 3.6, 3.3),
      room("bedroom", "Bedroom", 3.0, 2.7),
      room("living_room", "Living / Dining", 4.2, 3.6, { windows: 1 }),
      room("kitchen", "Kitchen", 2.7, 2.1),
      room("bathroom", "Bathroom", 2.1, 1.5, { quantity: 2 }),
    ],
  },
  {
    id: "ea2-3br-apartment",
    label: "3 Bedroom Apartment",
    description: "Typical ~90 m² family apartment",
    bedrooms: 3,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Master Bedroom", 3.6, 3.6),
      room("bedroom", "Bedroom", 3.3, 3.0),
      room("bedroom", "Small Bedroom", 2.7, 2.4),
      room("living_room", "Living / Dining", 4.5, 3.9, { windows: 1 }),
      room("kitchen", "Kitchen", 2.7, 2.1),
      room("bathroom", "Bathroom", 2.1, 1.5, { quantity: 2 }),
    ],
  },
  {
    id: "ea2-studio",
    label: "Studio Apartment",
    description: "Compact single-room unit",
    bedrooms: 1,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Studio", 3.6, 3.0, { windows: 1 }),
      room("kitchen", "Kitchenette", 2.0, 1.5),
      room("bathroom", "Bathroom", 1.8, 1.2),
    ],
  },
  {
    id: "ea2-4br-apartment",
    label: "4 Bedroom Apartment",
    description: "Large family apartment",
    bedrooms: 4,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Master Bedroom", 4.2, 3.9),
      room("bedroom", "Bedroom", 3.3, 3.0, { quantity: 2 }),
      room("bedroom", "Small Bedroom", 2.7, 2.4),
      room("living_room", "Living / Dining", 5.1, 4.2, { windows: 2 }),
      room("kitchen", "Kitchen", 3.0, 2.4),
      room("bathroom", "Bathroom", 2.1, 1.5, { quantity: 3 }),
    ],
  },
];

/**
 * EUROPE (DE, FR, ES, IT, NL, PL, SE, CH, TR): 2–4 room flats and compact
 * houses. Reference ceiling minimums 2.6–2.7 m; homes 75–100 m².
 */
const EUROPE: BuildingPreset[] = [
  {
    id: "eu-studio",
    label: "Studio Apartment",
    description: "Single-room apartment",
    bedrooms: 1,
    wallHeightM: 2.6,
    rooms: [
      room("bedroom", "Studio Room", 4.2, 3.5, { windows: 1 }),
      room("kitchen", "Kitchenette", 2.4, 2.0),
      room("bathroom", "Bathroom", 2.0, 1.6),
    ],
  },
  {
    id: "eu-2-room-apartment",
    label: "2 Room Apartment",
    description: "One bedroom + living room",
    bedrooms: 1,
    wallHeightM: 2.6,
    rooms: [
      room("bedroom", "Bedroom", 3.5, 3.0),
      room("living_room", "Living Room", 4.2, 3.6, { windows: 1 }),
      room("kitchen", "Kitchen", 2.7, 2.4),
      room("bathroom", "Bathroom", 2.2, 1.8),
    ],
  },
  {
    id: "eu-3-room-apartment",
    label: "3 Room Apartment",
    description: "Two bedroom family flat",
    bedrooms: 2,
    wallHeightM: 2.6,
    rooms: [
      room("bedroom", "Master Bedroom", 3.8, 3.4),
      room("bedroom", "Bedroom", 3.2, 3.0),
      room("living_room", "Living Room", 4.5, 4.0, { windows: 1 }),
      room("kitchen", "Kitchen", 3.0, 2.7),
      room("bathroom", "Bathroom", 2.2, 1.8),
      room("corridor", "Hallway", 3.0, 1.2, { doors: 0 }),
    ],
  },
  {
    id: "eu-4-room-apartment",
    label: "4 Room Apartment",
    description: "Three bedroom family flat",
    bedrooms: 3,
    wallHeightM: 2.6,
    rooms: [
      room("bedroom", "Master Bedroom", 4.0, 3.6),
      room("bedroom", "Bedroom", 3.2, 3.0, { quantity: 2 }),
      room("living_room", "Living Room", 5.0, 4.2, { windows: 1 }),
      room("dining", "Dining", 3.2, 3.0),
      room("kitchen", "Kitchen", 3.0, 2.7),
      room("bathroom", "Bathroom", 2.2, 1.8, { quantity: 2 }),
    ],
  },
  {
    id: "eu-terraced-house",
    label: "4 Bedroom Terraced House",
    description: "Row house family home",
    bedrooms: 4,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Master Bedroom", 3.8, 3.5),
      room("bedroom", "Bedroom", 3.2, 3.0, { quantity: 3 }),
      room("living_room", "Living Room", 4.8, 4.2, { windows: 1 }),
      room("dining", "Dining", 3.4, 3.0),
      room("kitchen", "Kitchen", 3.4, 3.0),
      room("bathroom", "Bathroom", 2.4, 2.0, { quantity: 2 }),
      room("staircase", "Staircase", 2.5, 1.2, { doors: 0, windows: 0 }),
    ],
  },
];

/**
 * LATIN AMERICA (BR, MX): apartments and houses, compact rooms.
 */
const LATAM: BuildingPreset[] = [
  {
    id: "la-studio",
    label: "Studio / Eficiência",
    description: "Single-room apartment",
    bedrooms: 1,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Studio", 4.0, 3.5, { windows: 1 }),
      room("kitchen", "Kitchenette", 2.4, 1.8),
      room("bathroom", "Bathroom", 2.0, 1.5),
    ],
  },
  {
    id: "la-2br-apartment",
    label: "2 Bedroom Apartment",
    description: "Two bedroom apartment",
    bedrooms: 2,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Master Bedroom", 3.4, 3.2),
      room("bedroom", "Bedroom", 3.0, 2.8),
      room("living_room", "Living Room", 4.0, 3.5, { windows: 1 }),
      room("kitchen", "Kitchen", 2.7, 2.4),
      room("bathroom", "Bathroom", 2.0, 1.6),
    ],
  },
  {
    id: "la-3br-apartment",
    label: "3 Bedroom Apartment",
    description: "Family apartment",
    bedrooms: 3,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Master Bedroom", 3.6, 3.4),
      room("bedroom", "Bedroom", 3.2, 3.0, { quantity: 2 }),
      room("living_room", "Living / Dining", 4.5, 4.0, { windows: 1 }),
      room("kitchen", "Kitchen", 3.0, 2.7),
      room("bathroom", "Bathroom", 2.0, 1.6, { quantity: 2 }),
    ],
  },
  {
    id: "la-1br-apartment",
    label: "1 Bedroom Apartment",
    description: "Compact apartment",
    bedrooms: 1,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Bedroom", 3.2, 2.8),
      room("living_room", "Living Room", 3.8, 3.2, { windows: 1 }),
      room("kitchen", "Kitchenette", 2.4, 2.0),
      room("bathroom", "Bathroom", 2.0, 1.5),
    ],
  },
  {
    id: "la-3br-house",
    label: "3 Bedroom House",
    description: "Standalone family house",
    bedrooms: 3,
    wallHeightM: 2.7,
    rooms: [
      room("bedroom", "Master Bedroom", 3.6, 3.4),
      room("bedroom", "Bedroom", 3.2, 3.0, { quantity: 2 }),
      room("living_room", "Living Room", 4.5, 4.0, { windows: 2 }),
      room("dining", "Dining", 3.2, 3.0),
      room("kitchen", "Kitchen", 3.2, 2.8),
      room("bathroom", "Bathroom", 2.2, 1.8, { quantity: 2 }),
      room("store", "Utility / Laundry", 2.0, 1.5),
    ],
  },
];

/**
 * SOUTHEAST ASIA (ID): rumah houses and apartments.
 */
const SOUTHEAST_ASIA: BuildingPreset[] = [
  {
    id: "se-2br-house",
    label: "2 Bedroom House (Rumah)",
    description: "Small family house",
    bedrooms: 2,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Master Bedroom", 3.4, 3.2),
      room("bedroom", "Bedroom", 3.0, 3.0),
      room("living_room", "Living Room", 3.8, 3.2, { windows: 1 }),
      room("kitchen", "Kitchen", 2.7, 2.2),
      room("bathroom", "Bathroom", 1.8, 1.5),
    ],
  },
  {
    id: "se-3br-house",
    label: "3 Bedroom House (Rumah)",
    description: "Family house",
    bedrooms: 3,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Master Bedroom", 3.6, 3.4),
      room("bedroom", "Bedroom", 3.2, 3.0, { quantity: 2 }),
      room("living_room", "Living Room", 4.2, 3.6, { windows: 1 }),
      room("dining", "Dining", 3.0, 2.7),
      room("kitchen", "Kitchen", 3.0, 2.4),
      room("bathroom", "Bathroom", 1.8, 1.5, { quantity: 2 }),
    ],
  },
  {
    id: "se-4br-house",
    label: "4 Bedroom House (Rumah)",
    description: "Large family house",
    bedrooms: 4,
    wallHeightM: 3.0,
    rooms: [
      room("bedroom", "Master Bedroom", 4.0, 3.6),
      room("bedroom", "Bedroom", 3.2, 3.0, { quantity: 3 }),
      room("living_room", "Living Room", 4.5, 4.0, { windows: 2 }),
      room("dining", "Dining", 3.2, 2.8),
      room("kitchen", "Kitchen", 3.0, 2.5),
      room("bathroom", "Bathroom", 1.8, 1.5, { quantity: 3 }),
      room("corridor", "Hallway", 3.5, 1.2, { doors: 0 }),
    ],
  },
  {
    id: "se-studio",
    label: "Studio Apartment",
    description: "Single-room unit",
    bedrooms: 1,
    wallHeightM: 2.8,
    rooms: [
      room("bedroom", "Studio", 3.6, 3.2, { windows: 1 }),
      room("kitchen", "Kitchenette", 2.0, 1.5),
      room("bathroom", "Bathroom", 1.6, 1.2),
    ],
  },
  {
    id: "se-2br-apartment",
    label: "2 Bedroom Apartment",
    description: "Apartment unit",
    bedrooms: 2,
    wallHeightM: 2.8,
    rooms: [
      room("bedroom", "Master Bedroom", 3.4, 3.0),
      room("bedroom", "Bedroom", 3.0, 2.7),
      room("living_room", "Living / Dining", 3.8, 3.4, { windows: 1 }),
      room("kitchen", "Kitchen", 2.4, 1.8),
      room("bathroom", "Bathroom", 1.8, 1.4),
    ],
  },
];

// =========================================================
// Market → profile mapping (all 32 FRELUX markets)
// =========================================================

const HOUSING_PROFILE_TABLE: Record<HousingProfileId, BuildingPreset[]> = {
  west_africa: WEST_AFRICA,
  east_africa: EAST_AFRICA,
  north_africa: NORTH_AFRICA,
  southern_africa: SOUTHERN_AFRICA,
  gulf: GULF,
  north_america: NORTH_AMERICA,
  britain: BRITAIN,
  oceania: OCEANIA,
  south_asia: SOUTH_ASIA,
  east_asia: EAST_ASIA,
  europe: EUROPE,
  latam: LATAM,
  southeast_asia: SOUTHEAST_ASIA,
};

export const HOUSING_PROFILE_BY_MARKET: Record<string, HousingProfileId> = {
  NG: "west_africa",
  GH: "west_africa",
  CI: "west_africa",
  KE: "east_africa",
  TZ: "east_africa",
  ET: "east_africa",
  EG: "north_africa",
  ZA: "southern_africa",
  AE: "gulf",
  SA: "gulf",
  US: "north_america",
  CA: "north_america",
  GB: "britain",
  AU: "oceania",
  NZ: "oceania",
  IN: "south_asia",
  CN: "east_asia",
  JP: "east_asia",
  KR: "east_asia",
  SG: "east_asia",
  DE: "europe",
  FR: "europe",
  ES: "europe",
  IT: "europe",
  NL: "europe",
  PL: "europe",
  SE: "europe",
  CH: "europe",
  TR: "europe",
  BR: "latam",
  MX: "latam",
  ID: "southeast_asia",
};

/** Markets that see feet-first room dimensions by default. */
// Imperial room-dimension markets: US/CA and the platform's NG/IN
// feet-based practice. The UK quotes room sizes in metres.
export const IMPERIAL_ROOM_MARKETS = new Set(["US", "CA", "NG", "IN"]);

/**
 * All 32 approved FRELUX market codes served by this module.
 */
export const PRESET_MARKET_CODES: string[] = Object.keys(HOUSING_PROFILE_BY_MARKET);

// =========================================================
// Public API
// =========================================================

/**
 * The house-type presets for a market. Unknown markets fall back to the
 * West Africa profile (the platform's reference market) so the UI is
 * never empty.
 */
export function getBuildingPresets(marketCode: string | undefined | null): BuildingPreset[] {
  const profileId = HOUSING_PROFILE_BY_MARKET[(marketCode ?? "NG").toUpperCase()];
  return HOUSING_PROFILE_TABLE[profileId ?? "west_africa"];
}

/** Look one preset up by id within a market's list. */
export function findBuildingPreset(
  marketCode: string | undefined | null,
  presetId: string,
): BuildingPreset | undefined {
  return getBuildingPresets(marketCode).find((p) => p.id === presetId);
}

/**
 * Convert a canonical metre dimension to the display unit, rounded to a
 * friendly precision (metres → 2dp; feet → 1dp, e.g. 12.0 ft not 12.14).
 */
export function displayDimension(
  metres: number,
  unit: RoomUnitChoice,
): number {
  if (unit === "feet") {
    return Math.round(metres * M_TO_FT * 10) / 10;
  }
  return Math.round(metres * 100) / 100;
}

/**
 * Convert a preset into editable room drafts in the requested unit.
 * Every dimension is converted from canonical metres; identical rooms
 * stay grouped via quantity so the user edits them once.
 */
export function presetToRoomDrafts(
  preset: BuildingPreset,
  unit: RoomUnitChoice,
): RoomDraft[] {
  return preset.rooms.map((r, i) => ({
    id: `${preset.id}-room-${i}`,
    spaceType: r.spaceType,
    label: r.label,
    length: displayDimension(r.lengthM, unit),
    width: displayDimension(r.widthM, unit),
    quantity: r.quantity,
    doors: r.doors,
    windows: r.windows,
  }));
}

/**
 * The preset's default wall height in the requested unit.
 */
export function presetWallHeight(preset: BuildingPreset, unit: RoomUnitChoice): number {
  return displayDimension(preset.wallHeightM, unit);
}

/**
 * Sensible default display unit for the preset UI: NG and imperial markets
 * get feet, everyone else metres. (Pages already have their own unit
 * selector; this only seeds the preset values consistently with it.)
 */
export function defaultPresetUnit(marketCode: string | undefined | null): RoomUnitChoice {
  return IMPERIAL_ROOM_MARKETS.has((marketCode ?? "NG").toUpperCase())
    ? "feet"
    : "meters";
}

// =========================================================
// Measurement project seeding (shared calculators)
// =========================================================

/**
 * Seed a measurement project's house/building section with a preset's
 * room breakdown. Used by the shared MeasurementInput "House / Building"
 * mode so every room-based calculator (screeding, tiling surfaces, ...)
 * gets the same market-aware whole-house flow as the paint calculator.
 *
 * The project switches to house_building mode with one section holding
 * one group per preset room (identical rooms stay grouped via quantity).
 * The entries' unit is chosen from the preset display unit of the
 * market (feet for NG/imperial markets, metres elsewhere); the
 * per-entry unit selector still lets users switch afterwards.
 */
export function seedProjectWithPreset(
  project: MeasurementProject,
  marketCode: string | undefined | null,
  presetId: string,
): MeasurementProject {
  const preset = findBuildingPreset(marketCode, presetId);
  if (!preset) return project;

  const unitChoice = defaultPresetUnit(marketCode);
  const drafts = presetToRoomDrafts(preset, unitChoice);
  const groups = drafts.map((d) =>
    createMeasurementGroup(
      d.label,
      createMeasurementEntry({
        unit: unitChoice === "feet" ? "feet" : "meters",
        spaceType: d.spaceType,
        length: d.length,
        width: d.width,
        quantity: d.quantity,
        doors: d.doors,
        windows: d.windows,
        description: d.label,
      }),
    ),
  );

  return {
    ...project,
    projectMode: "house_building",
    sections: [
      {
        id: `section-preset-${preset.id}`,
        label: "Building Spaces",
        groups,
      },
    ],
  };
}
