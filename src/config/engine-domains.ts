/**
 * Construction domains over the live tool catalogue.
 *
 * Six domains group the tools the way the work is grouped on site. The
 * registry here does not restate a tool's title, route or market data: it
 * points at the catalogue entry that already owns them, so a renamed tool or
 * a moved route cannot drift out of step with this file. A test asserts that
 * every catalogue slug is classified exactly once, either into a domain or
 * into PLATFORM_TOOLS with the reason it belongs to none.
 *
 * A domain is a grouping, not a claim about the engine behind the tool. No
 * accuracy figure, unit system, tax rate or local name is recorded here.
 * Currency and packaging come from the market bundle
 * (src/lib/international/markets), quantities from the engine itself.
 */

import { CONSTRUCTION_TOOLS, findTool } from "@/config/construction-tools";
import type { Tool } from "@/config/construction-tools";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";
import { canonicalMarketCode } from "@/lib/international/market-codes";
import { getMarketBundle } from "@/lib/international/markets";

export const ENGINE_DOMAINS = [
  "substructure",
  "superstructure",
  "finishes",
  "mep",
  "qs-renovation",
  "infrastructure",
] as const;

export type EngineDomain = (typeof ENGINE_DOMAINS)[number];

/** Domain labels as a reader would say them. */
export const DOMAIN_LABELS: Record<EngineDomain, string> = {
  substructure: "Substructure and ground works",
  superstructure: "Superstructure and structure",
  finishes: "Finishes and envelope",
  mep: "Services and MEP",
  "qs-renovation": "Surveying, cost and renovation",
  infrastructure: "External and infrastructure works",
};

/** Every catalogue slug that measures or prices construction work. */
export const TOOL_DOMAINS: Readonly<Record<string, EngineDomain>> = {
  // substructure
  "german-floor": "substructure",
  "concrete-slab-takeoff": "substructure",
  "foundation-designer": "substructure",
  "foundation-estimate": "substructure",
  "retaining-wall": "substructure",
  "earthworks-cut-fill": "substructure",
  "demolition-calculator": "substructure",
  // infrastructure
  "drainage-calculator": "infrastructure",
  "paving-calculator": "infrastructure",
  "borehole-water-system-estimator": "infrastructure",
  // superstructure
  concrete: "superstructure",
  reinforcement: "superstructure",
  "steel-beam-weight": "superstructure",
  "masonry-calculator": "superstructure",
  "fence-block": "superstructure",
  "build-to-roof": "superstructure",
  "tall-building-structure": "superstructure",
  "water-tower-staging": "superstructure",
  "roof-framing": "superstructure",
  "temporary-works-calculator": "superstructure",
  "mathematical-plan-elevation": "superstructure",
  "blueprint-takeoff": "superstructure",
  "insulation-calculator": "superstructure",
  // finishes
  paint: "finishes",
  "paint-comparison": "finishes",
  finish: "finishes",
  screeding: "finishes",
  "pop-ceiling": "finishes",
  tile: "finishes",
  "increte-flooring-calculator": "finishes",
  flooring: "finishes",
  waterproofing: "finishes",
  "wall-finish-estimator": "finishes",
  "plastering-calculator": "finishes",
  "drywall-calculator": "finishes",
  wallpaper: "finishes",
  "window-blinds": "finishes",
  "tv-console-calculator": "finishes",
  "doors-windows": "finishes",
  "soffit-gutter": "finishes",
  "surface-assessment": "finishes",
  // mep
  electrical: "mep",
  "conduit-wiring": "mep",
  plumbing: "mep",
  "septic-sizing-calculator": "mep",
  solar: "mep",
  generator: "mep",
  "heat-comfort": "mep",
  // qs-renovation
  "renovation-estimator": "qs-renovation",
  boq: "qs-renovation",
  labour: "qs-renovation",
  margin: "qs-renovation",
  "quote-check": "qs-renovation",
  "cash-flow": "qs-renovation",
  timeline: "qs-renovation",
  sequence: "qs-renovation",
  maintenance: "qs-renovation",
  warranty: "qs-renovation",
  "contractor-credit": "qs-renovation",
  "material-price-index": "qs-renovation",
  "regional-index": "qs-renovation",
  "material-prices": "qs-renovation",
  "diaspora-budget-tracker": "qs-renovation",
  "defect-diagnosis": "qs-renovation",
  "circular-reuse": "qs-renovation",
  "carbon-footprint": "qs-renovation",
  "global-site-safety-estimator": "qs-renovation",
  "code-reference": "qs-renovation",
  "material-advisor": "qs-renovation",
};

/** Catalogue tools that belong to no single construction domain. */
export const PLATFORM_TOOLS: Readonly<Record<string, string>> = {
  "measurement-converter":
    "Converted units feed every domain, so no single domain owns it.",
  "smart-calculator":
    "Routes a question to another tool rather than taking off a quantity.",
  conversational:
    "Routes a conversation to another tool rather than taking off a quantity.",
  "count-vision":
    "Extracts counts from an image instead of pricing construction work.",
  "photo-estimator":
    "Extracts measurements from a photo instead of pricing construction work.",
  "bim-ifc":
    "Imports a model and hands each element to the engine that owns it.",
  "field-sync": "Carries site data between tools rather than measuring work.",
  "estimate-refresh": "Reprices an existing estimate from stored prices.",
  "color-preview": "Renders a colour choice and takes off no quantity.",
  "color-assistant": "Suggests a colour and takes off no quantity.",
};

/**
 * The domain a tool's work belongs to, or null when it belongs to none.
 * An unknown slug is null rather than a guess.
 */
export function domainForTool(slug: string): EngineDomain | null {
  return TOOL_DOMAINS[slug] ?? null;
}

/** Catalogue entries in one domain, in catalogue order. */
export function toolsInDomain(domain: EngineDomain): Tool[] {
  return CONSTRUCTION_TOOLS.filter(
    (tool) => TOOL_DOMAINS[tool.slug] === domain,
  );
}

/** Every domain with the tools grouped under it, catalogue order preserved. */
export function toolsByDomain(): Record<EngineDomain, Tool[]> {
  const grouped = {} as Record<EngineDomain, Tool[]>;
  for (const domain of ENGINE_DOMAINS) grouped[domain] = toolsInDomain(domain);
  return grouped;
}

export interface ResolvedDomainTool {
  slug: string;
  title: string;
  path: string;
  domain: EngineDomain;
  /** Canonical ISO code for the market asked for, whether or not a bundle exists. */
  marketCode: string;
  /** The market bundle code when one exists for that market, otherwise null. */
  marketBundleCode: string | null;
  marketSupported: boolean;
}

/**
 * Join a tool to its domain and to the market it is being read in.
 *
 * The market code is canonicalised first, so "UK" resolves to GB rather than
 * falling through to a default. Returns null for an unknown slug or for a
 * platform tool, because neither can be read as a domain engine.
 */
export function resolveDomainTool(
  slug: string,
  marketCode?: string | null,
): ResolvedDomainTool | null {
  const tool = findTool(slug);
  const domain = domainForTool(slug);
  if (!tool || !domain) return null;
  const canonical = canonicalMarketCode(marketCode, "NG");
  const bundle = getMarketBundle(canonical);
  return {
    slug: tool.slug,
    title: tool.title,
    path: tool.to,
    domain,
    marketCode: canonical,
    marketBundleCode: bundle?.code ?? null,
    marketSupported: Boolean(bundle) && ALL_MARKET_CODES.includes(canonical),
  };
}
