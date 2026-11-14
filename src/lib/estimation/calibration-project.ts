/**
 * Bridge between a saved project row and the calibration evidence store.
 *
 * A project carries its market in different fields depending on when and where
 * it was saved, and a currency code is not a market. Anything that is not a
 * supported ISO market resolves to an empty string, so the interface asks for a
 * market instead of silently inventing one.
 */

import { normaliseMarketCode } from "./adaptive-calibration";

export interface CalibrationProject {
  id: string;
  name: string;
  data?: Record<string, unknown>;
}

const MARKET_FIELDS = [
  "marketCode",
  "market_code",
  "market",
  "countryCode",
  "country",
] as const;

export function marketFromProject(project: CalibrationProject): string {
  const data = project.data ?? {};
  for (const field of MARKET_FIELDS) {
    const resolved = normaliseMarketCode(data[field]);
    if (resolved) return resolved;
  }
  return "";
}

/** Short, honest wording for a storage or review failure. */
export function calibrationFailureMessage(reason: string | null): string {
  switch (reason) {
    case "duplicate":
      return "That record is already saved.";
    case "invalid":
      return "Check the material, quantities, unit and market.";
    case "requires_reopen":
      return "This record is already reviewed. Reopen it before changing the quantities.";
    case "immutable_field":
      return "The project and date of a record cannot be changed.";
    case "quota_exceeded":
      return "This device is out of storage. Remove an old record and try again.";
    case "storage_unavailable":
      return "Saving is unavailable right now. Check your connection and try again.";
    case "not_found":
      return "That record no longer exists.";
    default:
      return "Could not save the record. Check your connection and try again.";
  }
}
