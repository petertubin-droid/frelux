// ============================================================
// Phase 3 calendar-aware scheduling: deterministic tests.
// ============================================================

import { describe, expect, it } from "vitest";
import {
  SCHEDULE_EXCLUDED_FACTORS,
  addWorkDays,
  scheduleTimeline,
} from "./scheduled-timeline";
import type { WorkCalendar } from "./work-calendar";

const NG_2026: WorkCalendar = {
  id: "c1",
  country_code: "NG",
  subnational_scope: null,
  effective_year: 2026,
  timezone: "Africa/Lagos",
  workweek_days: [1, 2, 3, 4, 5],
  non_working_dates: [
    { date: "2026-10-01", name: "Independence Day" },
    { date: "2026-10-05", name: "Test Holiday", tentative: true },
  ],
  completeness: "partial",
  source: "qppstudio.net",
  source_url: null,
  last_refreshed_at: "2026-10-25T00:00:00Z",
  version: 1,
};

describe("addWorkDays", () => {
  it("counts the start day as the first working day", () => {
    // Monday 2026-10-26 + 5 working days = Friday 2026-10-30
    const r = addWorkDays("2026-10-26", 5, NG_2026);
    expect(r.date).toBe("2026-10-30");
    expect(r.skipped).toEqual([]);
  });

  it("skips weekends", () => {
    // Wednesday + 5 working days spans a weekend: Oct 28 -> Nov 4
    const r = addWorkDays("2026-10-28", 5, NG_2026);
    expect(r.date).toBe("2026-11-03");
  });

  it("skips holidays and reports them with provenance", () => {
    // Mon Oct 26 + 5 -> Fri Oct 30 is 4 days short of a holiday week;
    // Oct 29 and 30 are working, but if a holiday lands inside...
    const cal: WorkCalendar = {
      ...NG_2026,
      non_working_dates: [{ date: "2026-10-28", name: "Midweek break" }],
    };
    const r = addWorkDays("2026-10-26", 3, cal);
    // Mon 26 (1), Tue 27 (2), Wed 28 holiday, Thu 29 (3)
    expect(r.date).toBe("2026-10-29");
    expect(r.skipped.map((s) => s.name)).toEqual(["Midweek break"]);
  });

  it("advances a non-working start to the first working day", () => {
    const r = addWorkDays("2026-10-31", 1, NG_2026); // Saturday
    expect(r.date).toBe("2026-11-02"); // Monday
  });

  it("handles zero and invalid counts fail-closed on invalid dates", () => {
    expect(addWorkDays("2026-10-26", 0, NG_2026).date).toBe("2026-10-26");
    expect(addWorkDays("nonsense", 3, NG_2026).date).toBe("");
  });
});

describe("scheduleTimeline", () => {
  const stages = [
    {
      stage: "foundation",
      stage_label: "Foundation",
      min_days: 10,
      max_days: 14,
    },
    { stage: "framing", stage_label: "Framing", min_days: 15, max_days: 20 },
  ];

  it("schedules stages sequentially with uncertainty ranges", () => {
    const s = scheduleTimeline("2026-10-26", stages, NG_2026);
    const foundation = s.stages[0];
    const framing = s.stages[1];
    expect(foundation.start_date).toBe("2026-10-26");
    // min path: 10 working days from Mon Oct 26 -> Fri Nov 6
    expect(foundation.earliest_end).toBe("2026-11-06");
    // max path: 14 working days -> Fri Nov 12
    expect(foundation.latest_end).toBe("2026-11-12");
    // framing starts after the latest foundation end
    expect(framing.start_date).toBe("2026-11-12");
    expect(s.latest_finish).toBe(framing.latest_end);
    expect(s.earliest_finish).toBe(framing.earliest_end);
    expect(s.earliest_finish <= s.latest_finish).toBe(true);
  });

  it("discloses excluded factors and calendar provenance", () => {
    const s = scheduleTimeline("2026-10-26", stages, NG_2026);
    const joined = s.disclosures.join(" ");
    expect(joined).toContain("verified NG 2026 calendar");
    expect(joined).toContain("partial completeness");
    expect(joined).toContain(SCHEDULE_EXCLUDED_FACTORS[0]);
    expect(joined).toContain("permits and approvals");
    // tentative holiday is disclosed honestly
    expect(joined).toContain("tentative pending official declaration");
  });

  it("keeps every stage start on or after the previous latest end", () => {
    const s = scheduleTimeline("2026-10-26", stages, NG_2026);
    for (let i = 1; i < s.stages.length; i++) {
      expect(s.stages[i].start_date >= s.stages[i - 1].latest_end).toBe(true);
    }
  });

  it("returns an empty but well-formed schedule for no stages", () => {
    const s = scheduleTimeline("2026-10-26", [], NG_2026);
    expect(s.stages).toEqual([]);
    expect(s.earliest_finish).toBe("2026-10-26");
    expect(s.latest_finish).toBe("2026-10-26");
  });
});
