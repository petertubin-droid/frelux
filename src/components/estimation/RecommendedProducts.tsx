import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Package, RefreshCw } from "lucide-react";
import { useMarket } from "@/lib/international/market-context";
import { formatCurrency } from "@/lib/utils";
import {
  loadProductRecommendations,
  type ProductRecommendation,
} from "@/lib/products/product-recommendations";
import type { VerifiedProductCategory } from "@/config/verified-products";

interface RecommendedProductsProps {
  /** Catalogue category this estimator buys from. */
  category: VerifiedProductCategory;
  /** How many products to show. */
  limit?: number;
  /** Heading override, for a page that words the section differently. */
  title?: string;
  className?: string;
}

const CATEGORY_NOUN: Record<string, string> = {
  paint: "paint",
  cement: "cement",
  aggregate: "sand and aggregate",
  rebar: "reinforcement",
  steel: "steel",
  roofing: "roofing",
  flooring: "tiles and flooring",
  pipe: "pipework",
  plumbing: "plumbing fittings",
  waterproofing: "waterproofing",
  electrical: "electrical",
  doors_windows: "doors and windows",
  timber: "timber",
  drywall: "drywall",
  plaster: "plaster",
  filler: "filler",
  primer: "primer",
  adhesive: "adhesive",
  sealant: "sealant",
};

function priceText(
  product: ProductRecommendation,
  symbol: string,
): string | null {
  if (!product.price) return null;
  const low = formatCurrency(product.price.low, symbol);
  if (product.price.high === null) return low;
  return `${low} to ${formatCurrency(product.price.high, symbol)}`;
}

function specText(product: ProductRecommendation): string[] {
  const specs: string[] = [];
  if (product.detail) specs.push(product.detail);
  if (product.coveragePerLitre) {
    specs.push(`${product.coveragePerLitre} m² per litre per coat`);
  }
  if (product.coats) specs.push(`${product.coats} coats`);
  return specs;
}

/**
 * The products worth choosing between for this estimator's category.
 *
 * Advisory only: it never feeds a calculation. The estimate still comes from
 * the deterministic engine and the market's verified price book, which is why
 * the footnote says so rather than implying these prices are what gets quoted.
 */
export default function RecommendedProducts({
  category,
  limit = 4,
  title,
  className,
}: RecommendedProductsProps) {
  const { marketCode, market } = useMarket();
  const [items, setItems] = useState<ProductRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadProductRecommendations({ category, market: marketCode, limit })
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setError(result.error);
      })
      .catch(() => {
        if (!active) return;
        setItems([]);
        setError(
          "The product catalogue could not be read just now. Your estimate is unaffected.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [category, marketCode, limit, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const noun = CATEGORY_NOUN[category] ?? category.replace(/_/g, " ");

  if (loading) {
    return (
      <section
        aria-busy="true"
        aria-label={`Loading recommended ${noun} products`}
        className={`mt-8 ${className ?? ""}`}
      >
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-border bg-muted/40"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error && items.length === 0) {
    return (
      <section
        role="alert"
        className={`mt-8 rounded-lg border border-border bg-card p-4 ${className ?? ""}`}
      >
        <p className="text-sm font-medium text-card-foreground">
          Recommended products are unavailable
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
          Try again
        </button>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby={`recommended-${category}-heading`}
      className={`mt-8 ${className ?? ""}`}
    >
      <div className="flex items-center gap-2">
        <Package aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
        <h2
          id={`recommended-${category}-heading`}
          className="text-base font-semibold text-foreground"
        >
          {title ?? `Products to consider for ${noun}`}
        </h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Durable lines sold in {market.countryName}, with published pack prices
        where the manufacturer or its store publishes one.
      </p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((product) => {
          const price = priceText(product, market.currencySymbol);
          const specs = specText(product);
          return (
            <li
              key={product.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {product.brand ?? "Verified product"}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-card-foreground">
                {product.name}
              </p>
              {product.summary && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {product.summary}
                </p>
              )}
              {specs.length > 0 && (
                <p className="mt-2 text-xs text-card-foreground">
                  {specs.join(" · ")}
                </p>
              )}
              <p className="mt-2 text-sm font-semibold text-card-foreground">
                {price ?? "Pack price not published"}
              </p>
              {product.priceNote && (
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {product.priceNote}
                </p>
              )}
              <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground">
                <span>{product.source.label}</span>
                {product.source.retrieved && <span aria-hidden="true">·</span>}
                {product.source.retrieved && (
                  <span>read {product.source.retrieved}</span>
                )}
                {product.source.url && (
                  <a
                    href={product.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Source
                    <ExternalLink aria-hidden="true" className="h-3 w-3" />
                  </a>
                )}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        These are buying recommendations. Your estimate is still calculated by
        FRELUX's deterministic engine from its own verified {noun} prices, so a
        product price shown here does not change what the quote charges.
      </p>
    </section>
  );
}
