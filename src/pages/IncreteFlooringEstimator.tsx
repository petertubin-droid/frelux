import { useMemo, useState } from "react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import MarketScopeNotice from "@/components/MarketScopeNotice";
import { useMarket } from "@/lib/international/market-context";
import { useAuth } from "@/lib/auth";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { useDisplayCurrency } from "@/lib/international/currency-context";
import { createEstimate } from "@/lib/estimation/queries";
import { printQuote } from "@/lib/estimation/quote-export";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";
import { INCRETE_MARKETS } from "@/lib/estimation/increte-market-config";
import {
  calculateIncrete,
  type IncreteProductInput,
  type IncreteSystem,
} from "@/lib/estimation/increte-engine";
import { useLanguage } from "@/lib/i18n";

const SYSTEMS: Array<{ value: IncreteSystem; label: string }> = [
  { value: "stamped-concrete", label: "Stamped concrete" },
  { value: "colour-hardener", label: "Colour hardener" },
  { value: "release-agent", label: "Release agent" },
  { value: "stain", label: "Concrete stain" },
  { value: "decorative-overlay", label: "Decorative overlay" },
  { value: "textured-finish", label: "Textured finish / spray deck" },
  { value: "sealer", label: "Sealer" },
];
type DraftProduct = IncreteProductInput;
const blankProduct = (): DraftProduct => ({
  id: crypto.randomUUID(),
  name: "",
  system: "stamped-concrete",
  coverageM2PerPackage: null,
  packageSize: null,
  packageUnit: "package",
  coats: 1,
  wastePercent: 0,
  unitPrice: null,
  priceOrigin: "user_supplied",
  specOrigin: "user_supplied",
  sourceUrl: null,
});
const num = (value: string) => (value.trim() === "" ? null : Number(value));

