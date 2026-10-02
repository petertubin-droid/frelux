/**
 * FRELUX Mineral Stone Calculator (Phase 3)
 *
 * Deterministic, database-configured Mineral Stone estimation.
 *
 * - Every business value comes from the database through
 *   fetchConfigurableFinishProducts('mineral_stone'):
 *   products, application profiles, package sizes, prices.
 * - The calculation is performed ONLY by calculateMineralStone.
 *   This page renders and saves the result; it never computes quantities.
 * - Missing configuration produces explicit data-requirement warnings,
 *   never guessed values.
 * - No placeholder/demo products: if nothing is configured, the page says so.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { trackCalculation } from "@/lib/achievements";
import { trackRecentTool } from "@/lib/smart-defaults";
import { formatNumber } from "@/lib/utils";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { EstimateDisclaimer } from "@/components/calculators";
import {
  fetchConfigurableFinishProducts,
  createEstimate,
  createEstimateItem,
  type ConfigurableFinishProduct,
} from "@/lib/estimation/queries";
import {
  calculateMineralStone,
  type MineralStoneResult,
} from "@/lib/estimation/mineral-stone-engine";

const CALCULATOR_TYPE = "mineral_stone";

function fmt(n: number, digits = 2): string {
  return formatNumber(n, digits);
}

function rangeLabel(
  min: number | null,
  max: number | null,
  unit: string,
  digits = 2,
): string {
  if (min === null || max === null) return "—";
  if (min === max) return `${fmt(min, digits)} ${unit}`;
  return `${fmt(min, digits)}–${fmt(max, digits)} ${unit}`;
}

export default function MineralStoneCalculator({
  embedded = false,
}: { embedded?: boolean } = {}) {
  useSeo({
    title: "Mineral Stone Calculator — FRELUX",
    description:
      "Deterministic Mineral Stone calculator with database-verified product coverage and consumption data, package quantities, waste configuration and full calculation breakdown.",
  });

  const [searchParams] = useSearchParams();

  // ── Config state ──
  const [products, setProducts] = useState<ConfigurableFinishProduct[]>([]);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [calcVersionId, setCalcVersionId] = useState<string | null>(null);

  // ── User input ──
  const [productId, setProductId] = useState<string>("");
  const [profileId, setProfileId] = useState<string>("");
  const [area, setArea] = useState("");
  const [areaUnit, setAreaUnit] = useState("m2");
  const [coats, setCoats] = useState<string>("");

  // ── Result / save state ──
  const [result, setResult] = useState<MineralStoneResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState<string>("");

  // ── Load database configuration ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setConfigLoading(true);
      try {
        const { data, error } =
          await fetchConfigurableFinishProducts(CALCULATOR_TYPE);
        if (cancelled) return;
        if (error) {
          setConfigError(error);
        } else {
          setProducts(data);
          const fromUrl = searchParams.get("product");
          if (fromUrl && data.some((p) => p.slug === fromUrl)) {
            setProductId(data.find((p) => p.slug === fromUrl)!.id);
          } else if (data.length > 0) {
            setProductId(data[0].id);
          }
        }
        const { data: versions } = await supabase
          .from("estimation_calc_versions")
          .select("id")
          .eq("calculator_type", CALCULATOR_TYPE)
          .eq("is_active", true)
          .order("version_number", { ascending: false })
          .limit(1);
        if (!cancelled && versions && versions.length > 0) {
          setCalcVersionId(versions[0].id);
        }
      } catch (err) {
        if (!cancelled)
          setConfigError(getSafeError(err, "Failed to load configuration."));
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId],
  );

  const selectedProfile = useMemo(
    () => selectedProduct?.profiles.find((q) => q.id === profileId) ?? null,
    [selectedProduct, profileId],
  );

  // When the product changes, select its first profile and seed coats
  useEffect(() => {
    if (!selectedProduct) {
      setProfileId("");
      setCoats("");
      return;
    }
    const first = selectedProduct.profiles[0];
    setProfileId(first ? first.id : "");
    setCoats(
      first?.default_coats !== null && first?.default_coats !== undefined
        ? String(first.default_coats)
        : "",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // ── Calculation (engine call only — no math in this page) ──
  const handleCalculate = useCallback(() => {
    if (!selectedProduct || !selectedProfile) {
      setResult(null);
      return;
    }
    setCalculating(true);
    setSaveState("idle");
    try {
      const engineResult = calculateMineralStone(
        {
          area: area ? Number(area) : NaN,
          area_unit: areaUnit,
          coats: coats ? Number(coats) : null,
        },
        {
          product: {
            id: selectedProduct.id,
            name: selectedProduct.name,
            slug: selectedProduct.slug,
            brand: selectedProduct.brand,
            product_notes: selectedProduct.product_notes,
            technical_spec: selectedProduct.technical_spec,
            standard_pack_size: selectedProduct.standard_pack_size,
            pack_unit_symbol: selectedProduct.pack_unit_symbol,
            price_per_pack: selectedProduct.price_per_pack,
          },
          profile: {
            id: selectedProfile.id,
            name: selectedProfile.name,
            slug: selectedProfile.slug,
            is_active: selectedProfile.is_active,
            calculation_model: selectedProfile.calculation_model,
            coverage: null,
            coverage_min: selectedProfile.coverage_min,
            coverage_max: selectedProfile.coverage_max,
            coverage_unit: "m2_per_package",
            consumption_min: selectedProfile.consumption_min,
            consumption_max: selectedProfile.consumption_max,
            consumption_unit: selectedProfile.consumption_unit,
            default_coats: selectedProfile.default_coats,
            waste_percentage: selectedProfile.waste_percentage,
          },
        },
      );
      setResult(engineResult);
      track("mineral_stone_calculated", {
        calculable: engineResult.calculable,
      });
      if (engineResult.calculable) {
        trackCalculation("mineral_stone");
        trackRecentTool("mineral-stone");
      }
    } finally {
      setCalculating(false);
    }
  }, [selectedProduct, selectedProfile, area, areaUnit, coats]);

  // ── Save estimate (authoritative result, price snapshot included) ──
  const handleSave = useCallback(async () => {
    if (!result || !result.calculable || !selectedProduct || !selectedProfile)
      return;
    setSaveState("saving");
    setSaveMessage("");
    try {
      const estimateRef = `MST-${Date.now().toString(36).toUpperCase()}`;
      const totalCost = result.cost_min ?? 0;
      const { data: estimate, error: estError } = await createEstimate({
        estimate_ref: estimateRef,
        user_id: null,
        client_hash: null,
        calculator_type: CALCULATOR_TYPE,
        project_description: `Mineral Stone — ${selectedProduct.name} / ${selectedProfile.name}`,
        inputs: {
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          profile_id: selectedProfile.id,
          profile_name: selectedProfile.name,
          area: Number(area),
          area_unit: areaUnit,
          area_m2: result.area_m2,
          coats: result.coats,
        },
        calculation_method: "area_based",
        calc_version_id: calcVersionId,
        calculated_quantities: {
          calculation_model: result.calculation_model,
          coverage_min: result.coverage_min,
          coverage_max: result.coverage_max,
          consumption_min: result.consumption_min,
          consumption_max: result.consumption_max,
          consumption_unit: result.consumption_unit,
          pack_size: result.pack_size,
          pack_unit: result.pack_unit,
          waste_percentage: result.waste_percentage,
          material_min: result.material_min,
          material_max: result.material_max,
          material_unit: result.material_unit,
          with_waste_min: result.with_waste_min,
          with_waste_max: result.with_waste_max,
          purchase_min: result.purchase_min,
          purchase_max: result.purchase_max,
          price_per_pack: result.price_per_pack,
          cost_min: result.cost_min,
          cost_max: result.cost_max,
          steps: result.steps,
          product_notes: result.product_notes,
          technical_spec: result.technical_spec,
        },
        total_material_cost: totalCost,
        currency: "NGN",
        labour_status: "not_included",
        warnings: result.warnings,
        recommendations: [],
        status: "calculated",
      });
      if (estError || !estimate) {
        setSaveState("error");
        setSaveMessage(estError?.message ?? "Save failed.");
        return;
      }
      await createEstimateItem({
        estimate_id: estimate.id,
        item_name: selectedProduct.name,
        item_type: "product",
        product_id: selectedProduct.id,
        quality_level_id: selectedProfile.id,
        quantity_required: result.material_min ?? 0,
        practical_purchase_qty: result.purchase_min ?? 0,
        unit: result.purchase_unit ?? "package",
        pack_size: result.pack_size,
        unit_price: result.price_per_pack ?? 0,
        total_price: totalCost,
        price_snapshot: {
          price_type: "product",
          ref_id: selectedProduct.id,
          price: result.price_per_pack ?? 0,
          currency: "NGN",
          captured_at: new Date().toISOString(),
        },
        calculation_source: "calculated",
        adjustment_status: "none",
        sort_order: 0,
      });
      setSaveState("saved");
      setSaveMessage(`Saved as estimate ${estimateRef}.`);
    } catch (err) {
      setSaveState("error");
      setSaveMessage(getSafeError(err, "Save failed."));
    }
  }, [result, selectedProduct, selectedProfile, area, areaUnit, calcVersionId]);

  // ── PDF export: printable document built from the SAME result ──
  const handleExportPdf = useCallback(() => {
    if (!result) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = result.steps
      .map((s) => `<tr><td>${s.label}</td><td>${s.detail}</td></tr>`)
      .join("");
    w.document
      .write(`<!doctype html><html><head><title>FRELUX Mineral Stone Estimate</title>
      <style>body{font-family:Arial,sans-serif;margin:32px;color:#111}
      h1{font-size:20px}h2{font-size:14px;margin-top:24px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      td,th{border:1px solid #ccc;padding:6px 8px;font-size:12px;text-align:left}
      .warn{background:#fff7e0;border:1px solid #e6c200;padding:8px;margin-top:8px;font-size:12px}
      .big{font-size:16px;font-weight:bold}</style></head><body>
      <h1>FRELUX — Mineral Stone Estimate</h1>
      <table>
        <tr><th>Product</th><td>${result.product_name}${result.brand ? ` (${result.brand})` : ""}</td></tr>
        <tr><th>Application profile</th><td>${result.profile_name}</td></tr>
        <tr><th>Surface area</th><td>${fmt(result.area_input)} ${result.area_unit === "m2" ? "m²" : "ft²"} (${fmt(result.area_m2 ?? 0, 4)} m²)</td></tr>
        <tr><th>Coats/layers</th><td>${result.coats ?? "not configured"}</td></tr>
        <tr><th>Material requirement</th><td>${rangeLabel(result.with_waste_min, result.with_waste_max, result.material_unit ?? "", 2)}</td></tr>
        <tr><th>Purchase quantity</th><td>${result.purchase_min ?? "—"}–${result.purchase_max ?? "—"} ${result.purchase_unit ?? ""}</td></tr>
        <tr><th>Total cost</th><td>${result.cost_min === null ? "not configured" : `₦${fmt(result.cost_min)}${result.cost_min !== result.cost_max ? ` – ₦${fmt(result.cost_max ?? 0)}` : ""}`}</td></tr>
      </table>
      ${result.warnings.length > 0 ? `<div class="warn"><b>Data requirements:</b><ul>${result.warnings.map((x) => `<li>${x}</li>`).join("")}</ul></div>` : ""}
      <h2>Calculation breakdown</h2>
      <table><tr><th>Step</th><th>Detail</th></tr>${rows}</table>
      ${result.product_notes ? `<h2>Product notes</h2><p>${result.product_notes}</p>` : ""}
      ${result.technical_spec ? `<h2>Technical specification</h2><p>${result.technical_spec}</p>` : ""}
      <p style="margin-top:24px;font-size:11px;color:#666">Generated by the FRELUX deterministic calculation engine. Quantities are estimates — verify on site before purchase.</p>
      </body></html>`);
    w.document.close();
    w.print();
  }, [result]);

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  return (
    <div
      className={embedded ? "pb-8" : "min-h-screen bg-background pt-8 pb-16"}
    >
      <Container>
        {!embedded && (
          <PageHeader
            title="Mineral Stone Calculator"
            subtitle="Deterministic Mineral Stone estimation from database-verified product data — coverage or consumption based, package quantities and full calculation breakdown."
          />
        )}

        {configLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading product configuration…
          </p>
        ) : configError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Failed to load Mineral Stone configuration: {configError}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">
              No Mineral Stone products configured yet
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The calculator uses only verified product data from the database —
              it never estimates with assumed coverage rates. An administrator
              must configure at least one Mineral Stone product (with a
              calculation model, coverage or consumption data, package size and
              coat count) under <b>Admin → Estimation Products</b> before this
              calculator can produce results.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* ── Inputs ── */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-base font-semibold">Inputs</h2>
              <div className="grid gap-4">
                <label className="grid gap-1 text-sm font-medium">
                  Product
                  <select
                    className="rounded-lg border border-border bg-background px-3 py-2"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.brand ? ` — ${p.brand}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  Application profile
                  <select
                    className="rounded-lg border border-border bg-background px-3 py-2"
                    value={profileId}
                    onChange={(e) => {
                      setProfileId(e.target.value);
                      const prof = selectedProduct?.profiles.find(
                        (q) => q.id === e.target.value,
                      );
                      setCoats(
                        prof?.default_coats !== null &&
                          prof?.default_coats !== undefined
                          ? String(prof.default_coats)
                          : "",
                      );
                    }}
                    disabled={
                      !selectedProduct || selectedProduct.profiles.length === 0
                    }
                  >
                    {selectedProduct?.profiles.length ? (
                      selectedProduct.profiles.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.name}
                        </option>
                      ))
                    ) : (
                      <option value="">
                        No application profile configured
                      </option>
                    )}
                  </select>
                </label>

                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <label className="grid gap-1 text-sm font-medium">
                    Surface area
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="rounded-lg border border-border bg-background px-3 py-2"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. 53.89"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium">
                    Unit
                    <select
                      className="rounded-lg border border-border bg-background px-3 py-2"
                      value={areaUnit}
                      onChange={(e) => setAreaUnit(e.target.value)}
                    >
                      <option value="m2">m²</option>
                      <option value="ft2">ft²</option>
                    </select>
                  </label>
                </div>

                <label className="grid gap-1 text-sm font-medium">
                  Coats / layers
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="rounded-lg border border-border bg-background px-3 py-2"
                    value={coats}
                    onChange={(e) => setCoats(e.target.value)}
                    placeholder={
                      selectedProfile?.default_coats != null
                        ? `configured default: ${selectedProfile.default_coats}`
                        : "not configured for this product"
                    }
                  />
                  <span className="text-xs font-normal text-muted-foreground">
                    Seeded from the product's configured default. Left blank
                    when no default is configured — the engine will not guess a
                    coat count.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleCalculate}
                  disabled={calculating || !selectedProduct}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Calculate
                </button>
              </div>
            </div>

            {/* ── Result ── */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-base font-semibold">Result</h2>
              {!result ? (
                <p className="text-sm text-muted-foreground">
                  Enter the surface area and press Calculate.
                </p>
              ) : (
                <div className="grid gap-4">
                  {result.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                      <p className="font-semibold">Data requirements</p>
                      <ul className="mt-2 list-disc pl-5">
                        {result.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.calculable && (
                    <>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Material requirement (with waste)
                        </p>
                        <p className="mt-1 text-xl font-bold">
                          {rangeLabel(
                            result.with_waste_min,
                            result.with_waste_max,
                            result.material_unit ?? "",
                          )}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Raw:{" "}
                          {rangeLabel(
                            result.material_min,
                            result.material_max,
                            result.material_unit ?? "",
                          )}
                          {result.waste_percentage !== null &&
                            ` · waste +${fmt(result.waste_percentage)}%`}
                        </p>
                      </div>

                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Purchase quantity
                        </p>
                        <p className="mt-1 text-xl font-bold">
                          {result.purchase_min === result.purchase_max
                            ? `${result.purchase_min} ${result.purchase_unit}`
                            : `${result.purchase_min}–${result.purchase_max} ${result.purchase_unit}`}
                        </p>
                      </div>

                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Total cost
                        </p>
                        <p className="mt-1 text-xl font-bold">
                          {result.cost_min === null
                            ? "Price not configured"
                            : result.cost_min === result.cost_max
                              ? `₦${fmt(result.cost_min)}`
                              : `₦${fmt(result.cost_min)} – ₦${fmt(result.cost_max ?? 0)}`}
                        </p>
                        {result.price_per_pack !== null && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            ₦{fmt(result.price_per_pack)} per package
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saveState === "saving"}
                          className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground disabled:opacity-50"
                        >
                          {saveState === "saving" ? "Saving…" : "Save estimate"}
                        </button>
                        <button
                          type="button"
                          onClick={handleExportPdf}
                          className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
                        >
                          Export PDF
                        </button>
                        {saveMessage && (
                          <span
                            className={`self-center text-xs ${saveState === "error" ? "text-red-600" : "text-muted-foreground"}`}
                          >
                            {saveMessage}
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {/* Configuration echo */}
                  <div className="rounded-lg border border-border p-4 text-xs text-muted-foreground">
                    <p className="mb-2 font-semibold text-foreground">
                      Configuration used
                    </p>
                    <p>Model: {result.calculation_model ?? "not configured"}</p>
                    {result.calculation_model === "coverage_based" && (
                      <p>
                        Coverage:{" "}
                        {rangeLabel(
                          result.coverage_min,
                          result.coverage_max,
                          "m²/package",
                          4,
                        )}
                      </p>
                    )}
                    {(result.calculation_model === "mass_per_area" ||
                      result.calculation_model === "volume_per_area") && (
                      <p>
                        Consumption:{" "}
                        {rangeLabel(
                          result.consumption_min,
                          result.consumption_max,
                          `${result.consumption_unit ?? ""} per m² per coat`,
                          4,
                        )}
                      </p>
                    )}
                    <p>
                      Package:{" "}
                      {result.pack_size !== null && result.pack_unit
                        ? `${fmt(result.pack_size)} ${result.pack_unit}`
                        : "not configured"}
                    </p>
                    <p>Coats: {result.coats ?? "not configured"}</p>
                    {result.product_notes && (
                      <p className="mt-2">
                        Product notes: {result.product_notes}
                      </p>
                    )}
                    {result.technical_spec && (
                      <p>Technical spec: {result.technical_spec}</p>
                    )}
                  </div>

                  {/* Calculation breakdown */}
                  <div className="rounded-lg border border-border p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Calculation breakdown
                    </p>
                    <ol className="grid gap-2 text-sm">
                      {result.steps.map((s, i) => (
                        <li key={i}>
                          <span className="font-medium">{s.label}:</span>{" "}
                          <span className="text-muted-foreground">
                            {s.detail}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8">
          <EstimateDisclaimer />
        </div>
      </Container>
    </div>
  );
}
