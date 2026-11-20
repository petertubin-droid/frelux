/**
 * Marketplace inquiry threads.
 *
 * An inquiry used to be one-way: the buyer wrote once and the seller could only
 * change a status, so a question had no answer and a buyer who returned to the
 * product saw nothing new. These helpers read and write the reply thread that
 * hangs off the inquiry the buyer already created, so the product, the buyer
 * and the seller stay in one record.
 *
 * Access is decided by the database (marketplace_inquiry_messages policies:
 * the buyer on the inquiry, or the seller who owns the product). Nothing here
 * re-implements that check; a caller who is not a participant simply gets an
 * empty thread and a rejected send.
 */

import { supabase } from "@/lib/supabase";

export interface InquiryThreadMessage {
  id: string;
  inquiry_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export const INQUIRY_MESSAGE_MAX = 4000;

/** Newest last, so the thread reads top to bottom like a conversation. */
export async function getInquiryMessages(
  inquiryId: string,
): Promise<InquiryThreadMessage[]> {
  if (!inquiryId) return [];
  const { data, error } = await supabase
    .from("marketplace_inquiry_messages")
    .select("id, inquiry_id, sender_id, body, is_read, created_at")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: true });
  if (error) {
    if (import.meta.env.DEV)
      console.error("[marketplace] getInquiryMessages:", error.message);
    return [];
  }
  return (data ?? []) as InquiryThreadMessage[];
}

export type SendInquiryResult =
  | { ok: true; message: InquiryThreadMessage }
  | { ok: false; reason: "empty" | "too-long" | "not-signed-in" | "rejected" };

/**
 * Sends one reply. The result says why a send failed instead of returning null,
 * because a composer that silently does nothing is the failure mode this thread
 * exists to remove.
 */
export async function sendInquiryMessage(
  inquiryId: string,
  body: string,
): Promise<SendInquiryResult> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (trimmed.length > INQUIRY_MESSAGE_MAX)
    return { ok: false, reason: "too-long" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "not-signed-in" };

  const { data, error } = await supabase
    .from("marketplace_inquiry_messages")
    .insert({
      inquiry_id: inquiryId,
      sender_id: user.id,
      body: trimmed,
    })
    .select("id, inquiry_id, sender_id, body, is_read, created_at")
    .single();

  if (error || !data) {
    if (import.meta.env.DEV)
      console.error("[marketplace] sendInquiryMessage:", error?.message);
    return { ok: false, reason: "rejected" };
  }

  // Best effort: an unread marker that fails to clear never hides a message.
  await supabase
    .from("marketplace_product_inquiries")
    .update({ status: "responded" })
    .eq("id", inquiryId)
    .neq("status", "closed");

  return { ok: true, message: data as InquiryThreadMessage };
}

/** Marks the other side's messages read. Never throws. */
export async function markInquiryMessagesRead(
  inquiryId: string,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from("marketplace_inquiry_messages")
    .update({ is_read: true })
    .eq("inquiry_id", inquiryId)
    .neq("sender_id", user.id)
    .eq("is_read", false);
  if (error) {
    if (import.meta.env.DEV)
      console.error("[marketplace] markInquiryMessagesRead:", error.message);
    return false;
  }
  return true;
}

/**
 * The signed-in buyer's own inquiry on a product, if one exists. Used by the
 * product page to show the thread instead of asking the same question twice.
 */
export async function getMyInquiryForProduct(
  productId: string,
): Promise<{ id: string; status: string; created_at: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("marketplace_product_inquiries")
    .select("id, status, created_at")
    .eq("product_id", productId)
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (import.meta.env.DEV)
      console.error("[marketplace] getMyInquiryForProduct:", error.message);
    return null;
  }
  return (data as { id: string; status: string; created_at: string }) ?? null;
}
