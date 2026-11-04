// The pre-filled configuration of a catalog template, in the units the page
// will show.
//
// Why this exists: each template page carried a name, a one-line description
// and nothing else, so 40 templates read as 40 copies of the same page. The
// settings below are the template's real stored defaults (room dimensions,
// ceiling height, coats, openings, tile size, waste margin), which is exactly
// what differs between them.
//
// This mirrors templateSummaryForMarket() in src/lib/templates-global.ts:
//   - the same field order, labels and truthiness rules (a stored 0 is skipped,
//     not printed as "0 m");
//   - the same conversion, display-only: canonical metric input converted to
//     feet for the United States, rounded to 1 decimal there and 2 here. The
//     physical room does not change.
// src/lib/template-input-summary.test.ts compares the two for every catalog
// template in both unit systems, so they cannot drift.

const FEET_PER_METRE = 3.28084;

const DIM_FIELDS = [
  "length",
  "width",
  "wallHeight",
  "roomLength",
  "roomWidth",
  "wallWidth",
];

const roundForDisplay = (value, unit) =>
  unit === "feet" ? Math.round(value * 10) / 10 : Math.round(value * 100) / 100;

/** Display-only conversion of the canonical metric inputs. */
function convertForUnit(inputs, unit) {
  const out = { ...inputs };
  const storedUnit = inputs.unit === "feet" ? "feet" : "meters";
  if (storedUnit === unit) return out;
  for (const field of DIM_FIELDS) {
    const raw = out[field];
    if (typeof raw === "number" && Number.isFinite(raw) && raw !== 0) {
      const metres = storedUnit === "feet" ? raw / FEET_PER_METRE : raw;
      out[field] = roundForDisplay(
        unit === "feet" ? metres * FEET_PER_METRE : metres,
        unit,
      );
    }
  }
  return out;
}

/**
 * @param {{type: string, inputs: Record<string, unknown>}} template
 * @param {"meters" | "feet"} unit length unit the page displays
 * @returns {{label: string, value: string}[]}
 */
export function templateInputSummary(template, unit = "meters") {
  const d = convertForUnit(template?.inputs ?? {}, unit);
  const u = unit === "feet" ? "ft" : "m";
  const fmt = (value) =>
    typeof value === "number"
      ? String(roundForDisplay(value, unit))
      : String(value);
  const parts = [];
  const add = (label, value) => parts.push({ label, value });

  if (template.type === "paint") {
    if (d.length) add("Length", `${fmt(d.length)} ${u}`);
    if (d.width) add("Width", `${fmt(d.width)} ${u}`);
    if (d.wallHeight) add("Wall Height", `${fmt(d.wallHeight)} ${u}`);
    if (d.coats) add("Coats", String(d.coats));
    if (d.projectType) add("Project Type", String(d.projectType));
    if (d.includeCeiling) add("Ceiling", "Included");
    if (d.doors) add("Doors", String(d.doors));
    if (d.windows) add("Windows", String(d.windows));
    if (d.wasteMargin) add("Waste Margin", `${d.wasteMargin}%`);
  } else if (template.type === "tile") {
    if (d.length) add("Length", `${fmt(d.length)} ${u}`);
    if (d.width) add("Width", `${fmt(d.width)} ${u}`);
    if (d.tileWidthMm) add("Tile Size", `${d.tileWidthMm}x${d.tileHeightMm}mm`);
    if (d.method) add("Method", String(d.method));
    if (d.surfaceType) add("Surface", String(d.surfaceType));
    if (d.wasteMargin) add("Waste Margin", `${d.wasteMargin}%`);
  } else if (template.type === "screeding") {
    if (d.roomLength) add("Room Length", `${fmt(d.roomLength)} ${u}`);
    if (d.roomWidth) add("Room Width", `${fmt(d.roomWidth)} ${u}`);
    if (d.wallHeight) add("Wall Height", `${fmt(d.wallHeight)} ${u}`);
    if (d.doors) add("Doors", String(d.doors));
    if (d.windows) add("Windows", String(d.windows));
    if (d.wasteMargin) add("Waste Margin", `${d.wasteMargin}%`);
  } else if (template.type === "pop") {
    if (d.roomLength) add("Room Length", `${fmt(d.roomLength)} ${u}`);
    if (d.roomWidth) add("Room Width", `${fmt(d.roomWidth)} ${u}`);
    if (d.includeDecorative) add("Decorative", "Included");
    if (d.includeOptional) add("Optional Items", "Included");
    if (d.wasteMargin) add("Waste Margin", `${d.wasteMargin}%`);
  }

  return parts;
}

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Body HTML for the configuration table, or "" when the template has none. */
export function renderTemplateInputs(template, unit = "meters") {
  const items = templateInputSummary(template, unit);
  if (items.length === 0) return "";
  const rows = items
    .map(
      (item) =>
        `<tr><th scope="row">${escapeHtml(item.label)}</th><td>${escapeHtml(item.value)}</td></tr>`,
    )
    .join("");
  return (
    `<h2>What this template pre-fills</h2>` +
    `<table><caption>Template configuration in ${unit === "feet" ? "feet" : "metres"}</caption>` +
    `<thead><tr><th scope="col">Setting</th><th scope="col">Value</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>` +
    `<p>Stored defaults, not fixed sizes: every value can be changed before the estimate runs, and the calculator then works from your own measurements.</p>`
  );
}
