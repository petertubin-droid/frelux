/**
 * Pillar 3: 4D schedule linking for the IFC viewer.
 *
 * Engine-1A #1 (BIM/CAD) milestone: bind model elements (GlobalIds) to
 * project schedule activities so the viewer can show what is "active" on
 * a given date.
 *
 * Scope discipline:
 *  - Pure date-interval membership. No critical-path calculation, no
 *    resource levelling, no earned-value claims.
 *  - Unknown GlobalIds are REPORTED, never silently dropped; duplicate
 *    activity ids and invalid date ranges are refused.
 *  - Dates are plain ISO dates (YYYY-MM-DD); intervals are inclusive of
 *    both start and end.
 */

import type { IfcModelRevision } from "./model-revisions";

export interface ScheduleActivity {
  id: string;
  name: string;
  /** ISO date YYYY-MM-DD, inclusive */
  start_date: string;
  /** ISO date YYYY-MM-DD, inclusive */
  end_date: string;
  element_global_ids: string[];
}

export interface ScheduleLink {
  ok: true;
  /** GlobalId -> activity ids that reference it */
  element_activities: Map<string, string[]>;
  /** model GlobalIds no activity references */
  unassigned_global_ids: string[];
  /** activities that reference no known element */
  empty_activities: string[];
  /** activity GlobalIds not present in the model index */
  unknown_global_ids: string[];
  /** activities ordered by start_date, then id */
  ordered: ScheduleActivity[];
}

export interface ScheduleLinkError {
  ok: false;
  errors: string[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const t = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === value;
}

export function buildScheduleLink(
  activities: readonly ScheduleActivity[],
  revision: Pick<IfcModelRevision, "element_index">,
): ScheduleLink | ScheduleLinkError {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const activity of activities) {
    if (seen.has(activity.id)) errors.push(`Duplicate activity id ${activity.id}.`);
    seen.add(activity.id);
    if (!validDate(activity.start_date)) {
      errors.push(`Activity ${activity.id} has invalid start_date "${activity.start_date}".`);
    }
    if (!validDate(activity.end_date)) {
      errors.push(`Activity ${activity.id} has invalid end_date "${activity.end_date}".`);
    }
    if (
      validDate(activity.start_date) &&
      validDate(activity.end_date) &&
      activity.end_date < activity.start_date
    ) {
      errors.push(`Activity ${activity.id} ends before it starts.`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  const elementActivities = new Map<string, string[]>();
  const emptyActivities: string[] = [];
  const unknown = new Set<string>();

  for (const activity of activities) {
    if (activity.element_global_ids.length === 0) emptyActivities.push(activity.id);
    for (const globalId of activity.element_global_ids) {
      if (!revision.element_index[globalId]) {
        unknown.add(globalId);
        continue;
      }
      const list = elementActivities.get(globalId) ?? [];
      list.push(activity.id);
      elementActivities.set(globalId, list);
    }
  }

  const unassigned = Object.keys(revision.element_index).filter(
    (globalId) => !elementActivities.has(globalId),
  );

  return {
    ok: true,
    element_activities: elementActivities,
    unassigned_global_ids: unassigned.sort(),
    empty_activities: emptyActivities,
    unknown_global_ids: [...unknown].sort(),
    ordered: [...activities].sort((a, b) =>
      a.start_date === b.start_date
        ? a.id.localeCompare(b.id)
        : a.start_date.localeCompare(b.start_date),
    ),
  };
}

/**
 * GlobalIds whose activity interval contains the date (inclusive).
 * Returns an empty set for a date no activity covers — never a guess.
 */
export function elementsActiveOn(
  link: ScheduleLink,
  date: string,
): Set<string> {
  const active = new Set<string>();
  if (!validDate(date)) return active;
  for (const activity of link.ordered) {
    if (date < activity.start_date || date > activity.end_date) continue;
    for (const globalId of activity.element_global_ids) {
      if (link.element_activities.has(globalId)) active.add(globalId);
    }
  }
  return active;
}
