import { describe, expect, it } from "vitest";
import { buildRoofCsvRows } from "./roof-csv";
import type { BuildToRoofResult } from "@/types/build-to-roof";

const result = {
  project_name: "Test duplex",
  location: "NG",
  building_type: "duplex",
  number_of_floors: 2,
  total_floor_area: 220,
  construction_stage: "roof",
  confidence: "moderate",
  confidence_reason: "some prices are from a reference book",
  stages: [
    {
      stage: "foundation",
      stage_label: "Site & Foundation",
      quantities: [],
      materials: [
        {
          label: "Cement",
          unit: "bags",
          base_quantity: 100,
          wastage_percent: 5,
          final_quantity: 105,
          unit_price: 9500,
          total_cost: 997500,
          price_source: "NG book",
        },
      ],
      labour: [
        {
          label: "Blockwork labour",
          unit: "",
          quantity: 220,
          rate: 2500,
          total_cost: 550000,
        },
      ],
      materials_total: 997500,
      labour_total: 550000,
      stage_total: 1547500,
    },
  ],
  shopping_list: [],
  materials_total: 997500,
  labour_total: 550000,
  wastage_allowance: 47500,
  contingency: 79750,
  grand_total: 1674750,
  assumptions: ["Strip footing assumed at 600 mm depth."],
  limitations: ["Prices exclude haulage beyond 20 km."],
  missing_info: ["Soil test not supplied."],
  price_date: "2026-10-01",
  price_source: "NG book",
  price_age_days: 36,
  price_stale: true,
} as unknown as BuildToRoofResult;

describe("buildRoofCsvRows", () => {
  it("puts every material and labour task under the stage that produced it", () => {
    const rows = buildRoofCsvRows(result);
    const cement = rows.find((r) => r.item === "Cement");
    expect(cement?.stage).toBe("Site & Foundation");
    expect(cement?.quantity).toBe(105);
    // The base quantity stays visible next to the wastage, otherwise the
    // final figure cannot be rechecked.
    expect(cement?.note).toBe("5% wastage included, base 100");

    const labour = rows.find((r) => r.item === "Blockwork labour");
    expect(labour?.section).toBe("Labour");
    expect(labour?.unit).toBe("task");
    expect(labour?.line_total).toBe(550000);
  });

  it("closes with the totals, the price age and every stated caveat", () => {
    const rows = buildRoofCsvRows(result);
    const grand = rows.find((r) => r.item === "Grand total");
    expect(grand?.line_total).toBe(1674750);
    expect(grand?.note).toBe("moderate");

    const price = rows.find((r) => r.item === "Price date");
    expect(price?.note).toBe("2026-10-01 (36 days old), stale from NG book");

    expect(rows.some((r) => r.section === "Assumption")).toBe(true);
    expect(rows.some((r) => r.section === "Limitation")).toBe(true);
    expect(rows.some((r) => r.section === "Missing")).toBe(true);
  });
});
