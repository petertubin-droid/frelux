/**
 * BIM/IFC Interop Engine (Future Engine 15)
 *
 * Parses architect-exported .ifc (STEP) files entirely client-side
 * and produces a material takeoff from the building elements and
 * QUANTITIES THE FILE ITSELF DECLARES. No external AI, no server
 * round-trip (works offline), and no invented data:
 *
 *  - Element counts come from the entities the file contains.
 *  - Areas / volumes / lengths come only from authored quantities
 *    (IfcQuantityArea/Volume/Length/Count/Weight) that the file
 *    attaches to elements via IfcElementQuantity. If the file
 *    declares none, only counts are reported with an honest
 *    warning - never an estimated area.
 *  - A file that is not valid IFC/STEP is refused, not guessed at.
 *  - A file larger than the admin-configured entity cap is refused
 *    with an honest error instead of freezing the tab.
 *  - IFC quantities are per the IFC standard in SI units (m², m³,
 *    m, kg) - reported as such, never converted silently.
 */

// ============================================================
// Types
// ============================================================

export interface IfcQuantityRuleInput {
  rule_key: string;
  rule_value: Record<string, unknown>;
}

export interface IfcParseInput {
  /** Raw file text (a STEP .ifc file). */
  file_text: string;
  /** File name, only for honest error messages. */
  file_name?: string;
  /** Admin rules for calculator_type 'bim_ifc'. */
  rules: IfcQuantityRuleInput[];
}

export interface IfcElementSummary {
  type: string;
  count: number;
  /** Total per quantity name the file declares, e.g. GrossSideArea: 123.4 */
  quantity_totals: Record<
    string,
    { unit: string; total: number; elements: number }
  >;
}

export interface IfcParseResult {
  ok: boolean;
  /** Total STEP entities parsed. */
  entity_count: number;
  /** Construction elements found, grouped by IFC type. */
  elements: IfcElementSummary[];
  /** Distinct quantity names seen (for the honest 'no quantities' case). */
  has_quantities: boolean;
  /** STEP lines that could not be tokenized (reported, never hidden). */
  unparsed_lines: number;
  warnings: string[];
  steps: { label: string; detail: string }[];
}

// ============================================================
// Element types the takeoff reports (deterministic fixed list)
// ============================================================

const TARGET_ELEMENT_TYPES = new Set([
  "IFCWALL",
  "IFCWALLSTANDARDCASE",
  "IFCSLAB",
  "IFCROOF",
  "IFCCOLUMN",
  "IFCBEAM",
  "IFCDOOR",
  "IFCWINDOW",
  "IFCSTAIR",
  "IFCSTAIRFLIGHT",
  "IFCCURTAINWALL",
  "IFCPLATE",
  "IFCMEMBER",
  "IFCFOOTING",
  "IFCPILE",
  "IFCRAILING",
  "IFCCOVERING",
  "IFCCHIMNEY",
]);

const QUANTITY_TYPE_UNITS: Record<string, string> = {
  IFCQUANTITYAREA: "m²",
  IFCQUANTITYVOLUME: "m³",
  IFCQUANTITYLENGTH: "m",
  IFCQUANTITYCOUNT: "count",
  IFCQUANTITYWEIGHT: "kg",
  IFCQUANTITYTIME: "s",
};

// ============================================================
// STEP tokenizer (handles quoted strings with embedded commas)
// ============================================================

interface StepEntity {
  type: string;
  args: string[];
}

/** Splits a STEP argument list on top-level commas, respecting quotes. */
function splitStepArgs(raw: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inString = false;
  let current = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      current += ch;
      if (ch === "'") {
        // STEP escapes quotes by doubling
        if (raw[i + 1] === "'") {
          current += "'";
          i++;
        } else {
          inString = false;
        }
      }
      continue;
    }
    if (ch === "'") {
      inString = true;
      current += ch;
      continue;
    }
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim().length > 0) out.push(current.trim());
  return out;
}

