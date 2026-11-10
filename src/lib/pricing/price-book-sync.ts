/**
 * Account side of the price book.
 *
 * The browser copy stays authoritative for rendering, because a calculator must
 * keep working with no network and no session. This module only moves entries
 * between that copy and the signed-in account, and it reports failure instead of
 * pretending: a caller that cannot reach the account keeps the browser copy and
 * says so.
 */
import { isSupabaseConfigured } from "@/lib/supabase";
import { getSupabase } from "@/lib/supabase-lazy";
import {
  EMPTY_PRICE_BOOK,
  makePriceBookEntry,
  type PriceBook,
  type PriceBookEntry,
} from "./price-book";

export type SyncOutcome =
  | { status: "unconfigured"; entries: PriceBookEntry[] }
  | { status: "signed-out"; entries: PriceBookEntry[] }
  | { status: "ok"; entries: PriceBookEntry[] }
  | { status: "failed"; entries: PriceBookEntry[]; reason: string };

export type WriteOutcome = { ok: true } | { ok: false; reason: string };

const TABLE = "price_book_entries";

interface RemoteRow {
  slug: string;
  rate: number | string;
  currency: string;
  unit: string | null;
  note: string | null;
  updated_at: string;
}

function rowsToBook(rows: RemoteRow[]): PriceBook {
  const entries: PriceBookEntry[] = [];
  for (const row of rows) {
    const made = makePriceBookEntry({
      slug: row.slug,
      rate: row.rate,
      currency: row.currency,
      unit: row.unit ?? undefined,
      note: row.note ?? undefined,
    });
    // A row that cannot be made into a valid entry is skipped, exactly as an
    // invalid browser entry is: a broken row is not a price.
    if ("entry" in made) {
      // Keep the edit instant the account holds, so a merge between two devices
      // compares the moment of the edit rather than the moment of the download.
      const at = Date.parse(row.updated_at);
      entries.push({
        ...made.entry,
        updatedAt: Number.isFinite(at)
          ? new Date(at).toISOString()
          : made.entry.updatedAt,
      });
    }
  }
  return { version: 1, entries };
}

export async function currentAccountId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function fetchAccountBook(): Promise<SyncOutcome> {
  if (!isSupabaseConfigured) return { status: "unconfigured", entries: [] };
  const userId = await currentAccountId();
  if (!userId) return { status: "signed-out", entries: [] };

  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .select("slug, rate, currency, unit, note, updated_at")
      .order("slug", { ascending: true });
    if (error) return { status: "failed", entries: [], reason: error.message };
    return { status: "ok", entries: rowsToBook((data ?? []) as RemoteRow[]).entries };
  } catch (error) {
    return {
      status: "failed",
      entries: [],
      reason: error instanceof Error ? error.message : "The account could not be reached.",
    };
  }
}

export async function saveAccountEntry(entry: PriceBookEntry): Promise<WriteOutcome> {
  const userId = await currentAccountId();
  if (!userId) return { ok: false, reason: "not signed in" };
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.from(TABLE).upsert(
      {
        user_id: userId,
        slug: entry.slug,
        rate: entry.rate,
        currency: entry.currency,
        unit: entry.unit ?? null,
        note: entry.note ?? null,
        updated_at: entry.updatedAt,
      },
      { onConflict: "user_id,slug" },
    );
    return error ? { ok: false, reason: error.message } : { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "The rate was not sent.",
    };
  }
}

export async function deleteAccountEntry(slug: string): Promise<WriteOutcome> {
  const userId = await currentAccountId();
  if (!userId) return { ok: false, reason: "not signed in" };
  try {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("slug", slug);
    return error ? { ok: false, reason: error.message } : { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "The rate was not deleted.",
    };
  }
}

export const EMPTY_SYNC_BOOK = EMPTY_PRICE_BOOK;
