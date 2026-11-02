import { describe, expect, it } from "vitest";
import type { ShoppingItemWithActual } from "@/lib/project-intelligence";
import { buildRequisitionLines, groupRequisitionLines } from "./purchase-orders";

const mockItem: ShoppingItemWithActual = {
  id: "item-1",
  project_id: "proj-1",
  category: "Concrete & Masonry",
  name: "Cement",
  quantity: 110,
  unit: "kg",
  estimated_price: 1.5,
  actual_price: null,
  total_price: 165,
  supplier: null,
  notes: null,
  is_purchased: false,
  sort_order: 1,
};

describe("buildRequisitionLines", () => {
  it("calculates packaged order totals using entered package sizes", () => {
    const [line] = buildRequisitionLines([mockItem], {
      "item-1": { packageSize: 50, minimumOrderQuantity: 100 },
    });
    expect(line).toMatchObject({
      packageCount: 3,
      orderQuantity: 150,
      surplusQuantity: 40,
      estimatedOrderTotal: 225,
      status: "rounded",
    });
  });

  it("marks unconfigured items as needing a package size", () => {
    const [line] = buildRequisitionLines([mockItem], {});
    expect(line.status).toBe("package_size_required");
    expect(line.orderQuantity).toBeNull();
    expect(line.estimatedOrderTotal).toBeNull();
  });
});

describe("groupRequisitionLines", () => {
  it("groups lines by category", () => {
    const groups = groupRequisitionLines([
      { ...mockItem, category: "Masonry", packageSize: null, packageCount: null, orderQuantity: null, surplusQuantity: null, estimatedUnitPrice: null, estimatedOrderTotal: null, status: "package_size_required", requiredQuantity: 10 },
    ]);
    expect(groups.has("Masonry")).toBe(true);
  });
});
