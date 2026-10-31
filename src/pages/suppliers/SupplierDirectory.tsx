/**
 * Supplier directory.
 *
 * Public, crawlable page: a buyer can find material suppliers by market, city,
 * neighbourhood, category and verification level, see who delivers where, and
 * open a supplier's profile. Paid placements are shown in their own labelled
 * block, never mixed into the organic order.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  MapPin,
  Loader2,
  ShieldCheck,
  Store,
  Truck,
  Scale,
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  Info,
} from "lucide-react";
import { MapPanel } from "@/components/map/MapPanel";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Badge } from "@/components/ui/shadcn/badge";
import { useAuth } from "@/lib/auth";
import { useSeo, SITE_URL } from "@/lib/seo";
import { classNames } from "@/lib/utils";
import { formatByCode } from "@/lib/international/currency-format";
import { COUNTRY_OPTIONS } from "@/lib/international/countries";
import {
  fetchSavedSupplierIds,
  saveSupplier,
  unsaveSupplier,
  searchSuppliers,
} from "@/lib/suppliers/queries";
import {
  publicBadge,
  verificationDefinition,
} from "@/lib/suppliers/verification";
import {
  SUPPLIER_CATEGORIES,
  categoryLabel,
  type SupplierSearchResult,
} from "@/lib/suppliers/types";

const MARKETS = COUNTRY_OPTIONS.flatMap((group) => group.countries).slice(
  0,
  60,
);

function SupplierCard({
  result,
  saved,
  onToggleSave,
  selected,
  onToggleCompare,
}: {
  result: SupplierSearchResult;
  saved: boolean;
  onToggleSave: () => void;
  selected: boolean;
  onToggleCompare: () => void;
}) {
  const badge = publicBadge(result.supplier.verification_level);
  const definition = verificationDefinition(result.supplier.verification_level);
  const currency = result.currency ?? "NGN";
  const cities = [...new Set(result.zones.map((z) => z.city))].slice(0, 4);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={
                result.supplier.public_slug
                  ? `/suppliers/${result.supplier.public_slug}`
                  : `/suppliers?supplier=${result.supplier.id}`
              }
              className="truncate text-base font-semibold text-slate-900 hover:underline"
            >
              {result.supplier.company_name}
            </Link>
            <Badge
              variant={
                badge.tone === "positive"
                  ? "default"
                  : badge.tone === "info"
                    ? "secondary"
                    : "outline"
              }
              className="shrink-0 text-[11px]"
              title={definition.meaning}
            >
              {badge.label}
            </Badge>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {[result.supplier.neighbourhood, result.supplier.city]
                .filter(Boolean)
                .join(", ") || result.supplier.market_code}
            </span>
            {result.supplier.rating ? (
              <span>· {result.supplier.rating.toFixed(1)}/5 rating</span>
            ) : null}
            {result.listings.length > 0 ? (
              <span>· {result.listings.length} listed products</span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleSave}
            aria-label={saved ? "Remove from saved suppliers" : "Save supplier"}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
          >
            {saved ? (
              <BookmarkCheck className="h-4 w-4 text-emerald-600" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onToggleCompare}
            aria-label={
              selected ? "Remove from comparison" : "Add to comparison"
            }
            className={classNames(
              "rounded-md p-2 hover:bg-slate-100",
              selected ? "text-sky-600" : "text-slate-500",
            )}
          >
            <Scale className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
        {result.supplier.description ?? "No description supplied yet."}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {result.supplier.product_categories.slice(0, 5).map((slug) => (
          <span
            key={slug}
            className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
          >
            {categoryLabel(slug)}
          </span>
        ))}
      </div>

      {result.matchedListings.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
          {result.matchedListings.slice(0, 3).map((listing) => (
            <li
              key={listing.id}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="min-w-0 truncate text-slate-700">
                {listing.product_name}
                {listing.specification ? (
                  <span className="text-slate-400">
                    {" "}
                    · {listing.specification}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 font-medium text-slate-900">
                {formatByCode(Number(listing.unit_price), listing.currency)}
                <span className="text-xs font-normal text-slate-500">
                  /{listing.unit}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">
          No published prices match this search yet.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        {cities.length > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Truck className="h-3.5 w-3.5" /> Delivers to {cities.join(", ")}
          </span>
        ) : result.listings.some((l) => l.delivery_available) ? (
          <span className="inline-flex items-center gap-1">
            <Truck className="h-3.5 w-3.5" /> Delivery available
          </span>
        ) : (
          <span>Pickup only</span>
        )}
        {result.lowestPrice !== null ? (
          <span>
            From {formatByCode(result.lowestPrice, currency)} · prices in{" "}
            {currency}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export default function SupplierDirectory() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const [marketCode, setMarketCode] = useState(params.get("market") ?? "NG");
  const [city, setCity] = useState(params.get("city") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [verification, setVerification] = useState(
    params.get("verified") ?? "any",
  );
  const [inStockOnly, setInStockOnly] = useState(params.get("stock") === "1");
  const [deliveryOnly, setDeliveryOnly] = useState(
    params.get("delivery") === "1",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoted, setPromoted] = useState<SupplierSearchResult[]>([]);
  const [organic, setOrganic] = useState<SupplierSearchResult[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);

  useSeo({
    title: "Verified construction material suppliers and prices",
    description:
      "Find construction material suppliers by city, category and verification level across FRELUX markets. Compare specifications, prices and delivery coverage, then request quotations.",
    canonicalPath: "/suppliers",
  });

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { results, error: searchError } = await searchSuppliers({
      marketCode,
      city: city || undefined,
      category: category || undefined,
      query: query || undefined,
      verificationLevel: verification as never,
      inStockOnly,
      deliveryOnly,
    });
    setPromoted(results.promoted);
    setOrganic(results.organic);
    setError(searchError);
    setLoading(false);
  }, [
    marketCode,
    city,
    category,
    query,
    verification,
    inStockOnly,
    deliveryOnly,
  ]);

  useEffect(() => {
    const timer = setTimeout(runSearch, 250);
    return () => clearTimeout(timer);
  }, [runSearch]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (marketCode) next.set("market", marketCode);
    if (city) next.set("city", city);
    if (category) next.set("category", category);
    if (query) next.set("q", query);
    if (verification !== "any") next.set("verified", verification);
    if (inStockOnly) next.set("stock", "1");
    if (deliveryOnly) next.set("delivery", "1");
    setParams(next, { replace: true });
  }, [
    marketCode,
    city,
    category,
    query,
    verification,
    inStockOnly,
    deliveryOnly,
    setParams,
  ]);

  useEffect(() => {
    if (!user) {
      setSavedIds([]);
      return;
    }
    fetchSavedSupplierIds(user.id).then(({ ids }) => setSavedIds(ids));
  }, [user]);

  const toggleSave = async (supplierId: string) => {
    if (!user) return;
    const isSaved = savedIds.includes(supplierId);
    setSavedIds((prev) =>
      isSaved ? prev.filter((id) => id !== supplierId) : [...prev, supplierId],
    );
    const { error: saveError } = isSaved
      ? await unsaveSupplier(user.id, supplierId)
      : await saveSupplier(user.id, supplierId);
    if (saveError)
      setSavedIds((prev) =>
        isSaved
          ? [...prev, supplierId]
          : prev.filter((id) => id !== supplierId),
      );
  };

  const toggleCompare = (supplierId: string) => {
    setCompare((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId].slice(0, 4),
    );
  };

  const total = promoted.length + organic.length;
  const compareHref = useMemo(
    () => `/suppliers/compare?ids=${compare.join(",")}`,
    [compare],
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Construction material suppliers
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Search suppliers by market, city and category. Every badge states what
          FRELUX checked. A registered account is not a recommendation, and
          prices are supplier-declared until their verification level says a
          check has been run.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link
            to="/suppliers/register"
            className="font-medium text-sky-700 hover:underline"
          >
            Register as a supplier
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            to="/procurement"
            className="font-medium text-sky-700 hover:underline"
          >
            Post a material request
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            to="/material-prices"
            className="font-medium text-sky-700 hover:underline"
          >
            Material price index
          </Link>
        </div>
      </header>

      <section className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cement, 42.5R, block moulding…"
              className="pl-9"
              aria-label="Search suppliers and products"
            />
          </label>
          <select
            value={marketCode}
            onChange={(e) => setMarketCode(e.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            aria-label="Market"
          >
            {MARKETS.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City or neighbourhood"
            aria-label="City or neighbourhood"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            aria-label="Material category"
          >
            <option value="">All material categories</option>
            {SUPPLIER_CATEGORIES.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <select
            value={verification}
            onChange={(e) => setVerification(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-2"
            aria-label="Verification level"
          >
            <option value="any">Any verification level</option>
            <option value="platform_verified">Platform verified</option>
            <option value="address_checked">Address checked or higher</option>
            <option value="documents_reviewed">
              Documents reviewed or higher
            </option>
            <option value="identity_checked">Identity checked or higher</option>
          </select>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
            />
            In stock only
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={deliveryOnly}
              onChange={(e) => setDeliveryOnly(e.target.checked)}
            />
            Delivers
          </label>
          {compare.length > 0 ? (
            <Link
              to={compareHref}
              className="ml-auto inline-flex items-center gap-1 font-medium text-sky-700"
            >
              Compare {compare.length} selected{" "}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching suppliers…
            </div>
          ) : error ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              The directory could not load right now. {error}
            </div>
          ) : total === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
              <p className="font-medium text-slate-900">
                No supplier matches these filters yet.
              </p>
              <p className="mt-1">
                Nothing here is hidden to make the directory look fuller. Try a
                wider city, another category, or register your own business if
                you supply materials in this market.
              </p>
              <Link to="/suppliers/register" className="mt-3 inline-block">
                <Button size="sm">Register a supplier</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {promoted.length > 0 ? (
                <section>
                  <div className="mb-2 flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Featured suppliers
                    </h2>
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                      Paid placement
                    </span>
                  </div>
                  <p className="mb-3 text-xs text-slate-500">
                    These suppliers paid for placement. Being featured says
                    nothing about verification level, price or reliability, and
                    does not affect the order of the organic results below.
                  </p>
                  <div className="grid gap-3">
                    {promoted.map((result) => (
                      <SupplierCard
                        key={result.supplier.id}
                        result={result}
                        saved={savedIds.includes(result.supplier.id)}
                        onToggleSave={() => toggleSave(result.supplier.id)}
                        selected={compare.includes(result.supplier.id)}
                        onToggleCompare={() =>
                          toggleCompare(result.supplier.id)
                        }
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {total} {total === 1 ? "supplier" : "suppliers"}
                  </h2>
                  <span className="text-xs text-slate-500">
                    Ordered by verification, reviews, responsiveness and price
                    freshness
                  </span>
                </div>
                <div className="grid gap-3">
                  {organic.map((result) => (
                    <SupplierCard
                      key={result.supplier.id}
                      result={result}
                      saved={savedIds.includes(result.supplier.id)}
                      onToggleSave={() => toggleSave(result.supplier.id)}
                      selected={compare.includes(result.supplier.id)}
                      onToggleCompare={() => toggleCompare(result.supplier.id)}
                    />
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <MapPanel
            layers={["suppliers"]}
            title="Supplier locations"
            subtitle="Pins come from a supplier's tracked trading city, not an estimate."
            height={280}
            defaultLayer="suppliers"
            exploreHref="/suppliers"
          />
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> What the
              badges mean
            </h3>
            <ul className="mt-2 space-y-2 text-xs text-slate-600">
              {[
                "unverified",
                "identity_checked",
                "documents_reviewed",
                "address_checked",
                "platform_verified",
              ].map((level) => {
                const entry = verificationDefinition(level);
                return (
                  <li key={level}>
                    <span className="font-medium text-slate-800">
                      {entry.shortLabel}:
                    </span>{" "}
                    {entry.meaning}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 flex gap-1.5 text-[11px] text-slate-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              No level is a warranty. Agree specifications, quantities and
              delivery terms in writing before you pay.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
              <Store className="h-4 w-4" /> Own a supply business?
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Publish your catalogue, delivery coverage and prices, then answer
              material requests from buyers in your market.
            </p>
            <Link to="/suppliers/register" className="mt-2 inline-block">
              <Button size="sm" variant="outline">
                List your business
              </Button>
            </Link>
          </div>
        </aside>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Construction material suppliers",
            url: `${SITE_URL}/suppliers`,
            description:
              "Verified-level construction material suppliers with prices, delivery coverage and verification levels.",
          }),
        }}
      />
    </div>
  );
}
