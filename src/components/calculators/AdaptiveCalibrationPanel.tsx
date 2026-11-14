import { useMemo, useState } from "react";
import { Activity, Download, ShieldCheck } from "lucide-react";
import {
  buildCalibrationCandidate,
  compareShadowEstimate,
  exportBudgetCsv,
  suggestCostCode,
  type CalibrationFeedback,
} from "@/lib/estimation/adaptive-calibration";
import {
  getCalibrationFeedback,
  saveCalibrationFeedback,
  updateCalibrationFeedback,
} from "@/lib/estimation/calibration-storage";
import type { LocalProject } from "@/lib/local-projects";

function marketFromProject(project: LocalProject): string {
  const data = project.data as Record<string, unknown>;
  const candidates = [data.marketCode, data.market, data.countryCode];
  const market = candidates.find(
    (value) => typeof value === "string" && /^[A-Za-z]{2,3}$/.test(value),
  );
  return typeof market === "string" ? market.toUpperCase() : "UNKNOWN";
}

export function AdaptiveCalibrationPanel({
  project,
}: {
  project: LocalProject;
}) {
  const [open, setOpen] = useState(false);
  const [material, setMaterial] = useState("");
  const [measure, setMeasure] = useState<"material" | "labour">("material");
  const [estimate, setEstimate] = useState("");
  const [actual, setActual] = useState("");
  const [unit, setUnit] = useState("unit");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [feedbackRows, setFeedbackRows] = useState<CalibrationFeedback[]>(() =>
    getCalibrationFeedback(),
  );
  const [error, setError] = useState("");
  const marketCode = marketFromProject(project);
  const pending = feedbackRows.filter(
    (row) => row.projectId === project.id && row.status === "pending_review",
  );
  const candidate = useMemo(
    () =>
      buildCalibrationCandidate(feedbackRows, marketCode, material, measure),
    [feedbackRows, marketCode, material, measure],
  );
  const shadow = compareShadowEstimate(
    Number(estimate),
    candidate.proposedMultiplier,
  );
  const costCode = suggestCostCode(
    material,
    measure === "material" ? "M" : "L",
  );

  function saveActual() {
    const estimatedQuantity = Number(estimate);
    const actualQuantity = Number(actual);
    if (!material.trim()) {
      setError("Enter the material or trade being measured.");
      return;
    }
    if (
      !Number.isFinite(estimatedQuantity) ||
      estimatedQuantity <= 0 ||
      !Number.isFinite(actualQuantity) ||
      actualQuantity <= 0 ||
      !unit.trim()
    ) {
      setError("Enter positive estimated and actual quantities, plus a unit.");
      return;
    }
    const row: CalibrationFeedback = {
      id: `feedback_${project.id}_${Date.now()}`,
      projectId: project.id,
      marketCode,
      materialKey: material.trim().toLowerCase(),
      measure,
      estimatedQuantity,
      actualQuantity,
      unit: unit.trim(),
      evidence: evidenceReference.trim() ? "verified_project" : "user_reported",
      evidenceReference: evidenceReference.trim() || undefined,
      recordedAt: new Date().toISOString(),
      context: "takeoff",
      status: "pending_review",
    };
    const result = saveCalibrationFeedback(row);
    if (!result) {
      setError(
        "Could not save this record on the device. Check storage space and try again.",
      );
      return;
    }
    setEstimate("");
    setActual("");
    setEvidenceReference("");
    setError("");
    setFeedbackRows(getCalibrationFeedback());
  }

  function downloadCostCodedCsv() {
    const suggestedCode = costCode?.costCode ?? "";
    const data = project.data as Record<string, unknown>;
    const currency = typeof data.currency === "string" ? data.currency : "";
    const csv = exportBudgetCsv([
      {
        costCode: suggestedCode,
        costCodeDescription: costCode?.description ?? "Unclassified",
        costType: measure === "material" ? "M" : "L",
        description: `${material} actuals for ${project.name}`,
        uom: unit,
        quantity: Number(actual) || 0,
        unitCost: null,
        amount: null,
        currency,
        marketCode,
        sourceStatus: "user_entered",
      },
    ]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.name.replace(/[^a-z0-9-_]+/gi, "-")}-cost-codes.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
        aria-expanded={open}
      >
        <Activity className="h-3.5 w-3.5" /> Log actuals & cost codes
      </button>
      {open && (
        <section
          className="mt-3 rounded-xl border border-border bg-background p-4"
          aria-label="Adaptive calibration and Procore cost coding"
        >
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <p>
              Actuals are saved on this device as pending review. They do not
              change calculator rules. Verified records need a review record
              before they can contribute to a candidate.
            </p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs">
              Market
              <input
                value={marketCode}
                readOnly
                className="mt-1 w-full rounded-md border border-border bg-muted px-2 py-1.5"
              />
            </label>
            <label className="text-xs">
              Material / trade
              <input
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="e.g. paint, tile, plaster"
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
              />
            </label>
            <label className="text-xs">
              Measure
              <select
                value={measure}
                onChange={(e) =>
                  setMeasure(e.target.value as "material" | "labour")
                }
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
              >
                <option value="material">Material</option>
                <option value="labour">Labour</option>
              </select>
            </label>
            <label className="text-xs">
              Unit
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
              />
            </label>
            <label className="text-xs">
              Estimated quantity
              <input
                type="number"
                min="0"
                step="any"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
              />
            </label>
            <label className="text-xs">
              Actual quantity
              <input
                type="number"
                min="0"
                step="any"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
              />
            </label>
            <label className="text-xs sm:col-span-2">
              Evidence reference (receipt, close-out record, etc.)
              <input
                value={evidenceReference}
                onChange={(e) => setEvidenceReference(e.target.value)}
                placeholder="Optional reference, not an upload"
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5"
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {error}
            </p>
          )}
          {pending.length > 0 && (
            <div className="mt-3 rounded-lg border border-border p-3">
              <p className="text-xs font-semibold">
                Pending device-owner review ({pending.length})
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Review only records you can substantiate. This local-device
                review is not account-level access control or independent
                verification.
              </p>
              <div className="mt-2 space-y-2">
                {pending.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <span>
                      {row.materialKey}: {row.estimatedQuantity} →{" "}
                      {row.actualQuantity} {row.unit} ({row.evidence})
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          updateCalibrationFeedback(row.id, {
                            status: "accepted",
                            reviewerId: "device_owner_review",
                            reviewedAt: new Date().toISOString(),
                          });
                          setFeedbackRows(getCalibrationFeedback());
                        }}
                        className="rounded border border-border px-2 py-1"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateCalibrationFeedback(row.id, {
                            status: "rejected",
                            reviewerId: "device_owner_review",
                            reviewedAt: new Date().toISOString(),
                          });
                          setFeedbackRows(getCalibrationFeedback());
                        }}
                        className="rounded border border-border px-2 py-1"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveActual}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              Save actuals for review
            </button>
            <button
              type="button"
              onClick={downloadCostCodedCsv}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium"
            >
              <Download className="h-3.5 w-3.5" /> Export cost-coded CSV
            </button>
          </div>
          <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs">
            <p className="font-semibold">
              Calibration status:{" "}
              {candidate.eligible
                ? "candidate ready for owner review"
                : "not enough reviewed evidence"}
            </p>
            <p className="mt-1 text-muted-foreground">
              {candidate.observationCount} accepted observations ·{" "}
              {candidate.verifiedObservationCount} verified · blockers:{" "}
              {candidate.blockers.join(", ") || "none"}
            </p>
            <p className="mt-1 text-muted-foreground">
              Current estimate {shadow.baseline || "—"} {unit}; shadow
              comparison {shadow.shadow || "—"} {unit}. Shadow values are not
              applied to live estimates.
            </p>
            <p className="mt-1 text-muted-foreground">
              Suggested CSI code:{" "}
              {costCode
                ? `${costCode.costCode} · ${costCode.description} · Cost Type ${costCode.costType}`
                : "No safe classification match"}
              . Verify against the project's Procore Work Breakdown Structure
              before use.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