/** Parses a full STEP file into id -> entity. Returns null for unusable lines. */
function parseStepEntities(fileText: string): {
  entities: Map<string, StepEntity>;
  unparsed: number;
} {
  const entities = new Map<string, StepEntity>();
  let unparsed = 0;
  const lineRe = /#(\d+)\s*=\s*([A-Za-z0-9_]+)\s*\(([\s\S]*?)\)\s*;/g;
  let match: RegExpExecArray | null;
  while ((match = lineRe.exec(fileText)) !== null) {
    const [, id, type, rawArgs] = match;
    try {
      entities.set(id, {
        type: type.toUpperCase(),
        args: splitStepArgs(rawArgs),
      });
    } catch {
      unparsed++;
    }
  }
  // Any line that LOOKS like an entity but did not match the regex counts
  // as unparsed so it is never silently dropped.
  const candidateRe = /^\s*#\d+\s*=/gm;
  let candidates = 0;
  while (candidateRe.exec(fileText) !== null) candidates++;
  unparsed += Math.max(0, candidates - entities.size);
  return { entities, unparsed };
}

// ============================================================
// Quantity extraction
// ============================================================

/** Extracts the numeric value from a quantity entity's arguments. */
function quantityValue(entity: StepEntity): number | null {
  // IfcQuantityX('Name', 'Description'?, Unit?, Value, ...) - the value is
  // the first purely numeric argument after the name.
  for (let i = 1; i < entity.args.length; i++) {
    const a = entity.args[i];
    if (a === "$" || a === "*") continue;
    if (/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(a)) {
      const v = Number(a);
      return Number.isFinite(v) ? v : null;
    }
    // a numeric inside a parenthesised unit selection means we passed the
    // value already - treat as absent
    if (a.startsWith("(")) break;
    if (a.startsWith("'")) continue; // another string label before the value
    break;
  }
  return null;
}

/** Element Name per IfcRoot: GlobalId, OwnerHistory, Name, Description… */
function elementName(entity: StepEntity): string | null {
  const nameArg = entity.args[2];
  if (
    typeof nameArg === "string" &&
    nameArg.startsWith("'") &&
    nameArg !== "$"
  ) {
    return nameArg.replace(/^'|'$/g, "").replace(/''/g, "'");
  }
  return null;
}

function getRuleValue(
  rules: IfcQuantityRuleInput[],
  key: string,
  fallback: number,
): number {
  const r = rules.find((x) => x.rule_key === key);
  if (
    r &&
    typeof r.rule_value === "object" &&
    r.rule_value !== null &&
    "value" in r.rule_value
  ) {
    const v = (r.rule_value as { value: unknown }).value;
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  }
  return fallback;
}

// ============================================================
// Main parse
// ============================================================

