import type { IfcParseResult } from "./ifc-parser";

/** Portable audit record. It contains only the parsed summary, never the source IFC. */
export interface IfcTakeoffExport {
  format: "frelux-ifc-takeoff";
  formatVersion: 1;
  exportedAt: string;
  sourceFileName: string;
  sourceFileIncluded: false;
  limitations: string[];
  takeoff: IfcParseResult;
}

export function createIfcTakeoffExport(
  sourceFileName: string,
  takeoff: IfcParseResult,
  exportedAt = new Date().toISOString(),
): IfcTakeoffExport {
  if (!takeoff.ok) throw new Error("Cannot export a refused IFC takeoff.");
  return {
    format: "frelux-ifc-takeoff",
    formatVersion: 1,
    exportedAt,
    sourceFileName,
    sourceFileIncluded: false,
    limitations: [
      "Quantities are reported only when declared by the source IFC file.",
      "Unsupported or unresolved units remain raw and must be reviewed.",
      "This takeoff is not an IFC schema certification, design, or code-compliance check.",
      "The source IFC file is not included; retain it separately for verification.",
    ],
    takeoff,
  };
}

export function serializeIfcTakeoffExport(
  sourceFileName: string,
  takeoff: IfcParseResult,
  exportedAt?: string,
): string {
  return JSON.stringify(
    createIfcTakeoffExport(sourceFileName, takeoff, exportedAt),
    null,
    2,
  );
}
