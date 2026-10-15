/**
 * .ifczip reader — additive support for compressed IFC exports.
 *
 * FRELUX engine-1B BIM milestone (audit item: ".ifczip is not
 * supported"). Decompressed entirely in the browser via fflate
 * (already a production dependency): the file never leaves the
 * device. Rules are deliberately conservative and honest:
 *   - exactly one .ifc entry is required; multiple .ifc entries
 *     are refused (the takeoff is never guessed at),
 *   - entries that are not .ifc (e.g. .ifcxml) are reported,
 *     not silently interpreted,
 *   - a decompressed-size cap (DEFAULT_MAX_BYTES) protects the
 *     browser from zip bombs.
 */

import { unzipSync } from "fflate";

export const DEFAULT_MAX_IFCZIP_BYTES = 64 * 1024 * 1024; // 64 MB

export interface IfcZipReadResult {
  ok: boolean;
  /** Entry name of the extracted IFC file (report-friendly). */
  entry_name?: string;
  /** Decoded plain-text IFC content. */
  file_text?: string;
  /** Byte length of the extracted entry (before decoding). */
  entry_bytes?: number;
  /** Other entries present in the archive (names, not contents). */
  other_entries?: string[];
  errors: string[];
}

function findIfcEntries(names: string[]): string[] {
  return names.filter((n) => /\.ifc$/i.test(n) && !n.endsWith("/"));
}

/**
 * Reads an .ifczip archive and extracts its single .ifc entry.
 * Refuses (never guesses) on ambiguity or corruption.
 */
export function readIfcZipFile(
  bytes: Uint8Array,
  maxBytes: number = DEFAULT_MAX_IFCZIP_BYTES,
): IfcZipReadResult {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    return {
      ok: false,
      errors: [
        "The .ifczip archive could not be opened: it may be corrupted or not a ZIP archive. Nothing is estimated on its behalf.",
      ],
    };
  }

  const names = Object.keys(entries);
  const ifcEntries = findIfcEntries(names);
  const otherEntries = names.filter((n) => !ifcEntries.includes(n));

  if (ifcEntries.length === 0) {
    return {
      ok: false,
      other_entries: otherEntries,
      errors: [
        `The archive contains no .ifc entry (found: ${
          otherEntries.length > 0
            ? otherEntries.join(", ")
            : "no usable entries"
        }). .ifcxml (XML) exports are not interpreted as plain-text IFC.`,
      ],
    };
  }

  if (ifcEntries.length > 1) {
    return {
      ok: false,
      other_entries: otherEntries,
      errors: [
        `The archive contains ${ifcEntries.length} .ifc entries (${ifcEntries.join(
          ", ",
        )}); the correct one cannot be chosen honestly. Extract the intended file and upload it as .ifc.`,
      ],
    };
  }

  const entryName = ifcEntries[0];
  const data = entries[entryName];

  if (data.byteLength > maxBytes) {
    return {
      ok: false,
      entry_name: entryName,
      errors: [
        `The extracted IFC entry is ${(data.byteLength / (1024 * 1024)).toFixed(
          1,
        )} MB, above the ${(maxBytes / (1024 * 1024)).toFixed(
          0,
        )} MB in-browser safety cap. Extract the file and upload it as .ifc.`,
      ],
    };
  }

  try {
    const text = new TextDecoder("utf-8").decode(data);
    return {
      ok: true,
      entry_name: entryName,
      file_text: text,
      entry_bytes: data.byteLength,
      other_entries: otherEntries,
      errors: [],
    };
  } catch {
    return {
      ok: false,
      entry_name: entryName,
      errors: [
        "The extracted IFC entry is not valid UTF-8 text and cannot be parsed in the browser.",
      ],
    };
  }
}
