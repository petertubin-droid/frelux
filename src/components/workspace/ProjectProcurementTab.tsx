import { useMemo, useState } from "react";
import {
  Download,
  PackageCheck,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import type { ShoppingItemWithActual } from "@/lib/project-intelligence";
import { escapeCsvCell } from "@/lib/procurement/packaging-engine";
import {
  buildRequisitionLines,
  groupRequisitionLines,
} from "@/lib/procurement/purchase-orders";
import { useLanguage } from "@/lib/i18n";

interface Props {
  projectName: string;
  items: ShoppingItemWithActual[];
  formatMoney: (value: number) => string;
}

export function ProjectProcurementTab({
  projectName,
  items,
  formatMoney,
}: Props) {
  const { t } = useLanguage();
  const [packageInputs, setPackageInputs] = useState<
    Record<string, { size: string; moq: string }>
  >({});
  const rules = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(packageInputs)
          .filter(([, value]) => value.size.trim() !== "")
          .map(([id, value]) => [
            id,
            {
              packageSize: Number(value.size),
              minimumOrderQuantity: Number(value.moq || 0),
            },
          ]),
      ),
    [packageInputs],
  );
  const lines = useMemo(
    () => buildRequisitionLines(items, rules),
    [items, rules],
  );
  const grouped = useMemo(() => groupRequisitionLines(lines), [lines]);

  function update(id: string, key: "size" | "moq", value: string) {
    setPackageInputs((prev) => ({
      ...prev,
      [id]: {
        size: prev[id]?.size ?? "",
        moq: prev[id]?.moq ?? "",
        [key]: value,
      },
    }));
  }

  function exportCsv() {
    const rows = [
      ["Project", projectName],
      ["Document", "Purchase requisition (not a purchase order)"],
      [
        "Note",
        "Confirm package sizes, supplier, stock, price, delivery and approval before ordering.",
      ],
      [],
      [
        "Trade / category",
        "Material",
        "Required quantity",
        "Unit",
        "Pack size",
        "Packages",
        "Order quantity",
        "Surplus",
        "Supplier",
        "Indicative unit rate",
        "Indicative order total",
      ],
      ...lines.map((line) => [
        line.category,
        line.name,
        line.requiredQuantity,
        line.unit,
        line.packageSize ?? "Package size required",
        line.packageCount ?? "",
        line.orderQuantity ?? "",
        line.surplusQuantity ?? "",
        line.supplier ?? "Supplier not selected",
        line.estimatedUnitPrice ?? "",
        line.estimatedOrderTotal ?? "",
      ]),
    ];
    const csv = rows
      .map((row) => row.map(escapeCsvCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "project"}-requisition.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Add materials in the Shopping tab first. This requisition uses those
        project quantities and does not create an order or contact a supplier.
      </div>
    );
  }

  return (
    <section
      className="space-y-5"
      aria-label={t("Procurement and requisition")}
    >
      <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="font-semibold">
              {t("Requisition planning, not live procurement")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Package sizes and minimum orders are entered by you. Supplier
              inventory, verified supplier feeds, checkout, purchase approval,
              and order fulfillment are not connected here. Any displayed amount
              is a projection using the project’s saved estimated unit rate, not
              a current supplier quote.
            </p>
          </div>
        </div>
        <Button
          onClick={exportCsv}
          variant="outline"
          className="shrink-0"
          aria-label={t("Export purchase requisition CSV")}
        >
          <Download className="mr-2 h-4 w-4" /> {t("Export requisition CSV")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <PackageCheck className="h-4 w-4 text-primary" />{" "}
            {t("Items with package rules")}
          </div>
          <p className="mt-2 text-2xl font-bold">
            {lines.filter((line) => line.status === "rounded").length} /{" "}
            {lines.length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShoppingCart className="h-4 w-4 text-primary" />{" "}
            {t("Indicative packaged estimate")}
          </div>
          <p className="mt-2 text-2xl font-bold">
            {formatMoney(
              lines.reduce(
                (sum, line) => sum + (line.estimatedOrderTotal ?? 0),
                0,
              ),
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(
              "Excludes items without an entered pack size or valid estimated rate.",
            )}
          </p>
        </div>
      </div>

      {[...grouped.entries()].map(([category, categoryLines]) => (
        <div
          key={category}
          className="overflow-x-auto rounded-xl border bg-card"
        >
          <div className="border-b px-4 py-3">
            <h3 className="font-semibold">{category}</h3>
          </div>
          <table className="w-full min-w-[850px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                {[
                  "Material",
                  "Required",
                  "Pack size",
                  "Minimum order",
                  "Packages",
                  "Order qty",
                  "Surplus",
                  "Indicative total",
                ].map((label) => (
                  <th key={label} className="px-3 py-2 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categoryLines.map((line) => (
                <tr key={line.id} className="border-b last:border-0">
                  <td className="px-3 py-3">
                    <div className="font-medium">{line.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {line.supplier || "No supplier selected"}
                    </div>
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {line.requiredQuantity} {line.unit}
                  </td>
                  <td className="px-3 py-3">
                    <label className="sr-only" htmlFor={`pack-${line.id}`}>
                      Pack size for {line.name}
                    </label>
                    <input
                      id={`pack-${line.id}`}
                      type="number"
                      min="0.000001"
                      step="any"
                      inputMode="decimal"
                      className="input-field w-28"
                      placeholder={`${line.unit} / pack`}
                      value={packageInputs[line.id]?.size ?? ""}
                      onChange={(event) =>
                        update(line.id, "size", event.target.value)
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    <label className="sr-only" htmlFor={`moq-${line.id}`}>
                      Minimum order quantity for {line.name}
                    </label>
                    <input
                      id={`moq-${line.id}`}
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      className="input-field w-28"
                      placeholder={line.unit}
                      value={packageInputs[line.id]?.moq ?? ""}
                      onChange={(event) =>
                        update(line.id, "moq", event.target.value)
                      }
                    />
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {line.packageCount ?? "Enter pack size"}
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {line.orderQuantity === null
                      ? "—"
                      : `${line.orderQuantity} ${line.unit}`}
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {line.surplusQuantity === null
                      ? "—"
                      : `${line.surplusQuantity.toFixed(2)} ${line.unit}`}
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {line.estimatedOrderTotal === null
                      ? "—"
                      : formatMoney(line.estimatedOrderTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
