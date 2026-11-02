/**
 * Pillar 3: Bi-directional model-to-estimate linking (5D BIM).
 *
 * Deterministic mapping from IFC model elements to Bill of Quantities lines
 * and back. Only quantities declared by the model feed exact lines; derived
 * lines (rebar density, roof sheet and screw counts) are computed from the
 * declared areas/volumes with explicit, labelled assumptions and are always
 * marked indicative for engineer confirmation.
 */

import type { IfcModelElement, IfcQuantityValue } from "./ifc-model-loader";

export type EstimateCategory =
  "concrete" | "formwork" | "rebar" | "roof" | "openings" | "other";

export interface EstimateLine {
  id: string;
  label: string;
  category: EstimateCategory;
  quantity: number;
  unit: string;
  /** GlobalIds of the model elements this line derives from. */
  elementIds: string[];
  /** "declared" = straight from IfcQuantity; "indicative" = derived. */
  provenance: "declared" | "indicative";
  note: string;
}

export interface BiLinkIndex {
  lines: EstimateLine[];
  /** globalId -> line ids touching that element. */
  linesByElement: Map<string, string[]>;
  /** line id -> element globalIds. */
  elementIdsByLine: Map<string, string[]>;
  lineById: Map<string, EstimateLine>;
}

export interface LinkOptions {
  /**
   * Indicative rebar density in kg per m3 of declared concrete volume.
   * Default 100 kg/m3, a common mid-range for columns/walls; the engineer
   * must confirm per structure.
   */
  rebarDensityKgPerM3?: number;
  /**
   * Indicative net effective cover of one roofing sheet, m2 (e.g. a 0.9 m
   * sheet with 0.5 m net cover). Confirm with the product datasheet.
   */
  roofSheetNetCoverM2?: number;
  /** Indicative screws per sheet incl. laps. */
  screwsPerSheet?: number;
}

export const DEFAULT_LINK_OPTIONS: Required<LinkOptions> = {
  rebarDensityKgPerM3: 100,
  roofSheetNetCoverM2: 0.45,
  screwsPerSheet: 8,
};

const STRUCTURAL_CLASSES = new Set([
  "IFCWALL",
  "IFCWALLSTANDARDCASE",
  "IFCCOLUMN",
  "IFCBEAM",
  "IFCFOOTING",
  "IFCPILE",
  "IFCCHIMNEY",
  "IFCBUILDINGELEMENTPROXY",
]);

const ROOF_CLASSES = new Set(["IFCROOF"]);

const OPENING_CLASSES = new Set(["IFCDOOR", "IFCWINDOW", "IFCCURTAINWALL"]);

function pickQuantity(
  quantities: IfcQuantityValue[],
  kind: "volume" | "area" | "length",
  preferredNames: string[],
): IfcQuantityValue | null {
  const byKind = quantities.filter((q) => q.kind === kind);
  for (const name of preferredNames) {
    const hit = byKind.find((q) => q.name.toLowerCase() === name);
    if (hit) return hit;
  }
  return byKind.length > 0 ? byKind[0] : null;
}

/**
 * Build the estimate lines and the bi-directional element/line index for a
 * parsed model. One line per element and category: selecting a line always
 * resolves to exactly the element it came from, and selecting an element
 * resolves to exactly its lines.
 */
