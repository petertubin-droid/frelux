/**
 * Saved takeoffs.
 *
 * A takeoff set is the measured schedule plus the bill it produced. The schedule
 * is stored as jsonb because its shape belongs to the engine; the project id
 * stays relational so ownership is enforced by row level security rather than by
 * the client.
 */

import { supabase } from "@/lib/supabase";
import type { TakeoffResult, TakeoffScope } from "./types";
import type { TakeoffSpecs } from "./engine";
import type { ScheduleInput } from "./types";

export interface DbProjectTakeoff {
  id: string;
  project_id: string;
  name: string;
  schedule: ScheduleInput;
  scopes: TakeoffScope[];
  specs: TakeoffSpecs;
  result: TakeoffResult;
  totals: { unit: string; quantity: number }[];
  assumed_line_count: number;
  warnings: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface SaveTakeoffInput {
  id?: string;
  projectId: string;
  name: string;
  schedule: ScheduleInput;
  scopes: TakeoffScope[];
  specs: TakeoffSpecs;
  result: TakeoffResult;
  /** ISO date of the last measurement, shown in the saved list. */
  measuredAt?: string;
}

export async function fetchProjectTakeoffs(
  projectId: string,
): Promise<DbProjectTakeoff[]> {
  const { data, error } = await supabase
    .from("project_takeoffs")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to load takeoffs: ${error.message}`);
  }
  return (data ?? []) as unknown as DbProjectTakeoff[];
}

const payloadFor = (input: SaveTakeoffInput) => ({
  project_id: input.projectId,
  name: input.name.trim(),
  schedule: input.schedule as unknown as Record<string, unknown>,
  scopes: input.scopes,
  specs: input.specs as unknown as Record<string, unknown>,
  result: input.result as unknown as Record<string, unknown>,
  totals: input.result.totals,
  assumed_line_count: input.result.assumedLineCount,
  warnings: input.result.warnings,
});

export async function saveProjectTakeoff(
  input: SaveTakeoffInput,
): Promise<DbProjectTakeoff> {
  const name = input.name.trim();
  if (!name) throw new Error("Give the takeoff a name before saving.");
  if (!input.schedule.rooms?.length) {
    throw new Error("Add at least one room before saving a takeoff.");
  }

  const payload = payloadFor(input);
  const query = input.id
    ? supabase.from("project_takeoffs").update(payload).eq("id", input.id)
    : supabase.from("project_takeoffs").insert(payload);

  const { data, error } = await query.select().single();
  if (error) {
    throw new Error(`Failed to save the takeoff: ${error.message}`);
  }
  return data as unknown as DbProjectTakeoff;
}

export async function deleteProjectTakeoff(id: string): Promise<void> {
  const { error } = await supabase
    .from("project_takeoffs")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`Failed to delete the takeoff: ${error.message}`);
}

/**
 * Rebuilds a schedule from a saved row without trusting the stored bill. The
 * stored result is a snapshot; the schedule is the source of truth, so a
 * reopened takeoff is re-measured by the current engine.
 */
export function scheduleFromSaved(row: DbProjectTakeoff): ScheduleInput {
  return row.schedule;
}
