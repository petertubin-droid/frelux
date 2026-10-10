import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getSupabase } from "@/lib/supabase-lazy";
import type { DbSiteBranding } from "@/types/database";

interface BrandingContextValue {
  branding: DbSiteBranding | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const defaultBranding: DbSiteBranding = {
  id: "",
  website_name: "FRELUX",
  // Worldwide positioning, aligned with the final personalization pass
  // (2026-10-08). These are fallbacks; the live site_settings row still
  // overrides them.
  website_tagline: "Every Trade. Every Cost. One Platform.",
  browser_title: "FRELUX | Every Trade. Every Cost. One Platform.",
  light_logo_url: null,
  dark_logo_url: null,
  favicon_url: null,
  pwa_icon_url: null,
  primary_color: "#7C3AED",
  secondary_color: "#0B1120",
  accent_color: "#F97316",
  hero_highlight_config: null,
  hero_image_url: null,
  hero_image_alt: null,
  hero_image_label: null,
  hero_swatch_colors: null,
  hero_swatch_name: null,
  hero_chip_label: null,
  hero_chip_value: null,
  hero_chip_subtext: null,
  hero_badge_label: null,
  hero_badge_value: null,
  is_active: true,
  created_at: "",
  updated_at: "",
};

/**
 * Legacy brand identities that must never reach the UI. An older admin edit
 * left the active `site_branding` row as "FRELUXTOOLS" / "Build Smarter", so
 * every reload painted the FRELUX fallback first and then swapped to the
 * FRELUXTOOLS row once Supabase answered (two different-looking sites). The
 * public name, tagline and title are normalised back to the FRELUX defaults
 * here; colours, logos and hero content still come from the admin row.
 */
const LEGACY_BRAND_NAME = /^\s*frelux\s*tools?\b/i;
const LEGACY_BRAND_TAGLINE = /^\s*build\s+smarter\.?\s*$/i;

// eslint-disable-next-line react-refresh/only-export-components
export function normalizeBranding(row: DbSiteBranding): DbSiteBranding {
  const legacyName = LEGACY_BRAND_NAME.test(row.website_name ?? "");
  const legacyTagline = LEGACY_BRAND_TAGLINE.test(row.website_tagline ?? "");
  const legacyTitle = LEGACY_BRAND_NAME.test(row.browser_title ?? "");
  if (!legacyName && !legacyTagline && !legacyTitle) return row;
  return {
    ...row,
    website_name: legacyName ? defaultBranding.website_name : row.website_name,
    website_tagline: legacyTagline
      ? defaultBranding.website_tagline
      : row.website_tagline,
    browser_title:
      legacyTitle || legacyName
        ? defaultBranding.browser_title
        : row.browser_title,
  };
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: defaultBranding,
  loading: true,
  refresh: async () => {},
});

function hexToRgbChannels(hex: string): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Convert hex (#RRGGBB) to HSL channels "H S% L%" for shadcn/ui variables. */
function hexToHslChannels(hex: string): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  // Start from the FRELUX defaults (not null) so the very first paint already
  // carries the final brand name/tagline; the DB row then only refines colours,
  // logos and hero content instead of swapping the whole identity.
  const [branding, setBranding] = useState<DbSiteBranding | null>(
    defaultBranding,
  );
  const [loading, setLoading] = useState(true);

  async function loadBranding() {
    try {
      const supabase = await getSupabase();
      const { data } = await supabase
        .from("site_branding")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();
      setBranding(data ? normalizeBranding(data) : defaultBranding);
    } catch {
      setBranding((prev) => prev ?? defaultBranding);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBranding();
  }, []);

  // Apply branding to document head
  useEffect(() => {
    if (!branding) return;
    document.title = branding.browser_title;

    // Apply brand colors as CSS custom properties
    const root = document.documentElement;
    root.style.setProperty(
      "--brand-primary",
      hexToRgbChannels(branding.primary_color),
    );
    root.style.setProperty(
      "--brand-secondary",
      hexToRgbChannels(branding.secondary_color),
    );
    root.style.setProperty(
      "--brand-accent",
      hexToRgbChannels(branding.accent_color),
    );

    // Sync shadcn/ui semantic tokens with brand colors
    const primaryHsl = hexToHslChannels(branding.primary_color);
    root.style.setProperty("--primary", primaryHsl);
    root.style.setProperty("--ring", primaryHsl);

    // Favicon
    if (branding.favicon_url) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = branding.favicon_url;
    }

    // PWA apple-touch-icon
    if (branding.pwa_icon_url) {
      let link = document.querySelector<HTMLLinkElement>(
        "link[rel='apple-touch-icon']",
      );
      if (!link) {
        link = document.createElement("link");
        link.rel = "apple-touch-icon";
        document.head.appendChild(link);
      }
      link.href = branding.pwa_icon_url;
    }
  }, [branding]);

  return (
    <BrandingContext.Provider
      value={{ branding, loading, refresh: loadBranding }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBranding() {
  return useContext(BrandingContext);
}
