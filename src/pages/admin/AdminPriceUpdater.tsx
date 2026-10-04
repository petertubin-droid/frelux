/**
 * Admin Price Tracker (reference catalog → shared material database)
 *
 * Deterministic and honest:
 *  - "Review catalog" compares the FRELUX reference catalog against
 *    the prices actually configured in the shared material database.
 *    No simulated market movement, no invented prices.
 *  - The admin verifies/enters a price per material and applies it.
 *    Applied prices are written to estimation_prices (the shared DB
 *    every engine prices from), with the source recorded.
 *  - A material without a shared record or without a reference price
 *    is reported as such — never guessed.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Minus,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { AdminHeader as AdminPageHeader } from "@/components/admin/AdminUi";
import { Button } from "@/components/ui/shadcn/button";
import {
  fetchEstimationMaterials,
  fetchAllPrices,
  createOrUpdatePrice,
} from "@/lib/estimation/queries";
import type { EstimationMaterial, EstimationPrice } from "@/types/estimation";

type RowState = {
  key: string;
  name: string;
  slug: string;
  unit: string;
  configuredPrice: number | null;
  referencePrice: number | null;
  changePercent: number | null;
  hasMaterial: boolean;
  /** the price the admin is about to apply (editable input) */
  priceInput: string;
  selected: boolean;
};

type ApplyStatus = {
  ok: number;
  failed: number;
  skipped: number;
  messages: string[];
};

