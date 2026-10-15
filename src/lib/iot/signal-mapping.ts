// =========================================================
// FRELUX ENGINE #7 — M2: SIGNAL-TO-PROJECT-STATE MAPPING
//
// Deterministic derivation of project-state indicators from
// validated telemetry. Every mapping is:
//   * computed only from quality_flag="valid" readings —
//     suspect readings are never silently promoted to evidence
//   * gap-bounded: readings more than MAX_INTEGRATION_GAP
//     apart are never interpolated across (that would invent
//     data); each contiguous segment is integrated separately
//   * citation-carrying: physical thresholds name their basis
//     and their verification status
//   * refusing by design where evidence is insufficient:
//     - no strength value is ever derived from maturity
//       (that requires a project-specific calibrated
//       strength-maturity curve, ASTM C1074, which only the
//       owner can record after lab testing)
//     - vibration readings are stored as evidence only;
//       safety thresholds require independently reviewed
//       limits (engine #7 M4) and are never invented here
// =========================================================

import type { TelemetryRow } from "@/lib/iot/device-client";

export type { TelemetryRow } from "@/lib/iot/device-client";
import { METRIC_BY_NAME } from "@/lib/iot/telemetry-validation";

/** Nurse-Saul datum temperature (ASTM C1074), °C */
export const NURSE_SAUL_DATUM_C = -10;

/** Reference temperature for equivalent-age expression, °C */
export const EQUIVALENT_AGE_REF_C = 20;

/** Readings further apart than this are never integrated across */
export const MAX_INTEGRATION_GAP_HOURS = 6;

export interface MaturitySegment {
  /** ISO start of the integrated segment */
  from: string;
  /** ISO end of the integrated segment */
  to: string;
  /** Nurse-Saul maturity index over this segment, °C·h */
  maturityIndex: number;
}

export type MaturityResult =
  | {
      status: "computed";
      /** total maturity across all contiguous segments, °C·h */
      totalMaturityIndex: number;
      /** same index expressed as hours at 20 °C */
      equivalentAgeHours20C: number;
      segments: MaturitySegment[];
      readingCount: number;
      disclosure: string;
    }
  | {
      status: "refused";
      reason: string;
      readingCount: number;
    };

function parseMs(iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) throw new Error(`Unparseable timestamp: ${iso}`);
  return t;
}

/**
 * Nurse-Saul maturity from a concrete_temp_c series
 * (ASTM C1074): M = Σ (T − T0)·Δt, computed trapezoidally
 * (linear interpolation of temperature between readings).
 *
 * Only valid readings participate. Segments longer than
 * MAX_INTEGRATION_GAP_HOURS between consecutive readings are
 * NOT bridged; each contiguous block is integrated on its own.
 */
export function computeNurseSaulMaturity(
  readings: TelemetryRow[],
): MaturityResult {
  const valid = readings
    .filter(
      (r) =>
        r.metric === "concrete_temp_c" &&
        r.quality_flag === "valid" &&
        METRIC_BY_NAME[r.metric]?.unit === r.unit,
    )
    .sort((a, b) => parseMs(a.recorded_at) - parseMs(b.recorded_at));

  if (valid.length < 2) {
    return {
      status: "refused",
      reason:
        "At least 2 valid concrete_temp_c readings are required for a maturity computation; nothing is extrapolated from fewer points.",
      readingCount: valid.length,
    };
  }

  const segments: MaturitySegment[] = [];
  let segFrom = valid[0];
  let last = valid[0];
  let segMaturity = 0;
  let total = 0;

  const closeSegment = () => {
    if (segMaturity !== 0 || last !== segFrom) {
      segments.push({
        from: segFrom.recorded_at,
        to: last.recorded_at,
        maturityIndex: segMaturity,
      });
    }
    total += segMaturity;
    segMaturity = 0;
  };

  for (let i = 1; i < valid.length; i++) {
    const prev = valid[i - 1];
    const cur = valid[i];
    const gapHours = (parseMs(cur.recorded_at) - parseMs(prev.recorded_at)) / 3_600_000;
    if (gapHours <= 0) continue; // duplicate timestamp: zero contribution
    if (gapHours > MAX_INTEGRATION_GAP_HOURS) {
      // do NOT interpolate across the gap — close out the segment
      last = prev;
      closeSegment();
      segFrom = cur;
      last = cur;
      continue;
    }
    const avgTempC = (prev.value + cur.value) / 2;
    segMaturity += (avgTempC - NURSE_SAUL_DATUM_C) * gapHours;
    last = cur;
  }
  closeSegment();

  if (segments.length === 0) {
    return {
      status: "refused",
      reason: "No integrable time span found in the valid readings.",
      readingCount: valid.length,
    };
  }

  return {
    status: "computed",
    totalMaturityIndex: total,
    equivalentAgeHours20C: total / (EQUIVALENT_AGE_REF_C - NURSE_SAUL_DATUM_C),
    segments,
    readingCount: valid.length,
    disclosure:
      "Nurse-Saul maturity index (ASTM C1074, datum −10 °C). This is a cure-state index ONLY — no strength value is derived, because a project-specific calibrated strength-maturity curve has not been recorded. Segments longer than 6 h between readings are not interpolated across.",
  };
}

