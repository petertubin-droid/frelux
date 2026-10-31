/**
 * Calculator -> BOQ import.
 *
 * The rule that shapes this module: a BOQ line is only trustworthy if its
 * quantity came from a calculator that already validated it. So an import
 * copies recorded quantities and units verbatim and never re-derives them.
 * Rates are not invented either: a source that recorded no rate leaves the line
 * unpriced, and the compiler reports that on export.
 */

import type { BoqStudioItem, BoqStudioSection } from "./types";

/** The calculators a BOQ user expects to pull from, with their aliases. */
export const CALCULATOR_SECTIONS: Record<
  string,
  { label: string; aliases: string[]; section: { code: string; title: string } }
> = {
  foundation: {
    label: "Foundation Calculator",
    aliases: ["foundation-calculator", "foundation-estimator"],
    section: { code: "04", title: "Foundation" },
  },
  concrete: {
    label: "Concrete Calculator",
    aliases: ["concrete-calculator", "concrete-takeoff", "cost-estimator"],
    section: { code: "05", title: "Concrete Works" },
  },
  screeding: {
    label: "Screeding Calculator",
    aliases: ["screeding-calculator", "screeding-cost-estimator"],
    section: { code: "13", title: "Screeding" },
  },
  tiles: {
    label: "Tile Calculator",
    aliases: ["tile-calculator", "tile-cost-estimator", "flooring-estimator"],
    section: { code: "14", title: "Flooring" },
  },
  paint: {
    label: "Paint Calculator",
    aliases: ["paint-calculator", "painting-estimator", "paint-estimator"],
    section: { code: "16", title: "Painting" },
  },
  pop_ceiling: {
    label: "POP Ceiling Calculator",
    aliases: ["pop-ceiling-calculator", "pop-ceiling-cost-estimator"],
    section: { code: "15", title: "Ceiling Works" },
  },
  roofing: {
    label: "Roofing Calculator",
    aliases: ["roofing-calculator", "roof-estimator", "roofing-estimator"],
    section: { code: "08", title: "Roofing" },
  },
  structural: {
    label: "Structural Calculator",
    aliases: [
      "structural-calculator",
      "beam-design-calculator",
      "column-design-calculator",
      "slab-design-calculator",
    ],
    section: { code: "05", title: "Concrete Works" },
  },
  electrical: {
    label: "Electrical Estimator",
    aliases: ["electrical-estimator", "electrical-calculator"],
    section: { code: "10", title: "Electrical Installations" },
  },
  plumbing: {
    label: "Plumbing Estimator",
    aliases: ["plumbing-estimator", "plumbing-calculator"],
    section: { code: "11", title: "Plumbing Installations" },
  },
  build_to_roof: {
    label: "Build-to-Roof Estimator",
    aliases: ["build-to-roof-estimator", "btr-estimator"],
    section: { code: "05", title: "Concrete Works" },
  },
};

/** Keyword routing inside multi-trade imports such as Build-to-Roof. */
const KEYWORD_SECTIONS: Array<{ test: RegExp; code: string; title: string }> = [
  {
    test: /reinforc|rebar|mesh|brc|steel\s*bar|y\d{2}/i,
    code: "06",
    title: "Reinforcement",
  },
  {
    test: /cement|sand|granite|gravel|aggregate|hardcore|concrete|blinding/i,
    code: "05",
    title: "Concrete Works",
  },
  { test: /block|brick|masonry|mortar/i, code: "07", title: "Blockwork" },
  {
    test: /excavat|earthwork|filling|backfill|soil/i,
    code: "03",
    title: "Earthworks",
  },
  {
    test: /foundation|footing|pad|raft|pile/i,
    code: "04",
    title: "Foundation",
  },
  {
    test: /roof|truss|purlin|sheet|shingle|aluminium/i,
    code: "08",
    title: "Roofing",
  },
  {
    test: /door|window|frame|ironmongery|lock|handle/i,
    code: "09",
    title: "Doors and Windows",
  },
  {
    test: /cable|conduit|wire|socket|switch|db\b|distribution|light fitting|luminaire/i,
    code: "10",
    title: "Electrical Installations",
  },
  {
    test: /pipe|pvc|plumb|tap|valve|sink|wc\b|sanitary|drain/i,
    code: "11",
    title: "Plumbing Installations",
  },
  { test: /plaster|render|bonding/i, code: "12", title: "Plastering" },
  { test: /screed|screeding|putty|skim/i, code: "13", title: "Screeding" },
  {
    test: /tile|tiling|floor|marble|porcelain|terrazzo/i,
    code: "14",
    title: "Flooring",
  },
  {
    test: /ceiling|pop\b|gypsum|board|suspended/i,
    code: "15",
    title: "Ceiling Works",
  },
  {
    test: /paint|emulsion|gloss|primer|texture|tyrolene/i,
    code: "16",
    title: "Painting",
  },
  {
    test: /fenc|gate|paving|interlock|kerb|landscap|external/i,
    code: "18",
    title: "External Works",
  },
  { test: /labour|labourer|workmanship/i, code: "17", title: "Finishing" },
];