export default function AdminPriceUpdater() {
  const [scanning, setScanning] = useState(false);
  const [rows, setRows] = useState<RowState[]>([]);
  const [applyStatus, setApplyStatus] = useState<ApplyStatus | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Shared material records + currently configured prices (one load)
  const [slugToId, setSlugToId] = useState<Map<string, string>>(new Map());
  const [configured, setConfigured] = useState<Record<string, number>>({});

  const loadShared = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const { scanMaterialPrices, FALLBACK_PRICES } =
        await import("@/lib/estimation/price-scanner");
      const [matsRes, pricesRes] = await Promise.all([
        fetchEstimationMaterials(false),
        fetchAllPrices(true),
      ]);
      const map = new Map<string, string>();
      for (const m of (matsRes.data ?? []) as EstimationMaterial[]) {
        map.set(m.slug, m.id);
      }
      setSlugToId(map);

      // material id → active price (newest effective_date first)
      const byRef = new Map<string, number>();
      for (const p of (pricesRes.data ?? []) as EstimationPrice[]) {
        if (p.price_type === "material" && !byRef.has(p.ref_id)) {
          byRef.set(p.ref_id, p.price);
        }
      }
      const configuredPrices: Record<string, number | null> = {};
      for (const [slug, id] of map) {
        configuredPrices[slug] = byRef.get(id) ?? null;
      }
      setConfigured(
        Object.fromEntries(
          Object.entries(configuredPrices).filter(([, v]) => v !== null),
        ) as Record<string, number>,
      );

      const report = await scanMaterialPrices(configuredPrices, {
        region: "Nigeria",
        currency: "NGN",
      });

      const nextRows: RowState[] = report.results.map((r) => ({
        key: r.material_key,
        name: r.material_name,
        slug: r.material_slug,
        unit: r.unit,
        configuredPrice: r.configured_price,
        referencePrice: r.reference_price,
        changePercent: r.change_percent,
        hasMaterial: r.material_slug !== "" && map.has(r.material_slug),
        priceInput:
          r.material_slug &&
          byRef.get(map.get(r.material_slug) ?? "") !== undefined
            ? String(byRef.get(map.get(r.material_slug) ?? "") ?? "")
            : r.reference_price !== null
              ? String(r.reference_price)
              : "",
        selected: false,
      }));
      setRows(nextRows);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    void loadShared();
  }, [loadShared]);

  const unconfiguredCount = useMemo(
    () => rows.filter((r) => r.configuredPrice === null).length,
    [rows],
  );
  const differingCount = useMemo(
    () =>
      rows.filter((r) => r.changePercent !== null && r.changePercent !== 0)
        .length,
    [rows],
  );

  const toggleRow = useCallback((key: string) => {
    setRows((rs) =>
      rs.map((r) => (r.key === key ? { ...r, selected: !r.selected } : r)),
    );
  }, []);

  const setPriceInput = useCallback((key: string, value: string) => {
    setRows((rs) =>
      rs.map((r) => (r.key === key ? { ...r, priceInput: value } : r)),
    );
  }, []);

  const applySelected = useCallback(async () => {
    setApplying(true);
    setApplyStatus(null);
    const status: ApplyStatus = { ok: 0, failed: 0, skipped: 0, messages: [] };
    try {
      const today = new Date().toISOString().slice(0, 10);
      for (const row of rows.filter((r) => r.selected)) {
        const materialId = slugToId.get(row.slug);
        if (!row.hasMaterial || !materialId) {
          status.skipped++;
          status.messages.push(
            `${row.name}: no shared material record — skipped (not invented).`,
          );
          continue;
        }
        const price = Number(row.priceInput);
        if (!Number.isFinite(price) || price < 0) {
          status.skipped++;
          status.messages.push(
            `${row.name}: no verified price entered — skipped.`,
          );
          continue;
        }
        const { error: writeError } = await createOrUpdatePrice({
          price_type: "material",
          ref_id: materialId,
          price,
          currency: "NGN",
          market: "NG",
          effective_date: today,
          notes: `Applied from FRELUX reference catalog via Price Tracker (admin verified ${today}). Unit: ${row.unit}.`,
          is_active: true,
        });
        if (writeError) {
          status.failed++;
          status.messages.push(
            `${row.name}: could not save — ${writeError.message}`,
          );
        } else {
          status.ok++;
        }
      }
      setApplyStatus(status);
      if (status.ok > 0) await loadShared();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  }, [rows, slugToId, loadShared]);

  return (
    <div className="min-h-screen bg-muted/50">
      <AdminPageHeader
        title="Price Tracker"
        subtitle="Review the FRELUX reference catalog against configured prices, then apply verified prices to the shared material database every engine prices from."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Button
            variant="ghost"
            onClick={loadShared}
            disabled={scanning}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`}
            />
            {scanning
              ? "Reviewing catalog…"
              : "Review catalog & configured prices"}
          </Button>
          <Button
            variant="ghost"
            onClick={applySelected}
            disabled={applying || rows.every((r) => !r.selected)}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 aria-hidden="true" className="w-4 h-4" />
            {applying ? "Applying…" : "Apply selected prices"}
          </Button>
          {applyStatus && (
            <span
              className="text-sm text-muted-foreground"
              data-testid="apply-status"
            >
              {applyStatus.ok} applied · {applyStatus.skipped} skipped ·{" "}
              {applyStatus.failed} failed
            </span>
          )}
        </div>

        {error && (
          <div
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertCircle
                aria-hidden="true"
                className="w-5 h-5 text-red-600"
              />
              <span className="text-sm font-medium text-red-900">Error</span>
            </div>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Honesty banner */}
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          This is a <strong>reference catalog review</strong>, not a live market
          feed. Catalog values are FRELUX reference data — verify each price
          against your supplier before applying. Applied prices are recorded
          with their source and effective date in the shared material database.
          Nothing is invented: a material without a shared record or without a
          price stays unpriced, and every engine will show it as PRICE NOT
          CONFIGURED.
        </div>

        {/* Summary stats */}
        {loaded && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Catalog entries
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {rows.length}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-medium text-amber-600">
                Not configured
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                {unconfiguredCount}
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-medium text-blue-600">
                Differs from reference
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-700">
                {differingCount}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Region
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">Nigeria</p>
            </div>
          </div>
        )}

        {/* Results table */}
        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                    Apply
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Material
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Configured
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Reference
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    vs reference
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    Confidence
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Verified price (₦)
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map((r) => (
                  <tr
                    key={r.key}
                    className="hover:bg-muted/50"
                    data-testid={`price-row-${r.slug}`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={r.selected}
                        onChange={() => toggleRow(r.key)}
                        aria-label={`Select ${r.name} for pricing`}
                        disabled={!r.hasMaterial}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {r.name}
                      <span className="block text-xs text-muted-foreground">
                        per {r.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {r.configuredPrice === null ? (
                        <span className="font-medium text-amber-700">
                          NOT CONFIGURED
                        </span>
                      ) : (
                        `₦${r.configuredPrice.toLocaleString()}`
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {r.referencePrice === null
                        ? "no reference"
                        : `₦${r.referencePrice.toLocaleString()}`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.changePercent === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium ${
                            r.changePercent > 2
                              ? "text-red-600"
                              : r.changePercent < -2
                                ? "text-green-600"
                                : "text-muted-foreground"
                          }`}
                        >
                          {r.changePercent > 2 ? (
                            <TrendingUp
                              aria-hidden="true"
                              className="w-3 h-3"
                            />
                          ) : r.changePercent < -2 ? (
                            <TrendingDown
                              aria-hidden="true"
                              className="w-3 h-3"
                            />
                          ) : (
                            <Minus aria-hidden="true" className="w-3 h-3" />
                          )}
                          {r.changePercent > 0 ? "+" : ""}
                          {r.changePercent}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          r.referencePrice === null
                            ? "bg-red-500"
                            : "bg-amber-500"
                        }`}
                        title={
                          r.referencePrice === null
                            ? "No reference: price must be admin-verified"
                            : "Reference: verify before applying"
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={r.priceInput}
                        onChange={(e) => setPriceInput(r.key, e.target.value)}
                        placeholder="enter verified price"
                        className="w-36 rounded-md border border-input bg-background px-2 py-1 text-right"
                        aria-label={`Verified price for ${r.name}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {!r.hasMaterial
                        ? "No shared material record"
                        : r.configuredPrice === null
                          ? "Unconfigured in shared DB"
                          : "Configured"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {applyStatus && applyStatus.messages.length > 0 && (
          <ul
            className="mt-4 space-y-1 text-sm text-muted-foreground"
            data-testid="apply-messages"
          >
            {applyStatus.messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}

        {!loaded && !scanning && !error && (
          <div className="rounded-xl border border-dashed border-border bg-muted/50 p-12 text-center">
            <p className="text-muted-foreground">
              Loading the shared material catalog…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
