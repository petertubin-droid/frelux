import React, { Component, useEffect, useId, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Download,
  Globe,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
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
  VALID_MARKET_CODES,
  type CalibrationFeedback,
  type GlobalBudgetRow,
  type ProcoreBudgetRow,
} from "@/lib/estimation/adaptive-calibration";
import {
  CALIBRATION_STORAGE_KEY,
  CALIBRATION_UPDATED_EVENT,
  deleteCalibrationFeedback,
  getApprovalForCandidate,
  getCalibrationFeedback,
  saveCalibrationApproval,
  saveCalibrationFeedback,
  updateCalibrationFeedback,
} from "@/lib/estimation/calibration-storage";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";

export interface CalibrationProjectTarget {
  id: string;
  name: string;
  data?: Record<string, unknown> | null;
  project_data?: Record<string, unknown> | null;
  marketCode?: string;
  currency?: string;
}

class CalibrationErrorBoundary extends Component<
  { children: React.ReactNode; onReset?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Calibration panel error caught by boundary:", error, errorInfo);
  }

  handleClearCorrupted = () => {
    try {
      localStorage.removeItem(CALIBRATION_STORAGE_KEY);
    } catch {
      // ignore
    }
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <p className="font-semibold">Unable to display calibration panel</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            A corrupted feedback entry was detected in local storage.
          </p>
          <button
            type="button"
            onClick={this.handleClearCorrupted}
            className="mt-2 inline-flex items-center gap-1 rounded bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
          >
            <RefreshCw className="h-3 w-3" /> Clear corrupted records & reset
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function resolveProjectMarket(project: CalibrationProjectTarget): string {
  const data = (project.data || project.project_data || {}) as Record<string, unknown>;
  const candidates = [
    project.marketCode,
    data.marketCode,
    data.market,
    data.countryCode,
    data.country,
  ];
  for (const c of candidates) {
    if (typeof c === "string") {
      const upper = c.trim().toUpperCase();
      if (VALID_MARKET_CODES.has(upper)) {
        return upper;
      }
    }
  }
  return "US";
}

function resolveProjectCurrency(project: CalibrationProjectTarget): string {
  const data = (project.data || project.project_data || {}) as Record<string, unknown>;
  if (typeof project.currency === "string" && project.currency.trim()) {
    return project.currency.trim().toUpperCase();
  }
  if (typeof data.currency === "string" && data.currency.trim()) {
    return data.currency.trim().toUpperCase();
  }
  return "USD";
}

function AdaptiveCalibrationPanelContent({
  project,
}: {
  project: CalibrationProjectTarget;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [material, setMaterial] = useState("");
  const [measure, setMeasure] = useState<"material" | "labour">("material");
  const [estimate, setEstimate] = useState("");
  const [actual, setActual] = useState("");
  const [unit, setUnit] = useState("unit");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeApprovalKey, setActiveApprovalKey] = useState<string | null>(null);

  const initialMarket = useMemo(() => resolveProjectMarket(project), [project]);
  const [selectedMarket, setSelectedMarket] = useState<string>(initialMarket);

  // Lazy loading: only fetch records from storage when panel is opened
  const [feedbackRows, setFeedbackRows] = useState<CalibrationFeedback[]>([]);

  useEffect(() => {
    if (!open) return;
    setFeedbackRows(getCalibrationFeedback());

    const handleStorageChange = () => {
      setFeedbackRows(getCalibrationFeedback());
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(CALIBRATION_UPDATED_EVENT, handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(CALIBRATION_UPDATED_EVENT, handleStorageChange);
    };
  }, [open]);

  const currency = useMemo(() => resolveProjectCurrency(project), [project]);
  const primaryStandard = useMemo(
    () => getPrimaryClassificationForMarket(selectedMarket),
    [selectedMarket],
  );

  const pending = useMemo(
    () =>
      feedbackRows.filter(
        (row) => row.projectId === project.id && row.status === "pending_review",
      ),
    [feedbackRows, project.id],
  );

  const candidate = useMemo(
    () =>
      buildCalibrationCandidate(
        feedbackRows,
        selectedMarket,
        material,
        measure,
        unit.trim() || undefined,
      ),
    [feedbackRows, selectedMarket, material, measure, unit],
  );

  const candidateKey = useMemo(
    () =>
      calibrationCandidateKey({
        marketCode: selectedMarket,
        materialKey: material,
        measure,
        unit: unit.trim() || undefined,
      }),
    [selectedMarket, material, measure, unit],
  );

  const storedApproval = useMemo(() => {
    void activeApprovalKey;
    return getApprovalForCandidate(candidateKey);
  }, [candidateKey, activeApprovalKey]);

  const verifiedMultiplier = useMemo(() => {
    if (storedApproval) {
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
        ? resolveGlobalClassification(material, selectedMarket)
        : null,
    [material, selectedMarket],
  );

  const costCode = useMemo(
    () =>
      suggestCostCode(
        material,
        measure === "material" ? "M" : "L",
        selectedMarket,
      ),
    [material, measure, selectedMarket],
  );

  function handleSaveActual() {
    setError("");
    const estimatedQuantity = Number(estimate);
    const actualQuantity = Number(actual);
    const trimmedMaterial = material.trim().toLowerCase();
    const trimmedUnit = unit.trim().toLowerCase();

    if (!trimmedMaterial) {
      setError("Please enter the material or trade being measured.");
      return;
    }
    if (
      !Number.isFinite(estimatedQuantity) ||
      estimatedQuantity <= 0 ||
      !Number.isFinite(actualQuantity) ||
      actualQuantity <= 0 ||
      !trimmedUnit
    ) {
      setError("Enter positive estimated and actual quantities, and specify a unit.");
      return;
    }

    const ref = evidenceReference.trim();
    if (ref && ref.length < 3) {
      setError("Evidence reference must be at least 3 characters (e.g. PO number, ticket or delivery note).");
      return;
    }

    setIsSaving(true);
    try {
      const row: CalibrationFeedback = {
        id: `feedback_${project.id}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        projectId: project.id,
        marketCode: selectedMarket,
        materialKey: trimmedMaterial,
        measure,
        estimatedQuantity,
        actualQuantity,
        unit: trimmedUnit,
        evidence: ref ? "verified_project" : "user_reported",
        evidenceReference: ref || undefined,
        recordedAt: new Date().toISOString(),
        context: "takeoff",
        status: "pending_review",
      };

      const success = saveCalibrationFeedback(row);
      if (!success) {
        setError("Unable to save feedback to local storage. Check available storage space.");
        return;
      }

      setEstimate("");
      setActual("");
      setEvidenceReference("");
      setFeedbackRows(getCalibrationFeedback());
    } finally {
      setIsSaving(false);
    }
  }

  function handleAutoApprove() {
    if (!candidate.tripleCheck || !candidate.tripleCheck.passed) return;
    const { approval } = autoApproveVerifiedCandidate(candidate, feedbackRows);
    if (approval) {
      saveCalibrationApproval(approval);
      setActiveApprovalKey(approval.candidateFingerprint);
      setFeedbackRows(getCalibrationFeedback());
    }
  }

  function downloadGlobalWbsCsv() {
    const projectSavedRows = feedbackRows.filter(
      (r) => r.projectId === project.id && r.status === "accepted",
    );

    const multStatus =
      verifiedMultiplier !== null
        ? "verified_triple_check"
        : storedApproval
          ? "manual_approved"
          : "uncalibrated";

    let rowsToExport: GlobalBudgetRow[] = [];

    if (projectSavedRows.length > 0) {
      rowsToExport = projectSavedRows.map((r) => {
        const itemClass = resolveGlobalClassification(r.materialKey, selectedMarket);
        const itemCostCode = suggestCostCode(
          r.materialKey,
          r.measure === "material" ? "M" : "L",
          selectedMarket,
        );
        const cal = compareShadowEstimate(r.estimatedQuantity, activeMultiplier);
        return {
          costCode: itemClass?.masterFormat.code ?? itemCostCode?.costCode ?? "01 00 00",
          costCodeDescription: itemClass?.masterFormat.title ?? itemCostCode?.description ?? r.materialKey,
          costType: r.measure === "material" ? "M" : "L",
          description: `${r.materialKey} takeoff for ${project.name}`,
          uom: r.unit,
          quantity: r.actualQuantity,
          baseQuantity: r.estimatedQuantity,
          multiplier: activeMultiplier,
          multiplierStatus: multStatus,
          unitCost: null,
          amount: null,
          currency,
          marketCode: selectedMarket,
          sourceStatus: r.evidence === "verified_project" ? "verified" : "user_entered",
          primaryStandard: itemClass?.primaryStandardName ?? primaryStandard.standard,
          uniFormat: itemClass?.uniFormat.code ?? "B1010",
          uniclass2015: itemClass?.uniclass2015.code ?? "Ss_20_10",
          nrm2: itemClass?.nrm2.code ?? "Section 11",
          din276: itemClass?.din276.code ?? "330",
        };
      });
    } else {
      const baseQty = Number(estimate) || 0;
      const calQty = shadow.shadow || baseQty;
      rowsToExport = [
        {
          costCode: globalClass?.masterFormat.code ?? costCode?.costCode ?? "01 00 00",
          costCodeDescription:
            globalClass?.masterFormat.title ?? costCode?.description ?? (material || "General Takeoff"),
          costType: measure === "material" ? "M" : "L",
          description: `${material || "Material"} actuals for ${project.name}`,
          uom: unit || "unit",
          quantity: calQty,
          baseQuantity: baseQty,
          multiplier: activeMultiplier,
          multiplierStatus: multStatus,
          unitCost: null,
          amount: null,
          currency,
          marketCode: selectedMarket,
          sourceStatus: evidenceReference.trim() ? "verified" : "user_entered",
          primaryStandard: globalClass?.primaryStandardName ?? primaryStandard.standard,
          uniFormat: globalClass?.uniFormat.code ?? "B1010",
          uniclass2015: globalClass?.uniclass2015.code ?? "Ss_20_10",
          nrm2: globalClass?.nrm2.code ?? "Section 11",
          din276: globalClass?.din276.code ?? "330",
        },
      ];
    }

    const csv = exportGlobalBudgetCsv(rowsToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.name.replace(/[^a-z0-9-_]+/gi, "-")}-global-wbs.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadStandardCostCodedCsv() {
    const projectSavedRows = feedbackRows.filter(
      (r) => r.projectId === project.id && r.status === "accepted",
    );

    let rowsToExport: ProcoreBudgetRow[] = [];

    if (projectSavedRows.length > 0) {
      rowsToExport = projectSavedRows.map((r) => {
        const itemCostCode = suggestCostCode(
          r.materialKey,
          r.measure === "material" ? "M" : "L",
          selectedMarket,
        );
        return {
          costCode: itemCostCode?.costCode ?? "01 00 00",
          costCodeDescription: itemCostCode?.description ?? r.materialKey,
          costType: r.measure === "material" ? "M" : "L",
          description: `${r.materialKey} actuals for ${project.name}`,
          uom: r.unit,
          quantity: r.actualQuantity,
          unitCost: null,
          amount: null,
          currency,
          marketCode: selectedMarket,
          sourceStatus: r.evidence === "verified_project" ? "verified" : "user_entered",
        };
      });
    } else {
      rowsToExport = [
        {
          costCode: costCode?.costCode ?? "01 00 00",
          costCodeDescription: costCode?.description ?? (material || "Unclassified"),
          costType: measure === "material" ? "M" : "L",
          description: `${material || "Takeoff"} actuals for ${project.name}`,
          uom: unit || "unit",
          quantity: Number(actual) || Number(estimate) || 0,
          unitCost: null,
          amount: null,
          currency,
          marketCode: selectedMarket,
          sourceStatus: "user_entered",
        },
      ];
    }

    const csv = exportBudgetCsv(rowsToExport);
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <Activity className="h-3.5 w-3.5" /> Log actuals & global WBS coding
      </Button>

      {open && (
        <section
          id={panelId}
          className="mt-3 rounded-xl border border-border bg-card p-4 shadow-sm"
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
                {selectedMarket}: {primaryStandard.standard}
              </span>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-foreground">
              Market
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {Array.from(VALID_MARKET_CODES).sort().map((code) => (
                  <option key={code} value={code}>
                    {code} ({getPrimaryClassificationForMarket(code).standard})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-medium text-foreground">
              Material / trade
              <Input
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="e.g. concrete, paint, tile, block, steel door"
                className="mt-1 text-xs"
              />
            </label>

            <label className="text-xs font-medium text-foreground">
              Measure
              <select
                value={measure}
                onChange={(e) =>
                  setMeasure(e.target.value as "material" | "labour")
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="material">Material Takeoff</option>
                <option value="labour">Labour Productivity</option>
              </select>
            </label>

            <label className="text-xs font-medium text-foreground">
              Unit of Measure
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. m3, bag, kg, m2, ltr"
                className="mt-1 text-xs"
              />
            </label>

            <label className="text-xs font-medium text-foreground">
              Estimated quantity
              <Input
                type="number"
                min="0"
                step="any"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="0.00"
                className="mt-1 text-xs"
              />
            </label>

            <label className="text-xs font-medium text-foreground">
              Actual quantity
              <Input
                type="number"
                min="0"
                step="any"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                placeholder="0.00"
                className="mt-1 text-xs"
              />
            </label>

            <label className="text-xs font-medium text-foreground sm:col-span-2">
              Evidence reference (verified invoice, delivery ticket, site close-out note)
              <Input
                value={evidenceReference}
                onChange={(e) => setEvidenceReference(e.target.value)}
                placeholder="Required for verified status (e.g. PO-84920, Site closeout sign-off)"
                className="mt-1 text-xs"
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">
                Self-entered records with delivery tickets are local owner reviews unless verified by independent third-party auditor.
              </span>
            </label>
          </div>

          {error && (
            <p role="alert" className="mt-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          {pending.length > 0 && (
            <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs font-semibold text-foreground">
                Pending local review ({pending.length})
              </p>
              <div className="mt-2 space-y-2">
                {pending.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/80 bg-background/80 p-2 text-xs"
                  >
                    <span>
                      <strong className="text-foreground">{row.materialKey}</strong>: {row.estimatedQuantity} →{" "}
                      {row.actualQuantity} {row.unit} ({row.evidence})
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updateCalibrationFeedback(row.id, {
                            status: "accepted",
                            reviewerId: "device_owner_review",
                            reviewedAt: new Date().toISOString(),
                          });
                          setFeedbackRows(getCalibrationFeedback());
                        }}
                        className="h-7 text-xs"
                      >
                        Accept
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updateCalibrationFeedback(row.id, {
                            status: "rejected",
                            reviewerId: "device_owner_review",
                            reviewedAt: new Date().toISOString(),
                          });
                          setFeedbackRows(getCalibrationFeedback());
                        }}
                        className="h-7 text-xs"
                      >
                        Reject
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          deleteCalibrationFeedback(row.id);
                          setFeedbackRows(getCalibrationFeedback());
                        }}
                        className="h-7 px-1.5 text-xs text-destructive hover:bg-destructive/10"
                        title="Delete mistake"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleSaveActual}
              disabled={isSaving}
              size="sm"
              className="text-xs font-semibold"
            >
              Save actuals for review
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadGlobalWbsCsv}
              className="inline-flex items-center gap-1 text-xs"
            >
              <Download className="h-3.5 w-3.5" /> Export Global WBS CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadStandardCostCodedCsv}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            >
              <Download className="h-3.5 w-3.5" /> Export Standard CSV
            </Button>
          </div>

          {/* Autonomous Triple-Check Multiplier Verification Status */}
          <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-foreground">
                Triple-Check Multiplier Verification Status
              </span>
              {candidate.tripleCheck?.passed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Consensus Verified & Certified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-3 w-3" /> Verification In Progress / Awaiting Consensus
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
                  HHI: {candidate.tripleCheck?.dispersion.hhi ?? "—"} (Limit ≤ 0.380)
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                  Inter-Site CV:{" "}
                  {candidate.tripleCheck?.dispersion.interProjectCV !== undefined
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
                  Category: {candidate.tripleCheck?.physics.category ?? "default"}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                  Allowed: [{candidate.tripleCheck?.physics.bounds[0] ?? 0.8},{" "}
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
                <Button
                  type="button"
                  onClick={handleAutoApprove}
                  size="sm"
                  className="bg-emerald-600 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  <Sparkles className="h-3 w-3" /> Activate Certified Multiplier
                </Button>
              </div>
            )}

            {candidate.blockers && candidate.blockers.length > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Verification criteria pending: {candidate.blockers.join(", ")}
              </p>
            )}

            <div className="mt-2 text-[11px] text-muted-foreground">
              Current estimate: {shadow.baseline || "—"} {unit} → Calibrated:{" "}
              {shadow.shadow || "—"} {unit} (Δ{" "}
              {shadow.delta > 0 ? `+${shadow.delta}` : shadow.delta} {unit})
              {candidate.medianMultiplier && (
                <> · Robust median: {candidate.medianMultiplier}x</>
              )}
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
                    {globalClass.masterFormat.code} · {globalClass.masterFormat.title}
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
                    {globalClass.uniclass2015.code} · {globalClass.uniclass2015.title}
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

export function AdaptiveCalibrationPanel({
  project,
}: {
  project: CalibrationProjectTarget;
}) {
  return (
    <CalibrationErrorBoundary>
      <AdaptiveCalibrationPanelContent project={project} />
    </CalibrationErrorBoundary>
  );
}
