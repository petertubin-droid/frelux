/**
 * FRELUX Plumbing Estimator (Tier 2, Engine 2)
 *
 * Deterministic plumbing MATERIAL estimation: fixture counts and
 * your measured total pipe runs per category → pipes, fittings,
 * valves, taps and connection kits, with the calculation breakdown
 * visible, waste shown separately, prices from the shared material
 * database (never invented), and labour kept separate.
 *
 * This is ESTIMATION, not professional plumbing design.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
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
import {
  calculatePlumbing,
  parsePlumbingRules,
  type PlumbingInput,
  type PlumbingPriceMap,
  type PlumbingResult,
} from "@/lib/estimation/plumbing-engine";
import type {
  EstimationCalcRule,
  EstimationMaterial,
  EstimationPrice,
} from "@/types/estimation";

type NumField =
  | "taps"
  | "wcs"
  | "showers"
  | "sinks"
  | "floor_drains"
  | "water_storage_tanks"
  | "pumps";

type RunField = "cold_run_m" | "hot_run_m" | "waste_run_m" | "drainage_run_m";

const RUN_LABELS: Record<RunField, string> = {
  cold_run_m: "Cold water pipe — total run (m)",
  hot_run_m: "Hot water pipe — total run (m)",
  waste_run_m: "Waste pipe — total run (m)",
  drainage_run_m: "Drainage pipe — total run (m)",
};

const NUM_LABELS: Record<NumField, string> = {
  taps: "Taps",
  wcs: "WCs",
  showers: "Showers",
  sinks: "Sinks",
  floor_drains: "Floor drains",
  water_storage_tanks: "Water storage tanks",
  pumps: "Pumps",
};

function fmtN(v: number | null): string {
  return v === null ? "—" : v.toLocaleString();
}

export default function PlumbingEstimator() {
  const { user } = useAuth();

  const [counts, setCounts] = useState<Record<NumField, string>>({
    taps: "6",
    wcs: "2",
    showers: "1",
    sinks: "2",
    floor_drains: "2",
    water_storage_tanks: "1",
    pumps: "1",
  });
  const [runs, setRuns] = useState<Record<RunField, string>>({
    cold_run_m: "",
    hot_run_m: "",
    waste_run_m: "",
    drainage_run_m: "",
  });
  const [labourMode, setLabourMode] = useState<
    "none" | "per_fixture" | "lump_sum"
  >("none");
  const [labourRate, setLabourRate] = useState("");
  const [result, setResult] = useState<PlumbingResult | null>(null);
  const [saveState, setSaveState] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useSeo({
    title:
      "Plumbing Estimator — Pipes, Fittings, Valves & Connection Kits | FRELUX PROJECT CALC",
    description:
      "Deterministic plumbing material estimation: enter fixture counts and your measured pipe runs and get separate pipe, fitting, valve and connection-kit quantities with a full calculation breakdown. Estimation only — not plumbing design.",
  });

  const [priceMap, setPriceMap] = useState<PlumbingPriceMap>({});
  const [ruleRows, setRuleRows] = useState<EstimationCalcRule[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [rulesRes, matsRes, pricesRes] = await Promise.all([
        fetchCalcRules("plumbing"),
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
      const map: PlumbingPriceMap = {};
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
    () => parsePlumbingRules(ruleRows as never),
    [ruleRows],
  );

  const input: PlumbingInput = useMemo(() => {
    const num = (v: string): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : Number.NaN;
    };
    const run = (v: string): number | null => {
      const trimmed = v.trim();
      if (!trimmed) return null;
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : Number.NaN;
    };
    return {
      taps: num(counts.taps),
      wcs: num(counts.wcs),
      showers: num(counts.showers),
      sinks: num(counts.sinks),
      floor_drains: num(counts.floor_drains),
      water_storage_tanks: num(counts.water_storage_tanks),
      pumps: num(counts.pumps),
      cold_run_m: run(runs.cold_run_m),
      hot_run_m: run(runs.hot_run_m),
      waste_run_m: run(runs.waste_run_m),
      drainage_run_m: run(runs.drainage_run_m),
      labour: {
        mode: labourMode,
        per_fixture_rate:
          labourMode === "per_fixture" ? Number(labourRate) || null : null,
        lump_sum: labourMode === "lump_sum" ? Number(labourRate) || null : null,
      },
    };
  }, [counts, runs, labourMode, labourRate]);

  const run = useCallback(() => {
    const res = calculatePlumbing(input, rules, priceMap);
    setResult(res);
    track("calculator_completed", {
      calculator: "plumbing",
      incomplete: res.incomplete,
      lines: res.lines.length,
    });
  }, [input, rules, priceMap]);

  const save = useCallback(async () => {
    if (!result || !result.ok || saving) return;
    setSaving(true);
    setSaveState(null);
    try {
      const ref = `PLUMB-${Date.now().toString(36).toUpperCase()}`;
      const { data: estimate, error } = await createEstimate({
        estimate_ref: ref,
        user_id: user?.id ?? null,
        client_hash: null,
        calculator_type: "plumbing",
        project_description: "Plumbing estimate",
        inputs: input as unknown as Record<string, unknown>,
        calculation_method: "plumbing_v1",
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
        await createEstimateItem({
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
      }
      setSaveState(
        result.incomplete
          ? `Saved as draft (${ref}) — complete the missing inputs for a final estimate.`
          : `Saved (${ref}). Import it into a BOQ or project from your estimates.`,
      );
      track("calculator_completed", { calculator: "plumbing_saved", ref });
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
        title="Plumbing Estimator"
        subtitle="Enter your fixture counts and the total pipe run you measured for each category. The engine sizes each pipe category separately, applies the admin's visible waste and fitting allowances, and shows every step. Estimation only — not professional plumbing design."
      />

      {/* Inputs */}
      <div className="mb-8 rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="mb-2 font-semibold">Fixtures and equipment</h3>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(NUM_LABELS) as NumField[]).map((k) =>
            numberInput(NUM_LABELS[k], counts[k], (v) =>
              setCounts((c) => ({ ...c, [k]: v })),
            ),
          )}
        </div>

        <h3 className="mb-1 font-semibold">Pipe runs (your measurements)</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          The engine never invents pipe lengths. Give the total run per category
          from your layout; leave <strong>Hot water</strong> blank if there is
          no hot water system. A blank field the rest of the project needs
          leaves that line unsized and the estimate marked incomplete — enter 0
          only when a category truly doesn't exist.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(RUN_LABELS) as RunField[]).map((k) =>
            numberInput(RUN_LABELS[k], runs[k], (v) =>
              setRuns((r) => ({ ...r, [k]: v })),
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
              <option value="per_fixture">Per fixture point (rate)</option>
              <option value="lump_sum">Lump sum</option>
            </select>
          </label>
          {labourMode !== "none" &&
            numberInput(
              labourMode === "per_fixture"
                ? "Rate per point (₦)"
                : "Lump sum (₦)",
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
              <SaveToProjectButton
                calculatorType="plumbing"
                calculatorSlug="plumbing-estimator"
                calcTitle="Plumbing estimate"
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
                    category: "plumbing",
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
                        — the quantity is shown, but no price was invented.
                      </li>
                    ))}
                </ul>
              </>
            ) : (
              <strong>
                Complete estimate — every line sized and priced from the shared
                material database.
              </strong>
            )}
          </div>

          {/* Materials table */}
          <div className="mb-6 overflow-x-auto rounded-lg border bg-card">
            <table
              className="w-full text-sm"
              aria-label="Plumbing material takeoff"
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
                        ? "— provide run length"
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
                        `₦${fmtN(l.unit_price)}`
                      )}
                    </td>
                    <td className="p-3 font-medium">
                      {l.line_total === null ? "—" : `₦${fmtN(l.line_total)}`}
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
                  ? "— prices/inputs missing"
                  : `₦${fmtN(result.material_subtotal)}`}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                Of which priced so far
              </p>
              <p className="text-xl font-semibold">
                ₦{fmtN(result.priced_subtotal)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Labour</p>
              <p className="text-xl font-semibold">
                {labourMode === "none"
                  ? "Not included"
                  : `₦${fmtN(result.labour_total)}`}
              </p>
            </div>
            <div className="rounded-lg border bg-primary/10 p-4">
              <p className="text-sm text-muted-foreground">Grand total</p>
              <p className="text-xl font-semibold">
                {result.grand_total === null
                  ? "—"
                  : `₦${fmtN(result.grand_total)}`}
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
            Pipe quantities come from your measured total runs, one category at
            a time (cold, hot, waste, drainage), with the admin's waste
            allowance shown in the breakdown. Nothing is assumed about hidden
            pipe lengths.
          </li>
          <li>
            Fittings (elbows, tees, reducers, unions, valves) follow the admin's
            visible planning allowances per fixture connection — a labelled
            estimate, not a measurement.
          </li>
          <li>
            Prices come from the shared FRELUX material database, configured by
            the site admin (Price Tracker). Unpriced materials show PRICE NOT
            CONFIGURED, never invented.
          </li>
          <li>
            This is material ESTIMATION, not professional plumbing design. Pipe
            diameters, slopes and drainage design need a qualified plumber or
            engineer.
          </li>
        </ul>
      </section>

      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
