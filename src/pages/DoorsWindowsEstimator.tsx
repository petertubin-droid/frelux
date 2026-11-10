/**
 * FRELUX Doors & Windows Estimator (Tier 2, Engine 7)
 *
 * Deterministic doors/windows MATERIAL estimation: your door
 * and window counts per type → leaves, frames, hinges,
 * locksets and window units, with every derived count labelled
 * (frames one set per door, hinges from the visible
 * planning rule), prices from the shared material database
 * (never invented), labour separate.
 *
 * This is ESTIMATION, not a fixing specification.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import Container from "@/components/ui/Container";
import MeasurementTip from "@/components/ui/MeasurementTip";
import MissingFieldsNotice from "@/components/ui/MissingFieldsNotice";
import { useCalculatorFeedback } from "@/hooks/useCalculatorFeedback";
import PageHeader from "@/components/ui/PageHeader";
import RecommendedProducts from "@/components/estimation/RecommendedProducts";
import AdSlot from "@/components/ui/AdSlot";
import MarketScopeNotice from "@/components/MarketScopeNotice";
import { useMarket } from "@/lib/international/market-context";
import { usePriceBook } from "@/lib/pricing/price-book-context";
import { applyPriceBook } from "@/lib/pricing/price-book";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { downloadCsv } from "@/lib/export-utils";
import { useAuth } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import {
  fetchCalcRules,
  fetchEstimationMaterials,
  fetchMarketPriceBook,
  createEstimate,
  createEstimateItem,
} from "@/lib/estimation/queries";
import {
  resolveMarketDoorsWindows,
  DOORS_WINDOWS_ENGINE_KEYS,
  type DoorsWindowsMarketResolution,
} from "@/lib/estimation/structural-market";
import { SaveToProjectButton } from "@/components/calculators";
import PriceFreshnessNotice from "@/components/prices/PriceFreshnessNotice";
import {
  summarisePriceBook,
  type PriceBookSummary,
} from "@/lib/prices/freshness";
import { formatCurrency } from "@/lib/utils";
import { useDisplayCurrency } from "@/lib/international/currency-context";
import {
  printQuote,
  exportQuoteToDocumentStudio,
} from "@/lib/estimation/quote-export";
import {
  calculateDoorsWindows,
  parseDoorsWindowsRules,
  type DoorsWindowsInput,
  type DoorsWindowsPriceMap,
  type DoorsWindowsResult,
} from "@/lib/estimation/doors-windows-engine";
import type {
  EstimationCalcRule,
  EstimationMaterial,
} from "@/types/estimation";
import { QuoteShareButton } from "@/components/calculators/QuoteShareButton";
import { useLanguage } from "@/lib/i18n";
import { NearbySuppliersLink } from "@/components/map/NearbySuppliersLink";

type NumField =
  | "flush_doors"
  | "panel_doors"
  | "security_doors"
  | "aluminium_windows"
  | "louvre_windows";

const NUM_LABELS: Record<NumField, string> = {
  flush_doors: "Flush doors",
  panel_doors: "Panel doors",
  security_doors: "Security doors",
  aluminium_windows: "Aluminium sliding windows",
  louvre_windows: "Louvre windows",
};

function fmtN(v: number | null): string {
  return v === null ? "N/A" : v.toLocaleString();
}

export default function DoorsWindowsEstimator() {
  const { t } = useLanguage();
  const { symbol: displayCurrencySymbol } = useDisplayCurrency();
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "Doors & Windows Estimator", path: "/doors-windows" },
  ]);
  const { user } = useAuth();

  const { marketCode, market } = useMarket();
  const currencySymbol = market?.currencySymbol || displayCurrencySymbol || "₦";
  const currencyCode = market?.currencyCode || "NGN";
  const [counts, setCounts] = useState<Record<NumField, string>>({
    flush_doors: "",
    panel_doors: "",
    security_doors: "",
    aluminium_windows: "",
    louvre_windows: "",
  });
  const [glazing, setGlazing] = useState({
    area: "",
    pane: "",
    thickness: "",
  });
  const [includeLocksets, setIncludeLocksets] = useState(true);
  const [labourMode, setLabourMode] = useState<
    "none" | "per_door" | "lump_sum"
  >("none");
  const [labourRate, setLabourRate] = useState("");
  const [result, setResult] = useState<DoorsWindowsResult | null>(null);
  const [saveState, setSaveState] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useSeo({
    title:
      "Doors & Windows Estimator: Leaves, Frames, Hinges, Locksets & Units | FRELUX",
    description:
      "Deterministic doors and windows material estimation: enter your counts per type and get door leaves, frames, hinges, locksets and window units with every derived count labelled. Estimation only: confirm unit sizes on site.",
  });

  const [priceMap, setPriceMap] = useState<DoorsWindowsPriceMap>({});
  const [bookFreshness, setBookFreshness] = useState<PriceBookSummary | null>(
    null,
  );
  const [doorsMarket, setDoorsMarket] =
    useState<DoorsWindowsMarketResolution | null>(null);
  const [ruleRows, setRuleRows] = useState<EstimationCalcRule[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [rulesRes, matsRes, book] = await Promise.all([
        fetchCalcRules("doors_windows"),
        fetchEstimationMaterials(true),
        fetchMarketPriceBook(marketCode),
      ]);
      if (!alive) return;
      setBookFreshness(summarisePriceBook(book));
      const byRef = book.byRef;
      const map: DoorsWindowsPriceMap = {};
      for (const m of (matsRes.data ?? []) as EstimationMaterial[]) {
        if (marketCode !== "NG" && book.fromReference.has(m.id)) {
          map[m.slug] = null;
        } else {
          map[m.slug] = byRef.get(m.id) ?? null;
        }
      }

      if (marketCode !== "NG") {
        const doorsRes = await resolveMarketDoorsWindows(marketCode);
        if (alive) {
          setPriceMap({ ...map, ...doorsRes.overrides });
          setDoorsMarket(doorsRes);
        }
      } else {
        setPriceMap(map);
        setDoorsMarket(null);
      }
      if (alive) {
        setRuleRows(rulesRes.data as unknown as EstimationCalcRule[]);
      }
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [marketCode]);

  // The contractor's own supplier rates sit under the market book, so a priced
  // panel uses the rate that was actually quoted, in the currency it names.
  const { resolve } = usePriceBook();
  const effectivePrices = useMemo(
    () =>
      applyPriceBook(
        priceMap,
        resolve(market?.currencyCode ?? marketCode).rates,
      ),
    [priceMap, resolve, market, marketCode],
  );

  const doorsWindowsCoverage = useMemo(
    () =>
      DOORS_WINDOWS_ENGINE_KEYS.filter(
        (slug) =>
          effectivePrices[slug] !== undefined && effectivePrices[slug] !== null,
      ).length,
    [effectivePrices],
  );

  const rules = useMemo(
    () => parseDoorsWindowsRules(ruleRows as never),
    [ruleRows],
  );

  const input: DoorsWindowsInput = useMemo(() => {
    const num = (v: string): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : Number.NaN;
    };
    return {
      flush_doors: num(counts.flush_doors),
      panel_doors: num(counts.panel_doors),
      security_doors: num(counts.security_doors),
      aluminium_windows: num(counts.aluminium_windows),
      louvre_windows: num(counts.louvre_windows),
      glazed_area_m2: glazing.area.trim() === "" ? null : num(glazing.area),
      pane_area_m2: glazing.pane.trim() === "" ? null : num(glazing.pane),
      glass_thickness_mm:
        glazing.thickness.trim() === "" ? null : num(glazing.thickness),
      include_locksets: includeLocksets,
      labour: {
        mode: labourMode,
        per_door_rate:
          labourMode === "per_door" ? Number(labourRate) || null : null,
        lump_sum: labourMode === "lump_sum" ? Number(labourRate) || null : null,
      },
    };
  }, [counts, includeLocksets, labourMode, labourRate]);

  const run = useCallback(() => {
    const res = calculateDoorsWindows(input, rules, effectivePrices);
    setResult(res);
    track("calculator_completed", {
      calculator: "doors_windows",
      incomplete: res.incomplete,
      lines: res.lines.length,
    });
  }, [input, rules, priceMap]);

  // Printable professional quote, worldwide-currency formatted.
  const buildQuote = (): Parameters<typeof printQuote>[0] | null => {
    if (!result?.ok) return null;
    return {
      title: "FRELUX Doors & Windows Estimate",
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
          l.unit_price === null
            ? "unpriced"
            : formatCurrency(l.unit_price, currencySymbol),
        line_total:
          l.line_total === null
            ? "N/A"
            : formatCurrency(l.line_total, currencySymbol),
        detail: l.detail,
      })),
      totals: [
        {
          label: "Material subtotal",
          value:
            result.material_subtotal === null
              ? "(prices/inputs missing)"
              : formatCurrency(result.material_subtotal, currencySymbol),
        },
        {
          label: "Priced so far",
          value: formatCurrency(result.priced_subtotal, currencySymbol),
        },
        {
          label: "Labour",
          value:
            labourMode === "none"
              ? "Not included"
              : formatCurrency(result.labour_total, currencySymbol),
        },
        {
          label: "Grand total",
          value:
            result.grand_total === null
              ? "N/A"
              : formatCurrency(result.grand_total, currencySymbol),
          strong: true,
        },
      ],
      warnings: result.warnings,
      footer:
        "Estimates are indicative and not a formal quote. Quantities are sized from your openings and hardware rules; unpriced items are reported, never invented.",
    };
  };

  const exportQuote = () => {
    const quote = buildQuote();
    if (!quote) return;
    printQuote(quote, "frelux-doors-windows-estimate.html");
  };

  const exportToDocumentStudio = () => {
    if (!result?.ok) return;
    exportQuoteToDocumentStudio(
      {
        title: "FRELUX Doors & Windows Estimate",
        subtitle: `Generated ${new Date().toLocaleDateString()} · ${result.lines.length} line item(s)`,
        metaRows: result.steps.map(
          (step) => [step.label, step.detail] as [string, string],
        ),
        lines: result.lines.map((line) => ({
          label: line.label,
          quantity:
            line.quantity === null ? "unavailable" : String(line.quantity),
          unit: line.unit,
          unit_price:
            line.unit_price === null ? "unavailable" : String(line.unit_price),
          line_total:
            line.line_total === null ? "unavailable" : String(line.line_total),
          detail: line.detail,
        })),
        totals: [
          {
            label: "Estimate total",
            value:
              result.grand_total === null
                ? "Unavailable"
                : String(result.grand_total),
          },
        ],
        warnings: result.warnings,
      },
      currencyCode,
      "quotation",
    );
    window.location.assign("/document-studio");
  };

  const save = useCallback(async () => {
    if (!result || !result.ok || saving) return;
    setSaving(true);
    setSaveState(null);
    try {
      const ref = `DOORWIN-${Date.now()}}}}}.toString(36).toUpperCase()}`;
      const { data: estimate, error } = await createEstimate({
        estimate_ref: ref,
        user_id: user?.id ?? null,
        client_hash: null,
        calculator_type: "doors_windows",
        project_description: "Doors & windows estimate",
        inputs: input as unknown as Record<string, unknown>,
        calculation_method: "doors_windows_v1",
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
      track("calculator_completed", { calculator: "doors_windows_saved", ref });
    } catch (err) {
      setSaveState(`Could not save: ${getSafeError(err)}`);
    } finally {
      setSaving(false);
    }
  }, [result, saving, user, input, labourMode, currencyCode]);

  const numberInput = (
    label: string,
    state: string,
    setter: (v: string) => void,
    placeholder = "0",
    key?: string,
  ) => (
    <label key={key ?? label} className="block text-sm">
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

  const { fieldsRef, resultsRef, missing, handleCalculate } =
    useCalculatorFeedback<HTMLDivElement>();

  return (
    <Container>
      <PageHeader
        variant="tool"
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Construction Tools", path: "/construction-tools" },
          { label: "Doors & Windows Estimator" },
        ]}
        title={t("Doors & Windows Estimator")}
        subtitle="Enter your door and window counts per type. The engine lists leaves, frames, hinges, locksets and window units, labelling every derived count, and prices from the shared material database. Estimation only: confirm unit sizes on site."
      />

      <MarketScopeNotice />
      {bookFreshness && (
        <div className="mt-4">
          <PriceFreshnessNotice bookSummary={bookFreshness} className="mt-0" />
        </div>
      )}
      {marketCode !== "NG" && (
        <div
          className="mb-6 rounded-lg border border-border bg-muted/40 p-4 text-sm"
          data-testid="trade-price-coverage"
        >
          <p className="font-semibold">Price book coverage ({marketCode})</p>
          <p className="mt-1 text-muted-foreground">
            {doorsMarket && doorsMarket.provenance.length > 0
              ? `The ${marketCode} price book covers ${doorsWindowsCoverage} of ${DOORS_WINDOWS_ENGINE_KEYS.length} door and window material types from verified supplier listings. Unpriced lines are shown without a total and are never silently substituted; add verified prices for your market before relying on cost totals.`
              : `The ${marketCode} price book does not yet cover doors, frames and hardware. Unpriced items are marked and never silently substituted; add verified prices for your market before relying on cost totals.`}
          </p>
        </div>
      )}
      {doorsMarket &&
        marketCode !== "NG" &&
        doorsMarket.provenance.length > 0 && (
          <div
            className="mb-6 rounded-lg border border-border bg-muted/40 p-4 text-sm"
            data-testid="doors-windows-price-provenance"
          >
            <p className="font-semibold">
              Market doors & windows prices ({marketCode} book)
            </p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {doorsMarket.provenance.map((p) => (
                <li key={p.engineKey}>
                  ✓ {p.engineKey}: {p.materialName} (
                  {formatCurrency(p.price, currencySymbol)}) - {p.explanation}
                </li>
              ))}
              {doorsMarket.unresolved.length > 0 && (
                <li>
                  ✗ {doorsMarket.unresolved.join(", ")}: no verified price in
                  the {marketCode} book - reported unpriced, never silent
                  substitution.
                </li>
              )}
            </ul>
          </div>
        )}

      {/* Inputs */}
      <div
        ref={fieldsRef}
        className="mb-8 rounded-lg border bg-card p-5 shadow-sm"
      >
        <div className="mb-4">
          <MeasurementTip what="sizes, units and quantities" />
        </div>
        <h3 className="mb-1 font-semibold">{t("Door and window counts")}</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          The engine never invents openings. Enter the counts from your drawing
          or site survey; leave a type at 0 if you have none. Frames, hinges and
          locksets are derived and labelled in the breakdown; unit prices must
          match the sizes the configured: confirm actual sizes on site.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(NUM_LABELS) as NumField[]).map((k) =>
            numberInput(
              NUM_LABELS[k],
              counts[k],
              (v) => setCounts((c) => ({ ...c, [k]: v })),
              "0",
              k,
            ),
          )}
        </div>
        <h3 className="mt-5 mb-2 font-semibold">{t("Glazed envelope")}</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          {t(
            "For large or varied glazing where counting standard units would be wrong, enter the measured glass area. It is priced per m²; the pane count rounds up because a part pane is bought whole.",
          )}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {numberInput(
            t("Measured glazed area (m²)"),
            glazing.area,
            (v) => setGlazing((g) => ({ ...g, area: v })),
            "0",
            "glazed-area",
          )}
          {numberInput(
            t("Area of one pane (m²)"),
            glazing.pane,
            (v) => setGlazing((g) => ({ ...g, pane: v })),
            "optional",
            "pane-area",
          )}
          {numberInput(
            t("Glass thickness (mm)"),
            glazing.thickness,
            (v) => setGlazing((g) => ({ ...g, thickness: v })),
            "optional",
            "glass-thickness",
          )}
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeLocksets}
            onChange={(e) => setIncludeLocksets(e.target.checked)}
          />
          {t("Include locksets (one per door, labelled)")}
        </label>

        <h3 className="mt-5 mb-2 font-semibold">{t("Labour")}</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">{t("Labour mode")}</span>
            <select
              value={labourMode}
              onChange={(e) =>
                setLabourMode(e.target.value as typeof labourMode)
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 sm:w-56"
            >
              <option value="none">{t("Not included")}</option>
              <option value="per_door">{t("Per unit installed (rate)")}</option>
              <option value="lump_sum">{t("Lump sum")}</option>
            </select>
          </label>
          {labourMode !== "none" &&
            numberInput(
              labourMode === "per_door"
                ? `Rate per unit (${currencySymbol})`
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
            type="button"
            onClick={() => handleCalculate(run)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {t("Calculate estimate")}
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
                {t("Export quote (PDF)")}
              </button>
              <QuoteShareButton
                build={buildQuote}
                kind="Doors & Windows Estimate"
                link="/doors-windows"
              />
              <button
                onClick={exportToDocumentStudio}
                className="rounded-md border px-4 py-2 text-sm font-medium"
              >
                {t("Customize in Document Studio")}
              </button>
              <SaveToProjectButton
                calculatorType="doors_windows"
                calculatorSlug="doors-windows-estimator"
                calcTitle="Doors & windows estimate"
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
                    category: "doors_windows",
                    quantity: l.quantity ?? 0,
                    unit: l.unit,
                    estimated_price: l.unit_price ?? undefined,
                  }))}
              />
              <NearbySuppliersLink material="doors and windows" />
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

      <RecommendedProducts category="doors_windows" />

      <AdSlot slotKey="calculator_mid" className="mt-8" />

      <div className="mb-4">
        <MissingFieldsNotice fields={missing} />
      </div>

      {/* Errors */}
      {result && !result.ok && (
        <div
          className="mb-8 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
          role="alert"
        >
          <h3 className="mb-1 font-semibold text-destructive">
            {t("Fix these inputs first")}
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
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (!result) return;
              const rows: Record<string, unknown>[] = [
                ...result.lines.map((line) => ({
                  item: line.label,
                  quantity: line.quantity === null ? "" : line.quantity,
                  unit: line.unit,
                  basis: line.quantity_source,
                  detail: line.detail,
                  unit_price: line.unit_price === null ? "" : line.unit_price,
                  line_total: line.line_total === null ? "" : line.line_total,
                  note:
                    line.unit_price === null && line.quantity !== null
                      ? "Price not configured in the material database"
                      : "",
                })),
                {
                  item: "Priced subtotal",
                  quantity: "",
                  unit: "",
                  basis: "",
                  detail: "",
                  unit_price: "",
                  line_total: result.priced_subtotal,
                  note: "",
                },
                {
                  item: "Labour",
                  quantity: "",
                  unit: "",
                  basis: "",
                  detail: "",
                  unit_price: "",
                  line_total: result.labour_total,
                  note: "",
                },
                {
                  item: "Grand total",
                  quantity: "",
                  unit: "",
                  basis: "",
                  detail: "",
                  unit_price: "",
                  line_total: result.grand_total ?? "",
                  note: result.incomplete ? "Estimate incomplete" : "",
                },
                ...result.missing.map((item) => ({
                  item: "Missing",
                  quantity: "",
                  unit: "",
                  basis: "",
                  detail: item,
                  unit_price: "",
                  line_total: "",
                  note: "",
                })),
              ];
              downloadCsv("frelux-doors-windows-takeoff", rows, [
                { header: "Material", key: "item" },
                { header: "Quantity", key: "quantity" },
                { header: "Unit", key: "unit" },
                { header: "Basis", key: "basis" },
                { header: "How it was sized", key: "detail" },
                { header: "Unit price", key: "unit_price" },
                { header: "Line total", key: "line_total" },
                { header: "Note", key: "note" },
              ]);
            }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            {t("Export CSV")}
          </button>
        </div>
      )}

      {result?.ok && (
        <>
          {/* Status banner */}
          <div
            ref={resultsRef}
            className={`mb-4 rounded-lg border p-4 text-sm ${
              result.incomplete
                ? "border-amber-600/40 bg-amber-600/5"
                : "border-emerald-600/40 bg-emerald-600/5"
            }`}
            data-testid="estimate-status"
          >
            {result.incomplete ? (
              <>
                <strong className="block">
                  {t("This estimate is INCOMPLETE.")}
                </strong>
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
              aria-label={t("Doors and windows material takeoff")}
            >
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="p-3">{t("Material")}</th>
                  <th className="p-3">{t("Quantity")}</th>
                  <th className="p-3">{t("Unit")}</th>
                  <th className="p-3">{t("How it was sized")}</th>
                  <th className="p-3">{t("Unit price")}</th>
                  <th className="p-3">{t("Line total")}</th>
                </tr>
              </thead>
              <tbody>
                {result.lines.map((l) => (
                  <tr key={l.key} className="border-b last:border-0">
                    <td className="p-3 font-medium">{l.label}</td>
                    <td className="p-3" data-testid={`qty-${l.key}`}>
                      {l.quantity === null
                        ? "(enter a count)"
                        : fmtN(l.quantity)}
                    </td>
                    <td className="p-3 text-muted-foreground">{l.unit}</td>
                    <td className="max-w-xs p-3 text-xs text-muted-foreground">
                      {l.detail}
                    </td>
                    <td className="p-3">
                      {l.unit_price === null ? (
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          {t("PRICE NOT CONFIGURED")}
                        </span>
                      ) : (
                        formatCurrency(l.unit_price, currencySymbol)
                      )}
                    </td>
                    <td className="p-3 font-medium">
                      {l.line_total === null
                        ? "N/A"
                        : formatCurrency(l.line_total, currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Breakdown */}
          <div className="mb-6 rounded-lg border bg-card p-4">
            <h3 className="mb-2 font-semibold">{t("Calculation breakdown")}</h3>
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
              <p className="text-sm text-muted-foreground">
                {t("Material subtotal")}
              </p>
              <p className="text-xl font-semibold">
                {result.material_subtotal === null
                  ? "(prices/inputs missing)"
                  : formatCurrency(result.material_subtotal, currencySymbol)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                {t("Of which priced so far")}
              </p>
              <p className="text-xl font-semibold">
                {formatCurrency(result.priced_subtotal, currencySymbol)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{t("Labour")}</p>
              <p className="text-xl font-semibold">
                {labourMode === "none"
                  ? "Not included"
                  : formatCurrency(result.labour_total, currencySymbol)}
              </p>
            </div>
            <div className="rounded-lg border bg-primary/10 p-4">
              <p className="text-sm text-muted-foreground">
                {t("Grand total")}
              </p>
              <p className="text-xl font-semibold">
                {result.grand_total === null
                  ? "N/A"
                  : formatCurrency(result.grand_total, currencySymbol)}
              </p>
            </div>
          </div>

          {/* Warnings */}
          <div className="mb-8 rounded-lg border border-amber-600/40 bg-amber-600/5 p-4 text-sm">
            <h3 className="mb-1 font-semibold">{t("Important")}</h3>
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
        <h2 className="mb-2 font-semibold">{t("How this estimator works")}</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Door leaves and window units take your counts directly. Frames
            follow at one set per door, locksets at one per door when you
            include them, and hinges follow the visible planning rule: every
            derived count is labelled in the breakdown, not presented as a
            measurement.
          </li>
          <li>
            An all-zero schedule is reported as missing rather than inventing
            openings. A missing hinge rule is reported too; nothing is guessed.
          </li>
          <li>
            Prices come from the shared FRELUX material database, configured by
            FRELUX price tracking. Door and window prices must match the size
            and finish the configured: confirm actual unit sizes on site.
            Unpriced materials show PRICE NOT CONFIGURED, never invented.
          </li>
          <li>
            {t("This is material ESTIMATION, not a fixing specification.")}
          </li>
        </ul>
      </section>
    </Container>
  );
}
