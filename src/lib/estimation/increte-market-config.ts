/** Market selector coverage intentionally does not imply product verification. */
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";
import { COUNTRY_OPTIONS } from "@/lib/international/countries";

const countries = COUNTRY_OPTIONS.flatMap((group) => group.countries);
export interface IncreteMarketConfig {
  code: string;
  name: string;
  currencyCode: string | null;
  readiness: "requires_product_verification";
  verifiedProductCount: 0;
  message: string;
}

export const INCRETE_MARKETS: readonly IncreteMarketConfig[] = ALL_MARKET_CODES.map((code) => {
  const country = countries.find((entry) => entry.code === code);
  return {
    code,
    name: country?.name ?? code,
    currencyCode: country?.currency ?? null,
    readiness: "requires_product_verification",
    verifiedProductCount: 0,
    message: "No approved market-specific decorative-concrete product and price set is bundled. Enter local supplier data or add reviewed source evidence.",
  };
});

export function getIncreteMarket(code: string): IncreteMarketConfig | undefined {
  return INCRETE_MARKETS.find((market) => market.code === code);
}
