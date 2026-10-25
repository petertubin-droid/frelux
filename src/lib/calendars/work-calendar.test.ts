// ============================================================
// Phase 3 work-calendar engine: deterministic coverage tests.
// No provider is contacted; the calendar data is a fixture.
// ============================================================

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isCalendarStale,
  isWorkDay,
  isValidISODate,
  isoWeekdayOf,
  resolveWorkCalendar,
  todayInZone,
  workingDaysBetween,
  type WorkCalendar,
} from "./work-calendar";

const NG_2026: WorkCalendar = {
  id: "c1",
  country_code: "NG",
  subnational_scope: null,
  effective_year: 2026,
  timezone: "Africa/Lagos",
  workweek_days: [1, 2, 3, 4, 5],
  non_working_dates: [
    { date: "2026-10-01", name: "Independence Day" },
    { date: "2026-12-25", name: "Christmas Day", tentative: false },
    { date: "2026-03-09", name: "Id el Fitri", tentative: true },
  ],
  completeness: "partial",
  source: "qppstudio.net",
  source_url: "https://www.qppstudio.net/public-holidays/nigeria.htm",
  last_refreshed_at: "2026-10-25T00:00:00Z",
  version: 1,
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe("isoWeekdayOf and date validation", () => {
  it("maps ISO weekdays with Monday = 1", () => {
    expect(isoWeekdayOf("2026-10-26")).toBe(1); // Monday
    expect(isoWeekdayOf("2026-10-25")).toBe(7); // Sunday
  });

  it("accepts 2028-02-29 (leap year) and rejects invalid dates", () => {
    expect(isValidISODate("2028-02-29")).toBe(true);
    expect(isValidISODate("2026-02-29")).toBe(false);
    expect(isValidISODate("2026-13-01")).toBe(false);
    expect(isValidISODate("not-a-date")).toBe(false);
  });
});

describe("isWorkDay", () => {
  it("excludes weekends for a Monday to Friday workweek", () => {
    expect(isWorkDay("2026-10-26", NG_2026)).toBe(true); // Monday
    expect(isWorkDay("2026-10-31", NG_2026)).toBe(false); // Saturday
    expect(isWorkDay("2026-11-01", NG_2026)).toBe(false); // Sunday
  });

  it("honors a Sunday to Thursday workweek (fixture market)", () => {
    const middleEast: WorkCalendar = {
      ...NG_2026,
      workweek_days: [7, 1, 2, 3, 4],
      non_working_dates: [],
    };
    expect(isWorkDay("2026-10-25", middleEast)).toBe(true); // Sunday
    expect(isWorkDay("2026-10-30", middleEast)).toBe(false); // Friday
  });

  it("excludes holidays, including tentative ones, conservatively", () => {
    expect(isWorkDay("2026-10-01", NG_2026)).toBe(false);
    expect(isWorkDay("2026-03-09", NG_2026)).toBe(false); // tentative Eid
    expect(isWorkDay("2026-12-25", NG_2026)).toBe(false);
  });

  it("rejects invalid dates fail-closed", () => {
    expect(isWorkDay("2026-02-30", NG_2026)).toBe(false);
  });
});

describe("workingDaysBetween", () => {
  it("counts inclusive of the end date and excludes weekends and holidays", () => {
    // Sep 28 (Mon) to Oct 2 (Fri) 2026: Oct 1 is Independence Day
    const r = workingDaysBetween("2026-09-28", "2026-10-02", NG_2026);
    expect(r.days).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-02",
    ]);
    expect(r.holidayExclusions.map((h) => h.name)).toEqual([
      "Independence Day",
    ]);
    expect(r.weekendExclusions).toEqual([]); // none inside the range
  });

  it("reports weekend exclusions inside the range", () => {
    const r = workingDaysBetween("2026-10-23", "2026-10-27", NG_2026);
    expect(r.days).toEqual(["2026-10-23", "2026-10-26", "2026-10-27"]);
    expect(r.weekendExclusions).toEqual(["2026-10-24", "2026-10-25"]);
  });

  it("handles leap-year February across a weekend", () => {
    // 2028-02-25 (Fri) to 2028-03-01 (Wed); Feb 29 is a Tuesday
    const r = workingDaysBetween("2028-02-25", "2028-03-01", NG_2026);
    expect(r.days).toEqual([
      "2028-02-25",
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
    ]);
  });

  it("fails closed on an inverted or invalid range", () => {
    expect(
      workingDaysBetween("2026-10-05", "2026-10-01", NG_2026).days,
    ).toEqual([]);
    expect(workingDaysBetween("2026-10-05", "nonsense", NG_2026).days).toEqual(
      [],
    );
  });

  it("returns a single day when start equals end", () => {
    const r = workingDaysBetween("2026-10-26", "2026-10-26", NG_2026);
    expect(r.days).toEqual(["2026-10-26"]);
  });
});

describe("todayInZone", () => {
  it("returns the local date inside the calendar timezone", () => {
    // 2026-10-25 23:30 UTC is already Oct 26 in Lagos (UTC+1)
    expect(todayInZone("Africa/Lagos", new Date("2026-10-25T23:30:00Z"))).toBe(
      "2026-10-26",
    );
    // ...still Oct 25 in New York
    expect(
      todayInZone("America/New_York", new Date("2026-10-25T23:30:00Z")),
    ).toBe("2026-10-25");
  });

  it("honors DST via the IANA zone", () => {
    // 2026-07-01 22:30 UTC: London is BST (UTC+1), New York EDT (UTC-4)
    expect(todayInZone("Europe/London", new Date("2026-07-01T22:30:00Z"))).toBe(
      "2026-07-01",
    );
    expect(todayInZone("Europe/London", new Date("2026-07-01T23:30:00Z"))).toBe(
      "2026-07-02",
    );
  });
});

describe("isCalendarStale", () => {
  it("flags calendars not refreshed within 400 days", () => {
    const now = new Date("2026-10-25T00:00:00Z");
    const fresh = {
      ...NG_2026,
      last_refreshed_at: new Date(
        now.getTime() - 399 * ONE_DAY_MS,
      ).toISOString(),
    };
    const stale = {
      ...NG_2026,
      last_refreshed_at: new Date(
        now.getTime() - 401 * ONE_DAY_MS,
      ).toISOString(),
    };
    expect(isCalendarStale(fresh, now)).toBe(false);
    expect(isCalendarStale(stale, now)).toBe(true);
  });
});

describe("resolveWorkCalendar", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns missing with an honest note when no calendar exists", async () => {
    vi.doMock("@/lib/supabase", () => ({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  order: () => ({ limit: () => ({ data: [], error: null }) }),
                }),
                order: () => ({ limit: () => ({ data: [], error: null }) }),
              }),
            }),
          }),
        }),
      },
      isSupabaseConfigured: true,
    }));
    const { resolveWorkCalendar: resolve } = await import("./work-calendar");
    const r = await resolve("ZZ", 2026);
    expect(r.status).toBe("missing");
    expect(r.calendar).toBeNull();
    expect(r.note).toContain("No verified work calendar");
  });
});
