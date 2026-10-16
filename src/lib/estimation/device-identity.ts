/**
 * Stable device identity (Engine #11 — sync & offline-first)
 *
 * A capture's device_label is free text the artisan can edit, so
 * it can never be trusted as an identity. This module provides a
 * stable client-side UUID instead:
 *
 *  - getDeviceId() returns (creating once) a random UUID stored
 *    in localStorage. It is NOT an account: it is a per-browser,
 *    per-install label so captures synced from a phone and a
 *    tablet are honestly distinguishable.
 *  - Storage loss (reinstall, cleared browser data) = a NEW id.
 *    That is disclosed, never papered over: we do not invent a
 *    durable identity out of fingerprinting.
 *  - No personal data is derived or stored — the id is random,
 *    and never combined with anything identifying.
 */

const DEVICE_ID_KEY = "frelux_device_id";

function randomDeviceUuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // Deterministic fallback for environments without crypto.randomUUID
  return (
    "dev_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 14)
  );
}

/** Test hook: the storage key used for the device id. */
export const DEVICE_ID_STORAGE_KEY = DEVICE_ID_KEY;

/**
 * Returns this browser-install's stable device UUID, creating and
 * persisting it on first use. Corrupted or removed storage yields
 * a fresh id — identity is never guessed or invented from
 * fingerprinting.
 */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing && /^[0-9a-f-]{8,}$|^dev_[a-z0-9_]+$/.test(existing)) {
      return existing;
    }
    const fresh = randomDeviceUuid();
    localStorage.setItem(DEVICE_ID_KEY, fresh);
    return fresh;
  } catch {
    // localStorage unavailable (private mode edge): a volatile id
    // is still better than none, and the caller's disclosure says
    // the queue itself may not survive such environments anyway.
    return randomDeviceUuid();
  }
}
