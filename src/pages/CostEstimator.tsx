import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  CheckCircle2,
  ArrowRight,
  Info,
  AlertCircle,
  Loader2,
  MessageCircle,
  ShoppingBag,
  FileText,
  Save,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { calculateEstimatedTotal } from "@/lib/calc";
import { track } from "@/lib/analytics";
import {
  logAnalyticsEvent,
  fetchPaintProducts,
  fetchMaterialPrices,
  fetchSiteSettings,
} from "@/lib/queries";
import { formatCurrency, formatNumber, classNames } from "@/lib/utils";
import type {
  CostEstimateInput,
  CostEstimateResult,
  ProjectType,
  ContainerRecommendation,
} from "@/types";
import type {
  DbPaintProduct,
  DbMaterialPrice,
  DbSiteSettings,
} from "@/types/database";
import { shareCostEstimateOnWhatsApp } from "@/lib/share";
import {
  generateCostEstimateShoppingList,
  type ShoppingListItem,
} from "@/lib/shopping-list";
import { exportPdfQuote } from "@/lib/pdf-export";
import { saveLocalProject } from "@/lib/local-projects";
import { ShoppingListModal } from "@/components/ui/ShoppingListModal";
import { useCalcDefaults } from "@/lib/use-calc-defaults";
import {
  EstimateDisclaimer,
  ReportCalculationIssue,
} from "@/components/calculators";
import LabourCostSection from "@/components/labour/LabourCostSection";
import {
  type LabourConfig,
  calculateLabourCost,
  DEFAULT_LABOUR_CONFIG,
} from "@/lib/labour";

interface PassedState {
  projectType?: ProjectType;
  paintableArea?: number;
  paintLiters?: number;
  coats?: number;
  paintType?: string;
  paintTypeName?: string;
  qualityId?: string | null;
  qualityName?: string | null;
  qualityPrice?: number | null;
  qualityPriceCurrency?: string | null;
  recommendedContainers?: ContainerRecommendation[];
  totalRecommendedLiters?: number;
}

import { useSeo } from "@/lib/seo";
import { trackCalculation } from "@/lib/achievements";
import { trackCalculationWithRewards } from "@/lib/rewards-integration";
import { trackRecentTool } from "@/lib/smart-defaults";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import RelatedToolsLinks from "@/components/ui/RelatedToolsLinks";
import SaveToProjectButton from "@/components/calculators/SaveToProjectButton";
import { PremiumFeatureGate } from "@/components/premium/PremiumFeatureGate";
import { useAuth } from "@/lib/auth";
import AdSlot from "@/components/ui/AdSlot";
import { SITE_URL } from "@/lib/seo";
import { getSafeError } from "@/lib/safeError";

