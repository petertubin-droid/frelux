/**
 * Bridge between supplier listings and the FRELUX Material Price Index.
 *
 * Two directions, both deliberately conservative:
 *
 *   supplier -> index: a listing price is submitted as an *observation* through
 *   the existing price-index-submit function. It waits in the administrator
 *   review queue like any other observation and changes no published price
 *   until approved. Nothing here writes a published price.
 *
 *   index -> supplier: a listing can show the published market benchmark for
 *   the same material so a buyer can see how far a supplier's price sits from
 *   the market. When the index has no verified row, we say so instead of
 *   inventing a comparison.
 */

import { supabase } from "@/lib/supabase";

export interface IndexCity {
  slug: string;
  name: string;
  state: string | null;
}

export async function fetchIndexCities(
  marketCode = "NG",
): Promise<{ cities: IndexCity[]; error: string | null }> {
  const { data, error } = await supabase
    .from("market_cities")
    .select("slug, name, state, is_active, sort_order")
    .eq("country_code", marketCode)
    .eq("is_active", true)
    .order("sort_order");
  return {
    cities: (data ?? []).map((row) => ({
      slug: (row as { slug: string }).slug,
      name: (row as { name: string }).name,
      state: ((row as { state: string | null }).state ?? null) as string | null,
    })),
    error: error?.message ?? null,
  };
}

export function matchCitySlug(
  cityName: string | null | undefined,
  cities: IndexCity[],
): string | null {
  if (!cityName) return null;
  const needle = cityName.trim().toLowerCase();
  const exact = cities.find(
    (c) => c.name.toLowerCase() === needle || c.slug === needle,
  );
  if (exact) return exact.slug;
  const partial = cities.find(
    (c) =>
      c.name.toLowerCase().includes(needle) ||
      needle.includes(c.name.toLowerCase()),
  );
  return partial?.slug ?? null;
}

export interface IndexSubmissionResult {
  submitted: boolean;
  duplicate: boolean;
  message: string;
  error: string | null;
}

/**
 * Submits a listing price for review. The supplier must be the caller's own
 * listing (enforced by RLS on the listing and by the caller passing only its
 * own data); the index treats it as an observation with the supplier named.
 */
export async function submitListingPriceForReview(input: {
  marketCode?: string;
  cityName: string | null;
  itemName: string;
  price: number;
  unit: string;
  vendorName: string;
  contactEmail: string | null;
  notes: string | null;
}): Promise<IndexSubmissionResult> {
  const market = input.marketCode ?? "NG";
  if (market !== "NG") {
    return {
      submitted: false,
      duplicate: false,
      message:
        "Index price review currently runs for the Nigeria index only. The price will still be shown in your listing.",
      error: null,
    };
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return {
      submitted: false,
      duplicate: false,
      message: "",
      error: "Enter a price before submitting to the index.",
    };
  }

  const { cities } = await fetchIndexCities(market);
  const citySlug = matchCitySlug(input.cityName, cities);
  if (!citySlug) {
    return {
      submitted: false,
      duplicate: false,
      message: "",
      error:
        "Set a delivery city that the price index tracks, or submit the price from the price index page.",
    };
  }

  const { data, error } = await supabase.functions.invoke(
    "price-index-submit",
    {
      body: {
        market,
        city_slug: citySlug,
        item_name: input.itemName,
        price: input.price,
        unit: input.unit,
        price_kind: "retail",
        vendor: input.vendorName,
        notes: input.notes,
        contact_email: input.contactEmail,
      },
    },
  );

  if (error)
    return {
      submitted: false,
      duplicate: false,
      message: "",
      error: error.message,
    };
  const payload = data as {
    ok?: boolean;
    id?: string;
    duplicate?: boolean;
    message?: string;
    error?: string;
  };
  if (payload?.ok !== true) {
    return {
      submitted: false,
      duplicate: false,
      message: "",
      error: payload?.error ?? "The submission was refused.",
    };
  }
  return {
    submitted: Boolean(payload.id),
    duplicate: Boolean(payload.duplicate),
    message: payload.message ?? "Submitted for review.",
    error: null,
  };
}

export interface IndexBenchmark {
  productName: string;
  currency: string;
  /** Published (or last known) market price for the same material. */
  price: number;
  basis: "current" | "median" | "average";
  verificationStatus: string | null;
  asOf: string | null;
  suppliersCount: number | null;
  observationsCount: number | null;
  /** Percentage the listing sits above (+) or below (-) the benchmark. */
  differencePct: number | null;
  isVerified: boolean;
}

function firstNumber(...candidates: unknown[]): number | null {
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/**
 * Looks up the published index row for a listing. Matching is on the index's own
 * material identity, never on a guessed conversion: the listing's material slug
 * must appear in the index slug, otherwise there is no benchmark.
 */
export async function fetchIndexBenchmark(input: {
  marketCode: string;
  materialSlug: string;
  listingPrice: number;
  currency: string;
}): Promise<IndexBenchmark | null> {
  const slug = input.materialSlug?.trim().toLowerCase();
  if (!slug) return null;

  const { data, error } = await supabase
    .from("market_material_prices")
    .select(
      "material_slug, product_name, currency, current_price, median_price, avg_price, frelux_price, verification_status, last_verified_at, last_scanned_at, suppliers_count, observations_count",
    )
    .eq("market", input.marketCode)
    .ilike("material_slug", `%${slug}%`)
    .limit(10);

  if (error || !data || data.length === 0) return null;

  const row =
    data
      .map((r) => r as Record<string, unknown>)
      .find((r) => String(r.material_slug ?? "").toLowerCase() === slug) ??
    (data[0] as Record<string, unknown>);

  const price = firstNumber(row.current_price, row.median_price, row.avg_price);
  if (price === null) return null;

  const benchmarkCurrency = String(row.currency ?? input.currency);
  // Comparing across currencies without an FX conversion would be a false claim.
  const sameCurrency =
    benchmarkCurrency.toUpperCase() === input.currency.toUpperCase();
  const differencePct =
    sameCurrency && input.listingPrice > 0
      ? Math.round(((input.listingPrice - price) / price) * 1000) / 10
      : null;

  return {
    productName: String(row.product_name ?? slug),
    currency: benchmarkCurrency,
    price,
    basis: row.current_price
      ? "current"
      : row.median_price
        ? "median"
        : "average",
    verificationStatus: (row.verification_status as string) ?? null,
    asOf:
      (row.last_verified_at as string) ??
      (row.last_scanned_at as string) ??
      null,
    suppliersCount:
      row.suppliers_count === null || row.suppliers_count === undefined
        ? null
        : Number(row.suppliers_count),
    observationsCount:
      row.observations_count === null || row.observations_count === undefined
        ? null
        : Number(row.observations_count),
    differencePct,
    isVerified: (row.verification_status as string) === "verified",
  };
}

export function benchmarkSummary(benchmark: IndexBenchmark | null): string {
  if (!benchmark) return "No published index price for this material yet.";
  if (!benchmark.isVerified) {
    return "The index holds a last-known price for this material but it has not been verified for this market.";
  }
  if (benchmark.differencePct === null) {
    return "Index price is in a different currency, so no percentage comparison is shown.";
  }
  const direction =
    benchmark.differencePct > 0
      ? "above"
      : benchmark.differencePct < 0
        ? "below"
        : "level with";
  return `This listing is ${Math.abs(benchmark.differencePct).toFixed(1)}% ${direction} the verified index price.`;
}