export function parseIfcTakeoff(input: IfcParseInput): IfcParseResult {
  const warnings: string[] = [];
  const steps: { label: string; detail: string }[] = [];
  const decimals = getRuleValue(input.rules, "rounding_decimals", 2);
  const maxEntities = getRuleValue(
    input.rules,
    "max_entities_per_file",
    250000,
  );

  const fileText = input.file_text ?? "";

  // ---- validity gate: IFC/STEP files carry a FILE_SCHEMA header ----
  if (!fileText.includes("ISO-10303-21") && !fileText.includes("FILE_SCHEMA")) {
    return {
      ok: false,
      entity_count: 0,
      elements: [],
      has_quantities: false,
      unparsed_lines: 0,
      warnings: [
        `${input.file_name ?? "The uploaded file"} is not a valid IFC/STEP file (no ISO-10303-21 header or FILE_SCHEMA). The takeoff is refused rather than guessed at.`,
      ],
      steps: [],
    };
  }

  const { entities, unparsed } = parseStepEntities(fileText);
  steps.push({
    label: "File read",
    detail: `${entities.size} STEP entities parsed${unparsed > 0 ? `, ${unparsed} line(s) could not be tokenized and are reported below` : ""}.`,
  });

  if (entities.size > maxEntities) {
    return {
      ok: false,
      entity_count: entities.size,
      elements: [],
      has_quantities: false,
      unparsed_lines: unparsed,
      warnings: [
        `The file contains ${entities.size.toLocaleString("en-NG")} entities, above the configured cap of ${maxEntities.toLocaleString("en-NG")} (admin rule max_entities_per_file). It is refused with an honest error instead of freezing your browser.`,
      ],
      steps,
    };
  }

  // ---- index quantity entities and their property-set relations ----
  const quantities = new Map<
    string,
    { name: string; type: string; value: number }
  >();
  for (const [id, ent] of entities) {
    if (ent.type in QUANTITY_TYPE_UNITS) {
      const qName =
        ent.args[0]?.replace(/^'|'$/g, "").replace(/''/g, "'") ?? "";
      const value = quantityValue(ent);
      if (value !== null) {
        quantities.set(id, { name: qName, type: ent.type, value });
      }
    }
  }

  // ---- map property definitions -> elements (IfcRelDefinesByProperties) ----
  // IFCRELDEFINESBYPROPERTIES(GlobalId, OwnerHistory, Name, Description, RelatedObjects, RelatingPropertyDefinition)
  const propDefToElements = new Map<string, Set<string>>();
  for (const [, ent] of entities) {
    if (
      ent.type !== "IFCRELDEFINESBYPROPERTIES" &&
      ent.type !== "IFCRELDEFINESBYTYPE"
    )
      continue;
    if (ent.type === "IFCRELDEFINESBYTYPE") continue;
    // RelatedObjects is normally a parenthesised list of refs, and
    // RelatingPropertyDefinition a single ref - but their positions vary
    // between exports, so they are identified by SHAPE, never by index.
    const listArg = ent.args.find((a) => a.startsWith("(") && a.includes("#"));
    const singleRefs = ent.args.filter((a) => /^#\d+$/.test(a.trim()));
    if (!listArg && singleRefs.length < 2) continue;
    // the relation target is the LAST bare #ref (singleRefs may also hold
    // OwnerHistory); the object list is the parenthesised ref list
    const defId = (listArg ? singleRefs[singleRefs.length - 1] : singleRefs[0])
      .replace("#", "")
      .trim();
    if (!defId) continue;
    const refs: string[] = listArg
      ? (listArg.match(/#\d+/g)?.map((r) => r.replace("#", "")) ?? [])
      : singleRefs.slice(0, -1).map((r) => r.replace("#", ""));
    let set = propDefToElements.get(defId);
    if (!set) {
      set = new Set();
      propDefToElements.set(defId, set);
    }
    for (const r of refs) set.add(r.replace("#", ""));
  }

  // elementQuantity definition -> list of quantity ids
  // IFCELEMENTQUANTITY(GlobalId, OwnerHistory, Name, Description, MethodOfMeasurement, Quantities)
  const elementQuantityToQuantities = new Map<string, string[]>();
  for (const [id, ent] of entities) {
    if (ent.type !== "IFCELEMENTQUANTITY") continue;
    // Quantities is a parenthesised list of refs; found by SHAPE not index
    const qListRaw =
      ent.args.find((a) => a.startsWith("(") && a.includes("#")) ?? "";
    const qRefs = qListRaw.match(/#\d+/g) ?? [];
    if (qRefs.length > 0) {
      elementQuantityToQuantities.set(
        id,
        qRefs.map((r) => r.replace("#", "")),
      );
    }
  }

  // ---- group target elements with their quantities ----
  const byType = new Map<
    string,
    Map<
      string,
      {
        count: number;
        quantities: { name: string; unit: string; value: number }[];
      }
    >
  >();
  let targetCount = 0;

  for (const [id, ent] of entities) {
    if (!TARGET_ELEMENT_TYPES.has(ent.type)) continue;
    targetCount++;
    const typeMap = byType.get(ent.type) ?? new Map();
    if (!byType.has(ent.type)) byType.set(ent.type, typeMap);

    // find quantity sets attached to THIS element through any relation
    const elementQuantities: { name: string; unit: string; value: number }[] =
      [];
    for (const [defId, elements] of propDefToElements) {
      if (!elements.has(id)) continue;
      const qIds = elementQuantityToQuantities.get(defId);
      if (!qIds) continue;
      for (const qId of qIds) {
        const q = quantities.get(qId);
        if (!q) continue;
        elementQuantities.push({
          name: q.name,
          unit: QUANTITY_TYPE_UNITS[q.type] ?? "",
          value: q.value,
        });
      }
    }

    // group key: element name if the file names it, else one pooled group
    const name = elementName(ent);
    const key = name ?? "(unnamed)";
    const entry = typeMap.get(key) ?? { count: 0, quantities: [] };
    entry.count += 1;
    entry.quantities.push(...elementQuantities);
    typeMap.set(key, entry);
  }

  // ---- summarise per IFC type ----
  const elements: IfcElementSummary[] = [];
  let hasQuantities = false;
  for (const [type, namedMap] of byType) {
    let count = 0;
    const totals: Record<
      string,
      { unit: string; total: number; elements: number }
    > = {};
    const seenElementsWith = new Map<string, Set<string>>();
    for (const [name, entry] of namedMap) {
      count += entry.count;
      for (const q of entry.quantities) {
        hasQuantities = true;
        const t = totals[q.name] ?? { unit: q.unit, total: 0, elements: 0 };
        t.total += q.value;
        if (!seenElementsWith.has(q.name))
          seenElementsWith.set(q.name, new Set());
        if (!seenElementsWith.get(q.name)!.has(name)) {
          seenElementsWith.get(q.name)!.add(name);
          t.elements += entry.count;
        }
        totals[q.name] = t;
      }
    }
    const roundedTotals: Record<
      string,
      { unit: string; total: number; elements: number }
    > = {};
    for (const [qName, t] of Object.entries(totals)) {
      roundedTotals[qName] = {
        unit: t.unit,
        total: Number(t.total.toFixed(decimals)),
        elements: t.elements,
      };
    }
    elements.push({ type, count, quantity_totals: roundedTotals });
  }
  elements.sort((a, b) => b.count - a.count);

  steps.push({
    label: "Elements found",
    detail: `${targetCount} construction elements across ${elements.length} IFC type(s): ${elements.map((e) => `${e.type} ×${e.count}`).join(", ") || "none"}.`,
  });
  steps.push({
    label: "Authored quantities",
    detail: hasQuantities
      ? "Areas, volumes, lengths and weights are taken ONLY from the quantities the file itself attaches to these elements (IFC standard SI units: m², m³, m, kg)."
      : "This file declares NO quantities for its elements: only element counts are reported. No area or volume is invented.",
  });

  if (!hasQuantities && elements.length > 0) {
    warnings.push(
      "No quantities are declared in this file for the listed elements, so only counts are reported. Ask the architect to export with Base Quantities enabled for a full takeoff: nothing is guessed.",
    );
  }
  if (unparsed > 0) {
    warnings.push(
      `${unparsed} STEP line(s) could not be parsed and are excluded from this takeoff. Nothing is estimated on their behalf.`,
    );
  }
  if (elements.length === 0) {
    warnings.push(
      "No construction elements (walls, slabs, doors, windows, roofs, etc.) were found in this file. Nothing is reported rather than assumed.",
    );
  }

  return {
    ok: elements.length > 0,
    entity_count: entities.size,
    elements,
    has_quantities: hasQuantities,
    unparsed_lines: unparsed,
    warnings,
    steps,
  };
}
