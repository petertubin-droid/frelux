/**
 * Project adapter tests (Prompt 3, §7: no invented dimensions).
 */

import { describe, it, expect } from "vitest";
import {
  dbRoomsToSpaces,
  dbProjectToConstructionProject,
} from "./project-adapter";
import type { DbContractorProject, DbProjectRoom } from "@/types/database";
import { calculateConstructionProject } from "@/lib/measurement/project-engine";
import { buildQuantityTakeoff } from "./takeoff";

function makeRoom(overrides: Partial<DbProjectRoom>): DbProjectRoom {
  return {
    id: "room-1",
    project_id: "proj-1",
    name: "Bedroom 1",
    room_type: "bedroom",
    sort_order: 0,
    length_m: 4,
    width_m: 3,
    height_m: 3,
    unit: "meters",
    ...overrides,
  } as DbProjectRoom;
}

function makeProject(
  overrides: Partial<DbContractorProject>,
): DbContractorProject {
  return {
    id: "proj-1",
    user_id: "u1",
    name: "Test Project",
    description: null,
    project_type: "painting",
    building_type: "residential",
    surface_location: "interior",
    construction_type: "new_construction",
    finish_quality: "standard",
    budget_level: "standard",
    material_quality: "standard",
    client_name: null,
    client_phone: null,
    client_email: null,
    client_address: null,
    status: "draft",
    progress_percentage: 0,
    notes: null,
    tags: [],
    total_material_cost: 0,
    total_labour_cost: 0,
    total_transport_cost: 0,
    total_misc_cost: 0,
    total_markup: 0,
    total_profit: 0,
    total_project_cost: 0,
    estimated_duration_days: null,
    currency: "USD",
    currency_symbol: "$",
    location: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as DbContractorProject;
}

describe("dbRoomsToSpaces", () => {
  it("converts rooms with complete dimensions", () => {
    const { spaces, unmeasured } = dbRoomsToSpaces([makeRoom({})]);
    expect(spaces).toHaveLength(1);
    expect(unmeasured).toHaveLength(0);
    expect(spaces[0].length).toBe(4);
    expect(spaces[0].type).toBe("bedroom");
  });

  it("reports rooms without dimensions as unmeasured gaps, never zeros", () => {
    const { spaces, unmeasured } = dbRoomsToSpaces([
      makeRoom({ id: "r-no-dims", length_m: null, width_m: null }),
      makeRoom({ id: "r-partial", width_m: null }),
    ]);
    expect(spaces).toHaveLength(0);
    expect(unmeasured).toHaveLength(2);
  });

  it("maps hallway to the Space Engine corridor type", () => {
    const { spaces } = dbRoomsToSpaces([
      makeRoom({ room_type: "hallway" as DbProjectRoom["room_type"] }),
    ]);
    expect(spaces[0].type).toBe("corridor");
  });

  it("rejects non-positive dimensions as unmeasured", () => {
    const { unmeasured } = dbRoomsToSpaces([makeRoom({ length_m: 0 })]);
    expect(unmeasured).toHaveLength(1);
  });
});

describe("dbProjectToConstructionProject", () => {
  it("routes a painting project to one painting element", () => {
    const result = dbProjectToConstructionProject(makeProject({}), [
      makeRoom({}),
    ]);
    expect(result.constructionProject.elements).toHaveLength(1);
    expect(result.constructionProject.elements[0].primaryCalculator).toBe(
      "painting",
    );
  });

  it("routes a multi_trade project to all four trades with the same measured areas", () => {
    const result = dbProjectToConstructionProject(
      makeProject({ project_type: "multi_trade" }),
      [makeRoom({})],
    );
    expect(
      result.constructionProject.elements.map((e) => e.primaryCalculator),
    ).toEqual(["painting", "screeding", "tiling", "pop"]);
  });

  it("creates no elements when no room is measured", () => {
    const result = dbProjectToConstructionProject(makeProject({}), [
      makeRoom({ length_m: null }),
    ]);
    expect(result.constructionProject.elements).toHaveLength(0);
    expect(result.unmeasuredRooms).toHaveLength(1);
  });
});

describe("adapter feeds the deterministic pipeline end to end", () => {
  it("Project Engine → takeoff with no invented quantities", () => {
    const { constructionProject, unmeasuredRooms } =
      dbProjectToConstructionProject(makeProject({}), [
        makeRoom({}),
        makeRoom({ id: "r2", name: "Bedroom 2", length_m: null }),
      ]);
    const engineResult = calculateConstructionProject(constructionProject);
    const takeoff = buildQuantityTakeoff({
      project: engineResult,
      calculations: [],
    });
    // One measured space, one explicit gap — nothing invented.
    expect(takeoff.measurementItems).toHaveLength(1);
    expect(takeoff.measurementItems[0].quantitySource).toBe("project_engine");
    expect(takeoff.materialItems).toHaveLength(0);
    expect(takeoff.requiresCalculation).toEqual([
      expect.objectContaining({ discipline: "painting" }),
    ]);
    expect(unmeasuredRooms).toHaveLength(1);
  });
});
