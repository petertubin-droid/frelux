/**
 * Cross-site house-promo settings (Heartsyncx advertised on Frelux, plus
 * external partner promos).
 *
 * Config lives on the `house_cross_promo` ad_providers row (Admin →
 * Network Hub → House Promos), exposed through the same public ad-config
 * fetch as the ad networks. This keeps settings site-wide: flipping the
 * master switch or editing the Heartsyncx base URL (e.g. when the custom
 * domain goes live) updates every visitor, every slot, instantly.
 *
 * A first-party unit: no consent gate, cannot be blocked by ad blockers.
 */
import { useEffect, useState } from "react";
import { fetchAdConfig } from "@/lib/ad-config";
import type { DbAdProvider } from "@/types/database";

export type CrossPromoFormat = "card" | "banner" | "native" | "interstitial";

/** An external website owner's paid promo. Managed in Network Hub. */
export interface ExternalPromo {
  id: string;
  enabled: boolean;
  label: string;
  url: string;
  blurb: string;
  owner_name: string;
}

export const HOUSE_PROMO_SLUG = "house_cross_promo";
export const DEFAULT_CROSS_PROMO_BASE_URL = "https://heartsyncx.netlify.app";

export interface HousePromoSettings {
  enabled: boolean;
  format: CrossPromoFormat;
  /** Where sister-site promo links point (configurable for the custom domain). */
  baseUrl: string;
  externalPromos: ExternalPromo[];
}

const DEFAULTS: HousePromoSettings = {
  enabled: false,
  format: "card",
  baseUrl: DEFAULT_CROSS_PROMO_BASE_URL,
  externalPromos: [],
};

/** Accepts bare domains, adds https:// when missing, trims trailing slashes. */
export function normalizeBaseUrl(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return DEFAULT_CROSS_PROMO_BASE_URL;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withScheme.replace(/\/+$/, "");
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Extract the house-promo config from ad_providers rows (public settings). */
export function housePromoConfigFrom(
  providers:
    Pick<DbAdProvider, "slug" | "is_active" | "settings">[] | null | undefined,
): HousePromoSettings | null {
  const row = providers?.find((p) => p.slug === HOUSE_PROMO_SLUG);
  if (!row || !row.is_active) return null;
  const settings = (row.settings ?? {}) as Record<string, unknown>;
  const format =
    typeof settings.format === "string" &&
    ["card", "banner", "native", "interstitial"].includes(settings.format)
      ? (settings.format as CrossPromoFormat)
      : "card";
  const externalPromos = Array.isArray(settings.external_promos)
    ? (settings.external_promos as ExternalPromo[])
        .filter((p) => p && typeof p === "object")
        .map((p, i) => ({
          id: p.id || `ext-${i}`,
          enabled: p.enabled !== false,
          label: p.label || "",
          url: p.url || "",
          blurb: p.blurb || "",
          owner_name: p.owner_name || "",
        }))
    : [];
  return {
    enabled: true,
    format,
    baseUrl: normalizeBaseUrl(settings.base_url as string | undefined),
    externalPromos,
  };
}

let cachedSettings: HousePromoSettings | null = null;

/** One-shot read for non-React consumers (SSR-safe default while loading). */
export function getHousePromoSettings(): HousePromoSettings {
  return cachedSettings ?? DEFAULTS;
}

/**
 * Reactive, DB-backed settings for React consumers. Returns the DEFAULTS
 * (promos hidden) until the public ad-config fetch resolves.
 */
export function useHousePromoSettings(): HousePromoSettings {
  const [settings, setSettings] = useState<HousePromoSettings>(
    getHousePromoSettings,
  );

  useEffect(() => {
    let alive = true;
    fetchAdConfig()
      .then((cfg) => {
        if (!alive) return;
        const resolved = housePromoConfigFrom(cfg.providers) ?? DEFAULTS;
        cachedSettings = resolved;
        setSettings(resolved);
      })
      .catch(() => {
        /* config fetch failed — keep promos hidden */
      });
    return () => {
      alive = false;
    };
  }, []);

  return settings;
}
