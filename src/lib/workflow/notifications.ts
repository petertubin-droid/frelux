// =========================================================
// FRELUX WORKFLOW: EMAIL NOTIFICATIONS (client side)
//
// Fires ONE fire-and-forget notification request per workflow
// event to the deployed workflow-notify edge function. The
// function derives the recipient + content server-side; this
// lib only sends the document id.
//
// Honest behavior:
//   * Never blocks or fails a workflow action: the request is
//     sent after the DB write succeeded, and every error is
//     swallowed (notifications are best-effort).
//   * `isEmailNotifyActive()` reads the public view (active
//     providers only) so the UI can disclose whether email
//     notifications are configured at all — it never sees raw
//     keys (server-side providers expose status only).
// =========================================================

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Best-effort email notification for the latest event of a
 * workflow document. Call AFTER the DB write succeeded.
 * At-most-once per event server-side (workflow_notify_log).
 */
export async function notifyWorkflowEvent(documentId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.functions.invoke("workflow-notify", {
      body: { document_id: documentId },
    });
  } catch {
    // Never let notification failures affect a workflow action.
  }
}

/**
 * Whether a Resend key is active (build-time env or admin
 * Integration Center paste). Drives the honest UI disclosure;
 * raw keys are never visible to non-admin clients.
 */
export async function isEmailNotifyActive(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { data } = await supabase
      .from("integration_keys_public")
      .select("provider_id, key_value")
      .eq("provider_id", "resend")
      .maybeSingle();
    // The view only returns ACTIVE rows; a row means active.
    // (For server-side providers key_value is always null —
    // presence of the row is the signal, never the value.)
    return Boolean(data);
  } catch {
    return false;
  }
}
