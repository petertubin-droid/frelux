/**
 * Browser alerts for messages that arrive while the site is not being watched.
 *
 * A person sends a message, closes the tab, and the professional replies to an
 * empty room: the reply sits unread until they happen to come back. The site
 * already has a realtime subscription for the open thread, so the same event can
 * raise a desktop notification when the page is hidden.
 *
 * Rules kept deliberately narrow:
 *   - opt-in, stored per browser, off until the person turns it on;
 *   - only while the page is hidden, because a notification for a message
 *     already on screen is noise;
 *   - never for the person's own messages;
 *   - no notification body beyond the sender and the message text, and nothing
 *     is sent anywhere: this is the browser's own Notification API.
 */

const STORAGE_KEY = "frelux:message-alerts";

type NotificationCtor = typeof Notification;

function ctor(): NotificationCtor | null {
  if (typeof window === "undefined") return null;
  const C = (window as unknown as { Notification?: NotificationCtor })
    .Notification;
  return typeof C === "function" ? C : null;
}

/** True when this browser can raise a desktop notification at all. */
export function messageAlertsSupported(): boolean {
  return ctor() !== null;
}

/** The person's saved choice. Off unless they turned it on. */
export function getMessageAlertsEnabled(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function setMessageAlertsEnabled(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (enabled) localStorage.setItem(STORAGE_KEY, "on");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* a blocked storage write leaves alerts off, which is the safe default */
  }
}

/**
 * Ask the browser for permission and report whether alerts can be shown.
 *
 * Must be called from a click: a browser ignores a permission request that no
 * gesture triggered. A refusal is final for the session, so the caller should
 * leave the toggle off rather than ask again.
 */
export async function ensureAlertPermission(): Promise<boolean> {
  const C = ctor();
  if (!C) return false;
  if (C.permission === "granted") return true;
  if (C.permission === "denied") return false;
  try {
    const result = await C.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

export interface MessageAlert {
  title: string;
  body: string;
  tag?: string;
  onClick?: () => void;
}

/**
 * Show one alert. Returns true when the browser accepted it.
 *
 * `shouldAlert` decides whether this moment deserves an alert at all, so the
 * "page is hidden" rule lives in one place instead of in every caller.
 */
export function showMessageAlert(alert: MessageAlert): boolean {
  const C = ctor();
  if (!C || C.permission !== "granted") return false;
  try {
    const notification = new C(alert.title, {
      body: alert.body,
      tag: alert.tag,
      // A tag collapses repeats for the same thread into one bubble rather than
      // stacking a notification per message.
      renotify: false,
    } as NotificationOptions);
    if (alert.onClick) {
      notification.onclick = () => {
        try {
          window.focus();
        } catch {
          /* focusing is best-effort */
        }
        alert.onClick?.();
        notification.close();
      };
    }
    return true;
  } catch {
    return false;
  }
}

/** True when the page is not in front of the person right now. */
export function pageIsHidden(): boolean {
  if (typeof document === "undefined") return false;
  const hidden = document.hidden === true;
  const unfocused =
    typeof document.hasFocus === "function" ? !document.hasFocus() : false;
  return hidden || unfocused;
}

/**
 * One decision point for "should this message raise an alert": the person's
 * choice, the page being out of sight, and the message not being their own.
 */
export function shouldAlertForMessage(input: {
  enabled: boolean;
  senderIsSelf: boolean;
  hidden: boolean;
}): boolean {
  if (!input.enabled) return false;
  if (input.senderIsSelf) return false;
  return input.hidden;
}
