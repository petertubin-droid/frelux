/**
 * FRELUX Solar/PV Roofing Estimator (Future Engine 16 - PRIMARY)
 *
 * A complete solar installation estimate: array size, daily energy
 * yield, inverter, strings, and every material quantity with
 * configured prices - fit-by-roof or sized for an energy target.
 *
 * - The estimate is produced ONLY by calculateSolarPv. This page
 *   renders; it never estimates anything itself.
 * - Quantities come from configured panel specs and rules -
 *   never guessed. Unpriced components are reported honestly and
 *   the total is withheld, never invented.
 */

import { useEffect, useState, useCallback } from "react";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";
import { printQuote } from "@/lib/estimation/quote-export";
import type { QuoteLine } from "@/lib/estimation/quote-export";
import SaveToProjectButton from "@/components/calculators/SaveToProjectButton";
import { EstimateDisclaimer } from "@/components/calculators";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import {
  fetchSolarPanelModels,
  fetchSolarComponentPrices,
  fetchCalcRules,
  createEstimate,
  createEstimateItem,
} from "@/lib/estimation/queries";
import {
  calculateSolarPv,
  type SolarPvResult,
} from "@/lib/estimation/solar-pv-engine";
import type { SolarPanelModel, EstimationCalcRule } from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";

export default function SolarPvEstimator() {
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "Solar/PV Roofing Estimator", path: "/solar-pv-estimator" },
  ]);
  useSeo({
    title: "Solar/PV Roofing Estimator: Full Material Takeoff | FRELUX",
    description:
      "Plan a complete solar installation: panels that fit your roof or sized for your energy target, daily energy yield, inverter and strings, and every material quantity: rails, clamps, connectors, cabling, breakers, surge protection, earthing, batteries: with sourced prices. Nothing is guessed.",
  });

  const [models, setModels] = useState<SolarPanelModel[]>([]);
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [priceMap, setPriceMap] = useState<
    Record<string, { price_naira: number | null }>
  >({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<"roof_area" | "energy_target">("roof_area");
  const [modelId, setModelId] = useState("");
  const [roofArea, setRoofArea] = useState("");
  const [energyTarget, setEnergyTarget] = useState("");
  const [cableRun, setCableRun] = useState("");
  const [storage, setStorage] = useState("");
  const [result, setResult] = useState<SolarPvResult | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const pricedTotal = result
    ? (result.total_cost_naira ?? result.total_of_priced_lines_naira)
    : 0;

  const handleSave = async () => {
    if (!result?.ok) return;
    setSaveState("saving");
    setSaveMessage(null);
    try {
      const model = models.find((m) => m.id === modelId);
      const { data: estimate, error: estError } = await createEstimate({
        estimate_ref: `SLR-${Date.now().toString(36).toUpperCase()}`,
        user_id: null,
        client_hash: null,
        calculator_type: "solar_pv",
        project_description: `Solar/PV installation: ${result.panel_count} x ${model?.watt_peak ?? ""} Wp panels (${result.array_kwp} kWp)`,
        inputs: {
          mode,
          panel_model: model?.model_name ?? "",
          panel_watt_peak: model?.watt_peak ?? null,
          usable_roof_area_m2: roofArea ? Number(roofArea) : null,
          daily_energy_target_kwh: energyTarget ? Number(energyTarget) : null,
          cable_run_m: Number(cableRun),
          battery_storage_kwh: storage ? Number(storage) : null,
          system: {
            panel_count: result.panel_count,
            array_kwp: result.array_kwp,
            daily_energy_kwh: result.daily_energy_kwh,
            inverter_size_kw: result.inverter_size_kw,
            string_count: result.string_count,
            needed_roof_area_m2: result.needed_roof_area_m2,
            battery_count: result.battery_count,
          },
          steps: result.steps,
        },
        calculation_method: "panel_model",
        calculated_quantities: {
          materials: result.materials.map((m) => ({
            key: m.key,
            label: m.label,
            quantity: m.quantity,
            unit: m.unit,
            line_cost: m.line_cost_naira,
          })),
        } as unknown as Record<string, unknown>,
        total_material_cost: pricedTotal,
        currency: "NGN",
        labour_status: "included",
        warnings: result.warnings,
        recommendations: [],
        status: "calculated",
      });
      if (estError || !estimate) {
        setSaveState("error");
        setSaveMessage(estError?.message ?? "Save failed.");
        return;
      }
      for (const m of result.materials) {
        const { error: itemError } = await createEstimateItem({
          estimate_id: estimate.id,
          item_name: m.label,
          item_type: "material",
          quantity_required: m.quantity,
          practical_purchase_qty: m.quantity,
          unit: m.unit,
          unit_price: m.unit_price_naira ?? 0,
          total_price: m.line_cost_naira ?? 0,
          price_snapshot: {
            price_type: "solar_component",
            component_key: m.key,
            source: "FRELUX admin-configured price",
            effective_date: new Date().toISOString().slice(0, 10),
          },
        });
        if (itemError) {
          setSaveState("error");
          setSaveMessage(itemError.message);
          return;
        }
      }
      if (result.labor_cost_naira !== null) {
        const { error: laborError } = await createEstimateItem({
          estimate_id: estimate.id,
          item_name: "Installation labour",
          item_type: "labour",
          quantity_required: result.panel_count ?? 0,
          practical_purchase_qty: result.panel_count ?? 0,
          unit: "panel",
          unit_price: 0,
          total_price: result.labor_cost_naira,
          price_snapshot: {
            price_type: "rule",
            rule_key: "labor_cost_per_panel_naira",
            source: "FRELUX admin-configured rule",
            effective_date: new Date().toISOString().slice(0, 10),
          },
        });
        if (laborError) {
          setSaveState("error");
          setSaveMessage(laborError.message);
          return;
        }
      }
      setSaveState("saved");
      setSaveMessage("Estimate saved with its full bill of materials.");
    } catch (err) {
      setSaveState("error");
      setSaveMessage(err instanceof Error ? err.message : "Save failed.");
    }
  };

  // Printable professional quote via the shared quote-export library
  // (popup-blocked fallback downloads the quote as a printable HTML file).
  const handleExportQuote = () => {
    if (!result?.ok) return;
    const model = models.find((m) => m.id === modelId);
    const fmtQty = (q: number) => q.toLocaleString("en-NG");
    const lines: QuoteLine[] = result.materials.map((m) => ({
      label: m.label,
      quantity: fmtQty(m.quantity),
      unit: m.unit,
      unit_price:
        m.unit_price_naira === null
          ? "unpriced"
          : formatCurrency(m.unit_price_naira),
      line_total:
        m.line_cost_naira === null ? "N/A" : formatCurrency(m.line_cost_naira),
    }));
    if (result.labor_cost_naira !== null) {
      lines.push({
        label: "Installation labour",
        quantity: String(result.panel_count),
        unit: "panels",
        unit_price: "included",
        line_total: formatCurrency(result.labor_cost_naira),
      });
    }
    const warnings = [...result.warnings];
    if (result.total_cost_naira === null) {
      warnings.push(
        "Some components are unpriced; the total covers priced lines only.",
      );
    }
    printQuote(
      {
        title: "FRELUX Solar/PV Installation Estimate",
        subtitle: `Generated ${new Date().toLocaleDateString()} · Panel model: ${model?.model_name ?? ""} (${model?.watt_peak ?? ""} Wp)`,
        metaRows: [
          ["Panels", `${result.panel_count} (${result.array_kwp} kWp)`],
          ["Daily energy", `${result.daily_energy_kwh} kWh`],
          [
            "Inverter",
            `${result.inverter_size_kw} kW (${result.string_count} string(s))`,
          ],
          ["Roof area needed", `${result.needed_roof_area_m2} m²`],
          [
            "Batteries",
            result.battery_count > 0
              ? `${result.battery_count} unit(s)`
              : "none",
          ],
          ["Cable run", `${cableRun} m`],
        ],
        lines,
        totals: [
          {
            label: "Total estimate",
            value: formatCurrency(pricedTotal),
            strong: true,
          },
        ],
        warnings,
        footer:
          "Estimates are indicative and not a formal quote. Prices come from FRELUX admin-configured component prices; unpriced components are reported, never invented.",
      },
      "frelux-solar-pv-estimate.html",
    );
  };

  const load = useCallback(async () => {
    const m = await fetchSolarPanelModels(true);
    if (m.error)
      setLoadError(getSafeError(m.error, "Failed to load solar panel models."));
    else setModels(m.data);
    const p = await fetchSolarComponentPrices(true);
    const map: Record<string, { price_naira: number | null }> = {};
    for (const c of p.data)
      map[c.component_key] = { price_naira: c.price_naira };
    setPriceMap(map);
    const rl = await fetchCalcRules("solar_pv");
    setRules(rl.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = () => {
    setResult(null);
    const model = models.find((m) => m.id === modelId) ?? null;

    const r = calculateSolarPv({
      mode,
      panel: model
        ? {
            watt_peak: model.watt_peak,
            length_m: model.length_m,
            width_m: model.width_m,
            unit_price_naira: model.unit_price_naira,
          }
        : null,
      usable_roof_area_m2: roofArea ? Number(roofArea) : undefined,
      daily_energy_target_kwh: energyTarget ? Number(energyTarget) : undefined,
      cable_run_m: Number(cableRun),
      battery_storage_kwh: storage ? Number(storage) : null,
      prices: priceMap,
      rules: rules.map((r) => ({
        rule_key: r.rule_key,
        rule_value: r.rule_value as Record<string, unknown>,
      })),
    });
    setResult(r);
    if (r.ok) track("solar_pv_estimated");
  };

  const canRun =
    !!modelId &&
    !!cableRun &&
    (mode === "roof_area" ? !!roofArea : !!energyTarget);

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Construction Tools", path: "/construction-tools" },
            { label: "Solar/PV Roofing Estimator" },
          ]}
          title="Solar/PV Roofing Estimator"
          subtitle="A complete solar installation estimate from sourced data: fit panels to your roof or size the array for your daily energy target, then get every material quantity: rails, clamps, connectors, DC/AC cabling, breakers, surge protection, earthing, batteries: with configured prices. Nothing is guessed, and unpriced components are reported honestly."
        />

        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          <div className="grid gap-3">
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => {
                  setMode("roof_area");
                  setResult(null);
                }}
                className={`rounded-lg px-3 py-1.5 font-medium ${mode === "roof_area" ? "bg-primary text-primary-foreground" : "border border-border"}`}
              >
                Fit to my roof
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("energy_target");
                  setResult(null);
                }}
                className={`rounded-lg px-3 py-1.5 font-medium ${mode === "energy_target" ? "bg-primary text-primary-foreground" : "border border-border"}`}
              >
                Size for my energy target
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Panel model
                <select
                  className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                  value={modelId}
                  onChange={(e) => {
                    setModelId(e.target.value);
                    setResult(null);
                  }}
                >
                  <option value="">Select a configured panel model</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.model_name}: {m.watt_peak} Wp
                    </option>
                  ))}
                </select>
              </label>

              {mode === "roof_area" ? (
                <label className="grid gap-1 text-sm font-medium">
                  Usable roof area (m²)
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                    value={roofArea}
                    onChange={(e) => setRoofArea(e.target.value)}
                  />
                </label>
              ) : (
                <label className="grid gap-1 text-sm font-medium">
                  Target daily energy (kWh/day)
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                    value={energyTarget}
                    onChange={(e) => setEnergyTarget(e.target.value)}
                  />
                </label>
              )}

              <label className="grid gap-1 text-sm font-medium">
                Cable run, array to inverter (m)
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                  value={cableRun}
                  onChange={(e) => setCableRun(e.target.value)}
                />
              </label>

              <label className="grid gap-1 text-sm font-medium">
                Battery storage wanted (kWh: leave blank for none)
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                />
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={run}
            disabled={!canRun}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Estimate my installation
          </button>
        </div>

        {result && !result.ok && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
            {result.warnings.map((w, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                {w}
              </p>
            ))}
          </div>
        )}

        {result?.ok && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Panels
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {result.panel_count}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.array_kwp} kWp array
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Daily energy
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {result.daily_energy_kwh} kWh
                </p>
                <p className="text-xs text-muted-foreground">
                  at configured sun hours and derate
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Inverter
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {result.inverter_size_kw} kW
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.string_count} string(s)
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Roof needed
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {result.needed_roof_area_m2} m²
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.battery_count > 0
                    ? `${result.battery_count} battery unit(s)`
                    : "no batteries requested"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
              <h3 className="mb-2 text-sm font-semibold">Materials takeoff</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 text-left">Material</th>
                      <th className="py-2 text-right">Quantity</th>
                      <th className="py-2 text-right">Unit price</th>
                      <th className="py-2 text-right">Line cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.materials.map((m) => (
                      <tr
                        key={m.key}
                        className="border-t border-border dark:border-white/5"
                      >
                        <td className="py-2">{m.label}</td>
                        <td className="py-2 text-right font-mono text-xs">
                          {m.quantity.toLocaleString("en-NG")} {m.unit}
                        </td>
                        <td className="py-2 text-right font-mono text-xs">
                          {m.unit_price_naira === null
                            ? "unpriced"
                            : formatCurrency(m.unit_price_naira)}
                        </td>
                        <td className="py-2 text-right font-mono text-xs">
                          {m.line_cost_naira === null
                            ? "N/A"
                            : formatCurrency(m.line_cost_naira)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-border dark:border-white/5">
                      <td className="py-2">Installation labour</td>
                      <td className="py-2 text-right font-mono text-xs">
                        {result.panel_count} panels
                      </td>
                      <td className="py-2 text-right font-mono text-xs">N/A</td>
                      <td className="py-2 text-right font-mono text-xs">
                        {formatCurrency(result.labor_cost_naira ?? 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Total estimate
                </p>
                {result.total_cost_naira !== null ? (
                  <p className="mt-1 text-3xl font-semibold">
                    {formatCurrency(result.total_cost_naira)}
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-3xl font-semibold">
                      ₦
                      {result.total_of_priced_lines_naira.toLocaleString(
                        "en-NG",
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      total of priced lines only: some components are unpriced,
                      so the complete total is withheld rather than invented
                    </p>
                  </>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  materials + labour, from configured prices
                </p>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {w}
                  </p>
                ))}
              </div>
            )}

            <details className="rounded-lg border border-border bg-card p-4 text-sm dark:border-white/5">
              <summary className="cursor-pointer font-medium">
                How this was determined
              </summary>
              <ul className="mt-2 space-y-1">
                {result.steps.map((s, i) => (
                  <li key={i}>
                    <span className="font-medium">{s.label}:</span>{" "}
                    <span className="text-muted-foreground">{s.detail}</span>
                  </li>
                ))}
              </ul>
            </details>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saveState === "saving" || saveState === "saved"}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "saved"
                    ? "Saved"
                    : "Save estimate"}
              </button>
              <button
                type="button"
                onClick={handleExportQuote}
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
              >
                Export quote (PDF)
              </button>
              <SaveToProjectButton
                calculatorType="cost"
                calculatorSlug="solar-pv-estimator"
                calcTitle="Solar/PV Installation Estimate"
                calcData={
                  {
                    mode,
                    panel_model: modelId,
                    cable_run_m: Number(cableRun),
                    result: {
                      panel_count: result.panel_count,
                      array_kwp: result.array_kwp,
                      daily_energy_kwh: result.daily_energy_kwh,
                      inverter_size_kw: result.inverter_size_kw,
                      string_count: result.string_count,
                      needed_roof_area_m2: result.needed_roof_area_m2,
                      battery_count: result.battery_count,
                      total: pricedTotal,
                      currency: "NGN",
                    },
                  } as unknown as Record<string, unknown>
                }
                resultSummary={
                  {
                    grandTotal: pricedTotal,
                    panelCount: result.panel_count,
                    arrayKwp: result.array_kwp,
                    dailyEnergyKwh: result.daily_energy_kwh,
                  } as unknown as Record<string, unknown>
                }
                materials={result.materials.map((m) => ({
                  name: m.label,
                  category: "material",
                  quantity: m.quantity,
                  unit: m.unit,
                }))}
                compact
                label="Save to Project"
              />
              {saveMessage && (
                <span
                  className={`text-xs ${saveState === "error" ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {saveMessage}
                </span>
              )}
            </div>

            <EstimateDisclaimer text="Estimates are indicative and not a formal quote." />
          </div>
        )}
      </div>
      <AdSlot slotKey="calculator_mid" className="mt-8" />
      <AdSlot slotKey="calculator_native" className="mt-8" />
      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
