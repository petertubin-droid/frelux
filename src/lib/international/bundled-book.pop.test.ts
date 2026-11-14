import { describe, it, expect } from "vitest";
import { bundledPopMaterials } from "@/lib/international/bundled-book";

/**
 * The bundled book is the offline fallback. It is authored in camelCase while
 * the engines read snake_case, so it is mapped row by row; before that mapping
 * existed every offline POP estimate priced zero materials.
 */
describe("bundled POP materials", () => {
  it("returns rows the POP engine can actually price", async () => {
    const { data } = await bundledPopMaterials("nigeria", "NG");
    expect(data.length).toBeGreaterThan(0);
    for (const row of data) {
      expect(typeof row.coverage_rate).toBe("number");
      expect(typeof row.unit_price).toBe("number");
      expect(typeof row.package_size).toBe("number");
      expect(Number.isNaN(row.coverage_rate)).toBe(false);
      expect(row.is_active).toBe(true);
    }
  });

  it("carries the MDF work platform as a per-worker item", async () => {
    const { data } = await bundledPopMaterials("nigeria", "NG");
    const board = data.find((row) =>
      row.name.toLowerCase().includes("mdf plywood"),
    );
    expect(board).toBeDefined();
    expect(board?.quantity_basis).toBe("per_worker");
    expect(board?.per_worker_rate).toBe(0.5);
    expect(board?.unit_price).toBe(25000);
    expect(board?.coverage_unit).toBe("board");
  });

  it("defaults every other row to the area basis", async () => {
    const { data } = await bundledPopMaterials("nigeria", "NG");
    const areaRows = data.filter(
      (row) => row.name !== "MDF Plywood (work platform)",
    );
    expect(areaRows.length).toBeGreaterThan(0);
    for (const row of areaRows) {
      expect(row.quantity_basis ?? "area").toBe("area");
    }
  });
});
