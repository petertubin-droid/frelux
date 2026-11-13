// =========================================================
// PLAN IMPORT PANEL
//
// Upload a floor plan, have the existing plan-vision extractor
// read it, review what it found, then push verified values into
// the Mathematical Elevation Engine.
//
// The maths engine stays the only thing that calculates. The
// vision model only *reads* the drawing; nothing enters the
// engine until the visitor confirms it.
// =========================================================

import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  FileUp,
  Loader2,
  Ruler,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Badge } from "@/components/ui/shadcn/badge";
import { useAuth } from "@/lib/auth";
import {
  PlanExtractionError,
  requestPlanExtraction,
} from "@/lib/plan-vision/extraction";
import type { PlanExtraction } from "@/lib/plan-vision/types";
import type { PlanElevationInput } from "@/lib/engineering/mathematical-elevation-engine";
import {
  extractionToElevationImport,
  type ElevationPlanImport,
  type ImportedField,
} from "@/lib/plan-vision/elevation-bridge";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = "image/png,image/jpeg,image/webp,application/pdf";

interface PlanImportPanelProps {
  /** Called with the values the visitor approved. */
  onApply: (
    patch: Partial<PlanElevationInput>,
    origin: "plan" | "derived",
  ) => void;
  /** True while the engine should keep its current numbers. */
  disabled?: boolean;
}

type Stage = "idle" | "reading" | "review";

function confidenceBadge(confidence: number | null) {
  if (confidence === null) {
    return (
      <Badge
        variant="outline"
        className="border-border text-xs text-muted-foreground"
      >
        stated
      </Badge>
    );
  }
  const pct = Math.round(confidence * 100);
  const tone =
    pct >= 80
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : pct >= 55
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-destructive/30 bg-destructive/10 text-destructive";
  return (
    <Badge variant="outline" className={`text-xs ${tone}`}>
      {pct}% read
    </Badge>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.readAsDataURL(file);
  });
}

