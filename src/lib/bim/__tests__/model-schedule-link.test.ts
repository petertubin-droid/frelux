import { describe, it, expect } from "vitest";

import {
  buildScheduleLink,
  elementsActiveOn,
  type ScheduleActivity,
} from "../model-schedule-link";

const revision = {
  element_index: {
    w1: { parts: 1 },
    w2: { parts: 1 },
    d1: { parts: 1 },
  },
};

function act(
  id: string,
  start: string,
  end: string,
  ids: string[],
): ScheduleActivity {
  return {
    id,
    name: id,
    start_date: start,
    end_date: end,
    element_global_ids: ids,
  };
}

describe("buildScheduleLink", () => {
  it("maps elements to activities and reports unassigned elements", () => {
    const link = buildScheduleLink(
      [act("a1", "2026-11-01", "2026-11-10", ["w1", "w2"])],
      revision,
    );
    if (!link.ok) throw new Error("unexpected refusal");
    expect(link.element_activities.get("w1")).toEqual(["a1"]);
    expect(link.unassigned_global_ids).toEqual(["d1"]);
    expect(link.ordered.map((a) => a.id)).toEqual(["a1"]);
  });

  it("reports unknown GlobalIds instead of dropping them", () => {
    const link = buildScheduleLink(
      [act("a1", "2026-11-01", "2026-11-10", ["w1", "nope"])],
      revision,
    );
    if (!link.ok) throw new Error("unexpected refusal");
    expect(link.unknown_global_ids).toEqual(["nope"]);
    expect(link.element_activities.has("nope")).toBe(false);
  });

  it("refuses duplicate ids and inverted or invalid dates", () => {
    expect(
      buildScheduleLink(
        [
          act("a1", "2026-11-01", "2026-11-02", []),
          act("a1", "2026-11-03", "2026-11-04", []),
        ],
        revision,
      ).ok,
    ).toBe(false);
    expect(
      buildScheduleLink([act("a1", "2026-11-05", "2026-11-01", [])], revision)
        .ok,
    ).toBe(false);
    expect(
      buildScheduleLink([act("a1", "2026-13-01", "2026-11-10", [])], revision)
        .ok,
    ).toBe(false);
  });

  it("orders activities by start date", () => {
    const link = buildScheduleLink(
      [
        act("b", "2026-11-10", "2026-11-20", ["w2"]),
        act("a", "2026-11-01", "2026-11-09", ["w1"]),
      ],
      revision,
    );
    if (!link.ok) throw new Error("unexpected refusal");
    expect(link.ordered.map((a) => a.id)).toEqual(["a", "b"]);
  });
});

describe("elementsActiveOn", () => {
  it("includes both interval ends and nothing outside them", () => {
    const link = buildScheduleLink(
      [
        act("a1", "2026-11-01", "2026-11-10", ["w1"]),
        act("a2", "2026-11-11", "2026-11-20", ["w2"]),
      ],
      revision,
    );
    if (!link.ok) throw new Error("unexpected refusal");
    expect([...elementsActiveOn(link, "2026-11-01")]).toEqual(["w1"]);
    expect([...elementsActiveOn(link, "2026-11-10")]).toEqual(["w1"]);
    expect([...elementsActiveOn(link, "2026-11-15")]).toEqual(["w2"]);
    expect(elementsActiveOn(link, "2026-12-01").size).toBe(0);
    // invalid date: empty set, never a guess
    expect(elementsActiveOn(link, "not-a-date").size).toBe(0);
  });
});
