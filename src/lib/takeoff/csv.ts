/**
 * Takeoff CSV export.
 *
 * A quantity that cannot be checked is not a takeoff, so the export carries the
 * evidence with the number: the formula, the key inputs and whether anything
 * was assumed. It opens in a spreadsheet as plain columns.
 */

import type { TakeoffResult } from "./types";

const escapeCell = (value: string | number | undefined): string => {
  const text = value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const TAKEOFF_CSV_HEADER = [
  "Scope",
  "Description",
  "Quantity",
  "Unit",
  "Net quantity",
  "Waste %",
  "Buy",
  "Buy unit",
  "Formula",
  "Assumed",
  "Sources",
] as const;

export function takeoffToCsv(result: TakeoffResult): string {
  const rows = result.lines.map((line) => [
    line.scope,
    line.description,
    line.quantity,
    line.unit,
    line.netQuantity,
    line.wastePct,
    line.purchaseQuantity ?? "",
    line.purchaseUnit ?? "",
    line.derivation.formula,
    line.assumed ? "assumed" : "measured",
    line.sources.join(" "),
  ]);

  const body = [TAKEOFF_CSV_HEADER, ...rows].map((row) =>
    row.map(escapeCell).join(","),
  );

  if (result.warnings.length) {
    body.push("");
    body.push("Warnings");
    for (const warning of result.warnings) body.push(escapeCell(warning));
  }

  return body.join("\n");
}
