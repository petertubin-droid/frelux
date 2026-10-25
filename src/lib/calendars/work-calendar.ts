// =========================================================
// FRELUX Phase 3: deterministic work-calendar engine
//
// Separate from planning heuristics: this module only answers
// "which days are working days" from sourced calendar data.
// Missing coverage is disclosed, never substituted with a
// neighbouring jurisdiction's calendar. The AI layer never
// writes here; all computation is deterministic.
// =========================================================

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type WorkCalendarCompleteness = "full" | "partial" | "unknown";

export interface NonWorkingDate {
  /** ISO calendar date, e.g. 2026-10-01 */
  date: string;
  name: string;
  /** Subject to official declaration (e.g. Eid dates pending moon sighting). */
  tentative?: boolean;
}

export interface WorkCalendar {
  id: string;
  country_code: string;
  subnational_scope: string | null;
  effective_year: number;
  timezone: string;
  /** ISO weekday numbers: 1 = Monday ... 7 = Sunday */
  workweek_days: number[];
  non_working_dates: NonWorkingDate[];
  completeness: WorkCalendarCompleteness;
  source: string;
  source_url: string | null;
  last_refreshed_at: string;
  version: number;
}

export type CalendarResolutionStatus = "available" | "missing" | "stale";

export interface CalendarResolution {
  status: CalendarResolutionStatus;
  /** Present only when status is available. */
  calendar: WorkCalendar | null;
  /** Honest, user-facing explanation when not available. */
  note: string;
}

/** A calendar is stale when it has not been refreshed for over 400 days. */
const STALE_AFTER_DAYS = 400;

export function isCalendarStale(calendar: WorkCalendar, now: Date): boolean {
  const refreshed = new Date(calendar.last_refreshed_at).getTime();
  if (Number.isNaN(refreshed)) return true;
  return now.getTime() - refreshed > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Resolve the verified calendar for a site jurisdiction.
 * Fail closed: no coverage means no calendar, with an honest
 * note. A neighbouring jurisdiction is never substituted.
 */
export async function resolveWorkCalendar(
  countryCode: string,
  effectiveYear: number,
  subnationalScope?: string | null,
): Promise<CalendarResolution> {
  if (!isSupabaseConfigured) {
    return {
      status: "missing",
      calendar: null,
      note: "Calendar data is unavailable right now.",
    };
  }
  let query = supabase
    .from("work_calendars")
    .select("*")
    .eq("country_code", countryCode.toUpperCase())
    .eq("effective_year", effectiveYear);
  query =
    subnationalScope == null
      ? query.is("subnational_scope", null)
      : query.eq("subnational_scope", subnationalScope);
  const { data, error } = await query
    .order("version", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) {
    return {
      status: "missing",
      calendar: null,
      note:
        "No verified work calendar exists for this location and year. " +
        "Durations are planning estimates only; local non-working days are not excluded.",
    };
  }
  const calendar = data[0] as WorkCalendar;
  if (isCalendarStale(calendar, new Date())) {
    return {
      status: "stale",
      calendar,
      note:
        `The ${calendar.country_code} ${calendar.effective_year} calendar has not ` +
        "been refreshed recently. Working-day counts may be out of date.",
    };
  }
  return { status: "available", calendar, note: "" };
}

/** ISO weekday of an ISO calendar date: 1 = Monday ... 7 = Sunday. */
export function isoWeekdayOf(dateISO: string): number {
  const d = new Date(`${dateISO}T00:00:00Z`);
  const jsDay = d.getUTCDay(); // 0 = Sunday
  return jsDay === 0 ? 7 : jsDay;
}

export function isValidISODate(dateISO: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return false;
  const d = new Date(`${dateISO}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateISO;
}

/**
 * A working day is a workweek day that is not a listed non-working
 * date. Tentative dates are excluded conservatively: they are
 * declared as non-working until proven otherwise.
 */
export function isWorkDay(dateISO: string, calendar: WorkCalendar): boolean {
  if (!isValidISODate(dateISO)) return false;
  const weekday = isoWeekdayOf(dateISO);
  if (!calendar.workweek_days.includes(weekday)) return false;
  return !calendar.non_working_dates.some((n) => n.date === dateISO);
}

export interface WorkingDaysResult {
  /** Working days in the inclusive [start, end] range. */
  days: string[];
  /** Working days excluded from the range because they are holidays. */
  holidayExclusions: NonWorkingDate[];
  /** Working days excluded because they fall outside the workweek. */
  weekendExclusions: string[];
}

/**
 * List working days in the inclusive range [start, end].
 * Deterministic; end-of-range is included. Invalid ranges fail
 * closed with an empty result.
 */
export function workingDaysBetween(
  startISO: string,
  endISO: string,
  calendar: WorkCalendar,
): WorkingDaysResult {
  const result: WorkingDaysResult = {
    days: [],
    holidayExclusions: [],
    weekendExclusions: [],
  };
  if (!isValidISODate(startISO) || !isValidISODate(endISO)) return result;
  if (startISO > endISO) return result;
  const cursor = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  const holidaysByDate = new Map(
    calendar.non_working_dates.map((n) => [n.date, n]),
  );
  while (cursor.getTime() <= end.getTime()) {
    const iso = cursor.toISOString().slice(0, 10);
    const weekday = isoWeekdayOf(iso);
    if (!calendar.workweek_days.includes(weekday)) {
      result.weekendExclusions.push(iso);
    } else if (holidaysByDate.has(iso)) {
      const h = holidaysByDate.get(iso);
      if (h) result.holidayExclusions.push(h);
    } else {
      result.days.push(iso);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

/**
 * Today in the calendar's own timezone, as an ISO date. Honors
 * DST via the IANA zone rather than the browser's location.
 */
export function todayInZone(timezone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts;
}
