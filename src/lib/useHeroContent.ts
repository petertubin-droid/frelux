/**
 * Hero content hook, reads the homepage hero copy from
 * site_settings (CMS-managed) with module-level caching.
 *
 * Falls back to hardcoded defaults if the DB row is missing
 * or any fields are NULL, so the homepage always renders.
 *
 * The default copy is the client-approved permanent version:
 * it must NOT be rewritten, paraphrased, or "optimized" by any
 * AI or automated process (see Hero.tsx comment block).
 */

import { useEffect, useState } from "react";
import { isSupabaseConfigured, getSupabase } from "./supabase-lazy";

export interface HeroContent {
  headline: string;
  subheadline: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
}

/** Hardcoded fallback. Updated 2026-10-06 with the client-approved
 * worldwide-platform hero copy (matches the live site_settings row). */
export const DEFAULT_HERO_CONTENT: HeroContent = {
  headline: "Every trade. Every cost. One platform.",
  subheadline:
    "Frelux turns your measurements into exact material quantities and real, market-verified costs \u2014 for a single room or an entire building, foundation to roof. Snap a photo for an AI estimate, generate a professional BOQ, and hire verified pros when you\u2019re ready. Free, available in multiple languages.",
  ctaPrimaryLabel: "Start Estimating Free",
  ctaPrimaryHref: "/construction-tools",
  ctaSecondaryLabel: "Try the AI Photo Estimator",
  ctaSecondaryHref: "/image-estimator",
};

let cachedContent: HeroContent | null = null;

export function useHeroContent() {
  const [content, setContent] = useState<HeroContent>(
    cachedContent ?? DEFAULT_HERO_CONTENT,
  );
  const [loaded, setLoaded] = useState<boolean>(!!cachedContent);

  useEffect(() => {
    if (cachedContent) {
      setContent(cachedContent);
      setLoaded(true);
      return;
    }

    if (!isSupabaseConfigured) {
      setLoaded(true);
      return;
    }

    getSupabase()
      .then((supabase) =>
        supabase
          .from("site_settings")
          .select(
            "hero_headline, hero_subheadline, hero_cta_primary_label, hero_cta_primary_href, hero_cta_secondary_label, hero_cta_secondary_href",
          )
          .limit(1)
          .maybeSingle(),
      )
      .then(({ data }) => {
        if (!data) {
          setLoaded(true);
          return;
        }

        const resolved: HeroContent = {
          headline: data.hero_headline ?? DEFAULT_HERO_CONTENT.headline,
          subheadline:
            data.hero_subheadline ?? DEFAULT_HERO_CONTENT.subheadline,
          ctaPrimaryLabel:
            data.hero_cta_primary_label ?? DEFAULT_HERO_CONTENT.ctaPrimaryLabel,
          ctaPrimaryHref:
            data.hero_cta_primary_href ?? DEFAULT_HERO_CONTENT.ctaPrimaryHref,
          ctaSecondaryLabel:
            data.hero_cta_secondary_label ??
            DEFAULT_HERO_CONTENT.ctaSecondaryLabel,
          ctaSecondaryHref:
            data.hero_cta_secondary_href ??
            DEFAULT_HERO_CONTENT.ctaSecondaryHref,
        };

        cachedContent = resolved;
        setContent(resolved);
        setLoaded(true);
      });
  }, []);

  return { content, loaded };
}

/** Force a re-fetch after admin saves (clears the module cache). */
export function invalidateHeroContentCache() {
  cachedContent = null;
}
