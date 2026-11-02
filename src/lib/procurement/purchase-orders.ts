import type { ShoppingItemWithActual } from "@/lib/project-intelligence";
import { calculatePackagedQuantity, type PackagingRule } from "./packaging-engine";

export interface RequisitionLine {
  id: string;
  category: string;
  name: string;
  requiredQuantity: number;
  unit: string;
  packageSize: number | null;
  packageCount: number | null;
  orderQuantity: number | null;
  surplusQuantity: number | null;
  estimatedUnitPrice: number | null;
  estimatedOrderTotal: number | null;
  supplier: string | null;
  status: "rounded" | "package_size_required";
}

export function buildRequisitionLines(
  items: ShoppingItemWithActual[],
  rules: Record<string, PackagingRule>,
): RequisitionLine[] {
  return items.map((item) => {
    const packaging = calculatePackagedQuantity(item.quantity, rules[item.id]);
    const estimatedUnitPrice = Number.isFinite(item.estimated_price) && item.estimated_price >= 0
      ? item.estimated_price
      : null;
    return {
      id: item.id,
      category: item.category || "Uncategorized",
      name: item.name,
      requiredQuantity: item.quantity,
      unit: item.unit,
      packageSize: packaging.packageSize,
      packageCount: packaging.packageCount,
      orderQuantity: packaging.orderQuantity,
      surplusQuantity: packaging.surplusQuantity,
      estimatedUnitPrice,
      estimatedOrderTotal:
        packaging.orderQuantity !== null && estimatedUnitPrice !== null
          ? packaging.orderQuantity * estimatedUnitPrice
          : null,
      supplier: item.supplier,
      status: packaging.status,
    };
  });
}

export function groupRequisitionLines(lines: RequisitionLine[]): Map<string, RequisitionLine[]> {
  const groups = new Map<string, RequisitionLine[]>();
  for (const line of lines) {
    const group = groups.get(line.category) ?? [];
    group.push(line);
    groups.set(line.category, group);
  }
  return groups;
}
