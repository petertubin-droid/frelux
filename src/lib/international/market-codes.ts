/**
 * Market code aliases.
 *
 * The canonical market list (`ALL_MARKET_CODES`) and the newer systems —
 * regional codes, BOQ tax labels, data residency — use ISO 3166-1 alpha-2, so
 * the United Kingdom is "GB". Several older tables were keyed by "UK" instead:
 * masonry unit sizes, the cement bag weight table, and the slab vocabulary.
 *
 * A caller passing the canonical "GB" therefore fell through to the Nigerian
 * fallback and quoted 9-inch blocks and 50 kg bags for a London wall. Both
 * spellings are legitimate inputs, so lookups resolve through this module
 * rather than each table growing its own second key.
 */

/** Every spelling of a market, canonical first. */
export const MARKET_ALIASES: Record<string, readonly string[]> = {
  GB: ["GB", "UK", "GBR"],
  UK: ["GB", "UK", "GBR"],
  GBR: ["GB", "UK", "GBR"],
};

/** The canonical code for a market, or the uppercased input when unaliased. */
export function canonicalMarketCode(
  code: string | null | undefined,
  fallback = "NG",
): string {
  const upper = (code ?? "").trim().toUpperCase();
  if (!upper) return fallback;
  return MARKET_ALIASES[upper]?.[0] ?? upper;
}

/** Every accepted spelling, for tables that were keyed by the legacy form. */
export function marketCodeVariants(code: string | null | undefined): string[] {
  const upper = (code ?? "").trim().toUpperCase();
  if (!upper) return [];
  return [...(MARKET_ALIASES[upper] ?? [upper])];
}
