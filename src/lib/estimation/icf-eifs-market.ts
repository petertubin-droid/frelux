/**
 * ICF and EIFS/ETICS market price resolution.
 *
 * Both estimators price their bill of quantities from the market's own
 * book, exactly like the other FRELUX engines:
 *
 *   estimation_materials  slug = "{market}-{key}"  (e.g. "us-icf-form-block")
 *   estimation_prices     price_type = 'material', market, price, price_source
 *
 * Rules:
 *  - a market's own row wins; an inherited parent market may satisfy it;
 *  - no NG-basis price is ever borrowed for a market that names no
 *    ancestor (that would be the silent fallback the platform forbids);
 *  - anything unresolved stays unresolved and is disclosed, never
 *    estimated.
 */

import { supabase } from "@/lib/supabase";

/** BOQ code -> engine key. Several BOQ codes can share one price key. */
export const ICF_PRICE_KEYS: Record<string, string> = {
  "ICF-BLK-STR": "icf-form-block",
  "ICF-BLK-CNR90": "icf-corner-block",
  "ICF-BLK-CNR45": "icf-corner-block",
  "ICF-BLK-TWALL": "icf-corner-block",
  "CONC-ICF-PUMP": "icf-concrete",
  "STL-REBAR-DOWEL": "icf-rebar",
  "STL-REBAR-VERT": "icf-rebar",
  "STL-REBAR-HORIZ": "icf-rebar",
  "STL-REBAR-LINTEL": "icf-rebar",
  "OPN-FOAM-SEAL": "icf-sealant",
  "WTR-MEMBRANE-ICF": "icf-waterproof",
  "WTR-DIMPLE-DRAIN": "icf-waterproof",
};

export const EIFS_PRICE_KEYS: Record<string, string> = {
  "EIFS-INS-01": "eifs-insulation",
  "EIFS-ADH-01": "eifs-adhesive",
  "EIFS-FST-01": "eifs-fastener",
  "EIFS-MSH-01": "eifs-mesh",
  "EIFS-MSH-02": "eifs-mesh",
  "EIFS-BAS-01": "eifs-basecoat",
  "EIFS-PRM-01": "eifs-primer",
  "EIFS-FIN-01": "eifs-finish",
  "EIFS-TRM-01": "eifs-trim",
  "EIFS-TRM-02": "eifs-trim",
};

/**
 * DEFS shares the EIFS finish layers (mesh, base coat, primer, finish) because
 * the finish build-up is the same. Board, screws, seam tape and track are DEFS
 * roles of their own: a market that has no recorded row for them reports the
 * line unpriced rather than borrowing the EIFS insulation price.
 */
export const DEFS_PRICE_KEYS: Record<string, string> = {
  "DEFS-01": "defs-board",
  "DEFS-02": "defs-screws",
  "DEFS-03": "defs-joint-tape",
  "DEFS-04": "defs-track",
  "DEFS-05": "defs-trim",
  "DEFS-06": "eifs-mesh",
  "DEFS-07": "eifs-basecoat",
  "DEFS-08": "eifs-primer",
  "DEFS-09": "eifs-finish",
};

export interface ResolvedPrice {
  key: string;
  price: number;
  materialName: string;
  bookMarket: string;
  evidence: "verified" | "indicative";
  explanation: string;
}

export interface MarketPriceResolution {
  /** BOQ code -> unit price */
  prices: Record<string, number>;
  provenance: ResolvedPrice[];
  /** BOQ codes with no resolvable price in this market. */
  unresolved: string[];
}

type PriceRow = {
  price: number;
  scan_confidence: string | null;
  price_source: string | null;
};

async function resolveKeyAcrossChain(
  key: string,
  marketCode: string,
): Promise<{
  price: PriceRow;
  materialName: string;
  sourcedMarket: string;
} | null> {
  const seen = new Set<string>();
  let current: string | null = marketCode;
  while (current && !seen.has(current)) {
    seen.add(current);
    const { data: material } = await supabase
      .from("estimation_materials")
      .select("id, name")
      .eq("slug", `${current.toLowerCase()}-${key}`)
      .eq("is_active", true)
      .maybeSingle();
    if (material) {
      const { data: price } = await supabase
        .from("estimation_prices")
        .select("price, scan_confidence, price_source")
        .eq("price_type", "material")
        .eq("ref_id", (material as { id: string }).id)
        .eq("market", current)
        .eq("is_active", true)
        .order("effective_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (price) {
        return {
          price: price as PriceRow,
          materialName: (material as { name: string }).name,
          sourcedMarket: current,
        };
      }
    }
    const profileRes = (await supabase
      .from("market_profiles")
      .select("inherits_from")
      .eq("country_code", current)
      .maybeSingle()) as { data: { inherits_from?: string | null } | null };
    const next: string | null = profileRes.data?.inherits_from ?? null;
    if (!next) break;
    current = next;
  }
  return null;
}

async function resolvePrices(
  marketCode: string,
  codeToKey: Record<string, string>,
): Promise<MarketPriceResolution> {
  const result: MarketPriceResolution = {
    prices: {},
    provenance: [],
    unresolved: [],
  };
  const market = (marketCode || "").toUpperCase();
  if (!market) {
    result.unresolved = Object.keys(codeToKey);
    return result;
  }

  const resolvedByKey = new Map<
    string,
    { price: PriceRow; materialName: string; sourcedMarket: string } | null
  >();

  for (const [code, key] of Object.entries(codeToKey)) {
    if (!resolvedByKey.has(key)) {
      resolvedByKey.set(key, await resolveKeyAcrossChain(key, market));
    }
    const found = resolvedByKey.get(key) ?? null;
    if (!found) {
      result.unresolved.push(code);
      continue;
    }
    const { price, materialName, sourcedMarket } = found;
    result.prices[code] = price.price;
    if (!result.provenance.some((p) => p.key === key)) {
      const verified = price.scan_confidence === "manual";
      result.provenance.push({
        key,
        price: price.price,
        materialName,
        bookMarket: sourcedMarket,
        evidence: verified ? "verified" : "indicative",
        explanation:
          sourcedMarket === market
            ? verified
              ? `Unit price from the ${market} book (${price.price_source || "verified supplier listing"}).`
              : `Indicative price from the ${market} book (${price.price_source || "adjustable"}) — verify with a local supplier.`
            : `Unit price inherited from the ${sourcedMarket} book (${price.price_source || "verified supplier listing"}).`,
      });
    }
  }
  return result;
}

export function resolveIcfPrices(
  marketCode: string,
): Promise<MarketPriceResolution> {
  return resolvePrices(marketCode, ICF_PRICE_KEYS);
}

export function resolveEifsPrices(
  marketCode: string,
): Promise<MarketPriceResolution> {
  return resolvePrices(marketCode, EIFS_PRICE_KEYS);
}

export function resolveDefsPrices(
  marketCode: string,
): Promise<MarketPriceResolution> {
  return resolvePrices(marketCode, DEFS_PRICE_KEYS);
}
