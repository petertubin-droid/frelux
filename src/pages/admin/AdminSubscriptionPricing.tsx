import {
  PRICING_PLANS,
  type PricingPlan,
  formatUsdPrice,
} from "@/lib/pricing-plans";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, AlertTriangle, CheckCircle2, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isChargeableCurrency } from "@/lib/payments/charges";
import { AdminButton } from "@/components/admin/AdminUi";
import { AdminModal } from "@/components/admin/AdminModal";
import { useToast } from "@/components/ui/Toast";
import { classNames } from "@/lib/utils";

/**
 * What each market is charged for a subscription, set against what the
 * recorded USD rate implies. USD is the catalog: `subscription_local_prices`
 * holds the amount the pricing page displays and checkout charges, so a row
 * that has drifted is a market being over- or under-charged, not a cosmetic
 * mismatch.
 *
 * Nothing here changes a price on its own. The admin sees the proposal and
 * applies it, and every applied change is recorded with its reason.
 */

interface PriceRow {
  market_code: string;
  country_name: string | null;
  plan: string;
  billing_cycle: string;
  currency: string;
  local_minor: number | null;
  local_currency: string | null;
  stored_rate: number | null;
  fx_source: string | null;
  updated_at: string | null;
  live_rate: number | null;
  live_rate_source: string | null;
  fetched_at: string | null;
  implied_minor: number | null;
  deviation_pct: number | null;
  status:
    "ok" | "missing" | "currency_mismatch" | "stale" | "off_rate" | "no_rate";
}

const STATUS_LABEL: Record<PriceRow["status"], string> = {
  ok: "In line",
  missing: "No local price",
  currency_mismatch: "Wrong currency",
  stale: "Not refreshed",
  off_rate: "Off the rate",
  no_rate: "No rate to check",
};

const STATUS_STYLE: Record<PriceRow["status"], string> = {
  ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  missing: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  currency_mismatch:
    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  off_rate:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  stale: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  no_rate: "bg-muted text-muted-foreground dark:bg-white/5",
};

const ZERO_DECIMAL = new Set(["JPY", "KRW", "IDR", "XOF", "CLP", "VND"]);

function money(minor: number | null, currency: string): string {
  if (minor === null || minor === undefined) return "—";
  const exp = ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
  const major = minor / 10 ** exp;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: exp === 0 ? 0 : 2,
      maximumFractionDigits: exp === 0 ? 0 : 2,
    }).format(major);
  } catch {
    return `${currency.toUpperCase()} ${major.toFixed(exp)}`;
  }
}

