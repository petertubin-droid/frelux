import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Check,
  Download,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";
import {
  buildCalibrationCandidates,
  empiricalConfidenceRange,
  exportBudgetCsv,
  normaliseMaterialKey,
  normaliseUnit,
  suggestCostCode,
  type CalibrationFeedback,
  type CalibrationMeasure,
} from "@/lib/estimation/adaptive-calibration";
import {
  calibrationFailureMessage,
  marketFromProject,
  type CalibrationProject,
} from "@/lib/estimation/calibration-project";
import {
  invalidateCalibrationCache,
  loadCalibrationFeedback,
  persistCalibrationFeedback,
  removeCalibrationFeedback,
  reviewCalibrationFeedback,
  type CalibrationSnapshot,
} from "@/lib/estimation/calibration-repository";
import { subscribeCalibrationFeedback } from "@/lib/estimation/calibration-storage";

export function AdaptiveCalibrationPanel({
  project,
}: {
  project: CalibrationProject;
}) {
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();
  const derivedMarket = marketFromProject(project);
  const [open, setOpen] = useState(false);
  const [market, setMarket] = useState(derivedMarket);
  const [material, setMaterial] = useState("");
  const [measure, setMeasure] = useState<CalibrationMeasure>("material");
  const [estimate, setEstimate] = useState("");
  const [actual, setActual] = useState("");
  const [unit, setUnit] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [snapshot, setSnapshot] = useState<CalibrationSnapshot | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setMarket(derivedMarket);
  }, [derivedMarket]);

  useEffect(() => {
    let alive = true;
    loadCalibrationFeedback(project.id).then((result) => {
      if (alive) setSnapshot(result);
    });
    return () => {
      alive = false;
    };
  }, [project.id, reloadToken]);

  useEffect(
    () => subscribeCalibrationFeedback(() => setReloadToken((n) => n + 1)),
    [],
  );

  const refresh = useCallback(() => {
    invalidateCalibrationCache();
    setReloadToken((n) => n + 1);
  }, []);
  const formatQuantity = (value: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(
      value,
    );

  const rows = useMemo(
    () => (snapshot?.rows ?? []).filter((row) => row.projectId === project.id),
    [snapshot, project.id],
  );

  const candidates = useMemo(
    () =>
      market ? buildCalibrationCandidates(rows, { marketCode: market }) : [],
    [rows, market],
  );

  const pending = rows.filter((row) => row.status === "pending_review");

  const formMaterialKey = normaliseMaterialKey(material);
  const formUnit = normaliseUnit(unit);
  const range = useMemo(() => {
    if (!market || !formMaterialKey || !formUnit) return null;
    return empiricalConfidenceRange(Number(estimate), rows, {
      marketCode: market,
      materialKey: formMaterialKey,
      measure,
      unit: formUnit,
    });
  }, [rows, market, formMaterialKey, formUnit, measure, estimate]);

  async function saveActual() {
    const estimatedQuantity = Number(estimate);
    const actualQuantity = Number(actual);
    const materialKey = normaliseMaterialKey(material);
    const unitKey = normaliseUnit(unit);
    setError("");
    setNotice("");
    if (!market) {
      setError(
        "Choose the project's market first. A currency code is not a market.",
      );
      return;
    }
    if (!materialKey) {
      setError("Enter the material or trade being measured.");
      return;
    }
    if (
      !Number.isFinite(estimatedQuantity) ||
      estimatedQuantity <= 0 ||
      !Number.isFinite(actualQuantity) ||
      actualQuantity <= 0 ||
      !unitKey
    ) {
      setError("Enter positive estimated and actual quantities, plus a unit.");
      return;
    }
    const row: CalibrationFeedback = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `feedback_${crypto.randomUUID()}`
          : `feedback_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      projectId: project.id,
      marketCode: market,
      materialKey,
      measure,
      estimatedQuantity,
      actualQuantity,
      unit: unitKey,
      evidence: "self_attested",
      evidenceReference: reference.trim() || undefined,
      recordedAt: new Date().toISOString(),
      context: "takeoff",
      status: "pending_review",
      source: user ? "cloud" : "device",
    };
    setBusy(true);
    const result = await persistCalibrationFeedback(row);
    setBusy(false);
    if (!result.ok) {
      setError(calibrationFailureMessage(result.reason));
      return;
    }
    setEstimate("");
    setActual("");
    setReference("");
    setNotice("Saved for review. It does not change calculator rules.");
    refresh();
  }

  async function review(
    row: CalibrationFeedback,
    decision: "accepted" | "rejected",
  ) {
    setBusy(true);
    setError("");
    const result = await reviewCalibrationFeedback({
      id: row.id,
      decision,
      reviewerId: user?.id ?? "device_owner",
      reviewerRole: isAdmin ? "admin" : "owner",
      reason: isAdmin
        ? "Administrator review"
        : "Self review by the record owner",
    });
    setBusy(false);
    if (!result.ok) {
      setError(calibrationFailureMessage(result.reason));
      return;
    }
    setNotice(
      isAdmin && decision === "accepted"
        ? "Verified. This record now counts toward the verified quota."
        : decision === "accepted"
          ? "Accepted as self attested. Only an administrator can verify it."
          : "Record rejected. It stays on file but is not evidence.",
    );
    refresh();
  }

  async function remove(row: CalibrationFeedback) {
    setBusy(true);
    const result = await removeCalibrationFeedback(
      row.id,
      user?.id ?? "device",
    );
    setBusy(false);
    if (!result.ok) {
      setError(calibrationFailureMessage(result.reason));
      return;
    }
    setNotice("Record removed.");
    refresh();
  }

  function exportRecord(row: CalibrationFeedback) {
    const costCode = suggestCostCode(
      row.materialKey,
      row.measure === "material" ? "M" : "L",
      row.marketCode,
    );
    const data = project.data ?? {};
    const currency = typeof data.currency === "string" ? data.currency : "";
    const csv = exportBudgetCsv([
      {
        costCode: costCode?.costCode ?? "",
        costCodeDescription: costCode?.description ?? "Unclassified",
        costType:
          costCode?.costType ?? (row.measure === "material" ? "M" : "L"),
        description: `${row.materialKey} actuals for ${project.name}`,
        uom: row.unit,
        quantity: row.actualQuantity,
        unitCost: null,
        amount: null,
        currency,
        marketCode: row.marketCode,
        sourceStatus:
          row.evidence === "admin_verified" ? "verified" : "user_entered",
        classificationStandard: costCode?.standard ?? "",
      },
    ]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.name.replace(/[^a-z0-9-_]+/gi, "-")}-${row.materialKey}-cost-code.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      costCode
        ? `Exported ${costCode.costCode} for ${row.materialKey}. Quantities only, so add unit costs in your budget tool, and map the code to your own work breakdown before use.`
        : `Exported ${row.materialKey} with no cost code. No safe classification matched.`,
    );
  }

  const statusLine = snapshot
    ? snapshot.mode === "cloud"
      ? t("Evidence stored in your account")
      : t("Evidence stored on this device")
    : t("Loading evidence");

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`calibration-panel-${project.id}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <Activity className="h-3.5 w-3.5" aria-hidden="true" />{" "}
        {t("Log actuals and cost codes")}
      </button>
      {open && (
        <section
          id={`calibration-panel-${project.id}`}
          aria-label={t("Actuals, calibration and cost coding")}
          className="mt-3 rounded-xl border border-border bg-background p-4"
        >
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              {t(
                "Actuals never change a calculator rule. They become a shadow candidate, and only an administrator can verify a record or approve a candidate.",
              )}
            </p>
          </div>
          <p className="mt-2 text-xs font-medium text-foreground">
            {statusLine}
            {snapshot?.error
              ? ` (${t("cloud unavailable, showing device copy")})`
              : ""}
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="text-xs">
              <Label htmlFor={`market-${project.id}`}>{t("Market")}</Label>
              {derivedMarket ? (
                <Input
                  id={`market-${project.id}`}
                  value={derivedMarket}
                  readOnly
                  className="mt-1"
                />
              ) : (
                <select
                  id={`market-${project.id}`}
                  value={market}
                  onChange={(event) => setMarket(event.target.value)}
                  className="mt-1 h-10 w-full rounded-2xl border border-border/70 bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <option value="">{t("Choose a market")}</option>
                  {ALL_MARKET_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="text-xs">
              <Label htmlFor={`material-${project.id}`}>
                {t("Material or trade")}
              </Label>
              <Input
                id={`material-${project.id}`}
                value={material}
                onChange={(event) => setMaterial(event.target.value)}
                placeholder="block, cement, plaster"
                className="mt-1"
              />
            </div>
            <div className="text-xs">
              <Label htmlFor={`measure-${project.id}`}>{t("Measure")}</Label>
              <select
                id={`measure-${project.id}`}
                value={measure}
                onChange={(event) =>
                  setMeasure(event.target.value as CalibrationMeasure)
                }
                className="mt-1 h-10 w-full rounded-2xl border border-border/70 bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <option value="material">{t("Material")}</option>
                <option value="labour">{t("Labour")}</option>
              </select>
            </div>
            <div className="text-xs">
              <Label htmlFor={`unit-${project.id}`}>{t("Unit")}</Label>
              <Input
                id={`unit-${project.id}`}
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="bag, trip, m2"
                className="mt-1"
              />
            </div>
            <div className="text-xs">
              <Label htmlFor={`estimate-${project.id}`}>
                {t("Estimated quantity")}
              </Label>
              <Input
                id={`estimate-${project.id}`}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={estimate}
                onChange={(event) => setEstimate(event.target.value)}
                className="mt-1"
              />
            </div>
            <div className="text-xs">
              <Label htmlFor={`actual-${project.id}`}>
                {t("Actual quantity")}
              </Label>
              <Input
                id={`actual-${project.id}`}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={actual}
                onChange={(event) => setActual(event.target.value)}
                className="mt-1"
              />
            </div>
            <div className="text-xs sm:col-span-2">
              <Label htmlFor={`reference-${project.id}`}>
                {t("Evidence reference (receipt or close out record)")}
              </Label>
              <Input
                id={`reference-${project.id}`}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder={t("Optional reference, not an upload")}
                className="mt-1"
              />
            </div>
          </div>

          <div aria-live="polite" className="mt-2">
            {error && <p className="text-xs text-destructive">{error}</p>}
            {!error && notice && (
              <p className="text-xs text-muted-foreground">{notice}</p>
            )}
          </div>

          <div className="mt-3">
            <Button
              type="button"
              size="sm"
              onClick={saveActual}
              disabled={busy}
              className="text-xs"
            >
              {t("Save actuals for review")}
            </Button>
          </div>

          {pending.length > 0 && (
            <div className="mt-3 rounded-lg border border-border p-3">
              <p className="text-xs font-semibold">
                {t("Awaiting review")} ({pending.length})
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isAdmin
                  ? t(
                      "Verify only records you can substantiate. A verified record counts toward the candidate quota.",
                    )
                  : t(
                      "Accepting your own record marks it self attested. Only an administrator can verify it.",
                    )}
              </p>
              <div className="mt-2 space-y-2">
                {pending.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <span>
                      {row.materialKey}: {formatQuantity(row.estimatedQuantity)}{" "}
                      {t("estimated, actual")}{" "}
                      {formatQuantity(row.actualQuantity)} {row.unit}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => review(row, "accepted")}
                        className="h-7 gap-1 px-2 text-xs"
                      >
                        <Check className="h-3 w-3" aria-hidden="true" />
                        {isAdmin ? t("Verify") : t("Accept")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => review(row, "rejected")}
                        className="h-7 gap-1 px-2 text-xs"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                        {t("Reject")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3">
            <p className="text-xs font-semibold">{t("Recorded actuals")}</p>
            {rows.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  "No actuals recorded for this project yet. Record what a finished job used, not what it was quoted.",
                )}
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-2.5 py-2 text-xs"
                  >
                    <span>
                      {row.materialKey} · {formatQuantity(row.actualQuantity)}{" "}
                      {row.unit} ·{" "}
                      {row.status === "pending_review"
                        ? t("pending")
                        : row.status === "accepted"
                          ? row.evidence === "admin_verified"
                            ? t("verified")
                            : t("self attested")
                          : t("rejected")}
                    </span>
                    <span className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => exportRecord(row)}
                        className="h-7 gap-1 px-2 text-xs"
                        aria-label={`${t("Export cost code for")} ${row.materialKey}`}
                      >
                        <Download className="h-3 w-3" aria-hidden="true" />
                        {t("Export")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(row)}
                        disabled={busy}
                        className="h-7 gap-1 px-2 text-xs"
                        aria-label={`${t("Remove record for")} ${row.materialKey}`}
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-3 rounded-lg bg-muted/40 p-3 text-xs">
            <p className="font-semibold">
              {t("Calibration candidates")}{" "}
              {candidates.length > 0 ? `(${candidates.length})` : ""}
            </p>
            {candidates.length === 0 ? (
              <p className="mt-1 text-muted-foreground">
                {t(
                  "No reviewed evidence yet. A candidate needs accepted observations from at least three projects.",
                )}
              </p>
            ) : (
              <ul className="mt-1 space-y-1.5">
                {candidates.slice(0, 4).map((candidate) => (
                  <li key={candidate.fingerprint}>
                    <span className="font-medium">
                      {candidate.materialKey} · {candidate.unit}
                    </span>
                    {candidate.proposedMultiplier !== null && (
                      <>
                        {" "}
                        · ×{candidate.proposedMultiplier} {t("bounded median")}
                      </>
                    )}
                    {candidate.trendMultiplier !== null && (
                      <>
                        {" "}
                        · ×{candidate.trendMultiplier} {t("trend")}
                      </>
                    )}
                    <span className="text-muted-foreground">
                      {" "}
                      · {candidate.observationCount} {t("observations")} ·{" "}
                      {candidate.verifiedObservationCount} {t("verified")} ·{" "}
                      {candidate.eligible
                        ? t("ready for administrator approval")
                        : candidate.blockers.join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {range && (
              <p className="mt-2 text-muted-foreground">
                {t("Empirical range from completed projects")}:{" "}
                {formatQuantity(range.low)} to {formatQuantity(range.high)}{" "}
                {range.unit} ({t("likely")} {formatQuantity(range.likely)},{" "}
                {range.observations} {t("observations")}).{" "}
                {t("A record of outcomes, not a probabilistic guarantee.")}
              </p>
            )}
            {market &&
              rows.length > 0 &&
              (() => {
                const sample = rows[0];
                const code = suggestCostCode(
                  sample.materialKey,
                  sample.measure === "material" ? "M" : "L",
                  market,
                );
                if (!code) return null;
                return (
                  <p className="mt-1 text-muted-foreground">
                    {t("Suggested classification")}: {code.costCode} ·{" "}
                    {code.description} ({code.standard}).{" "}
                    {code.applicableToMarket
                      ? t("Common in this market.")
                      : t(
                          "This market does not normally use it. Map it to your own work breakdown.",
                        )}
                  </p>
                );
              })()}
          </div>
        </section>
      )}
    </div>
  );
}