export default function CostEstimator({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const { defaults: calcDefaults } = useCalcDefaults("cost");
  useSeo(
    !embedded
      ? {
          title:
            "Paint Cost Estimator — How Much Will Your Paint Materials Cost?",
          description:
            "Estimate the cost of your paint materials. Enter your paint bucket count, select products, and get a material cost breakdown. Labour not included.",
          canonicalPath: "/cost-estimator",
          ogType: "website",
          structuredDataArray: [
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "FRELUX Paint Cost Estimator",
              description:
                "Estimate the cost of your paint materials. Enter your paint bucket count, select products, and get a material cost breakdown. Labour not included.",
              url: `${SITE_URL}/cost-estimator`,
              applicationCategory: "CalculatorApplication",
              operatingSystem: "Web",
              offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: SITE_URL,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Calculators",
                  item: `${SITE_URL}/calculators`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: "Cost Estimator",
                  item: `${SITE_URL}/cost-estimator`,
                },
              ],
            },
          ],
        }
      : null,
  );

  const location = useLocation();
  const passed = (location.state as PassedState | null) ?? {};

  const mountedRef = useRef(true);
  useEffect(() => {
    trackRecentTool("/cost-estimator", "Cost Estimator", "DollarSign");
    return () => {
      mountedRef.current = false;
    };
  });
  const [products, setProducts] = useState<DbPaintProduct[]>([]);
  const [materials, setMaterials] = useState<DbMaterialPrice[]>([]);
  const [settings, setSettings] = useState<DbSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const currencySymbol = settings?.default_currency_symbol ?? "₦";
  const currency = settings?.default_currency ?? "NGN";

  const [input, setInput] = useState<CostEstimateInput>({
    projectType: passed.projectType ?? "room",
    paintableArea: passed.paintableArea ?? 0,
    paintLiters: passed.paintLiters ?? 0,
    coats: passed.coats ?? 2,
    paintType: passed.paintType ?? "",
    paintProductId: null,
    paintProductName: "",
    paintContainerSize: 0,
    paintContainerPrice: 0,
    paintPricePerLiter: 0,
    paintUseContainerPricing: false,
    includePrimer: false,
    primerLiters: 0,
    primerPricePerLiter: 0,
    includeFiller: false,
    fillerCost: 0,
    includePutty: false,
    puttyCost: 0,
    includeSandpaper: false,
    sandpaperCost: 0,
    includeBrushes: false,
    brushesCost: 0,
    includeRollers: false,
    rollersCost: 0,
    includeOther: false,
    otherMaterialsCost: 0,
    laborMode: "manual" as const,
    laborRatePerSqm: 0,
    laborTotal: 0,
    currency,
    currencySymbol,
  });
  const [result, setResult] = useState<CostEstimateResult | null>(null);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [pdfGateOpen, setPdfGateOpen] = useState(false);
  const [pdfUnlocked, setPdfUnlocked] = useState(false);
  const { isPaid } = useAuth();
  const [shoppingListItems, setShoppingListItems] = useState<
    ShoppingListItem[]
  >([]);
  const [labourConfig, setLabourConfig] = useState<LabourConfig>(
    DEFAULT_LABOUR_CONFIG,
  );
  // Manual bucket pricing — user picks a bucket size (e.g. 20L, 4L) from
  // admin-configurable options and enters the price for that bucket.
  const [manualBucketSize, setManualBucketSize] = useState(20);
  const [manualBucketPrice, setManualBucketPrice] = useState(0);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      const [prodRes, matRes, settingsRes] = await Promise.all([
        fetchPaintProducts(),
        fetchMaterialPrices(),
        fetchSiteSettings(),
      ]);
      if (prodRes.error) setLoadError(getSafeError(prodRes.error));
      if (matRes.error) setLoadError(getSafeError(matRes.error));
      if (settingsRes.error) setLoadError(getSafeError(settingsRes.error));

      setProducts(prodRes.data);
      setMaterials(matRes.data);
      setSettings(settingsRes.data);

      // Pre-fill primer price from the first primer material.
      const primer = matRes.data.find((m) => m.category === "primer");
      if (primer) {
        setInput((prev) => ({
          ...prev,
          primerPricePerLiter: Number(primer.price),
        }));
      }

      // If quality-level pricing was passed from the Paint Calculator,
      // auto-fill the paint price per liter so the user doesn't have to
      // manually select a product or enter a price.
      if (passed.qualityPrice && passed.qualityPrice > 0) {
        const containerSizes =
          passed.recommendedContainers
            ?.map((c) => c.size)
            ?.filter((s): s is number => s > 0) ?? [];
        const containerSize = containerSizes[0] ?? 20;
        const containerPrice = passed.qualityPrice * containerSize;
        setInput((prev) => ({
          ...prev,
          paintPricePerLiter: passed.qualityPrice!,
          paintContainerSize: containerSize,
          paintContainerPrice: containerPrice,
          paintUseContainerPricing: true,
          paintProductName: passed.qualityName ?? "",
        }));
      }

      setLoading(false);
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update currency in input when settings load.
  useEffect(() => {
    if (settings) {
      setInput((prev) => ({
        ...prev,
        currency: settings.default_currency,
        currencySymbol: settings.default_currency_symbol,
      }));
    }
  }, [settings]);

  // When a paint product is selected, fill container size and price so
  // the estimator uses actual container purchase cost. When no product is
  // selected (manual entry), use the manually chosen bucket size and price
  // so the estimator still calculates based on whole-bucket purchases.
  useEffect(() => {
    if (input.paintProductId) {
      const product = products.find((p) => p.id === input.paintProductId);
      if (product && Number(product.container_size) > 0) {
        setInput((prev) => ({
          ...prev,
          paintProductName: product.name,
          paintContainerSize: Number(product.container_size),
          paintContainerPrice: Number(product.price),
          paintPricePerLiter:
            Number(product.price) / Number(product.container_size),
          paintUseContainerPricing: true,
        }));
      }
    } else {
      // Manual entry — use bucket-based pricing with the user's selection.
      setInput((prev) => ({
        ...prev,
        paintProductName: "",
        paintContainerSize: manualBucketSize,
        paintContainerPrice: manualBucketPrice,
        paintPricePerLiter: 0,
        paintUseContainerPricing: manualBucketPrice > 0,
      }));
    }
  }, [input.paintProductId, products, manualBucketSize, manualBucketPrice]);

  function update<K extends keyof CostEstimateInput>(
    key: K,
    value: CostEstimateInput[K],
  ) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function handleWhatsAppShare() {
    if (!result) return;
    const paintTypeName =
      passed.paintTypeName ?? input.paintProductName ?? "Paint";
    shareCostEstimateOnWhatsApp({ result, input, paintTypeName });
  }

  function handlePdfExport() {
    if (!result) return;
    // Paid subscribers bypass the gate
    if (isPaid || pdfUnlocked) {
      exportPdfQuote({
        result,
        input,
        paintTypeName:
          passed.paintTypeName ?? input.paintProductName ?? "Paint",
        company: settings
          ? {
              name: settings.site_name,
              phone: settings.whatsapp_number,
              email: settings.contact_email,
              address: undefined,
            }
          : undefined,
      });
      // Session-scoped: reset unlock after use
      setPdfUnlocked(false);
    } else {
      setPdfGateOpen(true);
    }
  }

  function handleShoppingList() {
    if (!result) return;
    const items = generateCostEstimateShoppingList(
      result,
      input,
      passed.paintTypeName ?? input.paintProductName ?? "Paint",
    );
    setShoppingListItems(items);
    setShoppingListOpen(true);
  }

  function handleSaveLocal() {
    if (!result) return;
    const name = `Cost Estimate: ${input.projectType} — ${formatCurrency(result.total, currencySymbol)}`;
    saveLocalProject(name, "cost_estimate", { input, result });
  }

  function compute() {
    const rawResult = calculateEstimatedTotal({
      ...input,
      laborMode: "manual" as const,
      laborTotal: 0,
    });
    const laborCost = calculateLabourCost(labourConfig, input.paintableArea);
    const r: CostEstimateResult = {
      ...rawResult,
      laborCost,
      total: rawResult.total + laborCost,
    };
    setResult(r);
    trackCalculation("cost");
    trackCalculationWithRewards("cost", "Cost Estimator");
    track("cost_estimate_completed", { total: r.total });
    logAnalyticsEvent("cost_estimate_completed", { total: r.total });
  }

  const hasArea = input.paintableArea > 0;

  function toggleMaterial(
    cat: string,
    costKey: keyof CostEstimateInput,
    includeKey: keyof CostEstimateInput,
  ) {
    const mat = materials.find((m) => m.category === cat);
    const isEnabling = !input[includeKey as keyof CostEstimateInput];
    update(includeKey, isEnabling as never);
    if (isEnabling && mat) {
      update(costKey, Number(mat.price) as never);
    }
  }

  if (loading) {
    return (
      <>
        {!embedded && (
          <PageHeader
            eyebrow="Tool"
            title="Cost Estimator"
            subtitle="Estimate the cost of your paint materials — buckets, primer, and supplies."
            breadcrumbs={[
              { label: "Home", path: "/" },
              { label: "Calculators", path: "/calculators" },
              { label: "Cost Estimator" },
            ]}
          />
        )}
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />{" "}
          Loading pricing data…
        </div>
      </>
    );
  }

  return (
    <>
      {!embedded && (
        <PageHeader
          eyebrow="Tool"
          title="Cost Estimator"
          subtitle="Estimate the cost of your paint materials. Prices are editable so you can match local rates. Labour not included."
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Calculators", path: "/calculators" },
            { label: "Cost Estimator" },
          ]}
        />
      )}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {loadError && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <p>
              Some pricing data couldn't be loaded: {loadError}. You can still
              enter prices manually below.
            </p>
          </div>
        )}

        {!hasArea && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-accent-yellow/30 bg-accent-yellow/10 p-4 text-sm text-card-foreground">
            <Info
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-accent-yellow"
            />
            <p>
              Tip: Use the{" "}
              <Link
                to="/paint-calculator"
                className="font-semibold text-brand-purple underline"
              >
                Paint Calculator
              </Link>{" "}
              first, then continue here. Your paintable area and paint quantity
              will carry over automatically.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="calc-card card p-6 sm:p-8 dark:border-white/5 dark:bg-card lg:col-span-3">
            {/* Project summary */}
            <Section title="Project summary">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Project type">
                  <select
                    value={input.projectType}
                    onChange={(e) =>
                      update("projectType", e.target.value as ProjectType)
                    }
                    className="input-field"
                  >
                    <option value="room">Room</option>
                    <option value="house">House</option>
                    <option value="exterior">Exterior</option>
                    <option value="fence">Fence or Gate</option>
                  </select>
                </Field>
                <Field label="Paintable area (m²)">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={input.paintableArea || ""}
                    onChange={(e) =>
                      update("paintableArea", Number(e.target.value))
                    }
                    className="input-field"
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Paint quantity (L)">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={input.paintLiters || ""}
                    onChange={(e) =>
                      update("paintLiters", Number(e.target.value))
                    }
                    className="input-field"
                    placeholder="0.00"
                  />
                </Field>
              </div>
              {passed.paintTypeName && (
                <p className="mt-3 text-xs text-muted-foreground">
                  From calculator: {passed.paintTypeName}
                  {passed.qualityName ? ` · ${passed.qualityName}` : ""} ·{" "}
                  {passed.coats ?? 2} coats
                </p>
              )}
            </Section>

            {/* Paint cost */}
            <Section title="Paint">
              {products.length > 0 ? (
                <Field
                  label="Paint product"
                  hint="Selecting a product calculates cost based on actual container purchases"
                >
                  <select
                    value={input.paintProductId ?? ""}
                    onChange={(e) =>
                      update("paintProductId", e.target.value || null)
                    }
                    className="input-field"
                  >
                    <option value="">Manual price entry</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.brand ? ` (${p.brand})` : ""} · {p.container_size}L ·{" "}
                        {formatCurrency(Number(p.price), currencySymbol)}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No paint products configured. Enter a manual price per bucket
                  below.
                </p>
              )}

              {/* Product selected → show container pricing summary */}
              {input.paintProductId &&
              input.paintUseContainerPricing &&
              input.paintContainerSize > 0 ? (
                <div className="mt-4 rounded-lg border border-brand-purple/20 bg-primary/5 p-4">
                  <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                    Container based pricing
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatNumber(input.paintLiters, 1)} L required ·{" "}
                    {input.paintContainerSize} L containers ·{" "}
                    {Math.ceil(input.paintLiters / input.paintContainerSize)}{" "}
                    container(s) needed ·{" "}
                    {formatCurrency(input.paintContainerPrice, currencySymbol)}{" "}
                    each
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Paint cost ={" "}
                    {Math.ceil(input.paintLiters / input.paintContainerSize)} ×{" "}
                    {formatCurrency(input.paintContainerPrice, currencySymbol)}{" "}
                    ={" "}
                    <span className="font-semibold text-foreground dark:text-primary-foreground">
                      {formatCurrency(
                        Math.ceil(
                          input.paintLiters / input.paintContainerSize,
                        ) * input.paintContainerPrice,
                        currencySymbol,
                      )}
                    </span>
                  </p>
                </div>
              ) : (
                <>
                  {/* Manual entry — always show inputs */}
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Paint bucket size"
                      hint="Select a bucket size"
                    >
                      <select
                        value={manualBucketSize}
                        onChange={(e) => {
                          setManualBucketSize(Number(e.target.value));
                        }}
                        className="input-field"
                      >
                        {(settings?.manual_paint_bucket_sizes ?? [20, 4]).map(
                          (size) => (
                            <option key={size} value={size}>
                              {size} L
                            </option>
                          ),
                        )}
                      </select>
                    </Field>
                    <Field
                      label={`Price per ${manualBucketSize}L bucket (${currencySymbol})`}
                      hint="Manual entry"
                    >
                      <input
                        type="number"
                        min={0}
                        value={manualBucketPrice || ""}
                        onChange={(e) =>
                          setManualBucketPrice(Number(e.target.value))
                        }
                        className="input-field"
                        placeholder="0"
                      />
                    </Field>
                  </div>
                  {/* Show live cost summary below the inputs when a price is entered */}
                  {manualBucketPrice > 0 && input.paintLiters > 0 && (
                    <div className="mt-3 rounded-lg border border-brand-purple/20 bg-primary/5 p-4">
                      <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                        Bucket based pricing
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatNumber(input.paintLiters, 1)} L required ·{" "}
                        {manualBucketSize} L buckets ·{" "}
                        {Math.ceil(input.paintLiters / manualBucketSize)}{" "}
                        bucket(s) needed ·{" "}
                        {formatCurrency(manualBucketPrice, currencySymbol)} each
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Paint cost ={" "}
                        {Math.ceil(input.paintLiters / manualBucketSize)} ×{" "}
                        {formatCurrency(manualBucketPrice, currencySymbol)} ={" "}
                        <span className="font-semibold text-foreground dark:text-primary-foreground">
                          {formatCurrency(
                            Math.ceil(input.paintLiters / manualBucketSize) *
                              manualBucketPrice,
                            currencySymbol,
                          )}
                        </span>
                      </p>
                    </div>
                  )}
                </>
              )}
            </Section>

            {/* Primer */}
            <Section title="Primer">
              <div className="flex items-center gap-3">
                <Toggle
                  checked={input.includePrimer}
                  onChange={(v) => update("includePrimer", v)}
                />
                <span className="text-sm text-muted-foreground">Include primer</span>
              </div>
              {input.includePrimer && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Primer buckets">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={input.primerLiters || ""}
                      onChange={(e) =>
                        update("primerLiters", Number(e.target.value))
                      }
                      className="input-field"
                      placeholder="0.00"
                    />
                  </Field>
                  <Field label={`Primer price per bucket (${currencySymbol})`}>
                    <input
                      type="number"
                      min={0}
                      value={input.primerPricePerLiter || ""}
                      onChange={(e) =>
                        update("primerPricePerLiter", Number(e.target.value))
                      }
                      className="input-field"
                      placeholder="0"
                    />
                  </Field>
                </div>
              )}
            </Section>

            {/* Materials */}
            <Section title="Additional materials">
              <p className="mb-3 text-xs text-muted-foreground">
                Toggle materials to include them. Prices auto fill from
                configured data when available.
              </p>
              <div className="space-y-2">
                <MaterialToggle
                  label="Filler"
                  checked={input.includeFiller}
                  onToggle={() =>
                    toggleMaterial("filler", "fillerCost", "includeFiller")
                  }
                  cost={input.fillerCost}
                  symbol={currencySymbol}
                  onCostChange={(v) => update("fillerCost", v)}
                />
                <MaterialToggle
                  label="Putty"
                  checked={input.includePutty}
                  onToggle={() =>
                    toggleMaterial("putty", "puttyCost", "includePutty")
                  }
                  cost={input.puttyCost}
                  symbol={currencySymbol}
                  onCostChange={(v) => update("puttyCost", v)}
                />
                <MaterialToggle
                  label="Sandpaper"
                  checked={input.includeSandpaper}
                  onToggle={() =>
                    toggleMaterial(
                      "sandpaper",
                      "sandpaperCost",
                      "includeSandpaper",
                    )
                  }
                  cost={input.sandpaperCost}
                  symbol={currencySymbol}
                  onCostChange={(v) => update("sandpaperCost", v)}
                />
                <MaterialToggle
                  label="Brushes"
                  checked={input.includeBrushes}
                  onToggle={() =>
                    toggleMaterial("brushes", "brushesCost", "includeBrushes")
                  }
                  cost={input.brushesCost}
                  symbol={currencySymbol}
                  onCostChange={(v) => update("brushesCost", v)}
                />
                <MaterialToggle
                  label="Rollers"
                  checked={input.includeRollers}
                  onToggle={() =>
                    toggleMaterial("rollers", "rollersCost", "includeRollers")
                  }
                  cost={input.rollersCost}
                  symbol={currencySymbol}
                  onCostChange={(v) => update("rollersCost", v)}
                />
                <MaterialToggle
                  label="Other materials"
                  checked={input.includeOther}
                  onToggle={() => update("includeOther", !input.includeOther)}
                  cost={input.otherMaterialsCost}
                  symbol={currencySymbol}
                  onCostChange={(v) => update("otherMaterialsCost", v)}
                />
              </div>
            </Section>

            <LabourCostSection
              estimatorKey="paint"
              config={labourConfig}
              onChange={setLabourConfig}
              currencySymbol={currencySymbol}
              area={input.paintableArea}
              last
            />

            <button
              type="button"
              onClick={compute}
              className="btn-primary btn-glow mt-6 w-full sm:w-auto"
            >
              Calculate estimate
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          {/* Results panel */}
          <div className="lg:col-span-2">
            <div className="card sticky top-20 overflow-hidden">
              <div className="relative bg-gradient-to-br from-background to-primary p-6 text-primary-foreground">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/60">
                  Estimated total
                </p>
                {result ? (
                  <p className="mt-1 text-3xl font-bold sm:text-4xl">
                    {formatCurrency(result.total, currencySymbol)}
                  </p>
                ) : (
                  <p className="mt-1 text-3xl font-bold text-primary-foreground/40 sm:text-4xl">
                    {currencySymbol}0
                  </p>
                )}
                <p className="mt-1 text-xs text-primary-foreground/50">
                  Estimate only, not a final quote.
                </p>
              </div>
              <div className="space-y-2 p-6">
                <Row
                  label={
                    result && result.paintContainerCount > 0
                      ? `Paint (${result.paintContainerCount} containers)`
                      : "Paint"
                  }
                  value={
                    result
                      ? formatCurrency(result.paintCost, currencySymbol)
                      : "N/A"
                  }
                />
                {input.includePrimer && (
                  <Row
                    label="Primer"
                    value={
                      result
                        ? formatCurrency(result.primerCost, currencySymbol)
                        : "N/A"
                    }
                  />
                )}
                {input.includeFiller && (
                  <Row
                    label="Filler"
                    value={
                      result
                        ? formatCurrency(result.fillerCost, currencySymbol)
                        : "N/A"
                    }
                  />
                )}
                {input.includePutty && (
                  <Row
                    label="Putty"
                    value={
                      result
                        ? formatCurrency(result.puttyCost, currencySymbol)
                        : "N/A"
                    }
                  />
                )}
                {input.includeSandpaper && (
                  <Row
                    label="Sandpaper"
                    value={
                      result
                        ? formatCurrency(result.sandpaperCost, currencySymbol)
                        : "N/A"
                    }
                  />
                )}
                {input.includeBrushes && (
                  <Row
                    label="Brushes"
                    value={
                      result
                        ? formatCurrency(result.brushesCost, currencySymbol)
                        : "N/A"
                    }
                  />
                )}
                {input.includeRollers && (
                  <Row
                    label="Rollers"
                    value={
                      result
                        ? formatCurrency(result.rollersCost, currencySymbol)
                        : "N/A"
                    }
                  />
                )}
                {input.includeOther && (
                  <Row
                    label="Other"
                    value={
                      result
                        ? formatCurrency(
                            result.otherMaterialsCost,
                            currencySymbol,
                          )
                        : "N/A"
                    }
                  />
                )}
                <div className="border-t border-border/50 pt-2">
                  <Row
                    label="Material cost"
                    value={
                      result
                        ? formatCurrency(
                            result.total - result.laborCost,
                            currencySymbol,
                          )
                        : "N/A"
                    }
                  />
                  {labourConfig.includeLabour && (
                    <Row
                      label="Labour cost"
                      value={
                        result
                          ? formatCurrency(result.laborCost, currencySymbol)
                          : "N/A"
                      }
                    />
                  )}
                </div>
                <div className="border-t border-border/50 pt-2">
                  <Row
                    label="Grand total"
                    value={
                      result
                        ? formatCurrency(result.total, currencySymbol)
                        : "N/A"
                    }
                    strong
                  />
                </div>
                {result && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-green" />
                    Based on {formatNumber(input.paintableArea)} m² and{" "}
                    {formatNumber(input.paintLiters, 1)} L of paint.
                  </div>
                )}
              </div>
              <div className="border-t border-border/50 bg-muted/50 px-6 py-3 text-xs text-muted-foreground">
                Estimate only. Actual costs may vary depending on product brand,
                location, surface condition, market prices, and labor rates.
              </div>

              {/* Smart action buttons */}
              {result && (
                <>
                  <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-4">
                    <button
                      type="button"
                      onClick={handleWhatsAppShare}
                      className="flex flex-col items-center gap-1.5 rounded-lg bg-accent-green/10 p-3 text-center transition-all hover:bg-accent-green/20"
                    >
                      <MessageCircle className="h-5 w-5 text-accent-green" />
                      <span className="text-xs font-semibold text-accent-green">
                        WhatsApp
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePdfExport}
                      className="flex flex-col items-center gap-1.5 rounded-lg bg-primary/10 p-3 text-center transition-all hover:bg-primary/20"
                    >
                      <FileText className="h-5 w-5 text-brand-purple" />
                      <span className="text-xs font-semibold text-brand-purple">
                        Export PDF
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShoppingList}
                      className="flex flex-col items-center gap-1.5 rounded-lg bg-accent-orange/10 p-3 text-center transition-all hover:bg-accent-orange/20"
                    >
                      <ShoppingBag className="h-5 w-5 text-accent-orange" />
                      <span className="text-xs font-semibold text-accent-orange">
                        Shopping List
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveLocal}
                      className="flex flex-col items-center gap-1.5 rounded-lg bg-muted p-3 text-center transition-all hover:bg-muted dark:bg-card-foreground/90 dark:hover:bg-card-foreground/80"
                    >
                      <Save className="h-5 w-5 text-muted-foreground dark:text-muted-foreground/80" />
                      <span className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground/80">
                        Save to Device
                      </span>
                    </button>
                  </div>
                  <div className="mt-3 flex justify-center">
                    <SaveToProjectButton
                      calculatorType="cost"
                      calculatorSlug="cost-estimator"
                      calcTitle="Cost Estimate"
                      calcData={
                        { ...input, ...result } as Record<string, unknown>
                      }
                      resultSummary={
                        result as unknown as Record<string, unknown>
                      }
                      compact
                      label="Save to Project Workspace"
                    />
                  </div>
                </>
              )}

              {result && (
                <>
                  <EstimateDisclaimer text={calcDefaults.estimateDisclaimer} />
                  <ReportCalculationIssue
                    calculatorType="cost"
                    userInput={{
                      projectType: input.projectType,
                      area: input.paintableArea,
                      coats: input.coats,
                      includePrimer: input.includePrimer,
                    }}
                    actualResult={{
                      total: result.total,
                      materialCost: result.total - result.laborCost,
                      laborCost: result.laborCost,
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {shoppingListOpen && (
          <ShoppingListModal
            items={shoppingListItems}
            title="Cost Estimate Shopping List"
            onClose={() => setShoppingListOpen(false)}
          />
        )}
      </div>
      {!embedded && (
        <RelatedTools
          links={[
            CALC_LINKS.paintCalculator,
            CALC_LINKS.screedingCalc,
            CALC_LINKS.popCeilingCalc,
            CALC_LINKS.tileCalc,
            CALC_LINKS.buildToRoof,
            CALC_LINKS.imageEstimator,
          ]}
        />
      )}
      {pdfGateOpen && (
        <PremiumFeatureGate
          featureKey="pdf_export"
          featureName="PDF Export"
          description="Export professional PDF quotations. One-time use — unlock each export."
          onUnlock={() => {
            setPdfUnlocked(true);
            setPdfGateOpen(false);
            handlePdfExport();
          }}
          onClose={() => setPdfGateOpen(false)}
        />
      )}
      <AdSlot slotKey="estimator_bottom" className="mt-8" />
    </>
  );
}

function Section({
  title,
  children,
  last,
}: {
  title: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "mb-6 border-b border-border/50 pb-6"}>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          "text-sm " +
          (strong
            ? "font-bold text-foreground dark:text-primary-foreground"
            : "text-muted-foreground dark:text-muted-foreground")
        }
      >
        {label}
      </span>
      <span
        className={
          "text-sm " +
          (strong
            ? "font-bold text-foreground dark:text-primary-foreground"
            : "text-card-foreground dark:text-muted-foreground/60")
        }
      >
        {value}
      </span>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-card-foreground">
        {label}
      </span>
      {hint && (
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      )}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex appearance-none h-5 w-9 shrink-0 rounded-full transition-colors border-0 p-0 " +
        (checked ? "bg-accent-green" : "bg-muted")
      }
      aria-pressed={checked}
      style={{ width: "2.25rem", height: "1.25rem", minWidth: "2.25rem" }}
    >
      <span
        className={
          "absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform dark:bg-card " +
          (checked ? "translate-x-4" : "translate-x-0.5")
        }
      />
    </button>
  );
}

function MaterialToggle({
  label,
  checked,
  onToggle,
  cost,
  symbol,
  onCostChange,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  cost: number;
  symbol: string;
  onCostChange: (v: number) => void;
}) {
  return (
    <div
      className={classNames(
        "rounded-lg border p-3 transition-colors",
        checked
          ? "border-brand-purple/30 bg-primary/5"
          : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Toggle checked={checked} onChange={onToggle} />
          <span className="text-sm font-semibold text-card-foreground">
            {label}
          </span>
        </div>
        {checked && (
          <div className="flex items-center gap-2">
            <div className="relative w-28">
              <input
                type="number"
                min={0}
                value={cost || ""}
                onChange={(e) => onCostChange(Number(e.target.value))}
                className="input-field pr-7 text-sm"
                placeholder="0"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {symbol}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
