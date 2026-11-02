/**
 * Safety-risk outputs: decision support only + independent
 * validation gate — FRELUX engine #3 "Predictive analytics &
 * AI" milestone 4 (2026-10-15).
 *
 * THE GATE IS STRUCTURAL, NOT COSMETIC:
 *  - Safety outputs are ALWAYS labeled decision support.
 *  - They may only be presented as "validated" when an
 *    INDEPENDENT validation record exists for the safety_risk
 *    scope in predictive_model_validations — a table the app
 *    cannot write to as a normal user (restricted RLS).
 *  - The app never self-certifies. Absence of a record keeps
 *    every safety output in pending-validation mode.
 *
 * The scoring itself is DETERMINISTIC and evidence-based from
 * the owner's outcome dataset:
 *  - Per-market incident baseline (incidents per completed
 *    project) from records the owner recorded.
 *  - Deterministic drivers with documented thresholds:
 *      stories > 3  (multi-storey work)
 *      excavation_depth_m >= 1.5 (deep excavation)
 *      weather_delay_days share > 25% of project duration
 *  - No adequate dataset => refusal (insufficient_data),
 *    never a national-average invention.
 */

import { supabase } from "@/lib/supabase";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";
import { assessMarketDataQuality, type DataQualityLabel } from "./data-quality";
import type { ProjectOutcomeRecord } from "./outcomes";

export const SAFETY_MODEL_SCOPE = "safety_risk" as const;

export interface SafetyRiskInput {
  market_code: string;
  stories: number | null;
  excavation_depth_m: number | null;
  weather_delay_days: number | null;
  planned_duration_days: number | null;
}

export interface SafetyValidationRecord {
  id: string;
  model_scope: string;
  method: string;
  validator_name: string;
  validated_on: string;
  scope_summary: string;
  limitations: string;
  created_at: string;
}

export interface SafetyRiskAssessment {
  status: "ok" | "insufficient_data" | "unsupported_region";
  market_code: string;
  /** ALWAYS "decision_support" until independently validated. */
  output_class: "decision_support";
  /** Deterministic incident-rate baseline per project, from the owner's dataset. */
  baseline_incidents_per_project: number | null;
  baseline_projects: number;
  drivers: { driver: string; triggered: boolean; detail: string }[];
  /** Risk band relative to the market baseline: raised when any driver triggers. */
  risk_band: "at_baseline" | "raised" | null;
  data_quality: ReturnType<typeof assessMarketDataQuality> | null;
  validation: SafetyValidationRecord | null;
  disclosure: string;
}

/** Fetch the newest independent validation record for a scope. */
export async function fetchSafetyValidation(): Promise<SafetyValidationRecord | null> {
  const { data, error } = await supabase
    .from("predictive_model_validations")
    .select("*")
    .eq("model_scope", SAFETY_MODEL_SCOPE)
    .order("validated_on", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0] as SafetyValidationRecord;
}

/**
 * Deterministic safety-risk assessment. Pure: dataset, records
 * and validation record are passed in (the caller loads them).
 * Refusals are honest — no invented national averages.
 */