export default function IncreteFlooringEstimator() {
  const { t } = useLanguage();
  const { marketCode, market } = useMarket();
  const { user } = useAuth();
  const { symbol } = useDisplayCurrency();
  const [selectedMarket, setSelectedMarket] = useState(marketCode || "US");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [areaUnit, setAreaUnit] = useState<"m2" | "ft2">("m2");
  const [thickness, setThickness] = useState("");
  const [thicknessUnit, setThicknessUnit] = useState<"mm" | "in">("mm");
  const [labour, setLabour] = useState("");
  const [products, setProducts] = useState<DraftProduct[]>([blankProduct()]);
  const [status, setStatus] = useState("");
  const marketInfo = INCRETE_MARKETS.find((m) => m.code === selectedMarket);
  const currencyCode = marketInfo?.currencyCode || market?.currencyCode || "";
  const currencySymbol =
    selectedMarket === marketCode
      ? market?.currencySymbol || symbol || ""
      : symbol || "";

  useSeo({
    title: "Increte Flooring Calculator & Estimator | FRELUX",
    description:
      "Estimate decorative concrete flooring quantities using explicit product coverage, coats, waste, local prices and installation inputs. Missing market data is clearly identified.",
  });
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    {
      name: "Increte Flooring Estimator",
      path: "/increte-flooring-calculator",
    },
  ]);

  const input = useMemo(
    () => ({
      marketCode: selectedMarket,
      length: Number(length),
      width: Number(width),
      areaUnit,
      thickness: num(thickness),
      thicknessUnit,
      labourRatePerM2: num(labour),
      products,
      currencyCode,
    }),
    [
      selectedMarket,
      length,
      width,
      areaUnit,
      thickness,
      thicknessUnit,
      labour,
      products,
      currencyCode,
    ],
  );
  const result = useMemo(
    () =>
      Number(length) > 0 && Number(width) > 0 ? calculateIncrete(input) : null,
    [input, length, width],
  );

  const updateProduct = (index: number, patch: Partial<DraftProduct>) =>
    setProducts((current) =>
      current.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  const exportEstimate = () => {
    if (!result) return;
    printQuote(
      {
        title: "FRELUX Decorative Concrete Estimate",
        subtitle: `Generated ${new Date().toLocaleDateString()} · ${selectedMarket} · ${result.lines.length} product line(s)`,
        metaRows: [
          [
            "Market",
            `${marketInfo?.name ?? selectedMarket} (${selectedMarket})`,
          ],
          ["Currency", currencyCode || "Not configured"],
          ["Area", `${result.areaM2.toFixed(2)} m²`],
          ["Calculation", result.method.join(" ")],
        ],
        lines: result.lines.map((line) => ({
          label: line.name || "Unspecified product",
          quantity:
            line.quantity === null ? "Missing data" : line.quantity.toFixed(2),
          unit: "m² required",
          unit_price:
            line.unitPrice === null
              ? "Not priced"
              : formatCurrency(line.unitPrice, currencySymbol),
          line_total:
            line.total === null
              ? "N/A"
              : formatCurrency(line.total, currencySymbol),
          detail: `${line.packages ?? "?"} ${line.packageUnit}(s)`,
        })),
        totals: [
          {
            label: "Materials",
            value:
              result.materialTotal === null
                ? "Incomplete"
                : formatCurrency(result.materialTotal, currencySymbol),
          },
          {
            label: "Labour",
            value:
              result.labourTotal === null
                ? "Not included"
                : formatCurrency(result.labourTotal, currencySymbol),
          },
          {
            label: "Estimate total",
            value:
              result.grandTotal === null
                ? "Incomplete"
                : formatCurrency(result.grandTotal, currencySymbol),
            strong: true,
          },
        ],
        warnings: result.warnings,
        footer:
          "Planning estimate only. Product specifications and local prices require verification; this report is not a construction specification or supplier quotation.",
      },
      "frelux-increte-flooring-estimate.html",
    );
  };
  const saveEstimate = async () => {
    if (!result || status) return;
    setStatus("Saving estimate…");
    const { error } = await createEstimate({
      estimate_ref: `INCR-${Date.now().toString(36).toUpperCase()}`,
      user_id: user?.id ?? null,
      client_hash: null,
      calculator_type: "increte_flooring",
      project_description: "Decorative concrete flooring estimate",
      inputs: input,
      calculation_method: "increte_flooring_v1",
      calculated_quantities: {
        areaM2: result.areaM2,
        concreteVolumeM3: result.concreteVolumeM3,
        lines: result.lines,
        materialTotal: result.materialTotal,
        labourTotal: result.labourTotal,
        grandTotal: result.grandTotal,
      },
      total_material_cost: result.materialTotal ?? 0,
      currency: currencyCode || "",
      labour_status:
        result.labourTotal === null
          ? "not_included"
          : result.labourTotal > 0
            ? "included"
            : "negotiated_separately",
      warnings: result.warnings,
      recommendations: [],
      notes:
        "Product inputs entered by estimator; review source and market coverage before procurement.",
      status: "draft",
    });
    setStatus(
      error ? `Could not save: ${error.message}` : "Estimate saved to FRELUX.",
    );
  };

  return (
    <Container>
      <PageHeader
        title={t("Increte Flooring Calculator & Estimator")}
        subtitle="Build a transparent quantity and cost estimate for decorative concrete systems. Market presence is not a claim that products, rates or standards are verified."
        variant="tool"
      />
      <MarketScopeNotice />
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">
            {t("Project and market")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              {t("Market")}
              <select
                className="mt-1 block w-full rounded-md border bg-background p-2"
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
              >
                {INCRETE_MARKETS.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name} ({m.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              {t("Length")}
              <input
                className="mt-1 block w-full rounded-md border bg-background p-2"
                type="number"
                min="0"
                step="any"
                value={length}
                onChange={(e) => setLength(e.target.value)}
              />
            </label>
            <label className="text-sm">
              {t("Width")}
              <input
                className="mt-1 block w-full rounded-md border bg-background p-2"
                type="number"
                min="0"
                step="any"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </label>
            <label className="text-sm">
              {t("Dimension unit")}
              <select
                className="mt-1 block w-full rounded-md border bg-background p-2"
                value={areaUnit}
                onChange={(e) => setAreaUnit(e.target.value as "m2" | "ft2")}
              >
                <option value="m2">{t("Metres (m)")}</option>
                <option value="ft2">{t("Feet (ft)")}</option>
              </select>
            </label>
            <label className="text-sm">
              {t("Concrete thickness (optional)")}
              <input
                className="mt-1 block w-full rounded-md border bg-background p-2"
                type="number"
                min="0"
                step="any"
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
                placeholder={t("Needed for volume")}
              />
            </label>
            <label className="text-sm">
              {t("Thickness unit")}
              <select
                className="mt-1 block w-full rounded-md border bg-background p-2"
                value={thicknessUnit}
                onChange={(e) =>
                  setThicknessUnit(e.target.value as "mm" | "in")
                }
              >
                <option value="mm">mm</option>
                <option value="in">inches</option>
              </select>
            </label>
            <label className="text-sm">
              Local labour rate per m²
              <input
                className="mt-1 block w-full rounded-md border bg-background p-2"
                type="number"
                min="0"
                step="any"
                value={labour}
                onChange={(e) => setLabour(e.target.value)}
                placeholder={t("Optional, local currency")}
              />
            </label>
          </div>
          <div className="mt-4 rounded-lg bg-muted p-4 text-sm">
            <strong>
              {marketInfo?.name} ({selectedMarket}) ·{" "}
              {currencyCode || "Currency not mapped"}
            </strong>
            <p className="mt-1">{marketInfo?.message}</p>
            <p className="mt-2 font-medium">
              Market-specific product specifications, prices, tax and
              installation standards are not currently verified in this
              estimator. Enter local evidence and prices; no US values are
              copied.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {t("Products and application inputs")}
            </h2>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProducts((items) => [...items, blankProduct()])}
            >
              {t("Add product layer")}
            </Button>
          </div>
          {products.map((product, index) => (
            <div key={product.id} className="rounded-xl border bg-card p-5">
              <div className="mb-4 flex justify-between">
                <h3 className="font-medium">Layer {index + 1}</h3>
                {products.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setProducts((items) =>
                        items.filter((_, i) => i !== index),
                      )
                    }
                  >
                    {t("Remove")}
                  </Button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm">
                  {t("System")}
                  <select
                    className="mt-1 block w-full rounded-md border bg-background p-2"
                    value={product.system}
                    onChange={(e) =>
                      updateProduct(index, {
                        system: e.target.value as IncreteSystem,
                      })
                    }
                  >
                    {SYSTEMS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  {t("Brand / product")}
                  <input
                    className="mt-1 block w-full rounded-md border bg-background p-2"
                    value={product.name}
                    onChange={(e) =>
                      updateProduct(index, { name: e.target.value })
                    }
                    placeholder={t("Enter product name")}
                  />
                </label>
                <label className="text-sm">
                  Coverage per package (m²)
                  <input
                    className="mt-1 block w-full rounded-md border bg-background p-2"
                    type="number"
                    min="0"
                    step="any"
                    value={product.coverageM2PerPackage ?? ""}
                    onChange={(e) =>
                      updateProduct(index, {
                        coverageM2PerPackage: num(e.target.value),
                      })
                    }
                    placeholder={t("From product data sheet")}
                  />
                </label>
                <label className="text-sm">
                  {t("Package size / description")}
                  <input
                    className="mt-1 block w-full rounded-md border bg-background p-2"
                    type="number"
                    min="0"
                    step="any"
                    value={product.packageSize ?? ""}
                    onChange={(e) =>
                      updateProduct(index, { packageSize: num(e.target.value) })
                    }
                    placeholder={t("Optional")}
                  />
                </label>
                <label className="text-sm">
                  {t("Package unit")}
                  <input
                    className="mt-1 block w-full rounded-md border bg-background p-2"
                    value={product.packageUnit}
                    onChange={(e) =>
                      updateProduct(index, { packageUnit: e.target.value })
                    }
                    placeholder="bucket, bag, kit"
                  />
                </label>
                <label className="text-sm">
                  {t("Coats / applications")}
                  <input
                    className="mt-1 block w-full rounded-md border bg-background p-2"
                    type="number"
                    min="1"
                    step="1"
                    value={product.coats}
                    onChange={(e) =>
                      updateProduct(index, { coats: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="text-sm">
                  Waste allowance (%)
                  <input
                    className="mt-1 block w-full rounded-md border bg-background p-2"
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={product.wastePercent}
                    onChange={(e) =>
                      updateProduct(index, {
                        wastePercent: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="text-sm">
                  {t("Local price per package")}
                  <input
                    className="mt-1 block w-full rounded-md border bg-background p-2"
                    type="number"
                    min="0"
                    step="any"
                    value={product.unitPrice ?? ""}
                    onChange={(e) =>
                      updateProduct(index, {
                        unitPrice: num(e.target.value),
                        priceOrigin: "user_supplied",
                      })
                    }
                    placeholder={`${currencyCode || "Local currency"}`}
                  />
                </label>
                <label className="text-sm">
                  {t("Product source URL (optional)")}
                  <input
                    className="mt-1 block w-full rounded-md border bg-background p-2"
                    type="url"
                    value={product.sourceUrl ?? ""}
                    onChange={(e) =>
                      updateProduct(index, {
                        sourceUrl: e.target.value,
                        specOrigin: "user_supplied",
                      })
                    }
                    placeholder={t(
                      "Manufacturer datasheet or supplier listing",
                    )}
                  />
                </label>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Coverage must be entered as the manufacturer's coverage for one
                purchasable package. User-entered inputs are not independently
                verified.
              </p>
            </div>
          ))}
        </section>

        {result && (
          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-lg font-semibold">{t("Estimate results")}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-muted p-3">
                <span className="text-sm text-muted-foreground">
                  {t("Surface area")}
                </span>
                <p className="text-xl font-semibold">
                  {result.areaM2.toFixed(2)} m²
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-sm text-muted-foreground">
                  {t("Concrete volume")}
                </span>
                <p className="text-xl font-semibold">
                  {result.concreteVolumeM3 === null
                    ? "Not calculated"
                    : `${result.concreteVolumeM3.toFixed(3)} m³`}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-sm text-muted-foreground">
                  {t("Estimate total")}
                </span>
                <p className="text-xl font-semibold">
                  {result.grandTotal === null
                    ? "Incomplete inputs"
                    : formatCurrency(result.grandTotal, currencySymbol)}
                </p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">{t("Product")}</th>
                    <th className="p-2">Required m²</th>
                    <th className="p-2">{t("Packages")}</th>
                    <th className="p-2">{t("Price")}</th>
                    <th className="p-2">{t("Total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map((line) => (
                    <tr key={line.id} className="border-b">
                      <td className="p-2">{line.name || "Unspecified"}</td>
                      <td className="p-2">
                        {line.quantity?.toFixed(2) ?? "Missing"}
                      </td>
                      <td className="p-2">
                        {line.packages ?? "Missing"} {line.packageUnit}
                      </td>
                      <td className="p-2">
                        {line.unitPrice === null
                          ? "Not entered"
                          : formatCurrency(line.unitPrice, currencySymbol)}
                      </td>
                      <td className="p-2">
                        {line.total === null
                          ? "N/A"
                          : formatCurrency(line.total, currencySymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.warnings.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
                <strong>{t("Incomplete data and assumptions")}</strong>
                <ul className="mt-2 list-disc pl-5">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer font-medium">
                {t("Calculation method")}
              </summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                {result.method.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </details>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={exportEstimate}>
                {t("Export branded report")}
              </Button>
              <Button variant="outline" onClick={saveEstimate}>
                {t("Save estimate")}
              </Button>
            </div>
            {status && (
              <p className="mt-3 text-sm" role="status">
                {status}
              </p>
            )}
          </section>
        )}
        <p className="text-xs text-muted-foreground">
          Estimates are planning aids, not installation specifications. Confirm
          substrate condition, product compatibility, local standards, current
          supplier availability and installation requirements with qualified
          local professionals and manufacturers.
        </p>
      </div>
    </Container>
  );
}
