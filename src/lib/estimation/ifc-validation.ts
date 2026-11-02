/**
 * IFC import validation pipeline — engine-1B BIM milestone
 * (audit item: "Build a standards-tested IFC import/validation
 * pipeline first").
 *
 * Produces a deterministic, evidence-based structural report of
 * what the uploaded file actually contains BEFORE any takeoff
 * runs: STEP header, FILE_SCHEMA, entity coverage, project
 * declaration, units, geometric context, takeoff elements and
 * declared quantities. Nothing here certifies the file against
 * the IFC schema itself and no such claim is ever made; the
 * checks are structural presence/coverage checks on the plain
 * text, reported verbatim.
 */

export type IfcValidationStatus = "pass" | "warn" | "fail";
export type IfcValidationVerdict = "valid" | "valid_with_warnings" | "invalid";

export interface IfcValidationCheck {
  id: string;
  label: string;
  status: IfcValidationStatus;
  detail: string;
}

export interface IfcValidationReport {
  /** IFC schema entity-presence summary, not schema certification. */
  schema_coverage: { schema: string | null; distinct_entity_types: number; observed_entity_types: Record<string, number> };
  verdict: IfcValidationVerdict;
  /** FILE_SCHEMA value, e.g. IFC4 (null when absent). */
  schema: string | null;
  /** Total STEP entities parsed (#<n>=TYPE(...); lines). */
  entity_count: number;
  /** STEP-shaped lines that could not be tokenized. */
  unparsed_lines: number;
  /** Takeoff-relevant construction elements found. */
  element_count: number;
  /** IfcQuantity* entities found. */
  quantity_count: number;
  checks: IfcValidationCheck[];
  warnings: string[];
}

/** Element types the takeoff reports (mirrors ifc-parser's fixed list). */
const TAKEOFF_ELEMENT_TYPES = [
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
];

const QUANTITY_TYPES = [
  "IFCQUANTITYAREA",
  "IFCQUANTITYVOLUME",
  "IFCQUANTITYLENGTH",
  "IFCQUANTITYCOUNT",
  "IFCQUANTITYWEIGHT",
  "IFCQUANTITYTIME",
];

function countMatches(text: string, re: RegExp): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