export default function AdminSubscriptionPricing() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [problemsOnly, setProblemsOnly] = useState(true);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<PriceRow | null>(null);
  const [manualValue, setManualValue] = useState("");
  const [activeTab, setActiveTab] = useState<"local" | "tiers">("local");
  const [tiers, setTiers] = useState<PricingPlan[]>(PRICING_PLANS);
  const [editingTier, setEditingTier] = useState<PricingPlan | null>(null);
  const [tierForm, setTierForm] = useState<{
    name: string;
    tagline: string;
    monthlyPrice: number;
    yearlyPrice: number;
    badge: string;
    highlight: boolean;
    cta: string;
    featuresText: string;
  }>({
    name: "",
    tagline: "",
    monthlyPrice: 0,
    yearlyPrice: 0,
    badge: "",
    highlight: false,
    cta: "",
    featuresText: "",
  });

  const loadTiers = useCallback(async () => {
    try {
      if (typeof (supabase as any)?.from === "function") {
        const { data, error: tierErr } = await (supabase as any)
          .from("subscription_tier_configs")
          .select("*")
          .order("sort_order", { ascending: true });
        if (!tierErr && data && data.length > 0) {
          setTiers(
            data.map((r: any) => ({
              id: r.id,
              name: r.name,
              tagline: r.tagline,
              monthlyPrice: Number(r.monthly_price),
              yearlyPrice: Number(r.yearly_price),
              badge: r.badge || undefined,
              highlight: Boolean(r.highlight),
              features: Array.isArray(r.features) ? r.features : [],
              cta: r.cta || "Get Started",
            })),
          );
        }
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    void loadTiers();
  }, [loadTiers]);

  function startEditTier(tier: PricingPlan) {
    setEditingTier(tier);
    setTierForm({
      name: tier.name,
      tagline: tier.tagline,
      monthlyPrice: tier.monthlyPrice,
      yearlyPrice: tier.yearlyPrice,
      badge: tier.badge ?? "",
      highlight: tier.highlight ?? false,
      cta: tier.cta,
      featuresText: tier.features.join("\n"),
    });
  }

  async function saveTier() {
    if (!editingTier) return;
    setBusy(true);
    try {
      const features = tierForm.featuresText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const updatedTier: PricingPlan = {
        ...editingTier,
        name: tierForm.name.trim() || editingTier.name,
        tagline: tierForm.tagline.trim(),
        monthlyPrice: Number(tierForm.monthlyPrice) || 0,
        yearlyPrice: Number(tierForm.yearlyPrice) || 0,
        badge: tierForm.badge.trim() || undefined,
        highlight: tierForm.highlight,
        cta: tierForm.cta.trim() || "Get Started",
        features,
      };

      if (typeof (supabase as any)?.from === "function") {
        const { error: tierError } = await (supabase as any)
          .from("subscription_tier_configs")
          .upsert({
            id: updatedTier.id,
            name: updatedTier.name,
            tagline: updatedTier.tagline,
            monthly_price: updatedTier.monthlyPrice,
            yearly_price: updatedTier.yearlyPrice,
            badge: updatedTier.badge ?? null,
            highlight: updatedTier.highlight ?? false,
            cta: updatedTier.cta,
            features: updatedTier.features,
            updated_at: new Date().toISOString(),
          });
        if (tierError) throw tierError;

        // The checkout edge function charges from subscription_plan_prices, so a
        // price edited here must reach that table too. Without this the pricing
        // page advertises the new amount while checkout charges the old one.
        if (updatedTier.monthlyPrice > 0) {
          for (const [cycle, usd] of [
            ["monthly", updatedTier.monthlyPrice],
            ["yearly", updatedTier.yearlyPrice],
          ] as const) {
            const minor = Math.round(Number(usd) * 100);
            if (!Number.isFinite(minor) || minor <= 0) continue;
            const { error: priceError } = await (supabase as any)
              .from("subscription_plan_prices")
              .upsert(
                {
                  plan: updatedTier.id,
                  billing_cycle: cycle,
                  currency: "USD",
                  price_minor: minor,
                  // Legacy naira column: USD rows carry the same minor amount,
                  // exactly as the USD pricing migration backfilled it.
                  price_kobo: minor,
                  active: true,
                },
                { onConflict: "plan,billing_cycle" },
              );
            if (priceError) throw priceError;
          }
        }
      }

      setTiers((prev) =>
        prev.map((t) => (t.id === updatedTier.id ? updatedTier : t)),
      );
      toast({
        type: "success",
        title: "Tier updated",
        message: `Saved updates for ${updatedTier.name} tier.`,
      });
      setEditingTier(null);
    } catch (err: any) {
      toast({
        type: "error",
        title: "Could not save tier",
        message: err?.message ?? "An error occurred",
      });
    } finally {
      setBusy(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase.rpc(
      "admin_subscription_price_report",
      { p_deviation_pct: 5 },
    );
    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setError(null);
      setRows((data as PriceRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return counts;
  }, [rows]);

  const visible = useMemo(
    () => (problemsOnly ? rows.filter((r) => r.status !== "ok") : rows),
    [rows, problemsOnly],
  );

  async function applyRate(market: string) {
    if (!reason.trim()) {
      toast({
        type: "error",
        title: "A reason is needed",
        message: "Say why this market's price is being changed.",
      });
      return;
    }
    setBusy(true);
    const { data, error: err } = await supabase.rpc(
      "admin_apply_subscription_prices",
      { p_markets: [market], p_reason: reason.trim() },
    );
    setBusy(false);
    if (err) {
      toast({
        type: "error",
        title: "Price not changed",
        message: err.message,
      });
      return;
    }
    const applied = (data as { applied?: number })?.applied ?? 0;
    toast({
      type: applied ? "success" : "info",
      title: applied ? `${market} repriced` : `${market} unchanged`,
      message: applied
        ? `${applied} price${applied === 1 ? "" : "s"} moved to the recorded rate.`
        : "The current prices already match the recorded rate.",
    });
    setReason("");
    void load();
  }

  async function saveManual() {
    if (!editing) return;
    const amount = Number(manualValue.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ type: "error", title: "Enter a price above zero" });
      return;
    }
    if (!reason.trim()) {
      toast({ type: "error", title: "A reason is needed" });
      return;
    }
    const exp = ZERO_DECIMAL.has(editing.currency.toUpperCase()) ? 0 : 2;
    const minor = Math.round(amount * 10 ** exp);
    setBusy(true);
    const { error: err } = await supabase.rpc("admin_set_subscription_price", {
      p_market: editing.market_code,
      p_plan: editing.plan,
      p_billing_cycle: editing.billing_cycle,
      p_price_minor: minor,
      p_reason: reason.trim(),
    });
    setBusy(false);
    if (err) {
      toast({
        type: "error",
        title: "Price not changed",
        message: err.message,
      });
      return;
    }
    toast({
      type: "success",
      title: "Price set",
      message: `${editing.market_code} ${editing.plan} now charges ${money(minor, editing.currency)}.`,
    });
    setEditing(null);
    setManualValue("");
    setReason("");
    void load();
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            Subscription prices
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What each market is charged, against what the recorded dollar rate
            implies. Applying a rate rewrites the row the pricing page shows and
            checkout charges, and records why.
          </p>
        </div>
        <AdminButton
          type="button"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw
            className={classNames("h-4 w-4", loading && "animate-spin")}
            aria-hidden="true"
          />
          Refresh
        </AdminButton>
      </div>

      <div className="mb-6 flex gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("local")}
          className={classNames(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "local"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          Market FX & Quotes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tiers")}
          className={classNames(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "tiers"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          USD Base Tiers & Features
        </button>
      </div>

      {activeTab === "tiers" && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={classNames(
                "flex flex-col justify-between rounded-xl border p-4 transition-all",
                tier.highlight
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-card dark:border-white/10",
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{tier.name}</h3>
                  {tier.badge && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {tier.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tier.tagline}
                </p>
                <div className="mt-3">
                  <span className="text-xl font-bold text-foreground">
                    {formatUsdPrice(tier.monthlyPrice)}
                  </span>
                  <span className="text-xs text-muted-foreground"> /mo</span>
                  {tier.monthlyPrice > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formatUsdPrice(tier.yearlyPrice)} /yr
                    </p>
                  )}
                </div>
                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-xs font-medium text-foreground">
                    Features:
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {tier.features.slice(0, 5).map((f, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{f}</span>
                      </li>
                    ))}
                    {tier.features.length > 5 && (
                      <li className="text-[11px] italic text-muted-foreground/80">
                        + {tier.features.length - 5} more features
                      </li>
                    )}
                  </ul>
                </div>
              </div>
              <div className="mt-4 pt-2">
                <AdminButton
                  type="button"
                  onClick={() => startEditTier(tier)}
                  className="w-full justify-center min-h-8 rounded-lg border border-border text-xs"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit Tier & Features
                </AdminButton>
              </div>
            </div>
          ))}
        </div>
      )}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Could not read the price report
          </div>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 min-h-8 rounded-lg underline"
          >
            Try again
          </button>
        </div>
      ) : null}

      {!error && activeTab === "local" && (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["ok", "In line"],
                ["off_rate", "Off the rate"],
                ["missing", "No local price"],
                ["no_rate", "No rate to check"],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                data-testid={`price-tile-${key}`}
                className="rounded-xl border border-border bg-card p-4 dark:border-white/5"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                  {summary[key] ?? 0}
                </p>
              </div>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setProblemsOnly((v) => !v)}
              aria-pressed={problemsOnly}
              className="min-h-8 rounded-lg border border-border px-3 text-xs font-medium text-foreground dark:border-white/10"
            >
              {problemsOnly ? "Showing problems" : "Showing every market"}
            </button>
            <label className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
              <span className="shrink-0">Reason for any change</span>
              <input
                type="text"
                aria-label="Reason for any change"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. quarterly FX review"
                className="min-h-8 w-full max-w-xs rounded-lg border border-border bg-background px-2 text-sm text-foreground dark:border-white/10"
              />
            </label>
          </div>

          {loading && rows.length === 0 ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-muted dark:bg-white/5"
                />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="rounded-xl border border-border py-10 text-center text-sm text-muted-foreground dark:border-white/5">
              <CheckCircle2
                className="mx-auto mb-2 h-5 w-5 text-emerald-500"
                aria-hidden="true"
              />
              Every market is charging within 5% of its recorded rate.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border dark:border-white/5">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Market</th>
                    <th className="px-3 py-2 font-medium">Plan</th>
                    <th className="px-3 py-2 font-medium">Charged</th>
                    <th className="px-3 py-2 font-medium">Rate implies</th>
                    <th className="px-3 py-2 font-medium">Gap</th>
                    <th className="px-3 py-2 font-medium">State</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr
                      key={`${r.market_code}-${r.plan}-${r.billing_cycle}`}
                      className="border-t border-border/40 align-top dark:border-white/5"
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground">
                          {r.market_code} · {r.country_name ?? r.market_code}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.currency}
                          {r.live_rate
                            ? ` · ${Number(r.live_rate).toFixed(4)} per USD`
                            : " · no recorded rate"}
                          {!isChargeableCurrency(r.currency) && (
                            <span
                              className="ml-1.5 rounded bg-muted px-1 py-0.5 text-xs font-medium uppercase tracking-wide"
                              title="No payment rail collects this currency, so customers in this market are charged the dollar price."
                            >
                              no rail
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 capitalize text-foreground">
                        {r.plan}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({r.billing_cycle})
                        </span>
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {money(r.local_minor, r.local_currency ?? r.currency)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {money(r.implied_minor, r.currency)}
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {r.deviation_pct === null
                          ? "—"
                          : `${r.deviation_pct > 0 ? "+" : ""}${r.deviation_pct}%`}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={classNames(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            STATUS_STYLE[r.status],
                          )}
                        >
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap justify-end gap-2">
                          <AdminButton
                            type="button"
                            disabled={busy || !r.live_rate}
                            onClick={() => void applyRate(r.market_code)}
                            className="min-h-8 rounded-lg border border-border px-2.5 text-xs dark:border-white/10"
                          >
                            Use the rate
                          </AdminButton>
                          <AdminButton
                            type="button"
                            onClick={() => {
                              setEditing(r);
                              const exp = ZERO_DECIMAL.has(
                                r.currency.toUpperCase(),
                              )
                                ? 0
                                : 2;
                              setManualValue(
                                r.local_minor
                                  ? String(r.local_minor / 10 ** exp)
                                  : "",
                              );
                            }}
                            className="min-h-8 rounded-lg border border-border px-2.5 text-xs dark:border-white/10"
                          >
                            <Pencil
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Set price
                          </AdminButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <AdminModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={
          editing
            ? `Set price · ${editing.market_code} ${editing.plan}`
            : "Set price"
        }
      >
        {editing && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This is the amount the pricing page shows and checkout charges.
              Minimum unit for {editing.currency} is{" "}
              {ZERO_DECIMAL.has(editing.currency.toUpperCase())
                ? "whole units"
                : "cents"}
              .
            </p>
            <label className="block text-sm">
              <span className="font-medium text-foreground">
                Price in {editing.currency}
              </span>
              <input
                type="text"
                inputMode="decimal"
                aria-label={`Price in ${editing.currency}`}
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                className="mt-1 min-h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground dark:border-white/10"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Reason:{" "}
              {reason.trim() || "add one at the top of the page before saving"}
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <AdminButton
                type="button"
                onClick={() => setEditing(null)}
                className="min-h-8 rounded-lg border border-border px-3 text-xs dark:border-white/10"
              >
                Cancel
              </AdminButton>
              <AdminButton
                type="button"
                disabled={busy}
                onClick={() => void saveManual()}
                className="min-h-8 rounded-lg bg-primary px-3 text-xs text-primary-foreground"
              >
                Save price
              </AdminButton>
            </div>
          </div>
        )}
      </AdminModal>
      <AdminModal
        open={!!editingTier}
        onClose={() => setEditingTier(null)}
        title={
          editingTier ? `Edit Plan Tier: ${editingTier.name}` : "Edit Plan"
        }
      >
        {editingTier && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-foreground">Plan Name</span>
                <input
                  type="text"
                  value={tierForm.name}
                  onChange={(e) =>
                    setTierForm({ ...tierForm, name: e.target.value })
                  }
                  className="mt-1 min-h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-foreground">
                  Badge (optional)
                </span>
                <input
                  type="text"
                  placeholder="e.g. Most Popular"
                  value={tierForm.badge}
                  onChange={(e) =>
                    setTierForm({ ...tierForm, badge: e.target.value })
                  }
                  className="mt-1 min-h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="font-medium text-foreground">Tagline</span>
              <input
                type="text"
                value={tierForm.tagline}
                onChange={(e) =>
                  setTierForm({ ...tierForm, tagline: e.target.value })
                }
                className="mt-1 min-h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-foreground">
                  Monthly Price (USD $)
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tierForm.monthlyPrice}
                  onChange={(e) =>
                    setTierForm({
                      ...tierForm,
                      monthlyPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1 min-h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-foreground">
                  Yearly Price (USD $)
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tierForm.yearlyPrice}
                  onChange={(e) =>
                    setTierForm({
                      ...tierForm,
                      yearlyPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1 min-h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="font-medium text-foreground">
                CTA Button Label
              </span>
              <input
                type="text"
                value={tierForm.cta}
                onChange={(e) =>
                  setTierForm({ ...tierForm, cta: e.target.value })
                }
                className="mt-1 min-h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tierForm.highlight}
                onChange={(e) =>
                  setTierForm({ ...tierForm, highlight: e.target.checked })
                }
                className="rounded border-border"
              />
              <span className="font-medium text-foreground">
                Highlight this tier on pricing page
              </span>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-foreground">
                Features (one per line)
              </span>
              <textarea
                rows={6}
                value={tierForm.featuresText}
                onChange={(e) =>
                  setTierForm({ ...tierForm, featuresText: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground font-mono"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <AdminButton
                type="button"
                onClick={() => setEditingTier(null)}
                className="min-h-8 rounded-lg border border-border px-3 text-xs"
              >
                Cancel
              </AdminButton>
              <AdminButton
                type="button"
                disabled={busy}
                onClick={() => void saveTier()}
                className="min-h-8 rounded-lg bg-primary px-3 text-xs text-primary-foreground"
              >
                Save Tier Changes
              </AdminButton>
            </div>
          </div>
        )}
      </AdminModal>
    </>
  );
}