export interface RawSourceRecord {
  source_table:
    "project_calculations" | "estimation_estimates" | "advanced_estimates";
  ref: string;
  calculator_slug: string;
  calculator_type?: string | null;
  title: string;
  created_at: string;
  currency?: string | null;
  /** The recorded quantity payload, exactly as the calculator stored it. */
  materials?: unknown;
  calculated_quantities?: unknown;
  estimate_data?: unknown;
  project_id?: string | null;
}

export interface ImportedLine {
  description: string;
  unit: string;
  quantity: number;
  section: { code: string; title: string };
  /** Rate carried over from the source when it recorded one, otherwise null. */
  material_rate: number | null;
  source: {
    calculator: string;
    ref: string;
    label: string;
    imported_at: string;
  };
}

export interface ImportPreview {
  record: RawSourceRecord;
  calculator_key: string | null;
  calculator_label: string;
  lines: ImportedLine[];
  warnings: string[];
}

function resolveCalculator(
  record: RawSourceRecord,
): { key: string; entry: (typeof CALCULATOR_SECTIONS)[string] } | null {
  const slugs = [record.calculator_slug, record.calculator_type ?? ""].filter(
    Boolean,
  );
  for (const [key, entry] of Object.entries(CALCULATOR_SECTIONS)) {
    if (slugs.some((s) => entry.aliases.includes(s))) return { key, entry };
  }
  return null;
}

function sectionFor(name: string, fallback: { code: string; title: string }) {
  const hit = KEYWORD_SECTIONS.find((k) => k.test.test(name));
  return hit ? { code: hit.code, title: hit.title } : fallback;
}

interface QuantityRow {
  name: string;
  unit: string;
  quantity: number;
  rate?: number | null;
}

/** Reads whatever shape the calculator saved, without inventing entries. */
function extractRows(payload: unknown): QuantityRow[] {
  if (!payload) return [];
  const rows: QuantityRow[] = [];

  const pushObject = (obj: Record<string, unknown>, keyHint?: string) => {
    const name = String(
      obj.name ??
        obj.material ??
        obj.label ??
        obj.description ??
        obj.item ??
        keyHint ??
        "",
    ).trim();
    const quantity = Number(obj.quantity ?? obj.qty ?? obj.value ?? obj.amount);
    if (!name || !Number.isFinite(quantity) || quantity === 0) return;
    const rateRaw = obj.rate ?? obj.unit_price ?? obj.price ?? obj.unit_cost;
    const rate = Number(rateRaw);
    rows.push({
      name,
      unit: String(obj.unit ?? obj.uom ?? "nr"),
      quantity,
      rate: Number.isFinite(rate) ? rate : null,
    });
  };

  const walk = (node: unknown, keyHint?: string) => {
    if (Array.isArray(node)) {
      node.forEach((n) => walk(n));
      return;
    }
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      const keys = Object.keys(obj);
      const looksLikeRow =
        keys.some((k) => ["name", "material", "label", "item"].includes(k)) &&
        keys.some((k) => ["quantity", "qty", "value"].includes(k));
      if (looksLikeRow) {
        pushObject(obj, keyHint);
        return;
      }
      keys.forEach((k) => walk(obj[k], k));
      return;
    }
    if (
      typeof node === "number" &&
      keyHint &&
      Number.isFinite(node) &&
      node !== 0
    ) {
      rows.push({
        name: keyHint.replace(/_/g, " "),
        unit: "nr",
        quantity: node,
        rate: null,
      });
    }
  };

  walk(payload);
  return rows;
}