export function validateIfcFile(input: {
  file_text: string;
  file_name?: string;
  /** Admin cap from max_entities_per_file (same default as the parser). */
  max_entities?: number;
}): IfcValidationReport {
  const text = input.file_text ?? "";
  const maxEntities = input.max_entities ?? 250000;
  const label = input.file_name ?? "The uploaded file";
  const checks: IfcValidationCheck[] = [];
  const warnings: string[] = [];

  // 1. STEP header ------------------------------------------------
  const hasHeader = text.includes("ISO-10303-21");
  const hasSchemaText = text.includes("FILE_SCHEMA");
  checks.push({
    id: "step_header",
    label: "ISO-10303-21 (STEP) header",
    status: hasHeader ? "pass" : hasSchemaText ? "warn" : "fail",
    detail: hasHeader
      ? "STEP physical-file header found."
      : hasSchemaText
        ? "No ISO-10303-21 header, but a FILE_SCHEMA declaration is present: treated as an unusual IFC export."
        : "No ISO-10303-21 header and no FILE_SCHEMA: the file is not a plain-text IFC/STEP export.",
  });

  // 2. FILE_SCHEMA --------------------------------------------------
  const schemaMatch = text.match(
    /FILE_SCHEMA\s*\(\s*\(\s*'([^']*)'/i,
  );
  const schema = schemaMatch ? schemaMatch[1] : null;
  checks.push({
    id: "file_schema",
    label: "FILE_SCHEMA declaration",
    status: schema ? "pass" : hasHeader ? "warn" : "fail",
    detail: schema
      ? `Declared schema: ${schema}.`
      : "No FILE_SCHEMA declaration: the schema version is unknown.",
  });

  // 3. Entity coverage ----------------------------------------------
  const entityMatches = text.match(/#\d+\s*=\s*[A-Za-z0-9_]+\s*\(/g) ?? [];
  const entityCount = entityMatches.length;
  const candidateMatches = text.match(/^\s*#\d+\s*=/gm) ?? [];
  const unparsed = Math.max(0, candidateMatches.length - entityCount);
  checks.push({
    id: "entity_coverage",
    label: "STEP entity coverage",
    status:
      entityCount === 0
        ? "warn"
        : unparsed === 0
          ? "pass"
          : "warn",
    detail:
      entityCount === 0
        ? "No #<n>=TYPE(...) STEP entities found: the takeoff would be empty."
        : `${entityCount.toLocaleString(
            "en-NG",
          )} entities tokenized${unparsed > 0 ? `, ${unparsed.toLocaleString("en-NG")} entity-shaped line(s) could not be tokenized` : ""}.`,
  });
  if (unparsed > 0) {
    warnings.push(
      `${unparsed.toLocaleString("en-NG")} STEP line(s) could not be tokenized and are excluded from the takeoff.`,
    );
  }

  // 4. Entity cap ----------------------------------------------------
  const overCap = entityCount > maxEntities;
  checks.push({
    id: "entity_cap",
    label: "Entity count within cap",
    status: overCap ? "fail" : "pass",
    detail: overCap
      ? `${entityCount.toLocaleString("en-NG")} entities exceed the configured cap of ${maxEntities.toLocaleString("en-NG")}; parsing is refused rather than freezing the browser.`
      : `${entityCount.toLocaleString("en-NG")} entities (cap ${maxEntities.toLocaleString("en-NG")}).`,
  });

  // 5. Project declaration -------------------------------------------
  const hasProject = /IFCPROJECT\s*\(/i.test(text);
  checks.push({
    id: "project",
    label: "IfcProject declaration",
    status: hasProject ? "pass" : "warn",
    detail: hasProject
      ? "IfcProject entity present."
      : "No IfcProject entity: the file may be a fragment. The takeoff can still report declared elements.",
  });

  // 6. Units ----------------------------------------------------------
  const siUnitCount = countMatches(text, /IFCSIUNIT\s*\(/gi);
  const conversionUnitCount = countMatches(
    text,
    /IFCCONVERSIONBASEDUNIT\s*\(/gi,
  );
  const unitCount = siUnitCount + conversionUnitCount;
  checks.push({
    id: "units",
    label: "Explicit unit declarations",
    status: unitCount > 0 ? "pass" : "warn",
    detail:
      unitCount > 0
        ? `${siUnitCount} IfcSIUnit and ${conversionUnitCount} IfcConversionBasedUnit declaration(s) found. The takeoff converts only supported, explicitly assigned units; other values remain raw and labelled.`
        : "No IfcSIUnit or IfcConversionBasedUnit declarations: quantity units cannot be confirmed, so unresolved values remain raw and labelled in the takeoff.",
  });
  if (unitCount === 0) {
    warnings.push(
      "The file declares no supported unit declarations; unit fidelity cannot be confirmed and unresolved values remain raw.",
    );
  }

  // 7. Geometric representation context -------------------------------
  const hasGeoCtx = /IFCGEOMETRICREPRESENTATIONCONTEXT\s*\(/i.test(text);
  checks.push({
    id: "geometric_context",
    label: "Geometric representation context",
    status: hasGeoCtx ? "pass" : "warn",
    detail: hasGeoCtx
      ? "IfcGeometricRepresentationContext present."
      : "No geometric representation context: the file carries no coordinate/model space. This is acceptable for a quantity-only export.",
  });

  // 8. Takeoff elements ------------------------------------------------
  const elementCount = TAKEOFF_ELEMENT_TYPES.reduce(
    (n, t) => n + countMatches(text, new RegExp(`#${"\\d+"}\\s*=\\s*${t}\\s*\\(`, "gi")),
    0,
  );
  checks.push({
    id: "elements",
    label: "Takeoff-relevant elements",
    status: elementCount > 0 ? "pass" : "warn",
    detail:
      elementCount > 0
        ? `${elementCount.toLocaleString("en-NG")} wall/slab/roof/door/window/... element(s) found.`
        : "No takeoff-relevant elements (walls, slabs, roofs, doors, windows, ...) found: the takeoff would be empty.",
  });

  // 9. Declared quantities ---------------------------------------------
  const quantityCount = QUANTITY_TYPES.reduce(
    (n, t) => n + countMatches(text, new RegExp(`${t}\\s*\\(`, "gi")),
    0,
  );
  checks.push({
    id: "quantities",
    label: "Declared quantities (IfcQuantity*)",
    status: quantityCount > 0 ? "pass" : "warn",
    detail:
      quantityCount > 0
        ? `${quantityCount.toLocaleString("en-NG")} quantity declaration(s) found.`
        : "No IfcQuantity declarations: only element counts can be reported, never invented areas or volumes.",
  });

  // ---- verdict (deterministic) ---------------------------------------
  const failed = checks.filter((c) => c.status === "fail");
  const warned = checks.filter((c) => c.status === "warn");
  let verdict: IfcValidationVerdict;
  if (failed.length > 0) {
    verdict = "invalid";
  } else if (warned.length > 0) {
    verdict = "valid_with_warnings";
  } else {
    verdict = "valid";
  }

  if (verdict === "invalid") {
    warnings.unshift(
      `${label} did not pass validation: the takeoff is refused rather than guessed at.`,
    );
  }

  const observedEntityTypes: Record<string, number> = {};
  for (const match of text.matchAll(/#\d+\s*=\s*([A-Za-z0-9_]+)\s*\(/g)) {
    const type = match[1].toUpperCase();
    observedEntityTypes[type] = (observedEntityTypes[type] ?? 0) + 1;
  }
  return {
    schema_coverage: { schema, distinct_entity_types: Object.keys(observedEntityTypes).length, observed_entity_types: observedEntityTypes },
    verdict,
    schema,
    entity_count: entityCount,
    unparsed_lines: unparsed,
    element_count: elementCount,
    quantity_count: quantityCount,
    checks,
    warnings,
  };
}
