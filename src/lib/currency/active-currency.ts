// The currency an estimate is priced in, read without needing a React context.
//
// Calculators price materials in their market currency. This resolves that code
// from the saved global settings, so a result block can compare it with the
// visitor's display currency and offer a conversion.

import { CURRENCY_STORAGE_KEY } from "@/lib/international/fx-display";
import { suggestCurrency } from "./catalogue";

const SETTINGS_KEY = "frelux_global_settings_v1";

interface StoredSettings {
  currencyCode?: string;
  countryCode?: string;
}

function readStoredSettings(): StoredSettings {
  if (typeof window === "undefined") return {};
  for (const key of [SETTINGS_KEY, "frelux_global_settings"]) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as StoredSettings;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // A corrupt entry must never break a calculator.
    }
  }
  return {};
}

/** The currency the estimate's prices are in. */
export function activeCurrencyCode(): string {
  const stored = readStoredSettings();
  if (stored.currencyCode) return stored.currencyCode.toUpperCase();
  return suggestCurrency(stored.countryCode ?? null);
}

/** The currency the visitor asked to see figures in, if they chose one. */
export function preferredDisplayCurrency(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
  return (stored || fallback).toUpperCase();
}
