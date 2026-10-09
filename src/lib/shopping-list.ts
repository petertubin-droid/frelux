/**
 * Material Shopping List Generator
 * Compiles all materials from a calculation into a checklist format.
 */
import { SITE_URL } from "@/lib/seo";

import type {
  CalculatorResult,
  CostEstimateResult,
  CalculatorInput,
  CostEstimateInput,
} from "@/types";
import { formatNumber, formatCurrency } from "@/lib/utils";

export interface ShoppingListItem {
  name: string;
  quantity: string;
  detail?: string;
  checked: boolean;
}

export function generatePaintShoppingList(
  result: CalculatorResult,
  input: CalculatorInput,
  paintTypeName: string,
): ShoppingListItem[] {
  const items: ShoppingListItem[] = [];

  // Paint containers
  for (const c of result.recommendedContainers) {
    items.push({
      name: `${paintTypeName} paint (${c.size} L)`,
      quantity: `${c.count} ${c.count > 1 ? "containers" : "container"}`,
      detail: `Total: ${formatNumber(c.count * c.size, 1)} L`,
      checked: false,
    });
  }

  // If no container recommendations, show total liters
  if (result.recommendedContainers.length === 0) {
    items.push({
      name: `${paintTypeName} paint`,
      quantity: `${formatNumber(result.totalRecommendedLiters, 1)} L`,
      detail: `Includes ${input.wasteMargin}% waste margin`,
      checked: false,
    });
  }

  // Primer (if multiple coats)
  if (input.coats > 1) {
    items.push({
      name: "Primer",
      quantity: "1 container",
      detail: "Recommended for multi-coat projects",
      checked: false,
    });
  }

  // Sandpaper
  items.push({
    name: "Sandpaper (fine grit)",
    quantity: "2-3 sheets",
    detail: "For surface preparation",
    checked: false,
  });

  // Brushes
  items.push({
    name: "Paint brushes",
    quantity: "2-3 brushes",
    detail: "Various sizes for edges and corners",
    checked: false,
  });

  // Rollers
  items.push({
    name: "Paint rollers + tray",
    quantity: "1-2 sets",
    detail: `For ${formatNumber(result.paintableArea)} m² of surface`,
    checked: false,
  });

  // Drop cloth / masking tape
  items.push({
    name: "Masking tape",
    quantity: "2-3 rolls",
    detail: "For protecting edges and fixtures",
    checked: false,
  });

  items.push({
    name: "Drop cloth / plastic sheet",
    quantity: "1-2 sheets",
    detail: "For floor protection",
    checked: false,
  });

  return items;
}

export function generateCostEstimateShoppingList(
  result: CostEstimateResult,
  input: CostEstimateInput,
  paintTypeName: string,
): ShoppingListItem[] {
  const items: ShoppingListItem[] = [];

  // Paint
  if (result.paintCost > 0) {
    if (result.paintContainerCount > 0) {
      items.push({
        name: `${paintTypeName} paint`,
        quantity: `${result.paintContainerCount} container(s)`,
        detail: `${formatCurrency(result.paintCost, result.currencySymbol)}`,
        checked: false,
      });
    } else {
      items.push({
        name: `${paintTypeName} paint`,
        quantity: `${formatNumber(input.paintLiters, 1)} L`,
        detail: `${formatCurrency(result.paintCost, result.currencySymbol)}`,
        checked: false,
      });
    }
  }

  if (result.primerCost > 0)
    items.push({
      name: "Primer",
      quantity: "1 unit",
      detail: formatCurrency(result.primerCost, result.currencySymbol),
      checked: false,
    });
  if (result.fillerCost > 0)
    items.push({
      name: "Filler",
      quantity: "1 unit",
      detail: formatCurrency(result.fillerCost, result.currencySymbol),
      checked: false,
    });
  if (result.puttyCost > 0)
    items.push({
      name: "Putty",
      quantity: "1 unit",
      detail: formatCurrency(result.puttyCost, result.currencySymbol),
      checked: false,
    });
  if (result.sandpaperCost > 0)
    items.push({
      name: "Sandpaper",
      quantity: "1 unit",
      detail: formatCurrency(result.sandpaperCost, result.currencySymbol),
      checked: false,
    });
  if (result.brushesCost > 0)
    items.push({
      name: "Brushes",
      quantity: "1 set",
      detail: formatCurrency(result.brushesCost, result.currencySymbol),
      checked: false,
    });
  if (result.rollersCost > 0)
    items.push({
      name: "Rollers",
      quantity: "1 set",
      detail: formatCurrency(result.rollersCost, result.currencySymbol),
      checked: false,
    });
  if (result.otherMaterialsCost > 0)
    items.push({
      name: "Other materials",
      quantity: "1 unit",
      detail: formatCurrency(result.otherMaterialsCost, result.currencySymbol),
      checked: false,
    });

  return items;
}

