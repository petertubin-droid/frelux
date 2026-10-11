/**
 * FRELUX Flooring Estimator (Tier 2, Engine 4)
 *
 * Deterministic plank/sheet flooring MATERIAL estimation:
 * measured floor area and skirting run → laminate packs, vinyl or
 * parquet m², underlay, adhesive and skirting quantities, with
 * coverage, pack sizes and waste visible in the breakdown, prices
 * from the shared material database (never invented), labour
 * separate.
 *
 * This is ESTIMATION, not a flooring specification.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import MarketScopeNotice from "@/components/MarketScopeNotice";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import {
  fetchCalcRules,
  fetchEstimationMaterials,
  fetchAllPrices,
  createEstimate,
  createEstimateItem,
} from "@/lib/estimation/queries";
import { SaveToProjectButton } from "@/components/calculators";
import { formatCurrency } from "@/lib/utils";
import { useDisplayCurrency } from "@/lib/international/currency-context";
import { printQuote } from "@/lib/estimation/quote-export";
import {
  calculateFlooring,
  parseFlooringRules,
  type FlooringInput,
  type FlooringPriceMap,
  type FlooringResult,
} from "@/lib/estimation/flooring-engine";
import type {
  EstimationCalcRule,
  EstimationMaterial,
  EstimationPrice,
} from "@/types/estimation";

type FloorType = "laminate" | "vinyl" | "parquet";

const FLOOR_TYPES: { value: FloorType; label: string }[] = [
  { value: "laminate", label: "Laminate (packs)" },
  { value: "vinyl", label: "Vinyl / PVC (m²)" },
  { value: "parquet", label: "Parquet (m²)" },
];

function fmtN(v: number | null): string {
  return v === null ? "N/A" : v.toLocaleString();
}

export default function FlooringEstimator() {
  const { symbol: currencySymbol } = useDisplayCurrency();
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "Flooring Estimator", path: "/flooring" },
  ]);
  const { user } = useAuth();

  const [floorType, setFloorType] = useState<FloorType>("laminate");
  const [areaInput, setAreaInput] = useState("");
  const [skirtingInput, setSkirtingInput] = useState("");
  const [includeUnderlay, setIncludeUnderlay] = useState(true);
  const [includeAdhesive, setIncludeAdhesive] = useState(false);
  const [labourMode, setLabourMode] = useState<"none" | "per_m2" | "lump_sum">(
    "none",
  );
  const [labourRate, setLabourRate] = useState("");
  const [result, setResult] = useState<FlooringResult | null>(null);
  const [saveState, setSaveState] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useSeo({
    title:
      "Flooring Estimator: Laminate, Vinyl, Parquet, Underlay & Skirting | FRELUX",
    description:
      "Deterministic flooring material estimation: enter your floor area and skirting run and get laminate packs, vinyl or parquet m², underlay, adhesive and skirting quantities with pack coverage and waste shown in the breakdown. Estimation only: not a flooring specification.",
  });

  const [priceMap, setPriceMap] = useState<FlooringPriceMap>({});
  const [ruleRows, setRuleRows] = useState<EstimationCalcRule[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [rulesRes, matsRes, pricesRes] = await Promise.all([
        fetchCalcRules("flooring"),
        fetchEstimationMaterials(true),
        fetchAllPrices(true),
      ]);
      if (!alive) return;
      const byRef = new Map<string, number>();
      for (const pr of (pricesRes.data ?? []) as EstimationPrice[]) {
        if (pr.price_type === "material" && !byRef.has(pr.ref_id)) {
          byRef.set(pr.ref_id, pr.price);
        }
      }
      const map: FlooringPriceMap = {};
      for (const m of (matsRes.data ?? []) as EstimationMaterial[]) {
        map[m.slug] = byRef.get(m.id) ?? null;
      }
      setPriceMap(map);
      setRuleRows(rulesRes.data as unknown as EstimationCalcRule[]);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const rules = useMemo(
    () => parseFlooringRules(ruleRows as never),
    [ruleRows],
  );

  const input: FlooringInput = useMemo(() => {
    const run = (v: string): number | null => {
      const trimmed = v.trim();
      if (!trimmed) return null;
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : Number.NaN;
    };
    return {
      flooring_type: floorType,
      floor_area_m2: run(areaInput),
      skirting_run_m: run(skirtingInput),
      include_underlay: includeUnderlay,
      include_adhesive: includeAdhesive,
      labour: {
        mode: labourMode,
        per_m2_rate:
          labourMode === "per_m2" ? Number(labourRate) || null : null,
        lump_sum: labourMode === "lump_sum" ? Number(labourRate) || null : null,
      },
    };
  }, [
    floorType,
    areaInput,
    skirtingInput,
    includeUnderlay,
    includeAdhesive,
    labourMode,
    labourRate,
  ]);

  const run = useCallback(() => {
    const res = calculateFlooring(input, rules, priceMap);
    setResult(res);
    track("calculator_completed", {
      calculator: "flooring",
      incomplete: res.incomplete,
      lines: res.lines.length,
    });
  }, [input, rules, priceMap]);

  // Printable professional quote, worldwide-currency formatted.
  const exportQuote = () => {
    if (!result?.ok) return;
    printQuote(
      {
        title: "FRELUX Flooring Estimate",
        subtitle: `Generated ${new Date().toLocaleDateString()} · ${result.lines.length} line item(s)`,
        metaRows: result.steps.map(
          (st) => [st.label, st.detail] as [string, string],
        ),
        lines: result.lines.map((l) => ({
          label: l.label,
          quantity:
            l.quantity === null ? "(provide measurement)" : fmtN(l.quantity),
          unit: l.unit,
          unit_price:
            l.unit_price === null ? "unpriced" : formatCurrency(l.unit_price),
          line_total:
            l.line_total === null ? "N/A" : formatCurrency(l.line_total),
          detail: l.detail,
        })),
        totals: [
          {
            label: "Material subtotal",
            value:
              result.material_subtotal === null
                ? "(prices/inputs missing)"
                : formatCurrency(result.material_subtotal),
          },
          {
            label: "Priced so far",
            value: formatCurrency(result.priced_subtotal),
          },
          {
            label: "Labour",
            value:
              labourMode === "none"
                ? "Not included"
                : formatCurrency(result.labour_total),
          },
          {
            label: "Grand total",
            value:
              result.grand_total === null
                ? "N/A"
                : formatCurrency(result.grand_total),
            strong: true,
          },
        ],
        warnings: result.warnings,
        footer:
          "Estimates are indicative and not a formal quote. Quantities are sized from your room dimensions, tiles and screed rules; unpriced items are reported, never invented.",
      },
      "frelux-flooring-estimate.html",
    );
  };

  const save = useCallback(async () => {
    if (!result || !result.ok || saving) return;
    setSaving(true);
    setSaveState(null);
    try {
      const ref = `FLOOR-${Date.now()}}.toString(36).toUpperCase()}`;
      const { data: estimate, error } = await createEstimate({
        estimate_ref: ref,
        user_id: user?.id ?? null,
        client_hash: null,
        calculator_type: "flooring",
        project_description: "Flooring estimate",
        inputs: input as unknown as Record<string, unknown>,
        calculation_method: "flooring_v1",
        calculated_quantities: {
          lines: result.lines,
          priced_subtotal: result.priced_subtotal,
          material_subtotal: result.material_subtotal,
          labour_total: result.labour_total,
          incomplete: result.incomplete,
        },
        total_material_cost: result.material_subtotal ?? 0,
        currency: "NGN",
        labour_status:
          labourMode === "none"
            ? "not_included"
            : result.labour_total > 0
              ? "included"
              : "negotiated_separately",
        warnings: [
          ...result.warnings,
          ...result.missing.map((m) => `Missing: ${m}`),
        ],
        recommendations: [],
        notes: null,
        status: result.incomplete ? "draft" : "saved",
      });
      if (error) throw error;
      for (const line of result.lines) {
        const { error: itemError } = await createEstimateItem({
          estimate_id: estimate!.id,
          item_name: line.label,
          item_type: "material",
          product_id: null,
          quality_level_id: null,
          material_id: null,
          quantity_required: line.quantity ?? 0,
          practical_purchase_qty: line.quantity ?? 0,
          unit: line.unit,
          pack_size: null,
          unit_price: line.unit_price ?? 0,
          total_price: line.line_total ?? 0,
          price_snapshot: { base: line.unit_price, currency: "NGN" },
          calculation_source: "calculated",
          notes: line.detail,
        } as never);
        if (itemError) throw itemError;
      }
      setSaveState(
        result.incomplete
          ? `Saved as draft (${ref}): complete the missing inputs for a final estimate.`
          : `Saved (${ref}). Import it into a BOQ or project from your estimates.`,
      );
      track("calculator_completed", { calculator: "flooring_saved", ref });
    } catch (err) {
      setSaveState(`Could not save: ${getSafeError(err)}`);
    } finally {
      setSaving(false);
    }
  }, [result, saving, user, input, labourMode]);

  const numberInput = (
    label: string,
    state: string,
    setter: (v: string) => void,
    placeholder = "0",
  ) => (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        value={state}
        onChange={(e) => setter(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </label>
  );

  return (
    <Container>
      <PageHeader
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Construction Tools", path: "/construction-tools" },
          { label: "Flooring Estimator" },
        ]}
        title="Flooring Estimator"
        subtitle="Enter your measured floor area and skirting run. The engine sizes laminate packs, vinyl or parquet m², underlay, adhesive and skirting with the admin's visible coverage, pack-size and waste rules. Estimation only: not a flooring specification."
      />

      {/* Inputs */}
      <div className="mb-8 rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="mb-1 font-semibold">Flooring type and measurements</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          The engine never assumes areas. Enter your measured floor area and
          skirting run. Leave a field blank when it needs a decision (the
          estimate is marked incomplete); enter 0 only when there is truly none.
        </p>
        <label className="mb-3 block text-sm sm:max-w-xs">
          <span className="mb-1 block font-medium">Flooring type</span>
          <select
            value={floorType}
            onChange={(e) => setFloorType(e.target.value as FloorType)}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          >
            {FLOOR_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {numberInput("Floor area (m²)", areaInput, setAreaInput)}
          {numberInput(
            "Skirting run: room perimeter (m)",
            skirtingInput,
            setSkirtingInput,
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeUnderlay}
              onChange={(e) => setIncludeUnderlay(e.target.checked)}
            />
            Include underlay
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeAdhesive}
              onChange={(e) => setIncludeAdhesive(e.target.checked)}
            />
            Include adhesive (glue-down installations)
          </label>
        </div>

        <h3 className="mt-5 mb-2 font-semibold">Labour</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Labour mode</span>
            <select
              value={labourMode}
              onChange={(e) =>
                setLabourMode(e.target.value as typeof labourMode)
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 sm:w-56"
            >
              <option value="none">Not included</option>
              <option value="per_m2">Per m² treated (rate)</option>
              <option value="lump_sum">Lump sum</option>
            </select>
          </label>
          {labourMode !== "none" &&
            numberInput(
              labourMode === "per_m2" ? `Rate per m² (${currencySymbol})` : `Lump sum (${currencySymbol})`,
              labourRate,
              setLabourRate,
            )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Labour is always separate from material quantities and is never added
          automatically.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={run}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Calculate estimate
          </button>
          {result?.ok && (
            <>
              <button
                onClick={save}
                disabled={saving || result.lines.length === 0}
                className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save estimate"}
              </button>
              <button
                onClick={exportQuote}
                className="rounded-md border px-4 py-2 text-sm font-medium"
              >
                Export quote (PDF)
              </button>
              <SaveToProjectButton
                calculatorType="flooring"
                calculatorSlug="flooring-estimator"
                calcTitle="Flooring estimate"
                calcData={input as unknown as Record<string, unknown>}
                resultSummary={{
                  grand_total: result.grand_total,
                  material_subtotal: result.material_subtotal,
                  labour_total: result.labour_total,
                  incomplete: result.incomplete,
                }}
                materials={result.lines
                  .filter((l) => l.quantity !== null)
                  .map((l) => ({
                    name: l.label,
                    category: "flooring",
                    quantity: l.quantity ?? 0,
                    unit: l.unit,
                    estimated_price: l.unit_price ?? undefined,
                  }))}
              />
            </>
          )}
        </div>
        {saveState && (
          <p
            className="mt-3 text-sm text-muted-foreground"
            data-testid="save-state"
          >
            {saveState}
          </p>
        )}
      </div>

      <AdSlot slotKey="calculator_mid" className="mt-8" />

      {/* Errors */}
      {result && !result.ok && (
        <div
          className="mb-8 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
          role="alert"
        >
          <h3 className="mb-1 font-semibold text-destructive">
            Fix these inputs first
          </h3>
          <ul className="list-disc pl-5 text-sm text-destructive">
            {result.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Result */}
      {result?.ok && (
        <>
          {/* Status banner */}
          <div
            className={`mb-4 rounded-lg border p-4 text-sm ${
              result.incomplete
                ? "border-amber-600/40 bg-amber-600/5"
                : "border-emerald-600/40 bg-emerald-600/5"
            }`}
            data-testid="estimate-status"
          >
            {result.incomplete ? (
              <>
                <strong className="block">This estimate is INCOMPLETE.</strong>
                <ul className="mt-1 list-disc pl-5">
                  {result.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                  {result.lines
                    .filter((l) => l.unit_price === null && l.quantity !== null)
                    .map((l) => (
                      <li key={l.key}>
                        {l.label}: PRICE NOT CONFIGURED in the material database
                        : the quantity is shown, but no price was invented.
                      </li>
                    ))}
                </ul>
              </>
            ) : (
              <strong>
                Complete estimate: every line sized and priced from the shared
                material database.
              </strong>
            )}
          </div>

          {/* Materials table */}
          <div className="mb-6 overflow-x-auto rounded-lg border bg-card">
            <table
              className="w-full text-sm"
              aria-label="Flooring material takeoff"
            >
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Material</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Unit</th>
                  <th className="p-3">How it was sized</th>
                  <th className="p-3">Unit price</th>
                  <th className="p-3">Line total</th>
                </tr>
              </thead>
              <tbody>
                {result.lines.map((l) => (
                  <tr key={l.key} className="border-b last:border-0">
                    <td className="p-3 font-medium">{l.label}</td>
                    <td className="p-3" data-testid={`qty-${l.key}`}>
                      {l.quantity === null
                        ? "(provide measurement)"
                        : fmtN(l.quantity)}
                    </td>
                    <td className="p-3 text-muted-foreground">{l.unit}</td>
                    <td className="max-w-xs p-3 text-xs text-muted-foreground">
                      {l.detail}
                    </td>
                    <td className="p-3">
                      {l.unit_price === null ? (
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          PRICE NOT CONFIGURED
                        </span>
                      ) : (
                        formatCurrency(l.unit_price)
                      )}
                    </td>
                    <td className="p-3 font-medium">
                      {l.line_total === null
                        ? "N/A"
                        : formatCurrency(l.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Breakdown */}
          <div className="mb-6 rounded-lg border bg-card p-4">
            <h3 className="mb-2 font-semibold">Calculation breakdown</h3>
            <ol className="space-y-2 text-sm">
              {result.steps.map((s, i) => (
                <li key={i} className="border-b pb-2 last:border-0 last:pb-0">
                  <span className="font-medium">{s.label}:</span>{" "}
                  <span className="text-muted-foreground">{s.detail}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Cost summary */}
          <div className="mb-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Material subtotal</p>
              <p className="text-xl font-semibold">
                {result.material_subtotal === null
                  ? "(prices/inputs missing)"
                  : formatCurrency(result.material_subtotal)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                Of which priced so far
              </p>
              <p className="text-xl font-semibold">
                {formatCurrency(result.priced_subtotal)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Labour</p>
              <p className="text-xl font-semibold">
                {labourMode === "none"
                  ? "Not included"
                  : formatCurrency(result.labour_total)}
              </p>
            </div>
            <div className="rounded-lg border bg-primary/10 p-4">
              <p className="text-sm text-muted-foreground">Grand total</p>
              <p className="text-xl font-semibold">
                {result.grand_total === null
                  ? "N/A"
                  : formatCurrency(result.grand_total)}
              </p>
            </div>
          </div>

          {/* Warnings */}
          <div className="mb-8 rounded-lg border border-amber-600/40 bg-amber-600/5 p-4 text-sm">
            <h3 className="mb-1 font-semibold">Important</h3>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      <AdSlot slotKey="calculator_native" className="mt-8" />

      {/* How it works */}
      <section className="mt-10 rounded-lg border bg-muted/30 p-5 text-sm">
        <h2 className="mb-2 font-semibold">How this estimator works</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Quantities come from your measured area and skirting run, with the
            admin's visible waste, pack, roll and bag coverage rules. A coverage
            rule must match the product the admin prices: a pack covers what it
            says, no more.
          </li>
          <li>
            Laminate is sized in whole packs; vinyl and parquet in whole m². A
            blank measurement the project needs is reported as missing and the
            estimate stays incomplete instead of guessing.
          </li>
          <li>
            Prices come from the shared FRELUX material database, configured by
            the site admin (Price Tracker). Unpriced materials show PRICE NOT
            CONFIGURED, never invented.
          </li>
          <li>
            This is material ESTIMATION, not a flooring specification. Substrate
            condition, acclimatisation and installation details need a
            professional.
          </li>
        </ul>
      </section>

      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
