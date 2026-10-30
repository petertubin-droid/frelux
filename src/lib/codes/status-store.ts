/**
 * Administrative overlay for the code registry.
 *
 * The library in ./library.ts is the immutable, git-audited denominator.
 * This store holds the things an administrator legitimately changes over
 * time without editing code: whether a reference is verified, under
 * review or withdrawn, who reviewed it, and when.
 *
 * Reads degrade safely: with no database (static/disconnected mode) the
 * overlay is empty and every entry keeps its library status — never a
 * guessed status.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { StatusOverlay } from "./resolver";

export interface StatusRow {
  entry_key: string;
  family_id: string;
  domain: string;
  document: string;
  status: "verified" | "under-review" | "unsupported";
  note: string | null;
  reviewer: string | null;
  updated_at: string;
}

export interface HistoryRow {
  id: string;
  entry_key: string;
  status: string;
  note: string | null;
  reviewer: string | null;
  created_at: string;
}

export interface StatusLoadResult {
  overlay: StatusOverlay;
  rows: StatusRow[];
  error: string | null;
}

export async function fetchStatusOverlay(): Promise<StatusLoadResult> {
  if (!isSupabaseConfigured) {
    return { overlay: {}, rows: [], error: null };
  }
  try {
    const { data, error } = await supabase
      .from("code_registry_status")
      .select(
        "entry_key, family_id, domain, document, status, note, reviewer, updated_at",
      );
    if (error) return { overlay: {}, rows: [], error: error.message };
    const rows = (data ?? []) as StatusRow[];
    const overlay: StatusOverlay = {};
    for (const row of rows) {
      overlay[row.entry_key] = {
        status: row.status,
        note: row.note ?? undefined,
        reviewer: row.reviewer,
      };
    }
    return { overlay, rows, error: null };
  } catch (error) {
    return {
      overlay: {},
      rows: [],
      error:
        error instanceof Error
          ? error.message
          : "Could not load registry status.",
    };
  }
}

export interface SaveStatusInput {
  entryKey: string;
  familyId: string;
  domain: string;
  document: string;
  status: "verified" | "under-review" | "unsupported";
  note: string;
  reviewer: string;
}

export async function saveStatusChange(
  input: SaveStatusInput,
): Promise<{ ok: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      error: "No database connection: changes cannot be saved.",
    };
  }
  try {
    // Current row first, so the history entry records the real transition.
    const { data: existing } = await supabase
      .from("code_registry_status")
      .select("status")
      .eq("entry_key", input.entryKey)
      .maybeSingle();
    const previous =
      (existing as { status?: string } | null)?.status ?? "library-default";

    const { error: upsertError } = await supabase
      .from("code_registry_status")
      .upsert(
        {
          entry_key: input.entryKey,
          family_id: input.familyId,
          domain: input.domain,
          document: input.document,
          status: input.status,
          note: input.note || null,
          reviewer: input.reviewer || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "entry_key" },
      );
    if (upsertError) return { ok: false, error: upsertError.message };

    const { error: historyError } = await supabase
      .from("code_registry_history")
      .insert({
        entry_key: input.entryKey,
        status: input.status,
        note: `Changed from ${previous}. ${input.note}`.trim(),
        reviewer: input.reviewer || null,
      });
    if (historyError) {
      // The status is saved; the audit trail failed. Say so explicitly.
      return {
        ok: false,
        error:
          "Status saved, but the audit-history entry could not be written. Check the history table policy before relying on the record.",
      };
    }
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not save the change.",
    };
  }
}

export async function fetchStatusHistory(
  limit = 50,
): Promise<{ rows: HistoryRow[]; error: string | null }> {
  if (!isSupabaseConfigured) return { rows: [], error: null };
  try {
    const { data, error } = await supabase
      .from("code_registry_history")
      .select("id, entry_key, status, note, reviewer, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []) as HistoryRow[], error: null };
  } catch (error) {
    return {
      rows: [],
      error: error instanceof Error ? error.message : "Could not load history.",
    };
  }
}
