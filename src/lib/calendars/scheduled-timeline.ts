// =========================================================
// FRELUX Phase 3: calendar-aware project timeline scheduling
//
// The heuristic estimator (engineering/timeline-estimator)
// remains the source of estimated work durations. This layer
// converts those durations into dates on the site's verified
// calendar. Uncertainty ranges (min/max days) are retained as
// earliest and latest dates; excluded factors are disclosed,
// never hidden. No calendar, no scheduled dates: the heuristic
// estimate stays labeled as a planning estimate.
// =========================================================

import { isWorkDay, type WorkCalendar } from "./work-calendar";
import type { StageDuration } from "@/lib/engineering/timeline-estimator";

export const SCHEDULE_EXCLUDED_FACTORS = [
  "weather disruptions",
  "material logistics delays",
  "permits and approvals",
  "site access conditions",
  "labour availability",
] as const;

export interface ScheduledStage {
  stage: string;
  stage_label: string;
  /** Heuristic duration inputs, unchanged. */
  min_days: number;
  max_days: number;
  start_date: string;
  earliest_end: string;
  latest_end: string;
  /** Non-working dates skipped while this stage runs. */
  skipped_dates: { date: string; name: string; tentative: boolean }[];
}

export interface ScheduledTimeline {
  start_date: string;
  earliest_finish: string;
  latest_finish: string;
  stages: ScheduledStage[];
  calendar: {
    country_code: string;
    effective_year: number;
    completeness: string;
    source: string;
  };
  /** Honest disclosure: what the schedule does not account for. */
  disclosures: string[];
}

/**
 * Advance `count` working days from a start date on the
 * verified calendar. The start date itself must be a working
 * day; if it is not, the first working day after it becomes
 * the effective start. Deterministic and pure.
 */
export function addWorkDays(
  startISO: string,
  count: number,
  calendar: WorkCalendar,
): {
  date: string;
  skipped: { date: string; name: string; tentative: boolean }[];
} {
  const skipped: { date: string; name: string; tentative: boolean }[] = [];
  const holidayByDate = new Map(
    calendar.non_working_dates.map((n) => [n.date, n]),
  );
  let cursor = new Date(`${startISO}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime())) {
    return { date: "", skipped: [] };
  }
  // Find the effective start if the given start is a non-working day.
  const iso = () => cursor.toISOString().slice(0, 10);
  while (!isWorkDay(iso(), calendar)) {
    const h = holidayByDate.get(iso());
    if (h)
      skipped.push({
        date: h.date,
        name: h.name,
        tentative: Boolean(h.tentative),
      });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  let remaining = Math.max(0, Math.ceil(count));
  // The effective start counts as the first working day.
  if (remaining > 0) remaining -= 1;
  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (!isWorkDay(iso(), calendar)) {
      const h = holidayByDate.get(iso());
      if (h)
        skipped.push({
          date: h.date,
          name: h.name,
          tentative: Boolean(h.tentative),
        });
      continue;
    }
    remaining -= 1;
  }
  return { date: iso(), skipped };
}

/**
 * Convert heuristic stage durations into a dated schedule on
 * the site's verified calendar. Stages run sequentially, as in
 * the estimator. Uncertainty is preserved: each stage gets an
 * earliest and latest end date.
 */
export function scheduleTimeline(
  startISO: string,
  stages: Pick<
    StageDuration,
    "stage" | "stage_label" | "min_days" | "max_days"
  >[],
  calendar: WorkCalendar,
): ScheduledTimeline {
  const disclosures: string[] = [
    `Working days follow the verified ${calendar.country_code} ${calendar.effective_year} calendar (${calendar.completeness} completeness, source: ${calendar.source}).`,
    "The schedule excludes " + SCHEDULE_EXCLUDED_FACTORS.join(", ") + ".",
  ];
  const tentative = calendar.non_working_dates.filter((n) => n.tentative);
  if (tentative.length > 0) {
    disclosures.push(
      `${tentative.length} non-working date${tentative.length === 1 ? "" : "s"} in this calendar ${tentative.length === 1 ? "is" : "are"} still tentative pending official declaration.`,
    );
  }

  let cursor = startISO;
  const scheduled: ScheduledStage[] = [];
  for (const stage of stages) {
    const earliest = addWorkDays(cursor, stage.min_days, calendar);
    const latest = addWorkDays(cursor, stage.max_days, calendar);
    scheduled.push({
      stage: stage.stage,
      stage_label: stage.stage_label,
      min_days: stage.min_days,
      max_days: stage.max_days,
      start_date: cursor,
      earliest_end: earliest.date,
      latest_end: latest.date,
      skipped_dates: earliest.skipped,
    });
    cursor = latest.date;
  }

  const last = scheduled[scheduled.length - 1];
  return {
    start_date: startISO,
    earliest_finish: last ? last.earliest_end : startISO,
    latest_finish: last ? last.latest_end : startISO,
    stages: scheduled,
    calendar: {
      country_code: calendar.country_code,
      effective_year: calendar.effective_year,
      completeness: calendar.completeness,
      source: calendar.source,
    },
    disclosures,
  };
}

// =========================================================
// Integration: heuristic durations + site calendar.
// =========================================================

import {
  estimateTimeline,
  type TimelineInput,
  type TimelineResult,
} from "@/lib/engineering/timeline-estimator";
import { resolveWorkCalendar } from "./work-calendar";

export interface TimelinedWithCalendar {
  /** The unchanged heuristic estimate. */
  heuristic: TimelineResult;
  /** Dated schedule on the verified calendar, when one exists. */
  scheduled: ScheduledTimeline | null;
  /** Honest note when no verified calendar covers the site. */
  note: string;
}

/**
 * Estimate the timeline heuristically, then schedule it on the
 * site's verified calendar. The heuristic estimate is never
 * replaced: without a calendar the result stays a planning
 * estimate, labeled as such.
 */
export async function estimateTimelineWithCalendar(
  input: TimelineInput,
  site: {
    countryCode: string;
    startDateISO: string;
    subnationalScope?: string | null;
  },
): Promise<TimelinedWithCalendar> {
  const heuristic = estimateTimeline(input);
  const year = Number(site.startDateISO.slice(0, 4));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(site.startDateISO) || Number.isNaN(year)) {
    return {
      heuristic,
      scheduled: null,
      note: "A valid site start date is required before scheduling on a calendar.",
    };
  }
  const resolution = await resolveWorkCalendar(
    site.countryCode,
    year,
    site.subnationalScope ?? null,
  );
  if (resolution.status !== "available" || !resolution.calendar) {
    return {
      heuristic,
      scheduled: null,
      note:
        resolution.status === "stale"
          ? resolution.note
          : "No verified work calendar covers this location and year. " +
            "Durations below are planning estimates and do not exclude local non-working days.",
    };
  }
  const scheduled = scheduleTimeline(
    site.startDateISO,
    heuristic.stages.map((s) => ({
      stage: s.stage,
      stage_label: s.stage_label,
      min_days: s.min_days,
      max_days: s.max_days,
    })),
    resolution.calendar,
  );
  return { heuristic, scheduled, note: "" };
}