export function buildEstimateLines(
  elements: IfcModelElement[],
  options: LinkOptions = {},
): BiLinkIndex {
  const opts = { ...DEFAULT_LINK_OPTIONS, ...options };
  const lines: EstimateLine[] = [];
  const linesByElement = new Map<string, string[]>();
  const elementIdsByLine = new Map<string, string[]>();
  const lineById = new Map<string, EstimateLine>();

  const add = (
    element: IfcModelElement,
    line: Omit<EstimateLine, "id" | "elementIds">,
  ) => {
    const id = `${line.category}-${line.label}-${element.globalId}`;
    const full: EstimateLine = { ...line, id, elementIds: [element.globalId] };
    lines.push(full);
    lineById.set(id, full);
    elementIdsByLine.set(id, [element.globalId]);
    const list = linesByElement.get(element.globalId) ?? [];
    list.push(id);
    linesByElement.set(element.globalId, list);
  };

  for (const element of elements) {
    if (!element.globalId) continue;
    const cls = element.ifcClass;
    const isRoof = ROOF_CLASSES.has(cls) || /roof/i.test(element.name);
    const dims = `${element.ifcClass}${element.name ? ` ${element.name}` : ""}`;

    if (isRoof) {
      const areaQ = pickQuantity(element.quantities, "area", [
        "grossarea",
        "netarea",
        "projectedarea",
      ]);
      if (areaQ) {
        const sheets = Math.ceil(areaQ.value / opts.roofSheetNetCoverM2);
        add(element, {
          label: `Roof covering - ${dims}`,
          category: "roof",
          quantity: areaQ.value,
          unit: "m2",
          provenance: "declared",
          note: `Declared ${areaQ.name} = ${areaQ.value.toFixed(2)} m2 (IfcQuantityArea).`,
        });
        add(element, {
          label: `Roof sheets - ${dims}`,
          category: "roof",
          quantity: sheets,
          unit: "sheets",
          provenance: "indicative",
          note: `Derived from declared area / ${opts.roofSheetNetCoverM2} m2 net cover per sheet; confirm with the product datasheet.`,
        });
        add(element, {
          label: `Screw package - ${dims}`,
          category: "roof",
          quantity: sheets * opts.screwsPerSheet,
          unit: "screws",
          provenance: "indicative",
          note: `Derived from sheet count x ${opts.screwsPerSheet} screws per sheet; confirm with the fixing schedule.`,
        });
      }
      const ridge = pickQuantity(element.quantities, "length", [
        "ridgelength",
        "ridge",
      ]);
      if (ridge) {
        add(element, {
          label: `Ridge cap - ${dims}`,
          category: "roof",
          quantity: ridge.value,
          unit: "m",
          provenance: "declared",
          note: `Declared ${ridge.name} = ${ridge.value.toFixed(2)} m (IfcQuantityLength).`,
        });
      } else if (areaQ) {
        add(element, {
          label: `Ridge cap - ${dims}`,
          category: "roof",
          quantity: 0,
          unit: "m",
          provenance: "indicative",
          note: "The model declares no ridge length quantity; 0 m reported rather than guessed.",
        });
      }
      continue;
    }

    if (STRUCTURAL_CLASSES.has(cls) || cls === "IFCSLAB") {
      const volume = pickQuantity(element.quantities, "volume", [
        "netvolume",
        "grossvolume",
      ]);
      if (volume) {
        add(element, {
          label: `Concrete - ${dims}`,
          category: "concrete",
          quantity: volume.value,
          unit: "m3",
          provenance: "declared",
          note: `Declared ${volume.name} = ${volume.value.toFixed(3)} m3 (IfcQuantityVolume).`,
        });
        add(element, {
          label: `Rebar - ${dims}`,
          category: "rebar",
          quantity: volume.value * opts.rebarDensityKgPerM3,
          unit: "kg",
          provenance: "indicative",
          note: `Derived from declared volume x ${opts.rebarDensityKgPerM3} kg/m3 indicative density; engineer must confirm per structure.`,
        });
      }
      const area = pickQuantity(element.quantities, "area", [
        "grosssidearea",
        "netarea",
        "grossarea",
      ]);
      if (area) {
        add(element, {
          label: `Formwork - ${dims}`,
          category: "formwork",
          quantity: area.value,
          unit: "m2",
          provenance: "declared",
          note: `Declared ${area.name} = ${area.value.toFixed(2)} m2 (IfcQuantityArea).`,
        });
      }
      continue;
    }

    if (OPENING_CLASSES.has(cls)) {
      const area = pickQuantity(element.quantities, "area", [
        "netarea",
        "grossarea",
      ]);
      if (area) {
        add(element, {
          label: `Openings - ${dims}`,
          category: "openings",
          quantity: area.value,
          unit: "m2",
          provenance: "declared",
          note: `Declared ${area.name} = ${area.value.toFixed(2)} m2.`,
        });
      }
      continue;
    }

    // Stairs, railings, coverings, plates, members: weight or length declared.
    const weight = element.quantities.find((q) => q.kind === "weight");
    if (weight) {
      add(element, {
        label: `Metal/other - ${dims}`,
        category: "other",
        quantity: weight.value,
        unit: "kg",
        provenance: "declared",
        note: `Declared ${weight.name} = ${weight.value.toFixed(2)} kg (IfcQuantityWeight).`,
      });
    }
  }

  return { lines, linesByElement, elementIdsByLine, lineById };
}

/** Lines touched by a model element (for element -> estimate highlighting). */
export function linesForElement(
  index: BiLinkIndex,
  globalId: string | null,
): EstimateLine[] {
  if (!globalId) return [];
  return (index.linesByElement.get(globalId) ?? []).map((id) =>
    index.lineById.get(id)!,
  );
}

/** Elements a line derives from (for estimate -> model highlighting). */
export function elementIdsForLine(
  index: BiLinkIndex,
  lineId: string,
): string[] {
  return index.elementIdsByLine.get(lineId) ?? [];
}

/** Group lines by category for the Bill of Quantities table. */
export function groupLinesByCategory(
  index: BiLinkIndex,
): Map<EstimateCategory, EstimateLine[]> {
  const out = new Map<EstimateCategory, EstimateLine[]>();
  for (const line of index.lines) {
    const list = out.get(line.category) ?? [];
    list.push(line);
    out.set(line.category, list);
  }
  return out;
}
