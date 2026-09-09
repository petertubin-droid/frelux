/**
 * FRELUX CONSTRUCTION INTELLIGENCE, PROJECT DATA ADAPTER
 *
 * Bridges stored project data (contractor_projects + project_rooms) into
 * the canonical ConstructionProject that the deterministic Project Engine
 * consumes. This module ONLY maps data that exists:
 *
 *   - Rooms with recorded length + width become Spaces; their quantities
 *     are produced by the Project Engine, never here.
 *   - Rooms without complete dimensions are returned as `unmeasured` —
 *     an explicit gap that the risk layer reports, never a zero or an
 *     invented dimension (Prompt 3, §7).
 *   - The element's primary calculator is derived deterministically from
 *     the project's own project_type. A multi_trade project surfaces the
 *     same measured areas under each of its four trades so the takeoff
 *     and risk layers can honestly report which trades still have no
 *     saved engine calculation.
 */

import type {
  DbContractorProject,
  DbProjectRoom,
  ProjectType,
} from "@/types/database";
import type { CalculatorContext } from "@/lib/measurement/units";
import { createSpace, type Space } from "@/lib/measurement/space-engine";
import type { SpaceType } from "@/lib/measurement/types";
import {
  createProjectElement,
  type ConstructionProject,
  type ProjectElement,
  type ProjectElementType,
} from "@/lib/measurement/project-engine";

// =========================================================
// Deterministic project-type → trade routing
// =========================================================

const PROJECT_TYPE_ELEMENTS: Record<ProjectType, CalculatorContext[]> = {
  painting: ["painting"],
  screeding: ["screeding"],
  pop_ceiling: ["pop"],
  tiling: ["tiling"],
  // A multi-trade project measures the same surfaces for each of its
  // trades; the risk layer then flags any trade with measurements but
  // no saved calculation. No trade is silently skipped or assumed done.
  multi_trade: ["painting", "screeding", "tiling", "pop"],
};

const ELEMENT_LABELS: Record<CalculatorContext, string> = {
  painting: "Painting surfaces",
  screeding: "Screeding surfaces",
  tiling: "Tiling surfaces",
  pop: "POP ceiling surfaces",
  tyrolene: "Tyrolene surfaces",
  grafitex: "Grafitex surfaces",
  block: "Blockwork",
  fence_screeding: "Fence screeding",
  fence_painting: "Fence painting",
};

/** Deterministic RoomType → SpaceType mapping. Unknown types map to "other". */
const ROOM_TO_SPACE_TYPE: Record<string, SpaceType> = {
  living_room: "living_room",
  bedroom: "bedroom",
  kitchen: "kitchen",
  bathroom: "bathroom",
  balcony: "balcony",
  // FRELUX room "hallway" is the Space Engine's "corridor".
  hallway: "corridor",
  staircase: "staircase",
  office: "office",
  dining: "dining",
};

function roomSpaceType(room: DbProjectRoom): SpaceType {
  return ROOM_TO_SPACE_TYPE[room.room_type] ?? "other";
}

/** Space type label for a stored room, for display traceability only. */
function roomSpaceName(room: DbProjectRoom): string {
  return room.name?.trim() ? room.name.trim() : "Room";
}

// =========================================================
// Room → Space conversion (measured data only)
// =========================================================

export interface RoomsToSpacesResult {
  /** Rooms with complete dimensions, converted to canonical Spaces. */
  spaces: Space[];
  /** Rooms that lack recorded dimensions — explicit gaps, never zeros. */
  unmeasured: DbProjectRoom[];
}

/**
 * Convert stored rooms to canonical Space objects.
 *
 * Only rooms with recorded positive length and width are converted.
 * Unknown heights fall back to the Space Engine's own documented
 * default (never an invented per-room value).
 */
export function dbRoomsToSpaces(rooms: DbProjectRoom[]): RoomsToSpacesResult {
  const spaces: Space[] = [];
  const unmeasured: DbProjectRoom[] = [];

  for (const room of rooms) {
    const lengthM = room.length_m;
    const widthM = room.width_m;
    if (
      lengthM === null ||
      widthM === null ||
      !Number.isFinite(lengthM) ||
      !Number.isFinite(widthM) ||
      lengthM <= 0 ||
      widthM <= 0
    ) {
      unmeasured.push(room);
      continue;
    }
    spaces.push(
      createSpace({
        name: roomSpaceName(room),
        type: roomSpaceType(room),
        length: lengthM,
        width: widthM,
        // Unknown height → Space Engine documented default, traceable in steps.
        height: room.height_m ?? undefined,
        unit: room.unit === "feet" ? "feet" : "meters",
        quantity: 1,
        surfaceType: "wall",
        finishType: "none",
        includeCeiling: false,
      }),
    );
  }

  return { spaces, unmeasured };
}

// =========================================================
// Stored project → canonical ConstructionProject
// =========================================================

export interface ProjectAdapterResult {
  /** Canonical project, ready for calculateConstructionProject(). */
  constructionProject: ConstructionProject;
  /** Rooms without complete dimensions, reported as explicit gaps. */
  unmeasuredRooms: DbProjectRoom[];
}

/**
 * Build the canonical ConstructionProject from stored data.
 *
 * The project's own project_type determines which trade element(s) the
 * measured surfaces belong to. This mapping is deterministic — it never
 * guesses a trade the project does not declare.
 */
export function dbProjectToConstructionProject(
  project: DbContractorProject,
  rooms: DbProjectRoom[],
): ProjectAdapterResult {
  const { spaces, unmeasured } = dbRoomsToSpaces(rooms);

  const now = new Date().toISOString();
  const elementType: ProjectElementType = "interior";

  const elements: ProjectElement[] = [];
  for (const calculator of PROJECT_TYPE_ELEMENTS[project.project_type]) {
    if (spaces.length === 0) continue;
    elements.push(
      createProjectElement(
        ELEMENT_LABELS[calculator],
        elementType,
        calculator,
        spaces,
      ),
    );
  }

  const constructionProject: ConstructionProject = {
    id: project.id,
    name: project.name,
    description: project.description ?? undefined,
    preferredUnit: "meters",
    elements,
    marketCode: project.location?.["countryCode"] as string | undefined,
    status:
      project.status === "completed"
        ? "completed"
        : project.status === "draft"
          ? "draft"
          : "in_progress",
    createdAt: project.created_at,
    updatedAt: project.updated_at ?? now,
  };

  return { constructionProject, unmeasuredRooms: unmeasured };
}