export default function PlanImportPanel({
  onApply,
  disabled = false,
}: PlanImportPanelProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<PlanExtraction | null>(null);
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [useDerived, setUseDerived] = useState(false);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  const analysis: ElevationPlanImport | null = useMemo(
    () => (extraction ? extractionToElevationImport(extraction) : null),
    [extraction],
  );

  const reset = useCallback(() => {
    setStage("idle");
    setExtraction(null);
    setApproved({});
    setUseDerived(false);
    setError(null);
    setAppliedNotice(null);
  }, []);

  const handleFile = useCallback(
    (next: File | null) => {
      reset();
      setFile(next);
      if (next && next.size > MAX_BYTES) {
        setError(
          "That file is larger than 10 MB. Use a smaller scan or photo.",
        );
        setFile(null);
      }
    },
    [reset],
  );

  const readPlan = useCallback(async () => {
    if (!file) return;
    setError(null);
    setAppliedNotice(null);
    setStage("reading");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const result = await requestPlanExtraction({
        documentId: `upload_${file.name}_${file.size}`,
        documentKind:
          file.type === "application/pdf" ? "architectural_pdf" : "floor_plan",
        documentDataUrl: dataUrl,
      });
      setExtraction(result);
      const pre: Record<string, boolean> = {};
      for (const fact of result.buildingFacts) {
        if (fact.dimension && fact.dimension.confidence >= 0.85) {
          pre[String(fact.key)] = true;
        }
      }
      setApproved(pre);
      setStage("review");
    } catch (err) {
      const message =
        err instanceof PlanExtractionError
          ? err.message
          : "The plan could not be read. Enter the four measurements instead.";
      setError(message);
      setStage("idle");
    }
  }, [file]);

  const applicableFields: ImportedField[] = useMemo(
    () => analysis?.applied ?? [],
    [analysis],
  );

  const applyValues = useCallback(() => {
    if (!analysis) return;
    const patch: Partial<PlanElevationInput> = {};
    let count = 0;

    for (const field of applicableFields) {
      if (field.source !== "plan") continue;
      if (approved[String(field.key)] === false) continue;
      patch[field.key] = field.value as never;
      count += 1;
    }

    if (useDerived && analysis.footprint) {
      patch.building_length = analysis.footprint.lengthM;
      patch.building_width = analysis.footprint.widthM;
      count += 2;
    }

    if (count === 0) {
      setError(
        "Nothing usable was found on that drawing. Enter the measurements manually.",
      );
      return;
    }

    onApply(patch, useDerived ? "derived" : "plan");
    setAppliedNotice(
      `${count} value${count === 1 ? "" : "s"} sent to the engine. Figures below are recalculated from them.`,
    );
    setStage("idle");
  }, [analysis, applicableFields, approved, onApply, useDerived]);

  const footprint = analysis?.footprint ?? null;

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 space-y-4"
      aria-label="Read a plan automatically"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ScanLine
              className="h-4 w-4 text-brand-purple"
              aria-hidden="true"
            />
            Read a plan automatically
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a floor plan, elevation or section. The reader pulls the
            stated dimensions off the drawing, you confirm them, and the
            calculation below runs on the confirmed numbers.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-brand-purple/25 bg-brand-purple/10 text-brand-purple text-xs"
        >
          Vision read, maths applied
        </Badge>
      </div>

      {!user && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck
            className="h-4 w-4 shrink-0 text-brand-purple"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            Plan reading needs a free account, because drawings are personal
            documents. Sign in to use it; the manual fields below keep working
            either way.
          </span>
          <Link
            to="/login"
            className="rounded-lg bg-brand-purple px-3 py-1.5 text-xs font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      )}

      <div className="space-y-2">
        <Input
          type="file"
          accept={ACCEPTED}
          aria-label="Choose a plan to read"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          className="max-w-md"
          disabled={!user || stage === "reading"}
        />
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WEBP or PDF up to 10 MB. The drawing is read once and is not
          stored on your account.
        </p>
      </div>

      {previewUrl && file && (
        <figure className="space-y-2">
          <img
            src={previewUrl}
            alt={`Uploaded plan: ${file.name}`}
            className="max-h-72 w-full rounded-lg border border-border bg-muted object-contain"
            loading="lazy"
            decoding="async"
          />
          <figcaption className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{file.name}</span>
            <span aria-hidden="true">·</span>
            <span>{(file.size / 1024).toFixed(0)} KB</span>
          </figcaption>
        </figure>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={readPlan}
          disabled={!user || !file || stage === "reading" || disabled}
          className="h-9 gap-2 bg-brand-purple text-xs text-white hover:bg-brand-purple-dark"
        >
          {stage === "reading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Reading the drawing
            </>
          ) : (
            <>
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Read this plan
            </>
          )}
        </Button>
        {file && stage !== "reading" && (
          <Button
            type="button"
            variant="ghost"
            onClick={reset}
            className="h-9 text-xs text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {appliedNotice && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-800 dark:text-emerald-200">
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{appliedNotice}</span>
        </div>
      )}

      {stage === "review" && analysis && (
        <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Found on the drawing
            </h4>
            {applicableFields.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                No dimensions came back with enough confidence to use. Enter
                them manually below; the engine needs four numbers.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border/60">
                {applicableFields.map((field) => (
                  <li
                    key={String(field.key)}
                    className="flex items-center justify-between gap-2 py-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Ruler
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="truncate text-muted-foreground">
                        {field.label}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {field.displayValue}
                      </span>
                      {confidenceBadge(field.confidence)}
                      <input
                        type="checkbox"
                        aria-label={`Use ${field.label}`}
                        checked={approved[String(field.key)] !== false}
                        onChange={(event) =>
                          setApproved((prev) => ({
                            ...prev,
                            [String(field.key)]: event.target.checked,
                          }))
                        }
                        className="h-3.5 w-3.5 accent-[hsl(var(--brand-purple))]"
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {analysis.missing.length > 0 && (
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <p className="text-xs font-semibold text-foreground">
                Not on this drawing
              </p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {analysis.missing.map((item) => (
                  <li key={String(item.key)}>
                    <span className="font-medium text-foreground">
                      {item.label}:
                    </span>{" "}
                    {item.hint}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {footprint && (
            <div className="rounded-lg border border-brand-purple/25 bg-brand-purple/5 p-3">
              <label className="flex items-start gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={useDerived}
                  onChange={(event) => setUseDerived(event.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-[hsl(var(--brand-purple))]"
                />
                <span>
                  <span className="font-semibold">
                    Derive the footprint from the rooms
                  </span>{" "}
                  <span className="text-muted-foreground">
                    ({footprint.lengthM} × {footprint.widthM} m)
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {footprint.method}. Change any figure afterwards; the engine
                    recalculates immediately.
                  </span>
                </span>
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={applyValues}
              className="h-9 gap-2 bg-brand-purple text-xs text-white hover:bg-brand-purple-dark"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Use these values
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={reset}
              className="h-9 text-xs text-muted-foreground"
            >
              Start over
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Nothing from the drawing is used until you press this. The
            calculation, quantities and diagram all come from the engine's own
            maths, not from the model.
          </p>
        </div>
      )}
    </section>
  );
}
