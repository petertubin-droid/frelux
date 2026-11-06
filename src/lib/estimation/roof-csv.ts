/**
 * The build-to-roof estimate as flat rows for a spreadsheet.
 *
 * The page already prints a PDF quote, which is the document a client reads.
 * This is the same estimate in the form a contractor checks: one row per
 * material and per labour task, each carrying the stage it belongs to, so a
 * row can be traced back to the part of the build that produced it. The
 * summary totals, the price age and the stated assumptions close the file,
 * because a total without its price date cannot be defended.
 *
 * Kept out of the page so it can be tested without rendering a 3,700 line
 * component.
 */
import type { BuildToRoofResult } from "@/types/build-to-roof";

export interface RoofCsvRow extends Record<string, unknown> {
  section: string;
  stage: string;
  item: string;
  quantity: number | string;
  unit: string;
  unit_price: number | string;
  line_total: number | string;
  note: string;
}

export const ROOF_CSV_HEADERS = [
  { header: "Section", key: "section" },
  { header: "Stage", key: "stage" },
  { header: "Item", key: "item" },
  { header: "Quantity", key: "quantity" },
  { header: "Unit", key: "unit" },
  { header: "Unit price", key: "unit_price" },
  { header: "Line total", key: "line_total" },
  { header: "Note", key: "note" },
];

export function buildRoofCsvRows(result: BuildToRoofResult): RoofCsvRow[] {
  const rows: RoofCsvRow[] = [];

  for (const stage of result.stages) {
    for (const material of stage.materials) {
      rows.push({
        section: "Material",
        stage: stage.stage_label,
        item: material.label,
        quantity: material.final_quantity,
        unit: material.unit,
        unit_price: material.unit_price,
        line_total: material.total_cost,
        note:
          material.wastage_percent > 0
            ? `${material.wastage_percent}% wastage included, base ${material.base_quantity}`
            : material.price_source,
      });
    }
    for (const labour of stage.labour) {
      rows.push({
        section: "Labour",
        stage: stage.stage_label,
        item: labour.label,
        quantity: labour.quantity,
        unit: labour.unit || "task",
        unit_price: labour.rate,
        line_total: labour.total_cost,
        note: "",
      });
    }
  }

  const total = (item: string, value: number, note = ""): RoofCsvRow => ({
    section: "Total",
    stage: "",
    item,
    quantity: "",
    unit: "",
    unit_price: "",
    line_total: value,
    note,
  });

  rows.push(
    total("Materials", result.materials_total),
    total("Labour", result.labour_total),
    total("Wastage allowance", result.wastage_allowance),
    total("Contingency", result.contingency),
    total("Grand total", result.grand_total, result.confidence),
  );

  rows.push({
    section: "Price",
    stage: "",
    item: "Price date",
    quantity: "",
    unit: "",
    unit_price: "",
    line_total: "",
    note: `${result.price_date} (${result.price_age_days} days old)${result.price_stale ? ", stale" : ""} from ${result.price_source}`,
  });

  for (const assumption of result.assumptions) {
    rows.push({
      section: "Assumption",
      stage: "",
      item: assumption,
      quantity: "",
      unit: "",
      unit_price: "",
      line_total: "",
      note: "",
    });
  }
  for (const limitation of result.limitations) {
    rows.push({
      section: "Limitation",
      stage: "",
      item: limitation,
      quantity: "",
      unit: "",
      unit_price: "",
      line_total: "",
      note: "",
    });
  }
  for (const gap of result.missing_info) {
    rows.push({
      section: "Missing",
      stage: "",
      item: gap,
      quantity: "",
      unit: "",
      unit_price: "",
      line_total: "",
      note: "",
    });
  }

  return rows;
}
