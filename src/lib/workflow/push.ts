// =========================================================
// FRELUX: WORKFLOW WEB PUSH (client)
//
// Browser-side Web Push (RFC 8291/8292, VAPID):
//   * subscribeWorkflowPush() registers /sw-push.js, asks the
//     browser for a push subscription with the CLIENT-VISIBLE
//     VAPID public key (env-first, then the admin-pasted key
//     in integration_keys_public), and saves it in
//     workflow_push_subscriptions (RLS: own rows only).
//   * unsubscribeWorkflowPush() removes the row and unsubscribes.
//   * isWorkflowPushSupported()/isWorkflowPushEnabled() keep the
//     UI honest: unsupported browsers and unconfigured VAPID
//     keys are reported, never faked.
//
// The VAPID PRIVATE key never reaches the browser; delivery is
// done server-side by the workflow-push edge function.
// =========================================================

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { resolveClientProviderKey } from "@/lib/integrations/provider-keys";

export type PushOutcome =
  | { ok: true; endpoint: string }
  | {
      ok: false;
      reason: "unsupported" | "denied" | "not configured" | "failed";
      detail?: string;
    };

export function isWorkflowPushSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof PushManager !== "undefined" &&
    isSupabaseConfigured
  );
}

function urlB64ToUint8Array(base64Url: string): Uint8Array {
  const padded = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** The VAPID public key, honestly absent until configured. */
export async function getVapidPublicKey(): Promise<string | undefined> {
  return resolveClientProviderKey("web-push-public");
}

export async function subscribeWorkflowPush(): Promise<PushOutcome> {
  if (!isWorkflowPushSupported()) {
    return { ok: false, reason: "unsupported" };
  }
  const vapid = await getVapidPublicKey();
  if (!vapid) {
    return { ok: false, reason: "not configured" };
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw-push.js");
    await navigator.serviceWorker.ready;
    if (Notification.permission === "denied") {
      return { ok: false, reason: "denied" };
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, reason: "denied" };
    }
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(
          vapid,
        ) as unknown as BufferSource,
      });
    }
    const { endpoint, keys } = sub.toJSON();
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return { ok: false, reason: "failed", detail: "incomplete subscription" };
    }
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return { ok: false, reason: "failed", detail: "not signed in" };
    }
    const { error } = await supabase.from("workflow_push_subscriptions").upsert(
      {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_id: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) {
      return { ok: false, reason: "failed", detail: error.message };
    }
    return { ok: true, endpoint };
  } catch (e) {
    return { ok: false, reason: "failed", detail: String(e) };
  }
}

export async function unsubscribeWorkflowPush(): Promise<boolean> {
  if (!isWorkflowPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return false;
    const { error } = await supabase
      .from("workflow_push_subscriptions")
      .delete()
      .eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
    return !error;
  } catch {
    return false;
  }
}

/**
 * Whether THIS browser currently has an active push subscription
 * with permission granted. Honest: false on any doubt.
 */
export async function isWorkflowPushEnabled(): Promise<boolean> {
  if (!isWorkflowPushSupported()) return false;
  try {
    if (Notification.permission !== "granted") return false;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return false;
    const { data } = await supabase
      .from("workflow_push_subscriptions")
      .select("id")
      .eq("endpoint", sub.endpoint)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}
