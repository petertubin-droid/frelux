import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// VAPID public key — set this in your environment / Supabase auth settings
// The private key is used server-side (in Supabase Edge Functions) to send pushes.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * Subscribe the current user to push notifications.
 * Stores the subscription in the `push_subscriptions` table.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported() || !isSupabaseConfigured || !VAPID_PUBLIC_KEY) {
    if (import.meta.env.DEV) console.warn('[push] Push not supported or VAPID key not configured');
    return false;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  try {
    // Request permission if not already granted
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    // Get service worker registration
    const reg = await navigator.serviceWorker.ready;

    // Create push subscription
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });

    const subJSON = subscription.toJSON();

    // Store in database
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: subJSON.endpoint,
      p256dh_key: subJSON.keys?.p256dh ?? null,
      auth_key: subJSON.keys?.auth ?? null,
      is_active: true,
    }, { onConflict: 'endpoint' });

    if (error) {
      if (import.meta.env.DEV) console.error('[push] Failed to store subscription:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    if (import.meta.env.DEV) console.error('[push] Subscription error:', err);
    return false;
  }
}

/**
 * Unsubscribe the current user from push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported() || !isSupabaseConfigured) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }

    // Mark inactive in database
    await supabase.from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', user.id);

    return true;
  } catch (err) {
    if (import.meta.env.DEV) console.error('[push] Unsubscribe error:', err);
    return false;
  }
}

/**
 * Check if the current user has an active push subscription.
 */
export async function hasPushSubscription(): Promise<boolean> {
  if (!isPushSupported() || !isSupabaseConfigured) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/**
 * Send a push notification to a specific user (called server-side or via Supabase function).
 * This is a client-side helper for testing; production sends should go through an edge function.
 */
export async function sendPushToUser(userId: string, title: string, body: string, url?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase.functions.invoke('send-push-notification', {
    body: { userId, title, body, url: url ?? '/messages' },
  });

  if (error) {
    if (import.meta.env.DEV) console.error('[push] Failed to send push:', error.message);
    return false;
  }

  return true;
}

// Helper: convert VAPID base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
