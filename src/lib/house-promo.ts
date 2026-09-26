/**
 * Cross-site house-promo settings (Heartsyncx advertised on Frelux).
 *
 * First-party promo config: enabled + display format. Stored in
 * localStorage because, unlike ad-network config (Supabase-backed),
 * this is a static first-party unit with no credentials or campaign
 * data - the same place the site keeps consent and language choices.
 */
import { useEffect, useState } from "react";

export type CrossPromoFormat = "card" | "banner" | "native" | "interstitial";

export interface HousePromoSettings {
  enabled: boolean;
  format: CrossPromoFormat;
}

const STORAGE_KEY = "frelux_cross_promo_settings";
const DEFAULTS: HousePromoSettings = { enabled: true, format: "card" };

function readSettings(): HousePromoSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<HousePromoSettings>;
    return {
      enabled: parsed.enabled !== false,
      format: parsed.format ?? "card",
    };
  } catch {
    return DEFAULTS;
  }
}

export function getHousePromoSettings(): HousePromoSettings {
  return readSettings();
}

export function saveHousePromoSettings(s: HousePromoSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable - settings simply don't persist */
  }
}

/** Reactive settings for React consumers (re-renders on change). */
export function useHousePromoSettings(): [
  HousePromoSettings,
  (s: HousePromoSettings) => void,
] {
  const [settings, setSettings] = useState<HousePromoSettings>(readSettings);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) setSettings(readSettings());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const update = (s: HousePromoSettings) => {
    saveHousePromoSettings(s);
    setSettings(s);
    // storage events don't fire in the same tab that wrote them
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  };
  return [settings, update];
}
