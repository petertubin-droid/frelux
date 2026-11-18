/**
 * Verified statutory sales tax, VAT, and GST standards by market code.
 *
 * Keeps statutory tax rates and terminology synchronized across invoices,
 * quotation exports, and contractor workflows instead of hardcoding 7.5% VAT.
 */

export interface MarketTaxInfo {
  readonly name: string;
  readonly ratePercent: number;
}

const MARKET_TAX_TABLE: Record<string, MarketTaxInfo> = {
  NG: { name: "VAT", ratePercent: 7.5 },
  GB: { name: "VAT", ratePercent: 20 },
  US: { name: "Sales Tax", ratePercent: 0 },
  CA: { name: "HST/GST", ratePercent: 13 },
  AU: { name: "GST", ratePercent: 10 },
  DE: { name: "MwSt", ratePercent: 19 },
  FR: { name: "TVA", ratePercent: 20 },
  IT: { name: "IVA", ratePercent: 22 },
  ES: { name: "IVA", ratePercent: 21 },
  NL: { name: "BTW", ratePercent: 21 },
  IN: { name: "GST", ratePercent: 18 },
  ZA: { name: "VAT", ratePercent: 15 },
  KE: { name: "VAT", ratePercent: 16 },
  GH: { name: "VAT", ratePercent: 15 },
  JP: { name: "Consumption Tax", ratePercent: 10 },
  MX: { name: "IVA", ratePercent: 16 },
  SA: { name: "VAT", ratePercent: 15 },
  AE: { name: "VAT", ratePercent: 5 },
  NZ: { name: "GST", ratePercent: 15 },
  SG: { name: "GST", ratePercent: 9 },
  IE: { name: "VAT", ratePercent: 23 },
  CH: { name: "MWST", ratePercent: 8.1 },
  SE: { name: "Moms", ratePercent: 25 },
  PL: { name: "VAT", ratePercent: 23 },
  BR: { name: "ICMS/ISS", ratePercent: 18 },
};

/** Default tax for unconfigured or neutral international context (7.5% VAT). */
const DEFAULT_TAX: MarketTaxInfo = { name: "VAT", ratePercent: 7.5 };

export function getMarketTaxRate(marketCode?: string | null): MarketTaxInfo {
  if (!marketCode) return DEFAULT_TAX;
  const upper = marketCode.trim().toUpperCase();
  return MARKET_TAX_TABLE[upper] ?? DEFAULT_TAX;
}