// ---------------------------------------------------------
// Site-condition snapshot
// ---------------------------------------------------------

export type SiteConditionLabel =
  | "cold-weather-concreting"
  | "hot-weather-concreting"
  | "normal-conditions"
  | "insufficient-data";

export interface SiteConditionBand {
  label: SiteConditionLabel;
  /** latest reading the label is based on */
  asOf: string | null;
  basis: string;
  verification: "pending" | "verified";
  disclosure: string;
}

/** Conservative ambient bands. These are widely used guideline
 *  thresholds, NOT verified regulatory limits; every band is
 *  emitted with verification: "pending" until independently
 *  reviewed (engine #7 M4). */
const COLD_BAND_C = 4; // ACI 306R-10 cold-weather guideline (40 °F)
const HOT_BAND_C = 32; // ACI 305R hot-weather guideline (90 °F)

export function classifySiteConditions(
  readings: TelemetryRow[],
): SiteConditionBand {
  const latest = readings
    .filter(
      (r) =>
        r.metric === "ambient_temp_c" &&
        r.quality_flag === "valid" &&
        r.unit === "celsius",
    )
    .sort((a, b) => parseMs(b.recorded_at) - parseMs(a.recorded_at))[0];

  if (!latest) {
    return {
      label: "insufficient-data",
      asOf: null,
      basis: "ambient_temp_c",
      verification: "pending",
      disclosure:
        "No valid ambient temperature reading available; no site-condition classification is made.",
    };
  }

  if (latest.value < COLD_BAND_C) {
    return {
      label: "cold-weather-concreting",
      asOf: latest.recorded_at,
      basis: `ACI 306R-10 cold-weather guideline (< ${COLD_BAND_C} °C / 40 °F)`,
      verification: "pending",
      disclosure:
        "Guideline band, pending independent verification. Treat as a prompt to check cold-weather protection measures, not as a compliance verdict.",
    };
  }
  if (latest.value > HOT_BAND_C) {
    return {
      label: "hot-weather-concreting",
      asOf: latest.recorded_at,
      basis: `ACI 305R hot-weather guideline (> ${HOT_BAND_C} °C / 90 °F)`,
      verification: "pending",
      disclosure:
        "Guideline band, pending independent verification. Treat as a prompt to check hot-weather measures, not as a compliance verdict.",
    };
  }
  return {
    label: "normal-conditions",
    asOf: latest.recorded_at,
    basis: `ACI guideline band ${COLD_BAND_C}–${HOT_BAND_C} °C`,
    verification: "pending",
    disclosure:
      "Guideline band, pending independent verification. Ambient within normal concreting range at the reading time.",
  };
}

// ---------------------------------------------------------
// Vibration: evidence-only by design
// ---------------------------------------------------------

export const VIBRATION_EVIDENCE_DISCLOSURE =
  "Vibration readings are recorded as evidence only. Safety thresholds for peak particle velocity depend on the structure, soil, and jurisdiction and require independently reviewed limits (engine #7 M4); none are evaluated or invented here.";
