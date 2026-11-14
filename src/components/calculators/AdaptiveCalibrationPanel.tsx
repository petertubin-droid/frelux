import { useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Download,
  Globe,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  autoApproveVerifiedCandidate,
  buildCalibrationCandidate,
  calibrationCandidateKey,
  compareShadowEstimate,
  exportBudgetCsv,
  exportGlobalBudgetCsv,
  getPrimaryClassificationForMarket,
  resolveApprovedMultiplier,
  resolveGlobalClassification,
  suggestCostCode,
  type CalibrationFeedback,
  type GlobalBudgetRow,
} from "@/lib/estimation/adaptive-calibration";
import {
  getApprovalForCandidate,
  getCalibrationFeedback,
  saveCalibrationApproval,
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
  return typeof market === "string" ? market.toUpperCase() : "US";
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
  const [activeApprovalKey, setActiveApprovalKey] = useState<string | null>(
    null,
  );

  const marketCode = marketFromProject(project);
  const primaryStandard = getPrimaryClassificationForMarket(marketCode);

  const pending = feedbackRows.filter(
    (row) => row.projectId === project.id && row.status === "pending_review",
  );

  const candidate = useMemo(
    () =>
      buildCalibrationCandidate(feedbackRows, marketCode, material, measure),
    [feedbackRows, marketCode, material, measure],
  );

  const candidateKey = useMemo(
    () =>
      calibrationCandidateKey({ marketCode, materialKey: material, measure }),
    [marketCode, material, measure],
  );

  const storedApproval = useMemo(() => {
    void activeApprovalKey;
    return getApprovalForCandidate(candidateKey);
  }, [candidateKey, activeApprovalKey]);

  const verifiedMultiplier = useMemo(() => {
    if (storedApproval && candidate.tripleCheck) {
      return resolveApprovedMultiplier(
        candidate,
        storedApproval,
        storedApproval.candidateFingerprint,
      );
    }
    if (
      candidate.verifiedAndApproved &&
      candidate.tripleCheck?.consensusMultiplier
    ) {
      return candidate.tripleCheck.consensusMultiplier;
    }
    return null;
  }, [candidate, storedApproval]);

  const activeMultiplier = verifiedMultiplier ?? candidate.proposedMultiplier;

  const shadow = compareShadowEstimate(Number(estimate), activeMultiplier);

  const globalClass = useMemo(
    () =>
      material.trim()
        ? resolveGlobalClassification(material, marketCode)
        : null,
    [material, marketCode],
  );

  const costCode = suggestCostCode(
    material,
    measure === "material" ? "M" : "L",
    marketCode,
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

  function handleAutoApprove() {
    if (!candidate.tripleCheck || !candidate.tripleCheck.passed) return;
    const { approval } = autoApproveVerifiedCandidate(candidate, feedbackRows);
    if (approval) {
      saveCalibrationApproval(approval);
      setActiveApprovalKey(approval.candidateFingerprint);
    }
  }

  function downloadGlobalWbsCsv() {
    const data = project.data as Record<string, unknown>;
    const currency = typeof data.currency === "string" ? data.currency : "USD";
    const baseQty = Number(estimate) || 0;
    const calibratedQty = shadow.shadow || baseQty;
    const multStatus =
      verifiedMultiplier !== null
        ? "verified_triple_check"
        : storedApproval
          ? "manual_approved"
          : "uncalibrated";

    const row: GlobalBudgetRow = {
      costCode:
        globalClass?.masterFormat.code ?? costCode?.costCode ?? "00 00 00",
      costCodeDescription:
        globalClass?.masterFormat.title ??
        costCode?.description ??
        "General Takeoff",
      costType: measure === "material" ? "M" : "L",
      description: `${material || "Material"} actuals for ${project.name}`,
      uom: unit,
      quantity: calibratedQty,
      baseQuantity: baseQty,
      multiplier: activeMultiplier,
      multiplierStatus: multStatus,
      unitCost: null,
      amount: null,
      currency,
      marketCode,
      sourceStatus: "verified",
      primaryStandard:
        globalClass?.primaryStandardName ?? primaryStandard.standard,
      uniFormat: globalClass?.uniFormat.code ?? "B1010",
      uniclass2015: globalClass?.uniclass2015.code ?? "Ss_20_10",
      nrm2: globalClass?.nrm2.code ?? "Section 11",
      din276: globalClass?.din276.code ?? "330",
    };

    const csv = exportGlobalBudgetCsv([row]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.name.replace(/[^a-z0-9-_]+/gi, "-")}-global-wbs.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadStandardCostCodedCsv() {
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

  const maxDelta = candidate.tripleCheck?.estimators.maxPairwiseDelta;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
        aria-expanded={open}
      >
        <Activity className="h-3.5 w-3.5" /> Log actuals & global WBS coding
      </button>
      {open && (
        <section
          className="mt-3 rounded-xl border border-border bg-background p-4"
          aria-label="Adaptive calibration, triple-check verification and global cost coding"
        >
          <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="font-semibold text-foreground">
                  Global Construction Calibration & Triple-Check Consensus
                </p>
                <p className="mt-0.5">
                  Multi-estimator triangulation, cross-project dispersion check,
                  and physical bounds validation beyond Procore standards.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span>
                {marketCode}: {primaryStandard.standard}
              </span>
            </div>
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
                placeholder="e.g. concrete, paint, tile, block"
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
                <option value="material">Material Takeoff</option>
                <option value="labour">Labour Productivity</option>
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
              Evidence reference (verified receipt, delivery note, close-out
              sign-off)
              <input
                value={evidenceReference}
                onChange={(e) => setEvidenceReference(e.target.value)}
                placeholder="Required for verified status (e.g. PO-84920, Site closeout sign-off)"
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
                Pending local review ({pending.length})
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
                        className="rounded border border-border px-2 py-1 hover:bg-muted"
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
                        className="rounded border border-border px-2 py-1 hover:bg-muted"
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
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Save actuals for review
            </button>
            <button
              type="button"
              onClick={downloadGlobalWbsCsv}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" /> Export Global WBS CSV
              (Procore + Uniclass + DIN276)
            </button>
            <button
              type="button"
              onClick={downloadStandardCostCodedCsv}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" /> Export Standard CSV
            </button>
          </div>

          {/* Autonomous Triple-Check Multiplier Verification Status */}
          <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-foreground">
                Triple-Check Multiplier Verification Status
              </span>
              {candidate.tripleCheck?.passed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Consensus Verified &
                  Certified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-3 w-3" /> Verification In Progress /
                  Awaiting Consensus
                </span>
              )}
            </div>

            <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-border/80 bg-background/80 p-2.5">
                <p className="font-medium text-foreground">
                  1. Tri-Estimator Consensus
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  EMA: {candidate.tripleCheck?.estimators.ema ?? "—"} · HL:{" "}
                  {candidate.tripleCheck?.estimators.hodgesLehmann ?? "—"} · TM:{" "}
                  {candidate.tripleCheck?.estimators.trimmedMean ?? "—"}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                  Spread Δ:{" "}
                  {maxDelta !== null && maxDelta !== undefined
                    ? `${(maxDelta * 100).toFixed(2)}%`
                    : "—"}{" "}
                  (Max ≤ 3.5%)
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-background/80 p-2.5">
                <p className="font-medium text-foreground">
                  2. Cross-Project Dispersion
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  HHI: {candidate.tripleCheck?.dispersion.hhi ?? "—"} (Limit ≤
                  0.380)
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                  Inter-Site CV:{" "}
                  {candidate.tripleCheck?.dispersion.interProjectCV !==
                  undefined
                    ? `${(candidate.tripleCheck.dispersion.interProjectCV * 100).toFixed(1)}%`
                    : "—"}{" "}
                  (Limit ≤ 15.0%)
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-background/80 p-2.5">
                <p className="font-medium text-foreground">
                  3. Domain Physics Bounds
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Rule: {candidate.tripleCheck?.physics.category ?? "default"}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                  Limits: [{candidate.tripleCheck?.physics.bounds[0] ?? 0.8},{" "}
                  {candidate.tripleCheck?.physics.bounds[1] ?? 1.25}]
                </p>
              </div>
            </div>

            {candidate.tripleCheck?.passed && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                <div>
                  <p className="font-medium text-emerald-800 dark:text-emerald-200">
                    Certified Multiplier:{" "}
                    <span className="font-bold">
                      {candidate.tripleCheck.consensusMultiplier}x
                    </span>
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Fingerprint: {candidate.tripleCheck.fingerprint}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoApprove}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  <Sparkles className="h-3 w-3" /> Activate Certified Multiplier
                </button>
              </div>
            )}

            {candidate.tripleCheck?.blockers &&
              candidate.tripleCheck.blockers.length > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Verification criteria pending:{" "}
                  {candidate.tripleCheck.blockers.join(", ")}
                </p>
              )}

            <div className="mt-2 text-[11px] text-muted-foreground">
              Current estimate: {shadow.baseline || "—"} {unit} → Calibrated:{" "}
              {shadow.shadow || "—"} {unit} (Δ{" "}
              {shadow.delta > 0 ? `+${shadow.delta}` : shadow.delta} {unit})
            </div>
          </div>

          {/* Multi-Standard International Classification Directory */}
          {globalClass && (
            <div className="mt-3 rounded-lg border border-border bg-background p-3 text-xs">
              <p className="font-semibold text-foreground">
                International Construction Classification:{" "}
                {globalClass.primaryStandardName}
              </p>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2 text-[11px]">
                <div>
                  <span className="font-medium text-foreground">
                    CSI MasterFormat (US/CA):
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {globalClass.masterFormat.code} ·{" "}
                    {globalClass.masterFormat.title}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    UniFormat II (Systems):
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {globalClass.uniFormat.code} · {globalClass.uniFormat.title}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    Uniclass 2015 (UK/SG/BIM):
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {globalClass.uniclass2015.code} ·{" "}
                    {globalClass.uniclass2015.title}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    NRM2 (RICS/Middle East):
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {globalClass.nrm2.code} · {globalClass.nrm2.title}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    DIN 276 (Germany/EU):
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {globalClass.din276.code} · {globalClass.din276.title}
                  </span>
                </div>
                {globalClass.natspec && (
                  <div>
                    <span className="font-medium text-foreground">
                      NATSPEC (Australia):
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {globalClass.natspec.code} · {globalClass.natspec.title}
                    </span>
                  </div>
                )}
                {globalClass.sans1200 && (
                  <div>
                    <span className="font-medium text-foreground">
                      SANS 1200 (South Africa):
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {globalClass.sans1200.code} · {globalClass.sans1200.title}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