export function previewImport(record: RawSourceRecord): ImportPreview {
  const resolved = resolveCalculator(record);
  const warnings: string[] = [];
  const fallbackSection = resolved?.entry.section ?? {
    code: "18",
    title: "External Works",
  };

  const payload =
    record.materials ??
    record.calculated_quantities ??
    record.estimate_data ??
    null;

  const rawRows = extractRows(payload);
  const lines: ImportedLine[] = rawRows
    .filter((r) => Number.isFinite(r.quantity) && r.quantity !== 0)
    .map((r) => ({
      description: r.name,
      unit: r.unit || "nr",
      quantity: r.quantity,
      section: sectionFor(r.name, fallbackSection),
      material_rate: r.rate ?? null,
      source: {
        calculator: resolved?.key ?? record.calculator_slug,
        ref: record.ref,
        label: record.title,
        imported_at: new Date().toISOString(),
      },
    }));

  if (!resolved) {
    warnings.push(
      `"${record.calculator_slug}" is not one of the supported calculators; its lines are imported as recorded and sectioned by description.`,
    );
  }
  if (lines.length === 0) {
    warnings.push(
      "This saved calculation recorded no itemised quantities, so there is nothing to import.",
    );
  }
  if (lines.some((l) => l.material_rate === null)) {
    warnings.push(
      "Some lines carry a quantity but no recorded rate; they will import unpriced for you to rate.",
    );
  }

  return {
    record,
    calculator_key: resolved?.key ?? null,
    calculator_label: resolved?.entry.label ?? record.calculator_slug,
    lines,
    warnings,
  };
}

export function makeItemId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `item-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function sectionId(code: string, title: string): string {
  return `sec-${code}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/**
 * Folds imported lines into the document's sections. Existing sections are
 * reused by code, and a line that is already present (same description, unit and
 * quantity from the same source) is skipped instead of duplicated.
 */
export function mergeImportedLines(
  sections: BoqStudioSection[],
  lines: ImportedLine[],
): { sections: BoqStudioSection[]; added: number; skipped: number } {
  const next = sections.map((s) => ({ ...s, items: [...s.items] }));
  let added = 0;
  let skipped = 0;

  for (const line of lines) {
    const existingSection = next.find((s) => s.code === line.section.code);
    const duplicate = next.some((s) =>
      s.items.some(
        (i) =>
          i.description.trim().toLowerCase() ===
            line.description.trim().toLowerCase() &&
          i.unit === line.unit &&
          Math.abs(i.quantity - line.quantity) < 0.0001 &&
          i.source?.ref === line.source.ref,
      ),
    );
    if (duplicate) {
      skipped += 1;
      continue;
    }

    const item: BoqStudioItem = {
      id: makeItemId(),
      item_number: "",
      description: line.description,
      specification: "",
      unit: line.unit,
      quantity: line.quantity,
      material_rate: line.material_rate ?? 0,
      labour_rate: 0,
      plant_rate: 0,
      notes:
        line.material_rate === null
          ? "Rate to be added: the source recorded quantity only."
          : "",
      rates_include_waste: false,
      source: line.source,
    };

    const bucket = existingSection ?? {
      id: sectionId(line.section.code, line.section.title),
      code: line.section.code,
      title: line.section.title,
      notes: "",
      items: [] as BoqStudioItem[],
    };
    if (!existingSection) next.push(bucket);
    bucket.items.push(item);
    added += 1;
  }

  next.sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true }),
  );
  return { sections: next, added, skipped };
}
