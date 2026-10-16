// =========================================================
// FRELUX ENGINE #7 — M4: INDEPENDENTLY REVIEWED SAFETY ALERTS
//
// Safety alerts are evaluated ONLY against thresholds that a
// named reviewer has APPROVED in iot_safety_thresholds. Design
// guarantees:
//   * pending/rejected thresholds never drive an alert — they
//     are disclosed as unreviewed, nothing more
//   * a metric with readings but NO approved threshold yields
//     an explicit no-verdict disclosure, never a guessed limit
//   * only quality_flag="valid" readings trigger alerts; suspect
//     readings stay evidence-only (they were flagged at ingest)
//   * every alert carries the full citation chain: threshold
//     basis, reviewer name, review date — so the alert is
//     auditable to the qualified human who signed off
//   * alerts are INFORMATIONAL: no regulatory verdict, no
//     automatic action, no shutdown claims
// =========================================================

import type { TelemetryRow, DeviceType } from "@/lib/iot/device-client";
import { METRIC_BY_NAME } from "@/lib/iot/telemetry-validation";

export interface IotSafetyThresholdRow {
  id: string;
  metric: string;
  device_type: string | null;
  market_code: string | null;
  threshold_value: number;
  threshold_unit: string;
  direction: "above" | "below";
  basis: string;
  source_url: string | null;
  review_status: "pending" | "approved" | "rejected";
  reviewer_name: string | null;
  reviewer_credentials: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const SAFETY_ALERT_DISCLOSURE =
  "Informational alert based on an independently reviewed threshold. It is not a regulatory verdict and triggers no automatic action; verify readings and act per qualified judgment.";

export const NO_REVIEWED_THRESHOLD_DISCLOSURE =
  "No independently reviewed safety threshold is on record for this metric, so no safety verdict is made. Readings are evidence only; Frelux never invents default safety limits.";

export const ALL_WITHIN_DISCLOSURE =
  "All shown readings are within the independently reviewed threshold(s) for this metric. This is informational monitoring, not a compliance verdict.";

export interface SafetyAlert {
  metric: string;
  thresholdId: string;
  direction: "above" | "below";
  thresholdValue: number;
  thresholdUnit: string;
  /** latest valid reading that breached the threshold */
  latestValue: number;
  latestAt: string;
  /** worst breach among the readings shown */
  worstValue: number;
  worstAt: string;
  /** number of valid readings breaching the threshold */
  breachCount: number;
  basis: string;
  sourceUrl: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  disclosure: string;
}

export interface SafetyVerdictEntry {
  metric: string;
  verdict: "alert" | "no-reviewed-threshold";
  alerts?: SafetyAlert[];
  disclosure: string;
}

function exceeds(reading: number, threshold: number, direction: "above" | "below") {
  return direction === "above" ? reading > threshold : reading < threshold;
}

export interface EvaluateSafetyAlertsInput {
  deviceType: DeviceType;
  marketCode: string;
  telemetry: TelemetryRow[];
  thresholds: IotSafetyThresholdRow[];
}

/**
 * Evaluate alerts for one device against the approved threshold
 * set. Thresholds scope-match when their optional device_type /
 * market_code match the device (NULL = any). Pending and
 * rejected rows are invisible to the alert logic.
 */
export function evaluateSafetyAlerts(
  input: EvaluateSafetyAlertsInput,
): SafetyVerdictEntry[] {
  const byMetric = new Map<string, TelemetryRow[]>();
  for (const r of input.telemetry) {
    if (r.quality_flag !== "valid") continue;
    const list = byMetric.get(r.metric) ?? [];
    list.push(r);
    byMetric.set(r.metric, list);
  }

  const verdicts: SafetyVerdictEntry[] = [];

  for (const [metric, readings] of byMetric) {
    const sorted = [...readings].sort(
      (a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at),
    );
    const approved = input.thresholds.filter(
      (t) =>
        t.metric === metric &&
        t.review_status === "approved" &&
        (t.device_type === null || t.device_type === input.deviceType) &&
        (t.market_code === null || t.market_code === input.marketCode) &&
        // unit must agree with the registered metric unit
        t.threshold_unit === METRIC_BY_NAME[metric]?.unit,
    );

    if (approved.length === 0) {
      verdicts.push({
        metric,
        verdict: "no-reviewed-threshold",
        disclosure: NO_REVIEWED_THRESHOLD_DISCLOSURE,
      });
      continue;
    }

    const alerts: SafetyAlert[] = [];
    for (const t of approved) {
      const breaches = sorted.filter((r) => exceeds(r.value, t.threshold_value, t.direction));
      if (breaches.length === 0) continue;
      const latest = breaches[breaches.length - 1];
      const worst = breaches.reduce((w, r) =>
        t.direction === "above" ? (r.value > w.value ? r : w) : (r.value < w.value ? r : w),
      );
      alerts.push({
        metric,
        thresholdId: t.id,
        direction: t.direction,
        thresholdValue: t.threshold_value,
        thresholdUnit: t.threshold_unit,
        latestValue: latest.value,
        latestAt: latest.recorded_at,
        worstValue: worst.value,
        worstAt: worst.recorded_at,
        breachCount: breaches.length,
        basis: t.basis,
        sourceUrl: t.source_url,
        reviewerName: t.reviewer_name,
        reviewedAt: t.reviewed_at,
        disclosure: SAFETY_ALERT_DISCLOSURE,
      });
    }

    verdicts.push({
      metric,
      verdict: "alert",
      alerts,
      disclosure:
        alerts.length > 0
          ? `${alerts.length} reviewed threshold breach(es). ${SAFETY_ALERT_DISCLOSURE}`
          : ALL_WITHIN_DISCLOSURE,
    });
  }

  return verdicts;
}
