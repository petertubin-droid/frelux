// =========================================================
// FRELUX ARCHIE MIGRATION — HISTORY (spec §23)
//
// Every migration operation writes an audit record to
// archie_migration_history: who authorized, what package,
// source/destination environments, verification result,
// components restored/excluded, errors, final status.
//
// The table is owner-only (RLS, FORCE) — like the evolution
// audit trail it is evidence, not configuration.
// =========================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MigrationHistoryRecord, MigrationMode, MigrationStatus } from "./types";

export interface RecordMigrationInput {
  supabase: SupabaseClient;
  packageId: string;
  mode: MigrationMode | "RESTORE";
  status: MigrationStatus;
  sourceEnvironment: string;
  destinationEnvironment: string;
  archieVersion: string;
  ownerAuthorized: boolean;
  packageVerified: boolean | null;
  restoreResult?: string | null;
  componentsRestored?: string[];
  componentsExcluded?: string[];
  errors?: string[];
}

/** Append one audit record. Returns the created record id. */
export async function recordMigration(
  input: RecordMigrationInput,
): Promise<string> {
  const { supabase } = input;
  const { data, error } = await supabase
    .from("archie_migration_history")
    .insert({
      package_id: input.packageId,
      mode: input.mode,
      status: input.status,
      source_environment: input.sourceEnvironment,
      destination_environment: input.destinationEnvironment,
      archie_version: input.archieVersion,
      owner_authorized: input.ownerAuthorized,
      package_verified: input.packageVerified,
      restore_result: input.restoreResult ?? null,
      components_restored: input.componentsRestored ?? [],
      components_excluded: input.componentsExcluded ?? [],
      errors: input.errors ?? [],
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(
      `Could not record migration history: ${error?.message ?? "unknown error"}`,
    );
  }
  return (data as { id: string }).id;
}

/** Read the owner's migration history, newest first. */
export async function fetchMigrationHistory(
  supabase: SupabaseClient,
  limit = 50,
): Promise<MigrationHistoryRecord[]> {
  const { data, error } = await supabase
    .from("archie_migration_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToRecord);
}

export function rowToRecord(row: Record<string, unknown>): MigrationHistoryRecord {
  return {
    id: row.id as string,
    packageId: row.package_id as string,
    mode: row.mode as MigrationHistoryRecord["mode"],
    status: row.status as MigrationStatus,
    sourceEnvironment: row.source_environment as string,
    destinationEnvironment: row.destination_environment as string,
    archieVersion: row.archie_version as string,
    ownerAuthorized: row.owner_authorized as boolean,
    createdAt: (row.created_at ?? row.created_date ?? new Date().toISOString()) as string,
    packageVerified: row.package_verified as boolean | null,
    restoreResult: row.restore_result as string | null,
    componentsRestored: (row.components_restored as string[]) ?? [],
    componentsExcluded: (row.components_excluded as string[]) ?? [],
    errors: (row.errors as string[]) ?? [],
  };
}
