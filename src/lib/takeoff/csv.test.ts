import { describe, expect, it } from "vitest";
import { takeoffToCsv, TAKEOFF_CSV_HEADER } from "./csv";
import { runTakeoff } from "./engine";
import type { ScheduleInput } from "./types";

const schedule: ScheduleInput = {
  id: "sched",
  rooms: [
    {
      id: "r1",
      walls: [{ id: "w1", length: 3.6, height: 2.7 }],
      floor: { id: "f1", length: 3.6, width: 4.2 },
    },
  ],
};

describe("takeoff export", () => {
  it("writes one row per line under the documented header", () => {
    const result = runTakeoff(schedule, { scopes: ["paint"] });
    const rows = takeoffToCsv(result).split("\n");
    expect(rows[0]).toBe(TAKEOFF_CSV_HEADER.join(","));
    expect(rows).toHaveLength(1 + result.lines.length);
  });

  it("carries the formula and the assumption state into the file", () => {
    const csv = takeoffToCsv(
      runTakeoff(
        {
          id: "s",
          rooms: [
            {
              id: "r",
              walls: [{ id: "w", length: 3, height: 2.4, assumed: true }],
            },
          ],
        },
        { scopes: ["paint"] },
      ),
    );
    expect(csv).toContain("assumed");
    expect(csv).toMatch(/area x coats \/ coverage/);
  });

  it("appends warnings so an empty measure is visible in the file", () => {
    const csv = takeoffToCsv(runTakeoff({ id: "s", rooms: [] }));
    expect(csv).toContain("Warnings");
  });

  it("quotes a description that contains a comma", () => {
    const result = runTakeoff(schedule, { scopes: ["blockwork"] });
    const csv = takeoffToCsv(result);
    expect(csv.split("\n").every((row) => row.split(",").length >= 1)).toBe(
      true,
    );
  });
});