export function assessSafetyRisk(input: {
  project: SafetyRiskInput;
  records: ProjectOutcomeRecord[];
  validation: SafetyValidationRecord | null;
  now?: Date;
}): SafetyRiskAssessment {
  const { project, records, validation } = input;
  const now = input.now ?? new Date();

  if (!ALL_MARKET_CODES.includes(project.market_code)) {
    return {
      status: "unsupported_region",
      market_code: project.market_code,
      output_class: "decision_support",
      baseline_incidents_per_project: null,
      baseline_projects: 0,
      drivers: [],
      risk_band: null,
      data_quality: null,
      validation,
      disclosure: `Market "${project.market_code}" is not in the 20-market registry; no safety assessment is produced outside registered markets.`,
    };
  }

  const quality = assessMarketDataQuality({
    market_code: project.market_code,
    label: "safety_incident_count" satisfies DataQualityLabel,
    records,
    now,
  });
  const marketRecords = records.filter(
    (r) => r.market_code === project.market_code,
  );

  if (quality.verdict === "insufficient_data") {
    return {
      status: "insufficient_data",
      market_code: project.market_code,
      output_class: "decision_support",
      baseline_incidents_per_project: null,
      baseline_projects: marketRecords.length,
      drivers: [],
      risk_band: null,
      data_quality: quality,
      validation,
      disclosure: `No safety-risk assessment for ${project.market_code}: the recorded outcome history is below the data-quality gates. ${quality.disclosure} FRELUX does not substitute national averages or invented baselines.`,
    };
  }

  const incidents = marketRecords.reduce(
    (s, r) => s + (r.safety_incident_count ?? 0),
    0,
  );
  const baseline = incidents / marketRecords.length;

  const drivers: SafetyRiskAssessment["drivers"] = [
    {
      driver: "multi_storey",
      triggered: project.stories !== null && project.stories > 3,
      detail:
        project.stories === null
          ? "Storey count not recorded; the multi-storey driver cannot be evaluated."
          : project.stories > 3
            ? `${project.stories} storeys — above the 3-storey threshold for heightened fall/structural exposure.`
            : `${project.stories} storeys — within the standard band.`,
    },
    {
      driver: "deep_excavation",
      triggered:
        project.excavation_depth_m !== null && project.excavation_depth_m >= 1.5,
      detail:
        project.excavation_depth_m === null
          ? "Excavation depth not recorded; the deep-excavation driver cannot be evaluated."
          : project.excavation_depth_m >= 1.5
            ? `${project.excavation_depth_m} m excavation — at/above the 1.5 m threshold requiring shoring and collapse controls.`
            : `${project.excavation_depth_m} m excavation — below the 1.5 m deep-excavation threshold.`,
    },
    {
      driver: "weather_exposure",
      triggered:
        project.weather_delay_days !== null &&
        project.planned_duration_days !== null &&
        project.planned_duration_days > 0 &&
        project.weather_delay_days / project.planned_duration_days > 0.25,
      detail:
        project.weather_delay_days === null || project.planned_duration_days === null
          ? "Weather-delay share not computable: duration or weather days not recorded."
          : project.weather_delay_days / Math.max(project.planned_duration_days, 1) > 0.25
            ? "Weather delays exceed 25% of planned duration — schedule pressure correlates with rushed work and incident risk."
            : "Weather delays within the normal share of the planned duration.",
    },
  ];

  const anyTriggered = drivers.some((d) => d.triggered);

  const qualityNote =
    quality.verdict === "adequate"
      ? "The market's outcome history passes the data-quality gates."
      : `CAUTION: the market's outcome history is ${quality.verdict.replace("_", " ")}; treat this assessment with the corresponding caution.`;

  const validationNote = validation
    ? `An independent validation record exists (validated by ${validation.validator_name} on ${validation.validated_on}; scope: ${validation.scope_summary}).`
    : "No independent validation record exists for this safety model yet: this output is DECISION SUPPORT ONLY, pending independent validation. FRELUX does not self-certify.";

  return {
    status: "ok",
    market_code: project.market_code,
    output_class: "decision_support",
    baseline_incidents_per_project: baseline,
    baseline_projects: marketRecords.length,
    drivers,
    risk_band: anyTriggered ? "raised" : "at_baseline",
    data_quality: quality,
    validation,
    disclosure:
      `Decision support, not a certified safety assessment. Baseline: ${incidents} incident(s) across ${marketRecords.length} completed ${project.market_code} project(s) you recorded (${baseline.toFixed(2)} per project). ` +
      `Risk band: ${anyTriggered ? "raised" : "at baseline"} relative to that history. ` +
      `${qualityNote} ${validationNote}`,
  };
}
