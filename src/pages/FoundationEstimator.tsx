/**
 * FRELUX Foundation Estimator (Tier 2, Engine 6)
 *
 * Deterministic foundation MATERIAL estimation: measured volumes
 * and areas → concrete mix materials with every constant visible
 * (dry factor 1.54, 0.0347 m³ per 50 kg bag, the admin's mix
 * ratio), blocks from the visible blocks-per-m² rule, hardcore
 * and formwork from your measurements, prices from the shared
 * material database (never invented), labour separate.
 *
 * This is ESTIMATION and does NOT design foundations.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import MarketScopeNotice from "@/components/MarketScopeNotice";
import { useMarket } from "@/lib/international/market-context";
import {
  resolveStructuralMarketPricing,
  type StructuralMarketPricing,
} from "@/lib/estimation/structural-market";
import { useSeo } from "@/lib/seo";
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
import { printQuote } from "@/lib/estimation/quote-export";
import {
  calculateFoundation,
  parseFoundationRules,
  type FoundationInput,
  type FoundationPriceMap,
  type FoundationResult,
} from "@/lib/estimation/foundation-engine";
import type {
  EstimationCalcRule,
  EstimationMaterial,
  EstimationPrice,
} from "@/types/estimation";

type Field =
  | "concrete_volume_m3"
  | "block_wall_area_m2"
  | "hardcore_volume_m3"
  | "formwork_area_m2";

const FIELD_LABELS: Record<Field, string> = {
  concrete_volume_m3: "Foundation concrete volume (m³)",
  block_wall_area_m2: "Blockwork-to-DPC wall area (m²)",
  hardcore_volume_m3: "Hardcore fill volume (m³)",
  formwork_area_m2: "Formwork contact area (m²)",
};

function fmtN(v: number | null): string {
  return v === null ? "N/A" : v.toLocaleString();
}

export default function FoundationEstimator() {
  const { user } = useAuth();

  const [fields, setFields] = useState<Record<Field, string>>({
    concrete_volume_m3: "",
    block_wall_area_m2: "",
    hardcore_volume_m3: "",
    formwork_area_m2: "",
  });
  const [labourMode, setLabourMode] = useState<"none" | "per_m3" | "lump_sum">(
    "none",
  );
  const [labourRate, setLabourRate] = useState("");
  const [result, setResult] = useState<FoundationResult | null>(null);
  const [saveState, setSaveState] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useSeo({
    title:
      "Foundation Estimator: Concrete Mix, Blocks, Hardcore & Formwork | FRELUX",
    description:
      "Deterministic foundation material estimation: enter your measured concrete volume, wall area, hardcore and formwork and get cement, sand, granite, blocks and formwork quantities with the mix ratio, dry factor and every step shown. Estimation only: not foundation design.",
  });

  const [priceMap, setPriceMap] = useState<FoundationPriceMap>({});
  const [marketPricing, setMarketPricing] = useState<StructuralMarketPricing | null>(null);
  const { marketCode, currencyCode, currencySymbol } = useMarket();
  const [ruleRows, setRuleRows] = useState<EstimationCalcRule[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [rulesRes, matsRes, pricesRes] = await Promise.all([
        fetchCalcRules("foundation"),
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
      const map: FoundationPriceMap = {};
      for (const m of (matsRes.data ?? []) as EstimationMaterial[]) {
        map[m.slug] = byRef.get(m.id) ?? null;
      }
      if (marketCode !== "NG") {
        const marketPricing =
          await resolveStructuralMarketPricing(marketCode);
        if (!alive) return;
        const overlay = { ...map };
        for (const [k, v] of Object.entries(marketPricing.overrides)) {
          overlay[k] = v;
        }
        setPriceMap(overlay);
        setMarketPricing(marketPricing);
      } else {
        setPriceMap(map);
      }
      setRuleRows(rulesRes.data as unknown as EstimationCalcRule[]);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [marketCode]);

  const rules = useMemo(
    () => parseFoundationRules(ruleRows as never),
    [ruleRows],
  );

  const input: FoundationInput = useMemo(() => {
    const run = (v: string): number | null => {
      const trimmed = v.trim();
      if (!trimmed) return null;
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : Number.NaN;
    };
    return {
      concrete_volume_m3: run(fields.concrete_volume_m3),
      block_wall_area_m2: run(fields.block_wall_area_m2),
      hardcore_volume_m3: run(fields.hardcore_volume_m3),
      formwork_area_m2: run(fields.formwork_area_m2),
      labour: {
        mode: labourMode,
        per_m3_rate:
          labourMode === "per_m3" ? Number(labourRate) || null : null,
        lump_sum: labourMode === "lump_sum" ? Number(labourRate) || null : null,
      },
    };
  }, [fields, labourMode, labourRate]);

  const run = useCallback(() => {
    const res = calculateFoundation(input, rules, priceMap);
    setResult(res);
    track("calculator_completed", {
      calculator: "foundation",
      incomplete: res.incomplete,
      lines: res.lines.length,
    });
  }, [input, rules, priceMap]);

  // Printable professional quote, worldwide-currency formatted.
  const exportQuote = () => {
    if (!result?.ok) return;
    printQuote(
      {
        title: "FRELUX Foundation Estimate",
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
          "Estimates are indicative and not a formal quote. Quantities are sized from your foundation dimensions and soil rules; unpriced items are reported, never invented.",
      },
      "frelux-foundation-estimate.html",
    );
  };

  const save = useCallback(async () => {
    if (!result || !result.ok || saving) return;
    setSaving(true);
    setSaveState(null);
    try {
      const ref = `FOUND-${Date.now()}}}}.toString(36).toUpperCase()}`;
      const { data: estimate, error } = await createEstimate({
        estimate_ref: ref,
        user_id: user?.id ?? null,
        client_hash: null,
        calculator_type: "foundation",
        project_description: "Foundation estimate",
        inputs: input as unknown as Record<string, unknown>,
        calculation_method: "foundation_v1",
        calculated_quantities: {
          lines: result.lines,
          priced_subtotal: result.priced_subtotal,
          material_subtotal: result.material_subtotal,
          labour_total: result.labour_total,
          incomplete: result.incomplete,
        },
        total_material_cost: result.material_subtotal ?? 0,
        currency: currencyCode,
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
          price_snapshot: { base: line.unit_price, currency: currencyCode },
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
      track("calculator_completed", { calculator: "foundation_saved", ref });
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
          { label: "Foundation Estimator" },
        ]}
        title="Foundation Estimator"
        subtitle="Enter your measured concrete volume, wall area, hardcore and formwork. The engine splits concrete into cement, sand and granite with the admin's visible mix ratio and every constant shown, sizes blocks from the blocks-per-m² rule, and prices from the shared material database. Estimation only: not foundation design."
      />

      <MarketScopeNotice />
      {marketCode !== "NG" && marketPricing && (
        <div
          className="mb-6 rounded-lg border border-border bg-muted/40 p-4 text-sm"
          data-testid="market-price-provenance"
        >
          <p className="font-semibold">
            Prices from the {marketCode} price book ({currencyCode})
          </p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {marketPricing.provenance.map((p) => (
              <li key={p.engineKey}>
                {p.resolved ? "✓" : "✗"} {p.engineKey}: {p.explanation}
              </li>
            ))}
            {marketPricing.unresolved.length > 0 && (
              <li>
                ✗ {marketPricing.unresolved.join(", ")}: no verified price in
                the {marketCode} book - these lines report as unpriced until
                you supply local prices.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Inputs */}
      <div className="mb-8 rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="mb-1 font-semibold">Measured volumes and areas</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          The engine never assumes volumes. Enter what you measured. Leave a
          field blank when it needs a decision (the estimate is marked
          incomplete); enter 0 only when there is truly none. Footing sizes,
          depth and reinforcement are structural engineering decisions: use the
          Reinforcement estimator for the bar schedule.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(FIELD_LABELS) as Field[]).map((k) =>
            numberInput(FIELD_LABELS[k], fields[k], (v) =>
              setFields((f) => ({ ...f, [k]: v })),
            ),
          )}
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
              <option value="per_m3">Per m³ of concrete (rate)</option>
              <option value="lump_sum">Lump sum</option>
            </select>
          </label>
          {labourMode !== "none" &&
            numberInput(
              labourMode === "per_m3" ? `Rate per m³ (${currencySymbol})` : `Lump sum (${currencySymbol})`,
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
                calculatorType="foundation"
                calculatorSlug="foundation-estimator"
                calcTitle="Foundation estimate"
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
                    category: "foundation",
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
              aria-label="Foundation material takeoff"
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
            Concrete follows the standard dry-volume mix math with every
            constant shown: wet volume × waste × 1.54 dry factor, split by the
            admin's mix ratio (default 1:2:4), cement at 0.0347 m³ per 50 kg
            bag. Change the ratio in the admin and the split changes visibly.
          </li>
          <li>
            Blocks follow the admin's visible blocks-per-m² rule, which must
            match the block the admin prices. Hardcore and formwork take your
            measured volumes and areas directly.
          </li>
          <li>
            All materials use the same shared records the Price Tracker manages
            (cement, sand, granite, hardcore, blocks, formwork): one price
            configuration feeds every engine. Unpriced materials show PRICE NOT
            CONFIGURED, never invented.
          </li>
          <li>
            This is material ESTIMATION, not foundation design. Footing sizes,
            depth and reinforcement are structural engineering decisions: use
            the Reinforcement estimator for the bar schedule.
          </li>
        </ul>
      </section>

      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
