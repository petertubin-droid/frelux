/**
 * Admin Market Prices - the 32-market scanner monitor.
 *
 * Shows every market the app serves, what it has priced, how fresh that
 * pricing is, which sources are failing, and what changed. Opening a market
 * drills into its individual materials, its suppliers and its price alerts.
 *
 * Honest by construction:
 *  - every number comes from market_material_prices, which is derived only
 *    from supplier observations;
 *  - a market with no observations shows zero, never an estimate;
 *  - an administrator can record a supplier quotation by hand, which becomes
 *    an observation like any other and is verified by the same gate.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  ExternalLink,
  Globe2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminCard,
  AdminHeader as AdminPageHeader,
} from "@/components/admin/AdminUi";
import { Button } from "@/components/ui/shadcn/button";
import { classNames } from "@/lib/utils";
import SevenCountryCoverage from "@/components/admin/SevenCountryCoverage";
import CatalogueReviewPanel from "@/components/admin/CatalogueReviewPanel";

interface MarketRow {
  market: string;
  market_name: string;
  currency_code: string;
  is_enabled: boolean;
  cadence_hours: number;
  last_run_at: string | null;
  last_success_at: string | null;
  next_run_at: string | null;
  active_sources: number;
  failing_sources: number;
  materials_priced: number;
  verified_prices: number;
  unverified_prices: number;
  stale_prices: number;
  prices_awaiting_verification: number;
  increases: number;
  decreases: number;
  last_scan_at: string | null;
  open_alerts: number;
}

interface MaterialRow {
  id: string;
  market: string;
  material_slug: string;
  product_name: string | null;
  category: string | null;
  brand: string;
  specification: string;
  unit: string;
  currency: string | null;
  supplier_price: number | null;
  median_price: number | null;
  local_estimate: number | null;
  transport_cost: number | null;
  delivery_cost: number | null;
  frelux_price: number | null;
  min_observed: number | null;
  max_observed: number | null;
  supplier_name: string | null;
  supplier_location: string | null;
  source_url: string | null;
  last_scanned_at: string | null;
  last_verified_at: string | null;
  previous_price: number | null;
  price_change_percent: number | null;
  confidence_score: number | null;
  verification_status: string;
  observations_count: number;
  suppliers_count: number;
}

interface SourceRow {
  id: string;
  market: string;
  retailer: string;
  material_slug: string;
  source_format: string;
  supplier_name: string | null;
  supplier_location: string | null;
  last_scanned_at: string | null;
  last_success_at: string | null;
  last_scan_status: string | null;
  last_scan_error: string | null;
  consecutive_failures: number;
  cadence_hours: number;
  next_scan_at: string | null;
  is_active: boolean;
}

interface AlertRow {
  id: string;
  market: string;
  material_slug: string | null;
  kind: string;
  severity: string;
  message: string;
  created_at: string;
}

function fmt(value: number | null, currency: string | null): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "n/a";
  }
  const amount = Number(value);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: amount < 100 ? 2 : 0,
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

function ago(value: string | null): string {
  if (!value) return "never";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const STATUS_STYLES: Record<string, string> = {
  verified: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  unverified: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  stale: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  no_data: "bg-muted text-muted-foreground",
};

export default function AdminMarketPrices() {
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quote, setQuote] = useState({
    market: "NG",
    material_slug: "",
    supplier_name: "",
    supplier_location: "",
    price: "",
    brand: "",
    specification: "",
    unit: "",
  });
  const [savingQuote, setSavingQuote] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("market_scan_overview");
    if (!error && data) setMarkets(data as MarketRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const loadMarket = useCallback(async (market: string) => {
    setDetailLoading(true);
    const [matRes, srcRes, alertRes] = await Promise.all([
      supabase
        .from("market_material_prices")
        .select("*")
        .eq("market", market)
        .order("price_change_percent", { ascending: false, nullsFirst: false })
        .limit(200),
      supabase
        .from("price_scan_sources")
        .select(
          "id, market, retailer, material_slug, source_format, supplier_name, supplier_location, last_scanned_at, last_success_at, last_scan_status, last_scan_error, consecutive_failures, cadence_hours, next_scan_at, is_active",
        )
        .eq("market", market)
        .order("last_scanned_at", { ascending: true, nullsFirst: true })
        .limit(200),
      supabase
        .from("market_price_alerts")
        .select(
          "id, market, material_slug, kind, severity, message, created_at",
        )
        .eq("market", market)
        .is("acknowledged_at", null)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setMaterials((matRes.data ?? []) as MaterialRow[]);
    setSources((srcRes.data ?? []) as SourceRow[]);
    setAlerts((alertRes.data ?? []) as AlertRow[]);
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (!selected) {
      setMaterials([]);
      setSources([]);
      setAlerts([]);
      return;
    }
    void loadMarket(selected);
    setQuote((q) => ({
      ...q,
      market: selected,
      material_slug: q.material_slug,
    }));
  }, [selected, loadMarket]);

  const totals = useMemo(
    () => ({
      markets: markets.length,
      priced: markets.reduce((sum, m) => sum + m.materials_priced, 0),
      verified: markets.reduce((sum, m) => sum + m.verified_prices, 0),
      stale: markets.reduce((sum, m) => sum + m.stale_prices, 0),
      awaiting: markets.reduce(
        (sum, m) => sum + m.prices_awaiting_verification,
        0,
      ),
      failedSources: markets.reduce((sum, m) => sum + m.failing_sources, 0),
      alerts: markets.reduce((sum, m) => sum + m.open_alerts, 0),
    }),
    [markets],
  );

  const runScan = useCallback(async () => {
    setScanning(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "price-intel-scan",
        {
          body: {
            trigger: "admin",
            force: true,
            market: selected ?? undefined,
          },
        },
      );
      if (error) throw error;
      const result = data as {
        scanned?: number;
        observations_filed?: number;
        prices_updated?: number;
        markets_scanned?: number;
      };
      setMessage(
        `Scanned ${result.scanned ?? 0} source(s) across ${result.markets_scanned ?? 0} market(s): ${result.observations_filed ?? 0} observation(s), ${result.prices_updated ?? 0} price update(s) applied.`,
      );
      await loadOverview();
      if (selected) await loadMarket(selected);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "The scan could not be started.",
      );
    } finally {
      setScanning(false);
    }
  }, [selected, loadOverview, loadMarket]);

  const saveQuote = useCallback(async () => {
    const price = Number(quote.price);
    if (!quote.market || !quote.material_slug || !(price > 0)) {
      setMessage("A market, a material and a positive price are required.");
      return;
    }
    setSavingQuote(true);
    setMessage(null);
    const { error } = await supabase.from("market_price_observations").insert({
      market: quote.market,
      material_slug: quote.material_slug.trim(),
      brand: quote.brand.trim(),
      specification: quote.specification.trim(),
      unit: quote.unit.trim(),
      price,
      currency:
        markets.find((m) => m.market === quote.market)?.currency_code ?? "USD",
      supplier_name: quote.supplier_name.trim() || null,
      supplier_location: quote.supplier_location.trim() || null,
      source_format: "quote",
      extraction: "admin_quotation",
      confidence: "high",
    });
    setSavingQuote(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Quotation recorded and folded into the market price.");
    setQuote((q) => ({
      ...q,
      material_slug: "",
      supplier_name: "",
      supplier_location: "",
      price: "",
      brand: "",
      specification: "",
      unit: "",
    }));
    setQuoteOpen(false);
    await loadOverview();
    if (selected) await loadMarket(selected);
  }, [quote, markets, selected, loadOverview, loadMarket]);

  const selectedMarket = markets.find((m) => m.market === selected) ?? null;

  return (
    <div className="space-y-6">
      <SevenCountryCoverage />
      <CatalogueReviewPanel />
      <AdminPageHeader
        title="Market price scanner"
        subtitle="Every market the app serves, priced from its own suppliers. A market is only promoted to the price book when its own observations clear the consensus gate."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setQuoteOpen((open) => !open)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Supplier quote
            </Button>
            <Button onClick={runScan} disabled={scanning}>
              {scanning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {selected ? `Scan ${selected}` : "Scan due markets"}
            </Button>
          </div>
        }
      />

      {message && (
        <div className="admin-inset flex items-start gap-3 p-4 text-sm text-foreground">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="min-w-0 flex-1">{message}</p>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-muted-foreground transition hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {quoteOpen && (
        <AdminCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Record a supplier quotation
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A quotation is an observation like any other: it joins the
                market median and is verified by the same gate.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              <span className="text-muted-foreground">Market</span>
              <select
                value={quote.market}
                onChange={(e) => setQuote({ ...quote, market: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {markets.map((m) => (
                  <option key={m.market} value={m.market}>
                    {m.market_name} ({m.currency_code})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Material slug</span>
              <input
                value={quote.material_slug}
                onChange={(e) =>
                  setQuote({ ...quote, material_slug: e.target.value })
                }
                placeholder="cement-50kg"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Supplier</span>
              <input
                value={quote.supplier_name}
                onChange={(e) =>
                  setQuote({ ...quote, supplier_name: e.target.value })
                }
                placeholder="BuildCo"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Supplier location</span>
              <input
                value={quote.supplier_location}
                onChange={(e) =>
                  setQuote({ ...quote, supplier_location: e.target.value })
                }
                placeholder="Lagos"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Price</span>
              <input
                value={quote.price}
                onChange={(e) => setQuote({ ...quote, price: e.target.value })}
                inputMode="decimal"
                placeholder="8500"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Brand</span>
              <input
                value={quote.brand}
                onChange={(e) => setQuote({ ...quote, brand: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Specification</span>
              <input
                value={quote.specification}
                onChange={(e) =>
                  setQuote({ ...quote, specification: e.target.value })
                }
                placeholder="50kg bag"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Unit</span>
              <input
                value={quote.unit}
                onChange={(e) => setQuote({ ...quote, unit: e.target.value })}
                placeholder="bag"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setQuoteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveQuote} disabled={savingQuote}>
              {savingQuote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save quotation
            </Button>
          </div>
        </AdminCard>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Markets monitored",
            value: String(totals.markets),
            hint: "All Frelux markets",
          },
          {
            label: "Verified prices",
            value: String(totals.verified),
            hint: `${totals.priced} material records`,
          },
          {
            label: "Awaiting verification",
            value: String(totals.awaiting),
            hint: `${totals.stale} stale`,
          },
          {
            label: "Open alerts",
            value: String(totals.alerts),
            hint: `${totals.failedSources} failing sources`,
          },
        ].map((tile) => (
          <AdminCard key={tile.label} compact>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {tile.label}
            </p>
            <p className="mt-1.5 font-display text-2xl font-semibold text-foreground">
              {tile.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p>
          </AdminCard>
        ))}
      </div>

      <AdminCard compact>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading markets
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">Market</th>
                  <th className="px-3 py-2.5 font-medium">Suppliers</th>
                  <th className="px-3 py-2.5 font-medium">Priced</th>
                  <th className="px-3 py-2.5 font-medium">Verified</th>
                  <th className="px-3 py-2.5 font-medium">Unverified</th>
                  <th className="px-3 py-2.5 font-medium">Stale</th>
                  <th className="px-3 py-2.5 font-medium">Moves</th>
                  <th className="px-3 py-2.5 font-medium">Last scan</th>
                  <th className="px-3 py-2.5 font-medium">Alerts</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((m) => (
                  <tr
                    key={m.market}
                    onClick={() =>
                      setSelected(selected === m.market ? null : m.market)
                    }
                    className={classNames(
                      "cursor-pointer border-b border-border/40 transition hover:bg-accent/40",
                      selected === m.market && "bg-accent/50",
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {m.market_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {m.market} · {m.currency_code}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {m.active_sources}
                      {m.failing_sources > 0 && (
                        <span className="ml-1 text-rose-500">
                          ({m.failing_sources} failing)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{m.materials_priced}</td>
                    <td className="px-3 py-2.5 text-emerald-600 dark:text-emerald-400">
                      {m.verified_prices}
                    </td>
                    <td className="px-3 py-2.5 text-amber-600 dark:text-amber-400">
                      {m.unverified_prices}
                    </td>
                    <td className="px-3 py-2.5 text-rose-600 dark:text-rose-400">
                      {m.stale_prices}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        {m.increases}
                      </span>
                      <span className="ml-3 inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                        <ArrowDownRight className="h-3.5 w-3.5" />
                        {m.decreases}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {ago(m.last_scan_at)}
                    </td>
                    <td className="px-3 py-2.5">
                      {m.open_alerts > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="h-3 w-3" />
                          {m.open_alerts}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          clear
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {selected && selectedMarket && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                {selectedMarket.market_name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedMarket.currency_code} · every{" "}
                {selectedMarket.cadence_hours}h{" · "}last success{" "}
                {ago(selectedMarket.last_success_at)}
              </p>
            </div>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close market
            </Button>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading market detail
            </div>
          ) : (
            <>
              <AdminCard compact>
                <h3 className="mb-3 flex items-center gap-2 px-2 font-display text-base font-semibold">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Materials
                </h3>
                {materials.length === 0 ? (
                  <p className="px-2 py-6 text-sm text-muted-foreground">
                    No supplier observations in this market yet. Nothing is
                    priced until a supplier source or a quotation exists.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead>
                        <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-3 py-2 font-medium">Material</th>
                          <th className="px-3 py-2 font-medium">Supplier</th>
                          <th className="px-3 py-2 font-medium">Median</th>
                          <th className="px-3 py-2 font-medium">Range</th>
                          <th className="px-3 py-2 font-medium">Prev</th>
                          <th className="px-3 py-2 font-medium">Change</th>
                          <th className="px-3 py-2 font-medium">Confidence</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materials.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-border/40 align-top"
                          >
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-foreground">
                                {row.product_name ?? row.material_slug}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {[row.brand, row.specification, row.unit]
                                  .filter(Boolean)
                                  .join(" · ") || row.material_slug}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {row.supplier_name ?? "n/a"}
                              {row.source_url && (
                                <a
                                  href={row.source_url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="ml-1 inline-flex text-primary"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              <div className="text-xs">
                                {row.supplier_location ?? ""}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 font-medium">
                              {fmt(row.median_price, row.currency)}
                              <div className="text-xs font-normal text-muted-foreground">
                                {row.suppliers_count} supplier(s)
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {fmt(row.min_observed, row.currency)} to{" "}
                              {fmt(row.max_observed, row.currency)}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {fmt(row.previous_price, row.currency)}
                            </td>
                            <td
                              className={classNames(
                                "px-3 py-2.5 font-medium",
                                (row.price_change_percent ?? 0) > 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : (row.price_change_percent ?? 0) < 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground",
                              )}
                            >
                              {row.price_change_percent === null
                                ? "n/a"
                                : `${row.price_change_percent > 0 ? "+" : ""}${row.price_change_percent.toFixed(1)}%`}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {row.confidence_score === null
                                ? "n/a"
                                : row.confidence_score.toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={classNames(
                                  "rounded-full px-2 py-0.5 text-xs capitalize",
                                  STATUS_STYLES[row.verification_status] ??
                                    STATUS_STYLES.no_data,
                                )}
                              >
                                {row.verification_status.replace("_", " ")}
                              </span>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {ago(
                                  row.last_verified_at ?? row.last_scanned_at,
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AdminCard>

              <div className="grid gap-4 lg:grid-cols-2">
                <AdminCard compact>
                  <h3 className="mb-3 flex items-center gap-2 px-2 font-display text-base font-semibold">
                    <Store className="h-4 w-4 text-primary" />
                    Suppliers and sources
                  </h3>
                  {sources.length === 0 ? (
                    <p className="px-2 py-6 text-sm text-muted-foreground">
                      No supplier sources registered for this market.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/40">
                      {sources.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-start justify-between gap-3 px-2 py-2.5"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">
                              {s.supplier_name ?? s.retailer}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {s.source_format} · {s.material_slug}
                              {s.supplier_location
                                ? ` · ${s.supplier_location}`
                                : ""}
                            </div>
                            {s.last_scan_error && (
                              <div className="mt-0.5 truncate text-xs text-rose-500">
                                {s.last_scan_error}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right text-xs text-muted-foreground">
                            <div>{ago(s.last_scanned_at)}</div>
                            <div>
                              every {s.cadence_hours}h
                              {s.consecutive_failures > 0
                                ? ` · ${s.consecutive_failures} failed`
                                : ""}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </AdminCard>

                <AdminCard compact>
                  <h3 className="mb-3 flex items-center gap-2 px-2 font-display text-base font-semibold">
                    <Clock className="h-4 w-4 text-primary" />
                    Open alerts
                  </h3>
                  {alerts.length === 0 ? (
                    <p className="px-2 py-6 text-sm text-muted-foreground">
                      Nothing outstanding in this market.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/40">
                      {alerts.map((a) => (
                        <li key={a.id} className="px-2 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={classNames(
                                "rounded-full px-2 py-0.5 text-xs capitalize",
                                a.severity === "critical"
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  : a.severity === "warning"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    : "bg-muted text-muted-foreground",
                              )}
                            >
                              {a.kind.replace("_", " ")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {ago(a.created_at)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-foreground">
                            {a.message}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </AdminCard>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
