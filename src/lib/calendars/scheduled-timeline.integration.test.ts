// ============================================================
// Integration: heuristic estimator + verified site calendar.
// The heuristic result must remain untouched; the calendar
// layer only adds dated scheduling.
// ============================================================

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkCalendar } from "./work-calendar";

const NG_2026: WorkCalendar = {
  id: "c1",
  country_code: "NG",
  subnational_scope: null,
  effective_year: 2026,
  timezone: "Africa/Lagos",
  workweek_days: [1, 2, 3, 4, 5],
  non_working_dates: [{ date: "2026-10-01", name: "Independence Day" }],
  completeness: "partial",
  source: "qppstudio.net",
  source_url: null,
  last_refreshed_at: "2026-10-25T00:00:00Z",
  version: 1,
};

function mockSupabase(calendar: WorkCalendar | null) {
  vi.doMock("@/lib/supabase", () => ({
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                order: () => ({
                  limit: () => ({
                    data: calendar ? [calendar] : [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    },
    isSupabaseConfigured: true,
  }));
}

const INPUT = {
  building_type: "bungalow",
  building_length: 10,
  building_width: 10,
  number_of_floors: 1,
  complexity: "standard",
  workforce: "medium",
  season: "dry",
  foundation_type: "strip",
  roof_type: "gable",
  has_engineer_schedule: false,
} as const;

describe("estimateTimelineWithCalendar", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("adds dated scheduling on top of an unchanged heuristic estimate", async () => {
    mockSupabase(NG_2026);
    const { estimateTimelineWithCalendar } =
      await import("./scheduled-timeline");
    const { estimateTimeline } =
      await import("@/lib/engineering/timeline-estimator");
    const result = await estimateTimelineWithCalendar(INPUT, {
      countryCode: "NG",
      startDateISO: "2026-10-26",
    });
    expect(result.note).toBe("");
    expect(result.scheduled).not.toBeNull();
    expect(result.scheduled?.start_date).toBe("2026-10-26");
    expect(result.scheduled?.stages.length).toBe(
      result.heuristic.stages.length,
    );
    // heuristic result identical to a direct call
    expect(result.heuristic.total_days).toBe(
      estimateTimeline({ ...INPUT }).total_days,
    );
  });

  it("keeps the heuristic labeled as a planning estimate without a calendar", async () => {
    mockSupabase(null);
    const { estimateTimelineWithCalendar } =
      await import("./scheduled-timeline");
    const result = await estimateTimelineWithCalendar(INPUT, {
      countryCode: "ZZ",
      startDateISO: "2026-10-26",
    });
    expect(result.scheduled).toBeNull();
    expect(result.note).toContain("No verified work calendar");
    expect(result.note).toContain("planning estimates");
    expect(result.heuristic.stages.length).toBeGreaterThan(0);
  });

  it("rejects an invalid start date fail-closed", async () => {
    mockSupabase(NG_2026);
    const { estimateTimelineWithCalendar } =
      await import("./scheduled-timeline");
    const result = await estimateTimelineWithCalendar(INPUT, {
      countryCode: "NG",
      startDateISO: "soon",
    });
    expect(result.scheduled).toBeNull();
    expect(result.note).toContain("valid site start date");
  });
});
