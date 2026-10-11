/**
 * FRELUX Reinforcement Estimator (Tier 2, Engine 5)
 *
 * Deterministic reinforcement MATERIAL estimation from the
 * user's bar schedule: cutting lengths per diameter → whole 12 m
 * stock lengths with a visible lap/waste allowance, honest BS
 * 4449 tonnage for delivery planning, binding wire from the
 * admin's visible rule, prices from the shared material database
 * (never invented), labour separate.
 *
 * This is ESTIMATION and does NOT design reinforcement.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import MarketScopeNotice from "@/components/MarketScopeNotice";
import { useMarket } from "@/lib/international/market-context";
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
import { useDisplayCurrency } from "@/lib/international/currency-context";
import { printQuote } from "@/lib/estimation/quote-export";
import {
  calculateReinforcement,
  parseReinforcementRules,
  type ReinforcementInput,
  type ReinforcementPriceMap,
  type ReinforcementResult,
} from "@/lib/estimation/reinforcement-engine";
import type {
  EstimationCalcRule,
  EstimationMaterial,
  EstimationPrice,
} from "@/types/estimation";

type LenField = "len_12mm_m" | "len_16mm_m" | "len_20mm_m" | "len_25mm_m";

const LEN_LABELS: Record<LenField, string> = {
  len_12mm_m: "12 mm rebar: total cutting length (m)",
  len_16mm_m: "16 mm rebar: total cutting length (m)",
  len_20mm_m: "20 mm rebar: total cutting length (m)",
  len_25mm_m: "25 mm rebar: total cutting length (m)",
};

function fmtN(v: number | null): string {
  return v === null ? "N/A" : v.toLocaleString();
}

export default function ReinforcementEstimator() {
  const { symbol: currencySymbol } = useDisplayCurrency();
  const { user } = useAuth();

  const [lens, setLens] = useState<Record<LenField, string>>({
  const { marketCode } = useMarket();
    len_12mm_m: "",
    len_16mm_m: "",
    len_20mm_m: "",
    len_25mm_m: "",
  });
  const [labourMode, setLabourMode] = useState<
    "none" | "per_tonne" | "lump_sum"
  >("none");
  const [labourRate, setLabourRate] = useState("");
  const [result, setResult] = useState<ReinforcementResult | null>(null);
  const [saveState, setSaveState] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useSeo({
    title:
      "Reinforcement Estimator: Rebar Lengths, Tonnage & Binding Wire | FRELUX",
    description:
      "Deterministic reinforcement material estimation: enter your bar schedule cutting lengths per diameter and get whole 12 m stock lengths, BS 4449 tonnage and binding wire with the lap allowance and every step shown. Estimation only: it does not design reinforcement.",
  });

  const [priceMap, setPriceMap] = useState<ReinforcementPriceMap>({});
  const [ruleRows, setRuleRows] = useState<EstimationCalcRule[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [rulesRes, matsRes, pricesRes] = await Promise.all([
        fetchCalcRules("reinforcement"),
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
      const map: ReinforcementPriceMap = {};
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
    () => parseReinforcementRules(ruleRows as never),
    [ruleRows],
  );

  const input: ReinforcementInput = useMemo(() => {
    const run = (v: string): number | null => {
      const trimmed = v.trim();
      if (!trimmed) return null;
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : Number.NaN;
    };
    return {
      len_12mm_m: run(lens.len_12mm_m),
      len_16mm_m: run(lens.len_16mm_m),
      len_20mm_m: run(lens.len_20mm_m),
      len_25mm_m: run(lens.len_25mm_m),
      labour: {
        mode: labourMode,
        per_tonne_rate:
          labourMode === "per_tonne" ? Number(labourRate) || null : null,
        lump_sum: labourMode === "lump_sum" ? Number(labourRate) || null : null,
      },
    };
  }, [lens, labourMode, labourRate]);

  const run = useCallback(() => {
    const res = calculateReinforcement(input, rules, priceMap);
    setResult(res);
    track("calculator_completed", {
      calculator: "reinforcement",
      incomplete: res.incomplete,
      lines: res.lines.length,
    });
  }, [input, rules, priceMap]);

  // Printable professional quote, worldwide-currency formatted.
  const exportQuote = () => {
    if (!result?.ok) return;
    printQuote(
      {
        title: "FRELUX Reinforcement Estimate",
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
          "Estimates are indicative and not a formal quote. Quantities are sized from your structural members and reinforcement rules; unpriced items are reported, never invented.",
      },
      "frelux-reinforcement-estimate.html",
    );
  };

  const save = useCallback(async () => {
    if (!result || !result.ok || saving) return;
    setSaving(true);
    setSaveState(null);
    try {
      const ref = `REBAR-${Date.now()}}}.toString(36).toUpperCase()}`;
      const { data: estimate, error } = await createEstimate({
        estimate_ref: ref,
        user_id: user?.id ?? null,
        client_hash: null,
        calculator_type: "reinforcement",
        project_description: "Reinforcement estimate",
        inputs: input as unknown as Record<string, unknown>,
        calculation_method: "reinforcement_v1",
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
      track("calculator_completed", { calculator: "reinforcement_saved", ref });
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
          { label: "Reinforcement Estimator" },
        ]}
        title="Reinforcement Estimator"
        subtitle="Enter your bar schedule cutting lengths per diameter. The engine converts them to whole 12 m stock lengths with a visible lap/waste allowance, computes BS 4449 tonnage for delivery planning, and prices from the shared material database. It does NOT design reinforcement."
      />

      <MarketScopeNotice />
      {marketCode !== "NG" && (
        <div
          className="mb-6 rounded-lg border border-border bg-muted/40 p-4 text-sm"
          data-testid="trade-price-coverage"
        >
          <p className="font-semibold">Price book coverage ({marketCode})</p>
          <p className="mt-1 text-muted-foreground">
            The {marketCode} price book does not yet cover reinforcement steel and binding wire. Prices
            on this page come from the Nigerian price book (disclosed above);
            adjust them for your market before relying on cost totals.
          </p>
        </div>
      )}}


      {/* Inputs */}
      <div className="mb-8 rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="mb-1 font-semibold">
          Bar schedule: cutting lengths per diameter
        </h3>
        <p className="mb-2 text-xs text-muted-foreground">
          The engine never invents steel. Read the total cutting length per
          diameter from your bar bending schedule (or your engineer's estimate).
          Leave a diameter blank if it isn't used; enter 0 only when you
          explicitly mean none. Bar sizes, spacing and laps are structural
          engineering decisions that must come from your engineer: this tool
          only converts your schedule into purchasable quantities.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(LEN_LABELS) as LenField[]).map((k) =>
            numberInput(LEN_LABELS[k], lens[k], (v) =>
              setLens((l) => ({ ...l, [k]: v })),
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
              <option value="per_tonne">Per tonne of steel (rate)</option>
              <option value="lump_sum">Lump sum</option>
            </select>
          </label>
          {labourMode !== "none" &&
            numberInput(
              labourMode === "per_tonne"
                ? `Rate per tonne (${currencySymbol})`
                : `Lump sum (${currencySymbol})`,
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
                calculatorType="reinforcement"
                calculatorSlug="reinforcement-estimator"
                calcTitle="Reinforcement estimate"
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
                    category: "steel",
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
              aria-label="Reinforcement material takeoff"
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
                        ? "(provide schedule length)"
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
                Steel mass (delivery planning)
              </p>
              <p className="text-xl font-semibold">
                {result.total_tonnage_kg === null
                  ? "N/A"
                  : `${fmtN(result.total_tonnage_kg)} kg (${fmtN(
                      Math.round((result.total_tonnage_kg / 1000) * 1000) /
                        1000,
                    )} t)`}
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
            Your bar schedule's cutting lengths per diameter are converted to
            whole 12 m stock lengths, rounded up, with the admin's visible
            lap/cut/waste allowance shown separately.
          </li>
          <li>
            Tonnage is computed from true cutting lengths using BS 4449 nominal
            mass per metre (12 mm 0.888, 16 mm 1.578, 20 mm 2.466, 25 mm 3.854
            kg/m): for delivery planning, not for pricing.
          </li>
          <li>
            Binding wire follows the admin's visible planning rule (kg per
            tonne). Rebar and binding wire use the same shared material records
            the Price Tracker manages, so one price configuration feeds every
            engine.
          </li>
          <li>
            This is material ESTIMATION from your schedule. It does NOT design
            reinforcement: bar sizes, spacing and laps must come from a
            structural engineer.
          </li>
        </ul>
      </section>

      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
