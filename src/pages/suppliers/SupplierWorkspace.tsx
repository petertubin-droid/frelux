/**
 * Supplier workspace.
 *
 * The supplier's side of the marketplace: verification progress, catalogue and
 * moderation state, delivery coverage, buyer requests to quote, and orders to
 * progress. Trust actions (verification requests, order movement) go through the
 * supplier-ops function; nothing here can raise its own verification level.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Loader2,
  Package,
  Truck,
  Inbox,
  ClipboardList,
  Plus,
  UploadCloud,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Badge } from "@/components/ui/shadcn/badge";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { formatByCode } from "@/lib/international/currency-format";
import {
  fetchMySupplier,
  fetchSupplierListings,
  fetchVerificationEvents,
  saveDeliveryZone,
  removeDeliveryZone,
  saveListing,
} from "@/lib/suppliers/queries";
import {
  advanceOrderStatus,
  fetchOrders,
  fetchOpenRequestsForSupplier,
  fetchMyQuotes,
  orderStatusLabel,
  quoteTotals,
  submitQuote,
  type RequestDraftItem,
} from "@/lib/suppliers/procurement";
import {
  nextLevel,
  requestableLevels,
  verificationDefinition,
  verificationRequirements,
  publicBadge,
} from "@/lib/suppliers/verification";
import { submitListingPriceForReview } from "@/lib/suppliers/index-bridge";
import {
  SUPPLIER_CATEGORIES,
  categoryDefaultUnit,
  categoryLabel,
  type MaterialOrder,
  type MaterialRequest,
  type MaterialRequestItem,
  type MaterialRequestQuote,
  type SupplierDeliveryZone,
  type SupplierListing,
  type SupplierProfile,
} from "@/lib/suppliers/types";
import { supabase } from "@/lib/supabase";

type Tab = "verification" | "catalogue" | "delivery" | "requests" | "orders";

const TABS: { key: Tab; label: string; icon: typeof ShieldCheck }[] = [
  { key: "verification", label: "Verification", icon: ShieldCheck },
  { key: "catalogue", label: "Catalogue", icon: Package },
  { key: "delivery", label: "Delivery", icon: Truck },
  { key: "requests", label: "Requests", icon: Inbox },
  { key: "orders", label: "Orders", icon: ClipboardList },
];

export default function SupplierWorkspace() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("verification");
  const [supplier, setSupplier] = useState<SupplierProfile | null>(null);
  const [listings, setListings] = useState<SupplierListing[]>([]);
  const [zones, setZones] = useState<SupplierDeliveryZone[]>([]);
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [requestItems, setRequestItems] = useState<MaterialRequestItem[]>([]);
  const [quotes, setQuotes] = useState<MaterialRequestQuote[]>([]);
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useSeo({
    title: "Supplier workspace: verification, catalogue and requests",
    description:
      "Manage your supplier catalogue, delivery coverage, verification requests, buyer requests and orders on FRELUX.",
    canonicalPath: "/suppliers/workspace",
    noIndex: true,
  });

  const load = useCallback(async (userId: string) => {
    setLoading(true);
    const { supplier: profile } = await fetchMySupplier(userId);
    setSupplier(profile);
    if (profile) {
      const [
        listingResult,
        eventResult,
        requestResult,
        quoteResult,
        orderResult,
        zoneResult,
      ] = await Promise.all([
        fetchSupplierListings(profile.id),
        fetchVerificationEvents(profile.id),
        fetchOpenRequestsForSupplier(profile.market_code),
        fetchMyQuotes(profile.id),
        fetchOrders(userId, "supplier", profile.id),
        supabase
          .from("supplier_delivery_zones")
          .select("*")
          .eq("supplier_id", profile.id)
          .eq("is_active", true),
      ]);
      setListings(listingResult.listings);
      setEvents(eventResult.events as Record<string, unknown>[]);
      setRequests(requestResult.requests);
      setRequestItems(requestResult.items);
      setQuotes(quoteResult.quotes);
      setOrders(orderResult.orders);
      setZones((zoneResult.data ?? []) as SupplierDeliveryZone[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) load(user.id);
    else setLoading(false);
  }, [user, load]);

  const frelux = useMemo(() => {
    const latest = listings
      .map((l) => new Date(l.price_updated_at).getTime())
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => b - a)[0];
    return latest ? Math.floor((Date.now() - latest) / 86_400_000) : null;
  }, [listings]);

  const requirements =
    supplier && nextLevel(supplier.verification_level)
      ? verificationRequirements(nextLevel(supplier.verification_level)!, {
          hasBusinessRegNo: Boolean(supplier.business_reg_no),
          hasTaxId: Boolean(supplier.tax_id),
          hasAddress: Boolean(supplier.address),
          hasPhone: Boolean(supplier.phone),
          hasEmail: Boolean(supplier.email),
          hasContactName: Boolean(supplier.contact_name),
          hasCategories: supplier.product_categories.length > 0,
          hasListings: listings.length > 0,
          latestPriceDaysOld: frelux,
          priorLevel: supplier.verification_level,
        })
      : [];

  const requestVerification = async (level: string) => {
    setBusy("verification");
    setError(null);
    setNotice(null);
    const { data, error: invokeError } = await supabase.functions.invoke(
      "supplier-ops",
      {
        body: {
          action: "request_verification",
          level,
          evidence_ref: supplier?.business_reg_no ?? supplier?.address ?? "",
        },
      },
    );
    setBusy(null);
    const payload = data as {
      ok?: boolean;
      message?: string;
      error?: string;
    } | null;
    if (invokeError || !payload?.ok) {
      setError(
        payload?.error ??
          invokeError?.message ??
          "The request could not be sent.",
      );
      return;
    }
    setNotice(payload.message ?? "Verification request sent.");
    if (user) load(user.id);
  };

  const submitIndexPrice = async (listing: SupplierListing) => {
    if (!supplier) return;
    setBusy(listing.id);
    const result = await submitListingPriceForReview({
      cityName: supplier.city,
      itemName: listing.product_name,
      price: Number(listing.unit_price),
      unit: listing.unit,
      vendorName: supplier.company_name,
      contactEmail: supplier.email,
      notes: `Supplier listing ${listing.id}`,
    });
    setBusy(null);
    setError(result.error);
    setNotice(result.submitted || result.duplicate ? result.message : null);
  };

  const addListing = async (form: {
    category: string;
    name: string;
    brand: string;
    spec: string;
    unit: string;
    price: string;
    deliveryFee: string;
    inStock: boolean;
  }) => {
    if (!supplier) return;
    setBusy("listing");
    const { error: saveError } = await saveListing({
      supplier_id: supplier.id,
      market_code: supplier.market_code,
      material_category: form.category,
      material_slug:
        `${form.category}-${form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.slice(
          0,
          80,
        ),
      product_name: form.name,
      brand: form.brand || null,
      specification: form.spec || null,
      unit: form.unit,
      unit_price: Number(form.price) || 0,
      currency: supplier.market_code === "NG" ? "NGN" : "USD",
      minimum_order_qty: null,
      in_stock: form.inStock,
      lead_time_days: null,
      delivery_available:
        Boolean(form.deliveryFee) || supplier.delivery_fee_model !== "quoted",
      delivery_fee: form.deliveryFee ? Number(form.deliveryFee) : null,
      delivery_fee_currency: form.deliveryFee
        ? supplier.market_code === "NG"
          ? "NGN"
          : "USD"
        : null,
      description: null,
    });
    setBusy(null);
    if (saveError) setError(saveError);
    else {
      setNotice(
        "Listing added. It is queued for moderation before it appears in the public directory.",
      );
      if (user) load(user.id);
    }
  };

  const addZone = async (form: {
    city: string;
    neighbourhood: string;
    fee: string;
    eta: string;
  }) => {
    if (!supplier) return;
    setBusy("zone");
    const { error: saveError } = await saveDeliveryZone({
      supplier_id: supplier.id,
      market_code: supplier.market_code,
      city: form.city,
      neighbourhood: form.neighbourhood || null,
      delivery_fee: Number(form.fee) || 0,
      currency: supplier.market_code === "NG" ? "NGN" : "USD",
      eta_days: form.eta ? Number(form.eta) : null,
      is_active: true,
    });
    setBusy(null);
    if (saveError) setError(saveError);
    else if (user) load(user.id);
  };

  const quote = async (
    request: MaterialRequest,
    rates: Record<string, string>,
    delivery: string,
    days: string,
  ) => {
    if (!supplier || !user) return;
    const items = requestItems.filter((item) => item.request_id === request.id);
    const lines = items.map((item) => ({
      request_item_id: item.id,
      description: [item.product_name, item.brand, item.specification]
        .filter(Boolean)
        .join(" · "),
      unit: item.unit,
      quantity: Number(item.quantity),
      unit_rate: Number(rates[item.id] ?? 0),
    }));
    setBusy(request.id);
    const { quote: created, error: quoteError } = await submitQuote({
      requestId: request.id,
      supplierId: supplier.id,
      supplierUserId: user.id,
      currency: request.currency,
      lines,
      deliveryFee: Number(delivery) || 0,
      leadTimeDays: days ? Number(days) : null,
      validUntil: new Date(Date.now() + 7 * 86_400_000)
        .toISOString()
        .slice(0, 10),
      notes: null,
    });
    setBusy(null);
    if (quoteError) setError(quoteError);
    else if (created) {
      setNotice(`Quotation sent for ${request.reference}.`);
      await supabase
        .from("material_requests")
        .update({ status: "quoted" })
        .eq("id", request.id)
        .eq("status", "open");
      load(user.id);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-16 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your workspace…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-semibold text-slate-900">
          Supplier workspace
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to manage your supplier profile and requests.
        </p>
        <Link to="/login" className="mt-4 inline-block">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-semibold text-slate-900">
          No supplier profile yet
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Register your business to publish a catalogue and receive material
          requests.
        </p>
        <Link to="/suppliers/register" className="mt-4 inline-block">
          <Button>Register a supplier</Button>
        </Link>
      </div>
    );
  }

  const badge = publicBadge(supplier.verification_level);
  const definition = verificationDefinition(supplier.verification_level);
  const pendingRequests = requests.filter(
    (request) =>
      !quotes.some(
        (quote) =>
          quote.request_id === request.id && quote.status !== "withdrawn",
      ),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {supplier.company_name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
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
            <span>
              {[supplier.neighbourhood, supplier.city]
                .filter(Boolean)
                .join(", ")}{" "}
              · {supplier.market_code}
            </span>
            {supplier.public_slug ? (
              <Link
                to={`/suppliers/${supplier.public_slug}`}
                className="inline-flex items-center gap-1 text-sky-700 hover:underline"
              >
                View public profile <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </p>
        </div>
        <Link to="/marketplace/supplier-portal">
          <Button variant="outline" size="sm">
            Bulk price editor
          </Button>
        </Link>
      </header>

      {notice ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <nav className="mt-5 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((entry) => {
          const Icon = entry.icon;
          const active = tab === entry.key;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              className={
                active
                  ? "inline-flex items-center gap-1.5 border-b-2 border-slate-900 px-3 py-2 text-sm font-medium text-slate-900"
                  : "inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
              }
            >
              <Icon className="h-4 w-4" /> {entry.label}
              {entry.key === "requests" && pendingRequests.length > 0 ? (
                <span className="rounded bg-sky-100 px-1.5 text-[11px] text-sky-800">
                  {pendingRequests.length}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {tab === "verification" ? (
        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              {definition.label}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{definition.meaning}</p>
            <p className="mt-2 text-xs text-slate-500">
              {definition.doesNotMean}
            </p>

            {nextLevel(supplier.verification_level) ? (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Next level:{" "}
                  {
                    verificationDefinition(
                      nextLevel(supplier.verification_level)!,
                    ).label
                  }
                </h3>
                <ul className="mt-2 space-y-1 text-xs">
                  {requirements.map((requirement) => (
                    <li
                      key={requirement.requirement}
                      className="flex items-center gap-1.5"
                    >
                      {requirement.met ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <span className="inline-block h-3.5 w-3.5 rounded-full border border-slate-300" />
                      )}
                      <span
                        className={
                          requirement.met ? "text-slate-600" : "text-slate-800"
                        }
                      >
                        {requirement.requirement}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={busy === "verification"}
                  onClick={() =>
                    requestVerification(nextLevel(supplier.verification_level)!)
                  }
                >
                  {busy === "verification" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Request{" "}
                  {
                    verificationDefinition(
                      nextLevel(supplier.verification_level)!,
                    ).shortLabel
                  }
                </Button>
                <p className="mt-1 text-[11px] text-slate-500">
                  FRELUX reviews the request, then approves or rejects it.
                  Levels are granted one step at a time.
                </p>
              </div>
            ) : (
              <p className="mt-3 rounded bg-emerald-50 px-2 py-1.5 text-xs text-emerald-800">
                This is the highest verification level. Keeping prices current
                is what keeps it meaningful.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Verification history
            </h2>
            {events.length === 0 ? (
              <p className="mt-1 text-xs text-slate-600">
                No verification requests yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-2 text-xs text-slate-600">
                {events.map((event) => (
                  <li
                    key={String(event.id)}
                    className="border-b border-slate-100 pb-2 last:border-b-0"
                  >
                    <span className="font-medium text-slate-800">
                      {String(event.action)}
                    </span>{" "}
                    · {String(event.requested_level).replace(/_/g, " ")} ·{" "}
                    {new Date(String(event.created_at)).toLocaleDateString()}
                    {event.note ? (
                      <p className="mt-0.5 text-slate-500">
                        {String(event.note)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-slate-500">
              Requestable now:{" "}
              {requestableLevels(supplier.verification_level)
                .map((level) => verificationDefinition(level).shortLabel)
                .join(", ") || "none"}
            </p>
          </div>
        </section>
      ) : null}

      {tab === "catalogue" ? (
        <CatalogueTab
          listings={listings}
          busy={busy}
          onSubmitIndex={submitIndexPrice}
          onAdd={addListing}
          currency={supplier.market_code === "NG" ? "NGN" : "USD"}
        />
      ) : null}

      {tab === "delivery" ? (
        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Delivery zones
            </h2>
            {zones.length === 0 ? (
              <p className="mt-1 text-xs text-slate-600">
                No zones yet. Buyers filter by delivery coverage, so adding your
                cities helps you appear.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-xs">
                {zones.map((zone) => (
                  <li
                    key={zone.id}
                    className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5"
                  >
                    <span>
                      {[zone.neighbourhood, zone.city]
                        .filter(Boolean)
                        .join(", ")}{" "}
                      ·{" "}
                      {zone.delivery_fee === 0
                        ? "free"
                        : formatByCode(zone.delivery_fee, zone.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await removeDeliveryZone(zone.id);
                        if (user) load(user.id);
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ZoneForm
            onAdd={addZone}
            busy={busy === "zone"}
            defaultCity={supplier.city ?? ""}
          />
        </section>
      ) : null}

      {tab === "requests" ? (
        <RequestsTab
          requests={pendingRequests}
          items={requestItems}
          busy={busy}
          onQuote={quote}
          currency={requests[0]?.currency ?? "NGN"}
        />
      ) : null}

      {tab === "orders" ? (
        <section className="mt-5 space-y-3">
          {orders.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
              No orders yet. When a buyer awards your quotation it appears here
              with the status and delivery record.
            </p>
          ) : (
            orders.map((order) => (
              <article
                key={order.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {order.reference}
                    </p>
                    <p className="text-xs text-slate-500">
                      {orderStatusLabel(order.status)} ·{" "}
                      {formatByCode(order.total, order.currency)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {order.status === "placed" ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          advanceOrderStatus(order.id, "confirmed").then(
                            () => user && load(user.id),
                          )
                        }
                      >
                        Confirm order
                      </Button>
                    ) : null}
                    {order.status === "confirmed" ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          advanceOrderStatus(order.id, "dispatched").then(
                            () => user && load(user.id),
                          )
                        }
                      >
                        Mark dispatched
                      </Button>
                    ) : null}
                    {order.status === "dispatched" ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          advanceOrderStatus(order.id, "delivered").then(
                            () => user && load(user.id),
                          )
                        }
                      >
                        Mark delivered
                      </Button>
                    ) : null}
                    {order.status === "delivered" ? (
                      <span className="text-xs text-slate-500">
                        Waiting for the buyer to confirm receipt.
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      ) : null}
    </div>
  );
}

function CatalogueTab({
  listings,
  busy,
  onSubmitIndex,
  onAdd,
  currency,
}: {
  listings: SupplierListing[];
  busy: string | null;
  onSubmitIndex: (listing: SupplierListing) => void;
  onAdd: (form: {
    category: string;
    name: string;
    brand: string;
    spec: string;
    unit: string;
    price: string;
    deliveryFee: string;
    inStock: boolean;
  }) => void;
  currency: string;
}) {
  const [form, setForm] = useState({
    category: SUPPLIER_CATEGORIES[0].slug,
    name: "",
    brand: "",
    spec: "",
    unit: categoryDefaultUnit(SUPPLIER_CATEGORIES[0].slug),
    price: "",
    deliveryFee: "",
    inStock: true,
  });

  return (
    <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Your listings ({listings.length})
        </h2>
        {listings.length === 0 ? (
          <p className="mt-1 text-xs text-slate-600">
            Nothing listed yet. Add your first product on the right.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {listings.map((listing) => (
              <li key={listing.id} className="py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {listing.product_name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {categoryLabel(listing.material_category)} ·{" "}
                      {listing.brand ?? "no brand"} · updated{" "}
                      {new Date(listing.price_updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatByCode(Number(listing.unit_price), listing.currency)}
                    /{listing.unit}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                  <Badge
                    variant={
                      listing.listing_status === "active"
                        ? "default"
                        : listing.listing_status === "pending"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-[10px]"
                  >
                    {listing.listing_status === "active"
                      ? "Live"
                      : listing.listing_status === "pending"
                        ? "Awaiting moderation"
                        : listing.listing_status}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => onSubmitIndex(listing)}
                    disabled={busy === listing.id}
                    className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline disabled:opacity-50"
                  >
                    <UploadCloud className="h-3.5 w-3.5" /> Submit price to
                    index
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Plus className="h-4 w-4" /> Add a listing
        </h2>
        <div className="mt-2 space-y-2 text-sm">
          <select
            value={form.category}
            onChange={(e) =>
              setForm({
                ...form,
                category: e.target.value,
                unit: categoryDefaultUnit(e.target.value),
              })
            }
            className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
          >
            {SUPPLIER_CATEGORIES.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.label}
              </option>
            ))}
          </select>
          <Input
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            placeholder="Brand"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          />
          <Input
            placeholder="Specification (grade, size, thickness)"
            value={form.spec}
            onChange={(e) => setForm({ ...form, spec: e.target.value })}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
            <Input
              placeholder={`Price (${currency})`}
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <Input
            placeholder={`Delivery fee per order (${currency}), blank if quoted`}
            inputMode="decimal"
            value={form.deliveryFee}
            onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })}
          />
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={form.inStock}
              onChange={(e) => setForm({ ...form, inStock: e.target.checked })}
            />
            In stock now
          </label>
          <Button
            size="sm"
            disabled={busy === "listing" || !form.name.trim() || !form.price}
            onClick={() => onAdd(form)}
          >
            {busy === "listing" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Add listing
          </Button>
          <p className="text-[11px] text-slate-500">
            New listings are reviewed before they appear publicly. Price updates
            keep their own timestamp.
          </p>
        </div>
      </div>
    </section>
  );
}

function ZoneForm({
  onAdd,
  busy,
  defaultCity,
}: {
  onAdd: (form: {
    city: string;
    neighbourhood: string;
    fee: string;
    eta: string;
  }) => void;
  busy: boolean;
  defaultCity: string;
}) {
  const [form, setForm] = useState({
    city: defaultCity,
    neighbourhood: "",
    fee: "0",
    eta: "",
  });
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">
        Add a delivery zone
      </h2>
      <div className="mt-2 space-y-2 text-sm">
        <Input
          placeholder="City"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
        <Input
          placeholder="Neighbourhood (optional)"
          value={form.neighbourhood}
          onChange={(e) => setForm({ ...form, neighbourhood: e.target.value })}
        />
        <div className="flex gap-2">
          <Input
            placeholder="Delivery fee"
            inputMode="decimal"
            value={form.fee}
            onChange={(e) => setForm({ ...form, fee: e.target.value })}
          />
          <Input
            placeholder="Days to deliver"
            inputMode="numeric"
            value={form.eta}
            onChange={(e) => setForm({ ...form, eta: e.target.value })}
          />
        </div>
        <Button
          size="sm"
          disabled={busy || !form.city.trim()}
          onClick={() => onAdd(form)}
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Add zone
        </Button>
      </div>
    </div>
  );
}

function RequestsTab({
  requests,
  items,
  busy,
  onQuote,
  currency,
}: {
  requests: MaterialRequest[];
  items: MaterialRequestItem[];
  busy: string | null;
  onQuote: (
    request: MaterialRequest,
    rates: Record<string, string>,
    delivery: string,
    days: string,
  ) => void;
  currency: string;
}) {
  const [rates, setRates] = useState<Record<string, string>>({});
  const [delivery, setDelivery] = useState<Record<string, string>>({});
  const [days, setDays] = useState<Record<string, string>>({});

  if (requests.length === 0) {
    return (
      <p className="mt-5 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        No open requests in your market right now. Requests appear here when
        buyers post them.
      </p>
    );
  }

  return (
    <section className="mt-5 space-y-4">
      {requests.map((request) => {
        const lines = items.filter((item) => item.request_id === request.id);
        const draft = {
          lines: lines.map((line) => ({
            quantity: Number(line.quantity),
            unit_rate: Number(rates[line.id] ?? 0),
          })),
          deliveryFee: Number(delivery[request.id] ?? 0),
        };
        const totals = quoteTotals(draft);
        const ready =
          lines.length > 0 &&
          lines.every((line) => Number(rates[line.id] ?? 0) > 0);

        return (
          <article
            key={request.id}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {request.title}
                </p>
                <p className="text-xs text-slate-500">
                  {request.reference} ·{" "}
                  {[request.neighbourhood, request.city]
                    .filter(Boolean)
                    .join(", ")}{" "}
                  ·{" "}
                  {request.needed_by
                    ? `needed by ${request.needed_by}`
                    : "date flexible"}
                </p>
                {request.notes ? (
                  <p className="mt-1 text-xs text-slate-600">{request.notes}</p>
                ) : null}
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                {request.status}
              </span>
            </div>

            <ul className="mt-3 space-y-1.5">
              {lines.map((line) => (
                <li
                  key={line.id}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-slate-700">
                    {line.product_name}
                    {line.specification ? (
                      <span className="text-slate-400">
                        {" "}
                        · {line.specification}
                      </span>
                    ) : null}{" "}
                    · {Number(line.quantity)} {line.unit}
                  </span>
                  <Input
                    className="w-28"
                    inputMode="decimal"
                    placeholder="Rate"
                    value={rates[line.id] ?? ""}
                    onChange={(e) =>
                      setRates({ ...rates, [line.id]: e.target.value })
                    }
                  />
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <Input
                className="w-32"
                inputMode="decimal"
                placeholder={`Delivery (${currency})`}
                value={delivery[request.id] ?? ""}
                onChange={(e) =>
                  setDelivery({ ...delivery, [request.id]: e.target.value })
                }
              />
              <Input
                className="w-28"
                inputMode="numeric"
                placeholder="Lead days"
                value={days[request.id] ?? ""}
                onChange={(e) =>
                  setDays({ ...days, [request.id]: e.target.value })
                }
              />
              <span className="text-xs text-slate-500">
                Subtotal {formatByCode(totals.subtotal, currency)} · total{" "}
                {formatByCode(totals.total, currency)}
              </span>
              <Button
                size="sm"
                className="ml-auto"
                disabled={!ready || busy === request.id}
                onClick={() =>
                  onQuote(
                    request,
                    rates,
                    delivery[request.id] ?? "0",
                    days[request.id] ?? "",
                  )
                }
              >
                {busy === request.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Send quotation
              </Button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