export function shoppingListToText(items: ShoppingListItem[]): string {
  const lines: string[] = ["📋 *FRELUX Shopping List*", ""];
  for (const item of items) {
    const check = item.checked ? "✅" : "☐";
    lines.push(`${check} ${item.quantity}, ${item.name}`);
    if (item.detail) lines.push(`    ${item.detail}`);
  }
  lines.push("");
  lines.push(`🔗 ${SITE_URL}`);
  return lines.join("\n");
}

/* ============================================================
   Estimate history export: turns a saved estimate into a
   plain-text shopping list the user can take to any supplier.
   ============================================================ */

import type { DbEstimateHistory } from "@/types/database";

interface HistoryLine {
  name: string;
  quantity: number | null;
  unit: string | null;
}

const EST_NAME_KEYS = ["name", "label", "title", "material", "item", "product"];
const EST_QTY_KEYS = [
  "quantity",
  "packagesNeeded",
  "packages_needed",
  "count",
  "amount",
  "buckets",
  "bags",
  "litres",
  "liters",
];
const EST_UNIT_KEYS = ["unit", "coverage_unit", "uom"];

function pickValue(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

/** Depth-first scan for arrays of objects that look like material lines. */
function collectHistoryLines(
  node: unknown,
  out: HistoryLine[],
  depth = 0,
): void {
  if (depth > 4 || node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const item of node) {
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        const o = item as Record<string, unknown>;
        const name = pickValue(o, EST_NAME_KEYS);
        const qty = pickValue(o, EST_QTY_KEYS);
        const unit = pickValue(o, EST_UNIT_KEYS);
        if (typeof name === "string" && name.trim()) {
          const qtyNum =
            typeof qty === "number"
              ? qty
              : typeof qty === "string" &&
                  qty.trim() !== "" &&
                  !isNaN(Number(qty))
                ? Number(qty)
                : null;
          if (qtyNum !== null) {
            out.push({
              name: name.trim(),
              quantity: qtyNum,
              unit: typeof unit === "string" ? unit : null,
            });
            continue;
          }
        }
      }
      collectHistoryLines(item, out, depth + 1);
    }
    return;
  }
  if (typeof node === "object") {
    for (const value of Object.values(node as Record<string, unknown>)) {
      collectHistoryLines(value, out, depth + 1);
    }
  }
}

function estMoney(v: unknown, currency: string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(n);
  return `${currency} ${formatted}`;
}

export function buildShoppingList(est: DbEstimateHistory): string {
  const lines: string[] = [];
  const label = est.project_name ?? est.calculator_type;
  const date = new Date(est.created_at).toLocaleDateString();

  lines.push("FRELUX SHOPPING LIST");
  lines.push("===================");
  lines.push("");
  lines.push(`Project: ${label}`);
  lines.push(`Calculator: ${est.calculator_type}`);
  lines.push(`Date: ${date}`);
  lines.push("");

  const materialLines: HistoryLine[] = [];
  collectHistoryLines(est.result_data, materialLines);

  lines.push("MATERIALS");
  lines.push("---------");
  if (materialLines.length > 0) {
    for (const m of materialLines) {
      const qty = m.quantity !== null ? m.quantity : "?";
      const unit = m.unit ? ` ${m.unit}` : "";
      lines.push(`[ ] ${m.name}: ${qty}${unit}`);
    }
  } else {
    lines.push(
      "This estimate does not include an itemised material breakdown.",
    );
  }
  lines.push("");

  const costs = [
    ["Material cost", est.material_cost],
    ["Labour cost", est.labour_cost],
    ["Total", est.total_cost],
  ] as const;
  if (costs.some(([, v]) => Number.isFinite(Number(v)) && v !== null)) {
    lines.push("ESTIMATED COSTS");
    lines.push("----------------");
    for (const [costLabel, v] of costs) {
      const str = estMoney(v, est.currency ?? "NGN");
      if (str) lines.push(`${costLabel}: ${str}`);
    }
    lines.push("");
  }

  lines.push("TIP: add 5-10% wastage to quantities before buying.");
  lines.push("");
  lines.push("Planned with FRELUX · freluxtools.com");

  return lines.join("\n");
}

export function downloadShoppingList(est: DbEstimateHistory): string {
  const text = buildShoppingList(est);
  const name =
    (est.project_name ?? "frelux-estimate")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "frelux-estimate";
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `shopping-list-${name}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return text;
}
