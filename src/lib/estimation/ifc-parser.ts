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
 *  - IFC quantities use the project's assigned units unless the
 *    quantity supplies a local unit. Supported SI and conversion-based
 *    units are normalized to m²/m³/m/kg/s; unresolved units remain raw
 *    and are explicitly labelled rather than guessed to be SI.
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

const QUANTITY_UNIT_TYPES: Record<string, string> = {
  IFCQUANTITYAREA: "AREAUNIT",
  IFCQUANTITYVOLUME: "VOLUMEUNIT",
  IFCQUANTITYLENGTH: "LENGTHUNIT",
  IFCQUANTITYWEIGHT: "MASSUNIT",
  IFCQUANTITYTIME: "TIMEUNIT",
};

const CANONICAL_UNIT_LABELS: Record<string, string> = {
  AREAUNIT: "m²",
  VOLUMEUNIT: "m³",
  LENGTHUNIT: "m",
  MASSUNIT: "kg",
  TIMEUNIT: "s",
};

const SI_PREFIX_FACTORS: Record<string, number> = {
  EXA: 1e18, PETA: 1e15, TERA: 1e12, GIGA: 1e9, MEGA: 1e6,
  KILO: 1e3, HECTO: 1e2, DECA: 1e1, DECI: 1e-1, CENTI: 1e-2,
  MILLI: 1e-3, MICRO: 1e-6, NANO: 1e-9, PICO: 1e-12,
  FEMTO: 1e-15, ATTO: 1e-18,
};

interface ResolvedIfcUnit {
  unitType: string;
  factorToCanonical: number;
  label: string;
}

function enumValue(value: string | undefined): string {
  return (value ?? "").replace(/^\.|\.$/g, "").toUpperCase();
}

