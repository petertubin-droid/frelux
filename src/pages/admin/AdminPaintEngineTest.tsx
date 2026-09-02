/**
 * ADMIN → PAINT CALCULATION ENGINE → TEST CALCULATION
 *
 * Allows admin to test the central paint engine with real inputs
 * and see the full step-by-step calculation breakdown.
 */

import { useState, useEffect } from "react";
import { Play, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AdminHeader,
  AdminCard,
  AdminButton,
  AdminField,
  StateMessage,
  AdminInput,
} from "@/components/admin/AdminUi";
import {
  calculateRoom,
  getCoverageUnitLabel,
  type PaintEngineRoomInput,
  type PaintEngineRoomResult,
} from "@/lib/estimation/paint-engine";
import type {
  EstimationProduct,
  EstimationProductQuality,
  EstimationPrice,
  EstimationCalcRule,
  EstimationColourCondition,
  EstimationSurfaceCondition,
  OpeningInput,
} from "@/types/estimation";
import { formatCurrency } from "@/lib/estimation/pricing";
import { Button } from "@/components/ui/shadcn/button";

export default function AdminPaintEngineTest() {
  const [products, setProducts] = useState<EstimationProduct[]>([]);
  const [qualities, setQualities] = useState<
    Map<string, EstimationProductQuality[]>
  >(new Map());
  const [prices, setPrices] = useState<Map<string, EstimationPrice>>(new Map());
  const [calcRules, setCalcRules] = useState<Map<string, EstimationCalcRule>>(
    new Map(),
  );
  const [colourConditions, setColourConditions] = useState<
    EstimationColourCondition[]
  >([]);
  const [surfaceConditions, setSurfaceConditions] = useState<
    EstimationSurfaceCondition[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PaintEngineRoomResult | null>(null);
  const [expandedSteps, setExpandedSteps] = useState(true);

  // Form state
  const [productId, setProductId] = useState("");
  const [qualityId, setQualityId] = useState("");
  const [length, setLength] = useState(10);
  const [width, setWidth] = useState(12);
  const [height, setHeight] = useState(8);
  const [unit, setUnit] = useState<"feet" | "meters">("feet");
  const [doors, setDoors] = useState(1);
  const [windows, setWindows] = useState(2);
  const [coats, setCoats] = useState(2);
  const [includeCeiling, setIncludeCeiling] = useState(true);
  const [surfaceCondition, setSurfaceCondition] = useState(
    "previously_painted_sound",
  );
  const [colourCondition, setColourCondition] = useState(
    "previously_painted_same",
  );

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const [prodRes, ccRes, scRes, rulesRes] = await Promise.all([
        supabase
          .from("estimation_products")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("estimation_colour_conditions")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("estimation_surface_conditions")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
        supabase.from("estimation_calc_rules").select("*"),
      ]);

      const prodList = (prodRes.data ?? []) as EstimationProduct[];
      setProducts(prodList);

      // Load qualities for each product
      const qualMap = new Map<string, EstimationProductQuality[]>();
      for (const p of prodList) {
        const { data: quals } = await supabase
          .from("estimation_product_quality")
          .select("*")
          .eq("product_id", p.id)
          .eq("is_active", true)
          .order("sort_order");
        qualMap.set(p.id, (quals ?? []) as EstimationProductQuality[]);
      }
      setQualities(qualMap);

      // Load prices
      const { data: priceData } = await supabase
        .from("estimation_prices")
        .select("*")
        .eq("is_active", true);
      const priceMap = new Map<string, EstimationPrice>();
      for (const p of (priceData ?? []) as EstimationPrice[]) {
        priceMap.set(p.ref_id, p);
      }
      setPrices(priceMap);

      // Load calc rules
      const ruleMap = new Map<string, EstimationCalcRule>();
      for (const r of (rulesRes.data ?? []) as EstimationCalcRule[]) {
        ruleMap.set(r.rule_key, r);
      }
      setCalcRules(ruleMap);

      setColourConditions((ccRes.data ?? []) as EstimationColourCondition[]);
      setSurfaceConditions((scRes.data ?? []) as EstimationSurfaceCondition[]);

      // Set default product
      if (prodList.length > 0) {
        setProductId(prodList[0].id);
        const firstQuals = qualMap.get(prodList[0].id) ?? [];
        if (firstQuals.length > 0) setQualityId(firstQuals[0].id);
      }
    } catch (e) {
      console.error("Failed to load config:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleTestCalculate() {
    const product = products.find((p) => p.id === productId) ?? null;
    const qualList = qualities.get(productId) ?? [];
    const quality = qualList.find((q) => q.id === qualityId) ?? null;
    const price = prices.get(qualityId ?? productId) ?? null;

    const doorOpenings: OpeningInput[] =
      doors > 0 ? [{ quantity: doors, width: 3, height: 7 }] : [];
    const windowOpenings: OpeningInput[] =
      windows > 0 ? [{ quantity: windows, width: 3, height: 4 }] : [];

    const roomInput: PaintEngineRoomInput = {
      room_id: "test",
      room_name: "Test Room",
      length,
      width,
      height,
      unit,
      doors: doorOpenings,
      windows: windowOpenings,
      doors_unknown: false,
      windows_unknown: false,
      product_id: productId,
      quality_id: qualityId,
      coats,
      include_ceiling: includeCeiling,
      ceiling_colour: "white",
      surface_condition_key: surfaceCondition,
      colour_condition_key: colourCondition,
      include_primer: false,
    };

    const ceilingRule = calcRules.get("ceiling_quantity_per_room") ?? null;
    const ceilingCoverageRule = calcRules.get("ceiling_coverage_rate") ?? null;
    const packSizeRule = calcRules.get("pack_size_bucket_litres") ?? null;
    const roundingRule = calcRules.get("purchase_rounding_rule") ?? null;
    const standardHeightRule = calcRules.get("standard_room_height") ?? null;
    const heightAdjustmentRule =
      calcRules.get("height_adjustment_rule") ?? null;
    const openingDeductionRule =
      calcRules.get("opening_deduction_rule") ?? null;
    const coatCountRule = calcRules.get("standard_coat_count") ?? null;
    const calibrationReferencesRule =
      calcRules.get("frelux_calibration_references") ?? null;

    const res = calculateRoom(roomInput, {
      product,
      quality,
      price,
      primer_price: null,
      ceilingRule,
      ceilingCoverageRule,
      packSizeRule,
      roundingRule,
      standardHeightRule,
      heightAdjustmentRule,
      openingDeductionRule,
      coatCountRule,
      calibrationReferencesRule,
      colourConditions,
      surfaceConditions,
      calcVersionId: null,
    });

    setResult(res);
  }

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedQualities = qualities.get(productId) ?? [];
  const selectedQuality = selectedQualities.find((q) => q.id === qualityId);

  return (
    <div>
      <AdminHeader
        title="Paint Calculation Engine — Test Calculation"
        subtitle="Test the central paint engine with real inputs. Verify coverage, pricing, and calculation steps."
      />

      {loading ? (
        <StateMessage
          type="loading"
          title="Loading"
          message="Loading configuration..."
        />
      ) : (
        <>
          {/* Input Form */}
          <AdminCard>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AdminField label="Paint Type">
                <select
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    const q = qualities.get(e.target.value) ?? [];
                    setQualityId(q.length > 0 ? q[0].id : "");
                  }}
                  className="input-field"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category})
                    </option>
                  ))}
                </select>
              </AdminField>

              <AdminField label="Quality Level">
                <select
                  value={qualityId}
                  onChange={(e) => setQualityId(e.target.value)}
                  className="input-field"
                >
                  {selectedQualities.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                      {q.coverage
                        ? ` — ${q.coverage} ${getCoverageUnitLabel(q.coverage_unit ?? "m2_per_liter")}`
                        : " — NOT CONFIGURED"}
                    </option>
                  ))}
                </select>
              </AdminField>

              <AdminField label="Unit">
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as "feet" | "meters")}
                  className="input-field"
                >
                  <option value="feet">Feet (FRELUX default)</option>
                  <option value="meters">Meters</option>
                </select>
              </AdminField>

              <AdminField label="Length">
                <AdminInput
                  type="number"
                  value={length}
                  onChange={(v) => setLength(Number(v))}
                />
              </AdminField>

              <AdminField label="Width">
                <AdminInput
                  type="number"
                  value={width}
                  onChange={(v) => setWidth(Number(v))}
                />
              </AdminField>

              <AdminField label="Height">
                <AdminInput
                  type="number"
                  value={height}
                  onChange={(v) => setHeight(Number(v))}
                />
              </AdminField>

              <AdminField label="Doors">
                <AdminInput
                  type="number"
                  value={doors}
                  onChange={(v) => setDoors(Number(v))}
                />
              </AdminField>

              <AdminField label="Windows">
                <AdminInput
                  type="number"
                  value={windows}
                  onChange={(v) => setWindows(Number(v))}
                />
              </AdminField>

              <AdminField label="Coats">
                <AdminInput
                  type="number"
                  value={coats}
                  onChange={(v) => setCoats(Number(v))}
                />
              </AdminField>

              <AdminField label="Surface Condition">
                <select
                  value={surfaceCondition}
                  onChange={(e) => setSurfaceCondition(e.target.value)}
                  className="input-field"
                >
                  {surfaceConditions.map((s) => (
                    <option key={s.id} value={s.condition_key}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </AdminField>

              <AdminField label="Colour Condition">
                <select
                  value={colourCondition}
                  onChange={(e) => setColourCondition(e.target.value)}
                  className="input-field"
                >
                  {colourConditions.map((c) => (
                    <option key={c.id} value={c.condition_key}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </AdminField>

              <AdminField label="Include Ceiling">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeCeiling}
                    onChange={(e) => setIncludeCeiling(e.target.checked)}
                  />
                  <span className="text-sm">Calculate ceiling paint</span>
                </label>
              </AdminField>
            </div>

            <div className="mt-4">
              <AdminButton onClick={handleTestCalculate} variant="primary">
                <Play className="mr-1 h-4 w-4" /> Calculate Test
              </AdminButton>
            </div>
          </AdminCard>

          {/* Coverage Info */}
          {selectedQuality && (
            <AdminCard>
              <h3 className="mb-2 text-sm font-semibold text-card-foreground">
                Coverage Configuration for {selectedProduct?.name} —{" "}
                {selectedQuality.name}
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <span className="text-xs text-muted-foreground">Coverage</span>
                  <p className="text-sm font-medium">
                    {selectedQuality.coverage ?? "NOT CONFIGURED"}{" "}
                    {selectedQuality.coverage
                      ? getCoverageUnitLabel(
                          selectedQuality.coverage_unit ?? "m2_per_liter",
                        )
                      : ""}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">
                    Ceiling Coverage
                  </span>
                  <p className="text-sm font-medium">
                    {selectedQuality.ceiling_coverage ?? "Same as wall"}{" "}
                    {selectedQuality.ceiling_coverage
                      ? getCoverageUnitLabel(
                          selectedQuality.ceiling_coverage_unit ??
                            "m2_per_liter",
                        )
                      : ""}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Pack Size</span>
                  <p className="text-sm font-medium">
                    {selectedProduct?.standard_pack_size ?? 20} L
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Price</span>
                  <p className="text-sm font-medium">
                    {prices.get(qualityId)?.price
                      ? formatCurrency(
                          prices.get(qualityId)!.price,
                          prices.get(qualityId)!.currency,
                        )
                      : "NOT CONFIGURED"}
                  </p>
                </div>
              </div>
            </AdminCard>
          )}

          {/* Results */}
          {result && (
            <AdminCard>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-card-foreground">
                  Calculation Results
                </h3>
                <Button
                  onClick={() => setExpandedSteps(!expandedSteps)}
                  className="text-xs text-brand-purple hover:underline"
                >
                  {expandedSteps ? "Hide Steps" : "Show Steps"}
                </Button>
              </div>

              {result.errors.length > 0 && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                  {result.errors.map((e, i) => (
                    <p
                      key={i}
                      className="flex items-start gap-2 text-xs text-red-700"
                    >
                      <AlertCircle aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" /> {e}
                    </p>
                  ))}
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  {result.warnings.map((w, i) => (
                    <p
                      key={i}
                      className="flex items-start gap-2 text-xs text-amber-700"
                    >
                      <AlertCircle aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" /> {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Summary Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border bg-muted/50 p-3">
                  <span className="text-xs text-muted-foreground">
                    Gross Wall Area
                  </span>
                  <p className="text-sm font-semibold">
                    {result.gross_wall_area_m2.toFixed(2)} m²
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <span className="text-xs text-muted-foreground">
                    Opening Deduction
                  </span>
                  <p className="text-sm font-semibold">
                    −{result.opening_deduction_m2.toFixed(2)} m²
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <span className="text-xs text-muted-foreground">
                    Net Wall Area
                  </span>
                  <p className="text-sm font-semibold">
                    {result.net_wall_area_m2.toFixed(2)} m²
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <span className="text-xs text-muted-foreground">Ceiling Area</span>
                  <p className="text-sm font-semibold">
                    {result.ceiling_area_m2.toFixed(2)} m²
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <span className="text-xs text-muted-foreground">
                    Coverage (normalized)
                  </span>
                  <p className="text-sm font-semibold">
                    {result.coverage_rate ?? "N/A"} {result.coverage_unit}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <span className="text-xs text-muted-foreground">
                    Effective Coats
                  </span>
                  <p className="text-sm font-semibold">
                    {result.effective_coats}
                  </p>
                </div>
                <div className="rounded-lg border bg-blue-50 p-3">
                  <span className="text-xs text-muted-foreground">
                    Theoretical Litres
                  </span>
                  <p className="text-sm font-semibold text-blue-700">
                    {result.theoretical_total_litres.toFixed(2)} L
                  </p>
                </div>
                <div className="rounded-lg border bg-blue-50 p-3">
                  <span className="text-xs text-muted-foreground">
                    Theoretical Buckets
                  </span>
                  <p className="text-sm font-semibold text-blue-700">
                    {result.theoretical_total_buckets.toFixed(4)}
                  </p>
                </div>
                <div className="rounded-lg border bg-green-50 p-3">
                  <span className="text-xs text-muted-foreground">
                    Practical Buckets
                  </span>
                  <p className="text-sm font-semibold text-green-700">
                    {result.practical_total_buckets}
                  </p>
                </div>
                <div className="rounded-lg border bg-green-50 p-3">
                  <span className="text-xs text-muted-foreground">
                    Practical Litres
                  </span>
                  <p className="text-sm font-semibold text-green-700">
                    {result.practical_total_litres.toFixed(2)} L
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <span className="text-xs text-muted-foreground">Leftover</span>
                  <p className="text-sm font-semibold">
                    {result.leftover_litres.toFixed(2)} L
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <span className="text-xs text-muted-foreground">
                    Material Cost
                  </span>
                  <p className="text-sm font-semibold">
                    {result.price_configured
                      ? formatCurrency(
                          result.material_cost,
                          result.unit_price > 0 ? "NGN" : "NGN",
                        )
                      : "Not configured"}
                  </p>
                </div>
              </div>

              {/* Calculation Steps */}
              {expandedSteps && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                    Step-by-step Calculation
                  </h4>
                  <div className="space-y-1">
                    {result.calculation_steps.map((step, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-md border bg-muted/50 p-2"
                      >
                        <span className="mt-0.5 w-6 shrink-0 text-right text-xs font-medium text-muted-foreground">
                          {i + 1}.
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-card-foreground">
                              {step.label}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {step.value}
                            </span>
                          </div>
                          {step.detail && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {step.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Summary Preview */}
              <div className="mt-4 rounded-lg border-2 border-dashed border-border p-4">
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                  Customer-Facing Summary Preview
                </h4>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>{result.customer_summary.room_name}</strong>:{" "}
                    {result.customer_summary.room_size},{" "}
                    {result.customer_summary.wall_height}
                  </p>
                  <p>
                    Paint: {result.customer_summary.paint} —{" "}
                    {result.customer_summary.quality}
                  </p>
                  <p>
                    Coats: {result.customer_summary.coats} | Ceiling:{" "}
                    {result.customer_summary.ceiling}
                  </p>
                  <p>
                    Theoretical: {result.customer_summary.theoretical_buckets}
                  </p>
                  <p>
                    <strong>
                      Practical: {result.customer_summary.practical_purchase}
                    </strong>
                  </p>
                  <p>Material Cost: {result.customer_summary.material_cost}</p>
                  <p className="text-xs text-muted-foreground">
                    {result.customer_summary.labour_note}
                  </p>
                </div>
              </div>
            </AdminCard>
          )}
        </>
      )}
    </div>
  );
}
