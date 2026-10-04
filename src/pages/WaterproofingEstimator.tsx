/**
 * FRELUX Waterproofing Estimator (Tier 2, Engine 3)
 *
 * Deterministic waterproofing MATERIAL estimation: measured DPC
 * run, DPM area, wet-area surfaces and terrace area → DPC, DPM,
 * coating, membrane and tape quantities, with coats, coverage,
 * waste and overlaps visible in the breakdown, prices from the
 * shared material database (never invented), labour separate.
 *
 * This is ESTIMATION, not waterproofing design.
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
  calculateWaterproofing,
  parseWaterproofingRules,
  type WaterproofingInput,
  type WaterproofingPriceMap,
  type WaterproofingResult,
} from "@/lib/estimation/waterproofing-engine";
import type {
  EstimationCalcRule,
  EstimationMaterial,
  EstimationPrice,
} from "@/types/estimation";

type AreaField =
  | "dpc_run_m"
  | "dpm_area_m2"
  | "wet_floor_area_m2"
  | "wet_wall_area_m2"
  | "wet_perimeter_m"
  | "terrace_area_m2";

const FIELD_LABELS: Record<AreaField, string> = {
  dpc_run_m: "DPC run length (m)",
  dpm_area_m2: "DPM membrane area (m²)",
  wet_floor_area_m2: "Wet-area floor area (m²)",
  wet_wall_area_m2: "Wet-area wall splash area (m²)",
  wet_perimeter_m: "Wet-area perimeter for tape (m)",
  terrace_area_m2: "Terrace / roof treatment area (m²)",
};

function fmtN(v: number | null): string {
  return v === null ? "—" : v.toLocaleString();
}

export default function WaterproofingEstimator() {
  const { user } = useAuth();

  const [areas, setAreas] = useState<Record<AreaField, string>>({
    dpc_run_m: "",
    dpm_area_m2: "",
    wet_floor_area_m2: "",
    wet_wall_area_m2: "",
    wet_perimeter_m: "",
    terrace_area_m2: "",
  });
  const [labourMode, setLabourMode] = useState<"none" | "per_m2" | "lump_sum">(
    "none",
  );
  const [labourRate, setLabourRate] = useState("");
  const [result, setResult] = useState<WaterproofingResult | null>(null);
  const [saveState, setSaveState] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useSeo({
    title:
      "Waterproofing Estimator — DPC, DPM, Coating & Membrane | FRELUX PROJECT CALC",
    description:
      "Deterministic waterproofing material estimation: enter your measured DPC run, DPM area, wet-area surfaces and terrace area and get DPC, DPM, coating, membrane and tape quantities with coats, coverage and waste shown in the breakdown. Estimation only — not waterproofing design.",
  });

  const [priceMap, setPriceMap] = useState<WaterproofingPriceMap>({});
  const [ruleRows, setRuleRows] = useState<EstimationCalcRule[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [rulesRes, matsRes, pricesRes] = await Promise.all([
        fetchCalcRules("waterproofing"),
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
      const map: WaterproofingPriceMap = {};
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
    () => parseWaterproofingRules(ruleRows as never),
    [ruleRows],
  );

  const input: WaterproofingInput = useMemo(() => {
    const run = (v: string): number | null => {
      const trimmed = v.trim();
      if (!trimmed) return null;
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : Number.NaN;
    };
    return {
      dpc_run_m: run(areas.dpc_run_m),
      dpm_area_m2: run(areas.dpm_area_m2),
      wet_floor_area_m2: run(areas.wet_floor_area_m2),
      wet_wall_area_m2: run(areas.wet_wall_area_m2),
      wet_perimeter_m: run(areas.wet_perimeter_m),
      terrace_area_m2: run(areas.terrace_area_m2),
      labour: {
        mode: labourMode,
        per_m2_rate:
          labourMode === "per_m2" ? Number(labourRate) || null : null,
        lump_sum: labourMode === "lump_sum" ? Number(labourRate) || null : null,
      },
    };
  }, [areas, labourMode, labourRate]);

  const run = useCallback(() => {
    const res = calculateWaterproofing(input, rules, priceMap);
    setResult(res);
    track("calculator_completed", {
      calculator: "waterproofing",
      incomplete: res.incomplete,
      lines: res.lines.length,
    });
  }, [input, rules, priceMap]);

  const save = useCallback(async () => {
    if (!result || !result.ok || saving) return;
    setSaving(true);
    setSaveState(null);
    try {
      const ref = `WPROOF-${Date.now()}.toString(36).toUpperCase()}`;
      const { data: estimate, error } = await createEstimate({
        estimate_ref: ref,
        user_id: user?.id ?? null,
        client_hash: null,
        calculator_type: "waterproofing",
        project_description: "Waterproofing estimate",
        inputs: input as unknown as Record<string, unknown>,
        calculation_method: "waterproofing_v1",
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
          ? `Saved as draft (${ref}) — complete the missing inputs for a final estimate.`
          : `Saved (${ref}). Import it into a BOQ or project from your estimates.`,
      );
      track("calculator_completed", { calculator: "waterproofing_saved", ref });
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
        title="Waterproofing Estimator"
        subtitle="Enter your measured DPC run, DPM area, wet-area surfaces and terrace area. The engine sizes DPC, DPM, coating, membrane and tape from your measurements with the admin's visible coats, coverage, waste and overlap rules. Estimation only — not waterproofing design."
      />

      {/* Inputs */}
      <div className="mb-8 rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="mb-1 font-semibold">Measured areas and runs</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          The engine never assumes surfaces. Enter your measured DPC run, DPM
          area, wet-area surfaces and terrace area. Leave a field blank when it
          needs a decision (the estimate is marked incomplete) and enter 0 only
          when the surface truly doesn't exist.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(FIELD_LABELS) as AreaField[]).map((k) =>
            numberInput(FIELD_LABELS[k], areas[k], (v) =>
              setAreas((a) => ({ ...a, [k]: v })),
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
              <option value="per_m2">Per m² treated (rate)</option>
              <option value="lump_sum">Lump sum</option>
            </select>
          </label>
          {labourMode !== "none" &&
            numberInput(
              labourMode === "per_m2" ? "Rate per m² (₦)" : "Lump sum (₦)",
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
                calculatorType="waterproofing"
                calculatorSlug="waterproofing-estimator"
                calcTitle="Waterproofing estimate"
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
                    category: "waterproofing",
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
              aria-label="Waterproofing material takeoff"
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
                        ? "— provide measurement"
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
            Quantities come from your measured runs and areas, with the admin's
            visible overlap, waste, coat-count and coverage rules. The coverage
            rule must match the product the admin prices — a bag covers what its
            datasheet says, no more.
          </li>
          <li>
            A blank measurement the project needs is reported as missing; the
            estimate stays incomplete instead of guessing a surface.
          </li>
          <li>
            DPC and DPM use the same shared material records the Price Tracker
            manages, so one price configuration feeds this engine and every
            other.
          </li>
          <li>
            This is material ESTIMATION, not waterproofing design. Product
            selection, primers, substrate preparation and detailing need a
            professional specification.
          </li>
        </ul>
      </section>

      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
