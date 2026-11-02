/**
 * Public supplier profile.
 *
 * Shows what the supplier published, what FRELUX checked, and how each listing
 * sits against the published Material Price Index when a verified benchmark
 * exists. Verification copy is explicit that no level is a quality warranty.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  MapPin,
  Phone,
  Mail,
  Truck,
  ShieldCheck,
  Loader2,
  Bookmark,
  BookmarkCheck,
  Flag,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import { useAuth } from "@/lib/auth";
import { useSeo, SITE_URL } from "@/lib/seo";
import { formatByCode } from "@/lib/international/currency-format";
import {
  fetchSavedSupplierIds,
  fetchSupplierBySlug,
  reportSupplier,
  saveSupplier,
  unsaveSupplier,
} from "@/lib/suppliers/queries";
import {
  publicBadge,
  verificationDefinition,
} from "@/lib/suppliers/verification";
import {
  categoryLabel,
  type SupplierDeliveryZone,
  type SupplierListing,
  type SupplierProfile,
} from "@/lib/suppliers/types";
import {
  benchmarkSummary,
  fetchIndexBenchmark,
  type IndexBenchmark,
} from "@/lib/suppliers/index-bridge";

function ListingRow({
  listing,
  benchmark,
}: {
  listing: SupplierListing;
  benchmark: IndexBenchmark | null | undefined;
}) {
  const badge =
    benchmark && benchmark.isVerified
      ? benchmark.differencePct === null
        ? "Index price in another currency"
        : benchmark.differencePct > 0
          ? `${benchmark.differencePct.toFixed(1)}% above index`
          : `${benchmark.differencePct.toFixed(1)}% below index`
      : null;

  return (
    <li className="border-b border-slate-100 py-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">
            {listing.product_name}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {[listing.brand, listing.specification]
              .filter(Boolean)
              .join(" · ") || "Specification not stated"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">
            {formatByCode(Number(listing.unit_price), listing.currency)}
            <span className="text-xs font-normal text-slate-500">
              /{listing.unit}
            </span>
          </p>
          <p className="text-[11px] text-slate-500">
            {listing.in_stock ? "In stock" : "Out of stock"}
            {listing.delivery_fee !== null
              ? ` · delivery ${formatByCode(Number(listing.delivery_fee), listing.delivery_fee_currency ?? listing.currency)}`
              : listing.delivery_available
                ? " · delivery quoted"
                : " · pickup"}
          </p>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <span>
          Price updated{" "}
          {new Date(listing.price_updated_at).toLocaleDateString()}
        </span>
        {listing.lead_time_days !== null ? (
          <span>· lead time {listing.lead_time_days} days</span>
        ) : null}
        {badge ? (
          <span
            className={
              benchmark?.isVerified &&
              benchmark.differencePct !== null &&
              benchmark.differencePct < 0
                ? "font-medium text-emerald-700"
                : "font-medium text-slate-600"
            }
            title={benchmarkSummary(benchmark ?? null)}
          >
            · {badge}
          </span>
        ) : null}
      </div>
    </li>
  );
}

export default function SupplierProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<SupplierProfile | null>(null);
  const [listings, setListings] = useState<SupplierListing[]>([]);
  const [zones, setZones] = useState<SupplierDeliveryZone[]>([]);
  const [benchmarks, setBenchmarks] = useState<
    Record<string, IndexBenchmark | null>
  >({});
  const [saved, setSaved] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportDone, setReportDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supplierIdFromQuery = params.get("supplier");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { fetchSupplierById } = await import("@/lib/suppliers/queries");
      const data =
        slug && slug !== "profile"
          ? await fetchSupplierBySlug(slug)
          : supplierIdFromQuery
            ? await fetchSupplierById(supplierIdFromQuery)
            : { supplier: null, listings: [], zones: [], error: null };
      if (cancelled) return;
      setSupplier(data.supplier);
      setListings(data.listings);
      setZones(data.zones);
      setError(data.error);
      setLoading(false);

      if (data.supplier && data.listings.length > 0) {
        const entries = await Promise.all(
          data.listings.slice(0, 12).map(async (listing) => {
            const benchmark = await fetchIndexBenchmark({
              marketCode: listing.market_code,
              materialSlug: listing.material_slug,
              listingPrice: Number(listing.unit_price),
              currency: listing.currency,
            });
            return [listing.id, benchmark] as const;
          }),
        );
        if (!cancelled) setBenchmarks(Object.fromEntries(entries));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug, supplierIdFromQuery]);

  useEffect(() => {
    if (!user || !supplier) return;
    fetchSavedSupplierIds(user.id).then(({ ids }) =>
      setSaved(ids.includes(supplier.id)),
    );
  }, [user, supplier]);

  useSeo(
    supplier
      ? {
          title: `${supplier.company_name} material supplier${supplier.city ? ` in ${supplier.city}` : ""}`,
          description:
            supplier.description?.slice(0, 155) ??
            `${supplier.company_name}: construction material catalogue, delivery coverage and verification level on FRELUX.`,
          canonicalPath: `/suppliers/${supplier.public_slug ?? supplier.id}`,
        }
      : null,
  );

  const grouped = useMemo(() => {
    const map = new Map<string, SupplierListing[]>();
    for (const listing of listings) {
      map.set(listing.material_category, [
        ...(map.get(listing.material_category) ?? []),
        listing,
      ]);
    }
    return [...map.entries()].sort((a, b) =>
      categoryLabel(a[0]).localeCompare(categoryLabel(b[0])),
    );
  }, [listings]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-16 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading supplier…
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-semibold text-slate-900">
          Supplier not found
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          This profile may have been removed, or the link may be wrong. {error}
        </p>
        <Link to="/suppliers" className="mt-4 inline-block">
          <Button variant="outline">Back to the directory</Button>
        </Link>
      </div>
    );
  }

  const badge = publicBadge(supplier.verification_level);
  const definition = verificationDefinition(supplier.verification_level);

  const toggleSave = async () => {
    if (!user) return;
    const next = !saved;
    setSaved(next);
    const { error: saveError } = next
      ? await saveSupplier(user.id, supplier.id)
      : await unsaveSupplier(user.id, supplier.id);
    if (saveError) setSaved(!next);
  };

  const submitReport = async () => {
    if (!user || !reportText.trim()) return;
    const { error: reportError } = await reportSupplier({
      reporterId: user.id,
      supplierId: supplier.id,
      reportType: "other",
      reason: "Supplier report",
      description: reportText,
    });
    setReporting(false);
    setReportDone(reportError ?? "Report sent to FRELUX for review.");
    setReportText("");
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <nav className="text-xs text-slate-500">
        <Link to="/suppliers" className="hover:underline">
          Supplier directory
        </Link>
        <span className="mx-1">/</span>
        <span>{supplier.company_name}</span>
      </nav>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {supplier.company_name}
            </h1>
            <Badge
              variant={
                badge.tone === "positive"
                  ? "default"
                  : badge.tone === "info"
                    ? "secondary"
                    : "outline"
              }
            >
              {badge.label}
            </Badge>
            {supplier.is_featured ? (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                Featured (paid placement)
              </span>
            ) : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {[supplier.neighbourhood, supplier.city, supplier.country_name]
                .filter(Boolean)
                .join(", ")}
            </span>
            {supplier.phone ? (
              <a
                href={`tel:${supplier.phone}`}
                className="inline-flex items-center gap-1 hover:underline"
              >
                <Phone className="h-4 w-4" />
                {supplier.phone}
              </a>
            ) : null}
            {supplier.email ? (
              <a
                href={`mailto:${supplier.email}`}
                className="inline-flex items-center gap-1 hover:underline"
              >
                <Mail className="h-4 w-4" />
                {supplier.email}
              </a>
            ) : null}
          </p>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {supplier.description ??
              "This supplier has not added a description yet."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={toggleSave}>
            {saved ? (
              <BookmarkCheck className="mr-2 h-4 w-4" />
            ) : (
              <Bookmark className="mr-2 h-4 w-4" />
            )}
            {saved ? "Saved" : "Save supplier"}
          </Button>
          <Link
            to={`/procurement/new?supplier=${supplier.id}${supplier.product_categories[0] ? `&category=${supplier.product_categories[0]}` : ""}`}
          >
            <Button size="sm">
              Request a quotation <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />{" "}
          {definition.label}
        </h2>
        <p className="mt-1 text-sm text-slate-700">{definition.meaning}</p>
        {definition.checked.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {definition.checked.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
        ) : null}
        <p className="mt-2 flex gap-1.5 text-xs text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{" "}
          {definition.doesNotMean}
        </p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Catalogue</h2>
          {grouped.length === 0 ? (
            <p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
              No published products yet. When this supplier publishes prices
              they appear here with their update date.
            </p>
          ) : (
            <div className="mt-2 space-y-4">
              {grouped.map(([category, items]) => (
                <section
                  key={category}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <h3 className="text-sm font-semibold text-slate-800">
                    {categoryLabel(category)}
                  </h3>
                  <ul className="mt-1">
                    {items.map((listing) => (
                      <ListingRow
                        key={listing.id}
                        listing={listing}
                        benchmark={benchmarks[listing.id]}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Truck className="h-4 w-4" /> Delivery coverage
            </h2>
            {zones.length === 0 ? (
              <p className="mt-1 text-xs text-slate-600">
                No delivery zones published. Ask the supplier directly before
                assuming delivery.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
                {zones.map((zone) => (
                  <li
                    key={zone.id}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <span>
                      {[zone.neighbourhood, zone.city]
                        .filter(Boolean)
                        .join(", ")}
                      {zone.eta_days !== null ? (
                        <span className="text-slate-400">
                          {" "}
                          · {zone.eta_days}d
                        </span>
                      ) : null}
                    </span>
                    <span className="font-medium text-slate-800">
                      {zone.delivery_fee === 0
                        ? "Free"
                        : formatByCode(zone.delivery_fee, zone.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {supplier.delivery_notes ? (
              <p className="mt-2 text-xs text-slate-500">
                {supplier.delivery_notes}
              </p>
            ) : null}
            {supplier.minimum_order_value !== null ? (
              <p className="mt-2 text-xs text-slate-500">
                Minimum order{" "}
                {formatByCode(supplier.minimum_order_value, "NGN")}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600">
            <h2 className="text-sm font-semibold text-slate-900">
              Business details
            </h2>
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between gap-2">
                <dt>Market</dt>
                <dd className="font-medium text-slate-800">
                  {supplier.market_code}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Registration no.</dt>
                <dd className="font-medium text-slate-800">
                  {supplier.business_reg_no ?? "Not supplied"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Categories</dt>
                <dd className="text-right font-medium text-slate-800">
                  {supplier.product_categories.map(categoryLabel).join(", ") ||
                    "None"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Quotes served</dt>
                <dd className="font-medium text-slate-800">
                  {supplier.total_quotes_served ?? 0}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Flag className="h-4 w-4" /> Report a problem
            </h2>
            {reportDone ? (
              <p className="mt-1 text-xs text-slate-600">{reportDone}</p>
            ) : reporting ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  rows={3}
                  placeholder="What happened? Include dates and amounts."
                  className="w-full rounded-md border border-slate-200 p-2 text-xs"
                />
                <Button
                  size="sm"
                  onClick={submitReport}
                  disabled={!reportText.trim()}
                >
                  Send report
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  user
                    ? setReporting(true)
                    : setReportDone("Sign in to report a supplier.")
                }
                className="mt-1 text-xs font-medium text-sky-700 hover:underline"
              >
                Report a fake listing, wrong price or non-delivery
              </button>
            )}
          </div>
        </aside>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: supplier.company_name,
            description: supplier.description ?? undefined,
            telephone: supplier.phone ?? undefined,
            email: supplier.email ?? undefined,
            address: {
              "@type": "PostalAddress",
              streetAddress: supplier.address ?? undefined,
              addressLocality: supplier.city ?? undefined,
              addressCountry: supplier.market_code,
            },
            url: `${SITE_URL}/suppliers/${supplier.public_slug ?? supplier.id}`,
          }),
        }}
      />
    </div>
  );
}
