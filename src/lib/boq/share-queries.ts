/**
 * Persistence for shared quotations.
 *
 * The table is owner-only. Recipients never read it directly: they call the
 * `get_boq_quote_share` lookup, which returns one snapshot by id while the share
 * is live and counts the view.
 */

import { supabase } from "@/lib/supabase";
import type { QuoteShareSnapshot } from "./share";

export interface QuoteShareRow {
  id: string;
  document_id: string | null;
  mode: "priced" | "market_survey";
  reference: string;
  title: string;
  currency: string;
  is_active: boolean;
  expires_at: string | null;
  view_count: number;
  created_at: string;
}

export async function createQuoteShare(input: {
  documentId: string | null;
  snapshot: QuoteShareSnapshot;
  expiresAt?: string | null;
}): Promise<{ token: string | null; error: string | null }> {
  const { documentId, snapshot, expiresAt } = input;
  const { data, error } = await supabase
    .from("boq_quote_shares")
    .insert({
      document_id: documentId,
      mode: snapshot.mode,
      reference: snapshot.document.reference,
      title: snapshot.document.title,
      currency: snapshot.document.currency,
      snapshot,
      expires_at: expiresAt ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) return { token: null, error: error.message };
  return { token: (data?.id as string) ?? null, error: null };
}

/** Public read: no session required, one snapshot, expiry and revocation honoured. */
export async function fetchQuoteShare(
  token: string,
): Promise<{ snapshot: QuoteShareSnapshot | null; error: string | null }> {
  const { data, error } = await supabase.rpc("get_boq_quote_share", {
    p_token: token,
  });
  if (error) return { snapshot: null, error: error.message };
  if (!data) return { snapshot: null, error: null };
  return { snapshot: data as QuoteShareSnapshot, error: null };
}

export async function revokeQuoteShare(
  token: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("boq_quote_shares")
    .update({ is_active: false })
    .eq("id", token);
  return { error: error ? error.message : null };
}

export async function listQuoteShares(
  documentId: string,
): Promise<{ shares: QuoteShareRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("boq_quote_shares")
    .select(
      "id, document_id, mode, reference, title, currency, is_active, expires_at, view_count, created_at",
    )
    .eq("document_id", documentId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return { shares: [], error: error.message };
  return { shares: (data ?? []) as QuoteShareRow[], error: null };
}