function numericStepValue(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

/** Resolves only explicitly declared units. Unknown or custom units stay raw. */
function resolveIfcUnits(
  entities: Map<string, StepEntity>,
): { global: Map<string, ResolvedIfcUnit>; byId: Map<string, ResolvedIfcUnit> } {
  const cache = new Map<string, ResolvedIfcUnit>();
  const resolving = new Set<string>();
  const resolve = (id: string): ResolvedIfcUnit | null => {
    const cached = cache.get(id);
    if (cached) return cached;
    if (resolving.has(id)) return null;
    const entity = entities.get(id);
    if (!entity) return null;
    resolving.add(id);
    let unit: ResolvedIfcUnit | null = null;
    if (entity.type === "IFCSIUNIT") {
      const unitType = enumValue(entity.args[1]);
      const prefixValue = enumValue(entity.args[2]);
      const prefix = prefixValue === "$" ? "" : prefixValue;
      const name = enumValue(entity.args[3]);
      const prefixFactor = prefix ? SI_PREFIX_FACTORS[prefix] : 1;
      if (prefixFactor && unitType === "LENGTHUNIT" && name === "METRE") {
        unit = { unitType, factorToCanonical: prefixFactor, label: "m" };
      } else if (prefixFactor && unitType === "AREAUNIT" && name === "SQUARE_METRE") {
        unit = { unitType, factorToCanonical: prefixFactor ** 2, label: "m²" };
      } else if (prefixFactor && unitType === "VOLUMEUNIT" && name === "CUBIC_METRE") {
        unit = { unitType, factorToCanonical: prefixFactor ** 3, label: "m³" };
      } else if (prefixFactor && unitType === "MASSUNIT" && name === "GRAM") {
        unit = { unitType, factorToCanonical: prefixFactor / 1000, label: "kg" };
      } else if (prefixFactor && unitType === "MASSUNIT" && name === "KILOGRAM") {
        unit = { unitType, factorToCanonical: prefixFactor, label: "kg" };
      } else if (prefixFactor && unitType === "TIMEUNIT" && name === "SECOND") {
        unit = { unitType, factorToCanonical: prefixFactor, label: "s" };
      }
    } else if (entity.type === "IFCCONVERSIONBASEDUNIT") {
      const unitType = enumValue(entity.args[1]);
      const conversionId = entity.args[3]?.match(/^#(\d+)$/)?.[1];
      const conversion = conversionId ? entities.get(conversionId) : undefined;
      const measure = conversion?.type === "IFCMEASUREWITHUNIT" ? conversion : undefined;
      const numericFactor = numericStepValue(measure?.args[0]);
      const baseUnitId = measure?.args[1]?.match(/^#(\d+)$/)?.[1];
      const baseUnit = baseUnitId ? resolve(baseUnitId) : null;
      const factorToCanonical =
        numericFactor !== null && baseUnit
          ? numericFactor * baseUnit.factorToCanonical
          : Number.NaN;
      if (
        numericFactor !== null && numericFactor > 0 &&
        Number.isFinite(factorToCanonical) && baseUnit &&
        baseUnit.unitType === unitType &&
        (unitType === "LENGTHUNIT" || unitType === "AREAUNIT" ||
          unitType === "VOLUMEUNIT" || unitType === "MASSUNIT" || unitType === "TIMEUNIT")
      ) {
        unit = {
          unitType,
          factorToCanonical,
          label: CANONICAL_UNIT_LABELS[unitType],
        };
      }
    }
    resolving.delete(id);
    if (unit) cache.set(id, unit);
    return unit;
  };

  for (const [id, entity] of entities) {
    if (entity.type === "IFCSIUNIT" || entity.type === "IFCCONVERSIONBASEDUNIT") {
      resolve(id);
    }
  }

  const globalUnits = new Map<string, ResolvedIfcUnit>();
  let assignmentId: string | null = null;
  for (const entity of entities.values()) {
    if (entity.type !== "IFCPROJECT") continue;
    for (const arg of entity.args) {
      const ref = arg.match(/^#(\d+)$/)?.[1];
      if (ref && entities.get(ref)?.type === "IFCUNITASSIGNMENT") assignmentId = ref;
    }
  }
  const assignment = assignmentId ? entities.get(assignmentId) : undefined;
  const unitRefs = assignment?.args.join(",").match(/#\d+/g) ?? [];
  for (const ref of unitRefs) {
    const id = ref.slice(1);
    const entity = entities.get(id);
    const resolved = resolve(id);
    if (entity?.type === "IFCSIUNIT" && resolved) {
      globalUnits.set(enumValue(entity.args[1]), resolved);
    } else if (entity?.type === "IFCCONVERSIONBASEDUNIT" && resolved) {
      globalUnits.set(enumValue(entity.args[1]), resolved);
    }
  }

  return { global: globalUnits, byId: cache };
}

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
  const startRe = /#(\d+)\s*=\s*([A-Za-z0-9_]+)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = startRe.exec(fileText)) !== null) {
    const [, id, type] = match;
    const openParen = startRe.lastIndex - 1;
    let depth = 1;
    let inString = false;
    let end = openParen + 1;
    for (; end < fileText.length; end++) {
      const char = fileText[end];
      if (inString) {
        if (char === "'") {
          if (fileText[end + 1] === "'") end++;
          else inString = false;
        }
        continue;
      }
      if (char === "'") {
        inString = true;
      } else if (char === "(") {
        depth++;
      } else if (char === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0 || fileText.slice(end + 1).match(/^\s*;/) === null) {
      unparsed++;
      continue;
    }
    try {
      entities.set(id, {
        type: type.toUpperCase(),
        args: splitStepArgs(fileText.slice(openParen + 1, end)),
      });
    } catch {
      unparsed++;
    }
    startRe.lastIndex = end + 1 + (fileText.slice(end + 1).match(/^\s*/)?.[0].length ?? 0) + 1;
  }
  return { entities, unparsed };
}

// ============================================================
// Quantity extraction
// ============================================================

/** Extracts the numeric value from a quantity entity's arguments. */
function quantityValue(entity: StepEntity): number | null {
  // IfcQuantityX stores its measurement in argument 4 (index 3). Looking
  // there first is essential when argument 3 carries a local unit reference.
  const declaredValue = entity.args[3];
  const numericPattern = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/;
  if (declaredValue && numericPattern.test(declaredValue)) {
    const value = Number(declaredValue);
    if (Number.isFinite(value)) return value;
  }
  // Tolerate vendor variants only when the numeric value is still explicit.
  for (let i = 1; i < entity.args.length; i++) {
    const a = entity.args[i];
    if (a === "$" || a === "*") continue;
    if (numericPattern.test(a)) {
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
  const resolvedUnits = resolveIfcUnits(entities);
  const quantities = new Map<
    string,
    { name: string; type: string; value: number; unit: string; factor: number | null }
  >();
  let unresolvedUnitCount = 0;
  for (const [id, ent] of entities) {
    if (ent.type.startsWith("IFCQUANTITY")) {
      const qName =
        ent.args[0]?.replace(/^'|'$/g, "").replace(/''/g, "'") ?? "";
      const value = quantityValue(ent);
      if (value === null) continue;
      if (ent.type === "IFCQUANTITYCOUNT") {
        quantities.set(id, { name: qName, type: ent.type, value, unit: "count", factor: 1 });
        continue;
      }
      const unitType = QUANTITY_UNIT_TYPES[ent.type];
      if (!unitType) continue;
      const localUnitArg = ent.args[2]?.trim();
      const hasLocalUnitReference = Boolean(
        localUnitArg && localUnitArg !== "$" && localUnitArg !== "*",
      );
      const localUnitId = localUnitArg?.match(/^#(\d+)$/)?.[1];
      const localUnit = localUnitId
        ? resolvedUnits.byId.get(localUnitId)
        : null;
      const globalUnit = resolvedUnits.global.get(unitType) ?? null;
      const resolvedUnit = hasLocalUnitReference
        ? localUnit?.unitType === unitType ? localUnit : null
        : globalUnit;
      const convertedValue = resolvedUnit
        ? value * resolvedUnit.factorToCanonical
        : value;
      const safeUnit = Number.isFinite(convertedValue) ? resolvedUnit : null;
      if (!safeUnit) unresolvedUnitCount++;
      quantities.set(id, {
        name: qName,
        type: ent.type,
        value,
        unit: safeUnit?.label ?? "unit unresolved (raw IFC value)",
        factor: safeUnit?.factorToCanonical ?? null,
      });
    }
  }
  if (unresolvedUnitCount > 0) {
    warnings.push(
      `${unresolvedUnitCount} declared measurement(s) have no supported explicit local or project unit. Their values remain raw and are labelled unit unresolved; no SI conversion is assumed.`,
    );
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
          unit: q.unit,
          value: q.factor === null ? q.value : q.value * q.factor,
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
    const groupedTotals = new Map<
      string,
      { name: string; unit: string; total: number; elements: number; names: Set<string> }
    >();
    for (const [name, entry] of namedMap) {
      count += entry.count;
      for (const q of entry.quantities) {
        hasQuantities = true;
        const groupKey = `${q.name}\u0000${q.unit}`;
        const t = groupedTotals.get(groupKey) ?? {
          name: q.name, unit: q.unit, total: 0, elements: 0, names: new Set<string>(),
        };
        t.total += q.value;
        if (!t.names.has(name)) {
          t.names.add(name);
          t.elements += entry.count;
        }
        groupedTotals.set(groupKey, t);
      }
    }
    const roundedTotals: Record<
      string,
      { unit: string; total: number; elements: number }
    > = {};
    const groupsPerName = new Map<string, number>();
    for (const total of groupedTotals.values()) {
      groupsPerName.set(total.name, (groupsPerName.get(total.name) ?? 0) + 1);
    }
    for (const total of groupedTotals.values()) {
      const key = groupsPerName.get(total.name)! > 1
        ? `${total.name} (${total.unit})`
        : total.name;
      roundedTotals[key] = {
        unit: total.unit,
        total: Number(total.total.toFixed(decimals)),
        elements: total.elements,
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
      ? "Quantities are taken ONLY from the values the file attaches to these elements. Explicit supported units are converted to m², m³, m, kg or s; unresolved units remain raw and are labelled."
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
