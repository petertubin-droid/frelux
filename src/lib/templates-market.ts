/**
 * Market × template SEO layer.
 *
 * Every curated template is globalized to all 32 FRELUX markets as a real,
 * crawlable page:
 *
 *   /market/<code>/templates            market template hub
 *   /market/<code>/templates/<slug>     market template detail
 *
 * These pages are not thin duplicates of /templates/<slug>: the title,
 * description, canonical and body copy are built from the market profile
 * (country, currency, unit system, local terminology), and the template
 * itself is adapted by templates-global (units + market wording). Each page
 * declares the full hreflang alternate set so Google can consolidate the
 * family instead of guessing.
 *
 * The generic /templates/<slug> page stays the x-default member.
 */
import type {
  MarketProfile,
  PreferredAreaUnit,
  PreferredLengthUnit,
  ResolvedMarketContext,
} from "@/types/international";
import { BUILTIN_MARKET_PROFILES } from "@/lib/international/market-context";
import { SITE_URL } from "@/lib/seo";

export interface TemplateSeoSource {
  name: string;
  slug: string;
  type: string;
  description?: string | null;
  seoDescription?: string | null;
}

/** Visible, active markets, in the canonical display order. */
export function listTemplateMarkets(): MarketProfile[] {
  return BUILTIN_MARKET_PROFILES.filter(
    (p) => p.is_visible && p.status === "active",
  ).sort((a, b) => a.sort_order - b.sort_order);
}

/** Honest lookup: null for unknown markets, never a silent fallback. */
export function getTemplateMarketProfile(
  code?: string | null,
): MarketProfile | null {
  if (!code) return null;
  const upper = code.toUpperCase();
  return listTemplateMarkets().find((p) => p.country_code === upper) ?? null;
}

/** Build the resolved context the calculators and template layer expect. */
export function resolveTemplateMarketContext(
  profile: MarketProfile,
): ResolvedMarketContext {
  return {
    marketCode: profile.country_code,
    countryName: profile.country_name,
    currencyCode: profile.currency_code,
    currencySymbol: profile.currency_symbol,
    measurementSystem: profile.default_measurement_system,
    defaultLengthUnit: profile.default_length_unit as PreferredLengthUnit,
    defaultAreaUnit: profile.default_area_unit as PreferredAreaUnit,
    supportedLengthUnits:
      profile.supported_length_units as PreferredLengthUnit[],
    supportedAreaUnits: profile.supported_area_units as PreferredAreaUnit[],
    defaultLanguage: profile.default_language,
    localTerminology: profile.local_terminology,
    status: profile.status,
    profileVersion: profile.profile_version,
  };
}

export function marketTemplatesPath(code: string): string {
  return `/market/${code.toLowerCase()}/templates`;
}

export function marketTemplatePath(code: string, slug: string): string {
  return `/market/${code.toLowerCase()}/templates/${slug}`;
}

function unitWords(profile: MarketProfile): string {
  switch (profile.default_measurement_system) {
    case "imperial":
      return "feet and inches";
    case "metric":
      return "metres";
    default:
      return "metres or feet";
  }
}

/** The full hreflang alternate set for one template across all markets. */
export function templateMarketAlternates(
  slug: string,
): { hreflang: string; href: string }[] {
  const alternates = listTemplateMarkets().map((p) => ({
    hreflang: p.country_code.toLowerCase(),
    href: `${SITE_URL}${marketTemplatePath(p.country_code, slug)}/`,
  }));
  alternates.push({
    hreflang: "x-default",
    href: `${SITE_URL}/templates/${slug}/`,
  });
  return alternates;
}

export function buildMarketTemplateSeo(
  template: TemplateSeoSource,
  profile: MarketProfile,
): {
  title: string;
  description: string;
  canonicalPath: string;
  alternates: { hreflang: string; href: string }[];
} {
  const country = profile.country_name;
  const source =
    template.seoDescription ||
    template.description ||
    `${template.name} project`;
  const trimmed = source.trim().replace(/\s+/g, " ");
  const why = trimmed.length > 96 ? `${trimmed.slice(0, 93)}...` : trimmed;

  return {
    title: `${template.name} Template for ${country} (${profile.currency_code}) | FRELUX`,
    description:
      `Run the ${template.name} template in ${country}: ${why} ` +
      `Quantities in ${unitWords(profile)} and costs in ${profile.currency_code}, ` +
      `priced from live ${country} material prices.`,
    canonicalPath: marketTemplatePath(profile.country_code, template.slug),
    alternates: templateMarketAlternates(template.slug),
  };
}

export function buildMarketTemplatesHubSeo(profile: MarketProfile): {
  title: string;
  description: string;
  canonicalPath: string;
  alternates: { hreflang: string; href: string }[];
} {
  const country = profile.country_name;
  const alternates = listTemplateMarkets().map((p) => ({
    hreflang: p.country_code.toLowerCase(),
    href: `${SITE_URL}${marketTemplatesPath(p.country_code)}/`,
  }));
  alternates.push({ hreflang: "x-default", href: `${SITE_URL}/templates/` });

  return {
    title: `Construction Estimate Templates for ${country} | FRELUX`,
    description:
      `Pre-configured paint, screeding, POP ceiling and tile estimate templates ` +
      `for ${country}. Each template opens the calculator with ${unitWords(profile)} ` +
      `dimensions and ${profile.currency_code} cost estimates from live local prices.`,
    canonicalPath: marketTemplatesPath(profile.country_code),
    alternates,
  };
}
