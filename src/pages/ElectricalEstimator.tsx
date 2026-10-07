/**
 * FRELUX Electrical Wiring Estimator (Tier 2, Engine 1)
 *
 * Deterministic electrical MATERIAL estimation: point counts and
 * your average cable run lengths per category → cable, conduit,
 * junction boxes, breakers, accessories, boards - with the
 * calculation breakdown visible, waste shown separately, prices
 * from the shared material database (never invented), and labour
 * kept separate.
 *
 * This is ESTIMATION, not professional electrical design.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
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
import {
  calculateElectrical,
  parseElectricalRules,
  type ElectricalInput,
  type ElectricalPriceMap,
  type ElectricalResult,
} from "@/lib/estimation/electrical-engine";
import type {
  EstimationCalcRule,
  EstimationMaterial,
  EstimationPrice,
} from "@/types/estimation";

const BUILDING_TYPES = [
  "Residential: flat / bungalow",
  "Residential: storey building",
  "Commercial: shop / office",
  "Commercial: larger building",
  "Other",
];

type NumField =
  | "lighting_points"
  | "socket_points"
  | "dedicated_points"
  | "switches"
  | "distribution_boards";

type RunField =
  | "avg_run_lighting_m"
  | "avg_run_socket_m"
  | "avg_run_dedicated_m"
  | "avg_run_earth_m"
  | "avg_run_feeder_m";

const RUN_LABELS: Record<RunField, string> = {
  avg_run_lighting_m: "Avg lighting cable run per point (m)",
  avg_run_socket_m: "Avg socket cable run per point (m)",
  avg_run_dedicated_m: "Avg dedicated circuit run per point (m)",
  avg_run_earth_m: "Avg earth cable run per socket point (m)",
  avg_run_feeder_m: "Avg feeder run per distribution board (m)",
};

const NUM_LABELS: Record<NumField, string> = {
  lighting_points: "Lighting points",
  socket_points: "Socket points",
  dedicated_points: "Dedicated appliance points",
  switches: "Switches",
  distribution_boards: "Distribution boards",
};

function fmtN(v: number | null): string {
  return v === null ? "N/A" : v.toLocaleString();
}

export default function ElectricalEstimator() {
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "Electrical Wiring Estimator", path: "/electrical" },
  ]);
  const { user } = useAuth();

  const [buildingType, setBuildingType] = useState(BUILDING_TYPES[0]);
  const [counts, setCounts] = useState<Record<NumField, string>>({
    lighting_points: "10",
    socket_points: "8",
    dedicated_points: "1",
    switches: "10",
    distribution_boards: "1",
  });
  const [runs, setRuns] = useState<Record<RunField, string>>({
    avg_run_lighting_m: "",
    avg_run_socket_m: "",
    avg_run_dedicated_m: "",
    avg_run_earth_m: "",
    avg_run_feeder_m: "",
  });
  const [labourMode, setLabourMode] = useState<
    "none" | "per_point" | "lump_sum"
  >("none");
  const [labourRate, setLabourRate] = useState("");
  const [result, setResult] = useState<ElectricalResult | null>(null);
  const [saveState, setSaveState] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useSeo({
    title:
      "Electrical Wiring Estimator: Cables, Conduit, Breakers & Boards | FRELUX PROJECT CALC",
    description:
      "Deterministic electrical material estimation: enter your lighting points, socket points and average cable runs and get separate cable, conduit, junction box, breaker and accessory quantities with a full calculation breakdown. Estimation only: not electrical design.",
  });

  // Rules + materials prices load once
  const [priceMap, setPriceMap] = useState<ElectricalPriceMap>({});
  useEffect(() => {
    let alive = true;
    (async () => {
      const [rulesRes, matsRes, pricesRes] = await Promise.all([
        fetchCalcRules("electrical"),
        fetchEstimationMaterials(true),
        fetchAllPrices(true),
      ]);
      if (!alive) return;
      // material id → active price, newest effective_date first
      const byRef = new Map<string, number>();
      for (const pr of (pricesRes.data ?? []) as EstimationPrice[]) {
        if (pr.price_type === "material" && !byRef.has(pr.ref_id)) {
          byRef.set(pr.ref_id, pr.price);
        }
      }
      const map: ElectricalPriceMap = {};
      for (const m of (matsRes.data ?? []) as EstimationMaterial[]) {
        map[m.slug] = byRef.get(m.id) ?? null;
      }
      setPriceMap(map);
      // rules parsed on demand by the calculate handler via stored rows
      setRuleRows(rulesRes.data as unknown as EstimationCalcRule[]);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const [ruleRows, setRuleRows] = useState<EstimationCalcRule[]>([]);
  const rules = useMemo(
    () => parseElectricalRules(ruleRows as never),
    [ruleRows],
  );

  const input: ElectricalInput = useMemo(() => {
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
      building_type: buildingType,
      lighting_points: num(counts.lighting_points),
      socket_points: num(counts.socket_points),
      dedicated_points: num(counts.dedicated_points),
      switches: num(counts.switches),
      distribution_boards: num(counts.distribution_boards),
      avg_run_lighting_m: run(runs.avg_run_lighting_m),
      avg_run_socket_m: run(runs.avg_run_socket_m),
      avg_run_dedicated_m: run(runs.avg_run_dedicated_m),
      avg_run_earth_m: run(runs.avg_run_earth_m),
      avg_run_feeder_m: run(runs.avg_run_feeder_m),
      labour: {
        mode: labourMode,
        per_point_rate:
          labourMode === "per_point" ? Number(labourRate) || null : null,
        lump_sum: labourMode === "lump_sum" ? Number(labourRate) || null : null,
      },
    };
  }, [buildingType, counts, runs, labourMode, labourRate]);

  const run = useCallback(() => {
    const res = calculateElectrical(input, rules, priceMap);
    setResult(res);
    track("calculator_completed", {
      calculator: "electrical",
      incomplete: res.incomplete,
      lines: res.lines.length,
    });
  }, [input, rules, priceMap]);

  const save = useCallback(async () => {
    if (!result || !result.ok || saving) return;
    setSaving(true);
    setSaveState(null);
    try {
      const ref = `ELEC-${Date.now().toString(36).toUpperCase()}`;
      const { data: estimate, error } = await createEstimate({
        estimate_ref: ref,
        user_id: user?.id ?? null,
        client_hash: null,
        calculator_type: "electrical",
        project_description: `Electrical estimate: ${buildingType}`,
        inputs: input as unknown as Record<string, unknown>,
        calculation_method: "electrical_wiring_v1",
        calculated_quantities: {
          lines: result.lines,
          circuit_summary: result.circuit_summary,
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
      track("calculator_completed", { calculator: "electrical_saved", ref });
    } catch (err) {
      setSaveState(`Could not save: ${getSafeError(err)}`);
    } finally {
      setSaving(false);
    }
  }, [result, saving, user, buildingType, input, labourMode]);

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
          { label: "Electrical Wiring Estimator" },
        ]}
        title="Electrical Wiring Estimator"
        subtitle="Enter your point counts and estimated average cable runs. The engine sizes each cable category separately, counts circuits and accessories from your inputs, and shows every step of the calculation. Estimation only: not professional electrical design."
      />

      {/* Inputs */}
      <div className="mb-8 rounded-lg border bg-card p-5 shadow-sm">
        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium">Building type</span>
          <select
            value={buildingType}
            onChange={(e) => setBuildingType(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 sm:max-w-sm"
          >
            {BUILDING_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>

        <h3 className="mb-2 font-semibold">Points and units</h3>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(NUM_LABELS) as NumField[]).map((k) =>
            numberInput(NUM_LABELS[k], counts[k], (v) =>
              setCounts((c) => ({ ...c, [k]: v })),
            ),
          )}
        </div>

        <h3 className="mb-1 font-semibold">Average cable runs</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          The engine never invents cable lengths. Give your estimated average
          run per point from your layout (measure or read it off your plan).
          Leave a field blank and that cable line stays unsized: the estimate is
          marked incomplete rather than guessed.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
              <option value="per_point">Per point (rate)</option>
              <option value="lump_sum">Lump sum</option>
            </select>
          </label>
          {labourMode !== "none" &&
            numberInput(
              labourMode === "per_point"
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
                calculatorType="electrical"
                calculatorSlug="electrical-estimator"
                calcTitle={`Electrical: ${buildingType}`}
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
                    category: "electrical",
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
              aria-label="Electrical material takeoff"
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
                        ? "(provide run length)"
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
                      {l.line_total === null ? "N/A" : `₦${fmtN(l.line_total)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Circuit summary */}
          {result.circuit_summary &&
            result.circuit_summary.total_circuits > 0 && (
              <div className="mb-6 rounded-lg border bg-muted/30 p-4 text-sm">
                <h3 className="mb-1 font-semibold">
                  Circuits: {result.circuit_summary.total_circuits} (planning
                  rule: not design)
                </h3>
                <p className="text-muted-foreground">
                  Lighting {result.circuit_summary.lighting_circuits} · Sockets{" "}
                  {result.circuit_summary.socket_circuits} · Dedicated{" "}
                  {result.circuit_summary.dedicated_circuits}. One breaker per
                  circuit counted; {result.circuit_summary.db_ways_guidance}{" "}
                  board ways as guidance. Breaker ratings are a design decision
                  for a licensed engineer.
                </p>
              </div>
            )}

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
                  ? "N/A"
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
            Quantities come from your explicit point counts, your estimated
            average run lengths, and the admin's visible planning rules (circuit
            grouping, conduit allowance, junction boxes, waste). Nothing else is
            assumed.
          </li>
          <li>
            The five cable categories (lighting, socket, dedicated, earth,
            feeder) are sized separately: they are never merged into one "cable"
            number.
          </li>
          <li>
            Prices come from the shared FRELUX material database, configured by
            the site admin. Unpriced materials are shown as PRICE NOT
            CONFIGURED, never invented.
          </li>
          <li>
            This is material ESTIMATION, not professional electrical design.
            Cable sizes, breaker ratings and board schedules need a licensed
            electrical engineer.
          </li>
        </ul>
      </section>

      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
