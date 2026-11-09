import { describe, expect, it, vi, beforeEach } from "vitest";

const insert = vi.fn(() => ({
  select: () => ({
    single: async () => ({ data: { id: "tk-1" }, error: null }),
  }),
}));
const update = vi.fn(() => ({
  eq: () => ({
    select: () => ({
      single: async () => ({ data: { id: "tk-1" }, error: null }),
    }),
  }),
}));
const deleteEq = vi.fn(async () => ({ error: null }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      expect(table).toBe("project_takeoffs");
      return {
        insert,
        update,
        delete: () => ({ eq: deleteEq }),
      };
    },
  },
}));

const { saveProjectTakeoff, deleteProjectTakeoff } =
  await import("./persistence");
const { runTakeoff } = await import("./engine");

const schedule = {
  id: "t",
  rooms: [
    {
      id: "r1",
      label: "Bedroom",
      walls: [{ id: "w1", length: 4, height: 2.7 }],
      floor: { id: "f1", length: 4, width: 3.5 },
    },
  ],
};

const result = runTakeoff(schedule, { scopes: ["blockwork"] });

const baseInput = {
  projectId: "proj-1",
  name: "Ground floor",
  schedule,
  scopes: ["blockwork" as const],
  specs: {},
  result,
};

describe("saving a takeoff", () => {
  beforeEach(() => {
    insert.mockClear();
    update.mockClear();
  });

  it("inserts the schedule and the bill for a new takeoff", async () => {
    await saveProjectTakeoff(baseInput);
    const payload = (
      insert.mock.calls[0] as unknown as [Record<string, unknown>]
    )[0];
    expect(payload.project_id).toBe("proj-1");
    expect(payload.name).toBe("Ground floor");
    expect(payload.schedule).toMatchObject({ rooms: [{ id: "r1" }] });
    expect(payload.result).toBeTruthy();
    expect(payload.totals).toEqual(result.totals);
    expect(payload.assumed_line_count).toBe(0);
    expect(payload.warnings).toEqual(result.warnings);
  });

  it("updates an existing takeoff instead of duplicating it", async () => {
    await saveProjectTakeoff({ ...baseInput, id: "tk-9" });
    expect(update).toHaveBeenCalledTimes(1);
    expect(insert).not.toHaveBeenCalled();
  });

  it("refuses a blank name before it reaches the database", async () => {
    await expect(
      saveProjectTakeoff({ ...baseInput, name: "   " }),
    ).rejects.toThrow(/name/i);
    expect(insert).not.toHaveBeenCalled();
  });

  it("refuses a schedule with no rooms", async () => {
    await expect(
      saveProjectTakeoff({ ...baseInput, schedule: { id: "t", rooms: [] } }),
    ).rejects.toThrow(/at least one room/i);
    expect(insert).not.toHaveBeenCalled();
  });

  it("trims the name so a trailing space cannot create a duplicate looking row", async () => {
    await saveProjectTakeoff({ ...baseInput, name: "  Ground floor  " });
    const payload = (
      insert.mock.calls[0] as unknown as [Record<string, unknown>]
    )[0];
    expect(payload.name).toBe("Ground floor");
  });
});

describe("deleting a takeoff", () => {
  it("scopes the delete to the row id", async () => {
    deleteEq.mockClear();
    await deleteProjectTakeoff("tk-1");
    expect(deleteEq).toHaveBeenCalledWith("id", "tk-1");
  });
});
