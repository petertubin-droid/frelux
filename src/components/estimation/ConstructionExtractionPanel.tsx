// =========================================================
// FRELUX Construction Extraction Panel
//
// UI for the AI Construction Document & Image Extraction Layer.
// Pipeline: Upload → AI analysis → Review (accept/edit/reject) →
// Apply → existing Build-to-Roof manual steps & engine.
//
// The AI NEVER calculates anything — this panel only produces
// user-confirmed input values for the deterministic engine.
// If AI extraction fails at any point, the panel degrades
// gracefully: the manual workflow below it is always available.
// =========================================================

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  Type,
  Upload,
  X,
  AlertTriangle,
  Info,
  Sparkles,
  Ruler,
  ArrowRight,
} from "lucide-react";
import {
  ConstructionExtractionError,
  type ConstructionExtractionResult,
  type DocumentKind,
  type EditedValues,
  type FieldDecision,
  type ExtractionField,
  type FieldDecisions,
  buildEnginePatch,
  confidenceBand,
  confidencePercent,
  initialDecisions,
  missingRequiredFields,
  requestConstructionExtraction,
  saveExtractionRecord,
  SOURCE_LABELS,
} from "@/lib/construction-extraction";
import type { BuildToRoofInput } from "@/types/build-to-roof";

interface ConstructionExtractionPanelProps {
  currentOpenings: BuildToRoofInput["openings"];
  onApply: (
    patch: Partial<BuildToRoofInput>,
    meta: { appliedCount: number; fileName?: string },
  ) => void;
}

type Phase = "idle" | "analyzing" | "review" | "error";

const KIND_OPTIONS: { id: DocumentKind; label: string; hint: string }[] = [
  {
    id: "architectural_plan",
    label: "Building plan",
    hint: "Floor plans, elevations, sections — most reliable",
  },
  {
    id: "roof_plan",
    label: "Roof plan",
    hint: "Roof geometry, ridges, hips, overhang",
  },
  {
    id: "building_photo",
    label: "Building photo",
    hint: "Site photo — estimates only, needs your confirmation",
  },
  {
    id: "text_description",
    label: "Text description",
    hint: "Describe the building in words",
  },
];

const GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "Building",
    keys: [
      "building_type",
      "building_length",
      "building_width",
      "number_of_floors",
      "floor_to_floor_height",
      "perimeter",
      "floor_area",
      "room_count",
    ],
  },
  {
    title: "Walls & structure",
    keys: [
      "wall_thickness",
      "internal_wall_length",
      "block_size",
      "foundation_type",
    ],
  },
  {
    title: "Openings",
    keys: [
      "doors_count",
      "door_width",
      "door_height",
      "windows_count",
      "window_width",
      "window_height",
    ],
  },
  {
    title: "Roof",
    keys: [
      "roof_type",
      "roof_pitch_degrees",
      "roof_overhang",
      "roofing_material",
      "ridge_length",
      "valleys_count",
      "hips_count",
    ],
  },
];

const ENUM_OPTIONS: Record<string, { value: string; label: string }[]> = {
  building_type: [
    { value: "bungalow", label: "Bungalow" },
    { value: "duplex", label: "Duplex" },
    { value: "two_storey", label: "Two storey" },
    { value: "apartment", label: "Apartment" },
    { value: "office", label: "Office" },
    { value: "shop", label: "Shop" },
    { value: "custom", label: "Custom" },
  ],
  roof_type: [
    { value: "gable", label: "Gable" },
    { value: "hip", label: "Hip" },
    { value: "mono_pitch", label: "Mono pitch" },
    { value: "flat", label: "Flat" },
    { value: "custom", label: "Custom" },
  ],
  roofing_material: [
    { value: "long_span_aluminium", label: "Long span aluminium" },
    { value: "stone_coated", label: "Stone coated" },
    { value: "gi_sheet", label: "GI sheet" },
    { value: "shingle", label: "Shingle" },
    { value: "custom", label: "Custom" },
  ],
  block_size: [
    { value: "9inch", label: "9 inch" },
    { value: "6inch", label: "6 inch" },
    { value: "5inch", label: "5 inch" },
    { value: "custom", label: "Custom" },
  ],
  foundation_type: [
    { value: "strip_footing", label: "Strip footing" },
    { value: "pad_footing", label: "Pad footing" },
    { value: "raft", label: "Raft" },
    { value: "pile", label: "Pile" },
    { value: "custom", label: "Custom" },
  ],
};

export function ConstructionExtractionPanel({
  currentOpenings,
  onApply,
}: ConstructionExtractionPanelProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [kind, setKind] = useState<DocumentKind>("architectural_plan");
  const [fileName, setFileName] = useState("");
  const [fileDataUrl, setFileDataUrl] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<ConstructionExtractionResult | null>(
    null,
  );
  const [decisions, setDecisions] = useState<FieldDecisions>({});
  const [editedValues, setEditedValues] = useState<EditedValues>({});
  const [applied, setApplied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAnalyze =
    kind === "text_description" ? description.trim().length > 5 : !!fileDataUrl;

  const handleFile = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError(
        "That file is larger than 10MB. Please upload a smaller image or PDF.",
      );
      setPhase("error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFileDataUrl(String(reader.result || ""));
      setFileName(file.name);
      setPhase("idle");
      setError("");
    };
    reader.onerror = () => {
      setError(
        "That file could not be read. Try a different file, or enter your dimensions manually.",
      );
      setPhase("error");
    };
    reader.readAsDataURL(file);
  }, []);

  const analyze = useCallback(async () => {
    setPhase("analyzing");
    setError("");
    try {
      const res = await requestConstructionExtraction({
        documentKind: kind,
        documentDataUrl: kind === "text_description" ? undefined : fileDataUrl,
        textDescription:
          kind === "text_description" ? description.trim() : undefined,
      });
      if (res.fields.length === 0) {
        setError(
          "The AI could not read any construction information from this input. Check the image quality, or enter your dimensions manually below — the estimator is fully functional without AI.",
        );
        setPhase("error");
        return;
      }
      setResult(res);
      setDecisions(initialDecisions(res.fields));
      setEditedValues({});
      setApplied(false);
      setPhase("review");
    } catch (e) {
      const msg =
        e instanceof ConstructionExtractionError
          ? e.message
          : "The AI could not analyse this input. Please try again, or enter your dimensions manually below.";
      setError(msg);
      setPhase("error");
    }
  }, [kind, fileDataUrl, description]);

  const setDecision = useCallback((key: string, decision: FieldDecision) => {
    setDecisions((prev) => ({ ...prev, [key]: decision }));
    setApplied(false);
  }, []);

  const setEdited = useCallback(
    (key: string, value: string) => {
      const field = result?.fields.find((f) => f.key === key);
      if (!field) return;
      const parsed =
        typeof field.value === "number" ? parseFloat(value) : value;
      setEditedValues((prev) => ({
        ...prev,
        [key]: Number.isNaN(parsed) ? value : parsed,
      }));
      setDecisions((prev) => ({ ...prev, [key]: "edited" }));
      setApplied(false);
    },
    [result],
  );

  const applyPatch = useCallback(() => {
    if (!result) return;
    const { patch, appliedFields, drawingAnalysis } = buildEnginePatch(
      result.fields,
      decisions,
      editedValues,
      fileName || description.slice(0, 40),
      currentOpenings,
    );
    if (appliedFields.length > 0) {
      // drawing_analysis feeds the engine's own confidence assessment
      // (a drawing-confirmed building_length upgrades the estimate).
      patch.drawing_analysis = drawingAnalysis;
      onApply(patch, { appliedCount: appliedFields.length, fileName });
    }
    // Best-effort record for signed-in users — never blocks the workflow.
    void saveExtractionRecord({
      documentKind: result.documentKind,
      fileName,
      fields: result.fields,
      decisions,
      appliedFields,
    });
    setApplied(true);
  }, [
    result,
    decisions,
    editedValues,
    fileName,
    description,
    currentOpenings,
    onApply,
  ]);

  const missing = useMemo(
    () => (result ? missingRequiredFields(result.fields, decisions) : []),
    [result, decisions],
  );

  const confirmedCount = useMemo(
    () =>
      result
        ? result.fields.filter(
            (f) =>
              (decisions[f.key] ?? "pending") === "accepted" ||
              (decisions[f.key] ?? "pending") === "edited",
          ).length
        : 0,
    [result, decisions],
  );

  const reset = () => {
    setPhase("idle");
    setResult(null);
    setDecisions({});
    setEditedValues({});
    setApplied(false);
    setError("");
    setFileDataUrl("");
    setFileName("");
    setDescription("");
  };

  return (
    <div className="space-y-4">
      {/* ── Input phase ── */}
      {(phase === "idle" || phase === "error") && (
        <div>
          {/* Kind selector */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {KIND_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setKind(opt.id)}
                aria-pressed={kind === opt.id}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  kind === opt.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {opt.id === "text_description" ? (
                    <Type className="h-4 w-4" aria-hidden="true" />
                  ) : opt.id === "building_photo" ? (
                    <ImageIcon className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  )}
                  {opt.label}
                </span>
                <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                  {opt.hint}
                </span>
              </button>
            ))}
          </div>

          {/* File upload (not for text descriptions) */}
          {kind !== "text_description" && (
            <div className="border-2 border-dashed border-border rounded-xl p-4 sm:p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                aria-label="Upload construction document"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              {fileDataUrl ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-left">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                    <FileText
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="truncate">{fileName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFileDataUrl("");
                      setFileName("");
                    }}
                    className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload
                    className="w-8 h-8 text-muted-foreground/80 mx-auto mb-2"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-muted-foreground mb-1">
                    Upload your{" "}
                    {kind === "roof_plan"
                      ? "roof plan"
                      : kind === "building_photo"
                        ? "building photo"
                        : "building plan"}{" "}
                    (PDF, JPG, PNG)
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Dimensioned plans give the most accurate results
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    Choose file
                  </button>
                </>
              )}
            </div>
          )}

          {/* Text description */}
          {kind === "text_description" && (
            <div>
              <label
                htmlFor="btr-description"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Describe your building
              </label>
              <textarea
                id="btr-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="e.g. A 3 bedroom bungalow in Lagos, about 18 metres long and 11 metres wide, hip roof with stone coated sheets"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          )}

          {phase === "error" && error && (
            <div
              className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 p-3"
              role="alert"
            >
              <AlertTriangle
                className="h-4 w-4 mt-0.5 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {error}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={analyze}
            disabled={!canAnalyze}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Analyse with AI
          </button>

          <p className="mt-3 text-xs text-muted-foreground">
            The AI reads your document and fills the form below. You review
            every value before anything is used — and the manual estimator
            always works without it.
          </p>
        </div>
      )}

      {/* ── Review phase ── */}
      {phase === "review" && result && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-sm font-semibold text-foreground">
              Detected information
            </p>
            <button
              type="button"
              onClick={reset}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Start over
            </button>
          </div>

          {result.warnings.length > 0 && (
            <div className="mb-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                Notes from the analysis
              </p>
              <ul className="space-y-0.5">
                {result.warnings.slice(0, 3).map((w, i) => (
                  <li
                    key={i}
                    className="text-xs text-blue-700 dark:text-blue-300"
                  >
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {GROUPS.map((group) => {
              const fields = group.keys
                .map((k) => result.fields.find((f) => f.key === k))
                .filter((f): f is ExtractionField => !!f);
              if (fields.length === 0) return null;
              return (
                <div key={group.title}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {group.title}
                  </p>
                  <div className="space-y-2">
                    {fields.map((field) => {
                      const decision = decisions[field.key] ?? "pending";
                      const enums = ENUM_OPTIONS[field.key];
                      const isEditing = decision === "edited";
                      return (
                        <div
                          key={field.key}
                          className={`rounded-xl border p-3 transition-colors ${
                            decision === "accepted" || decision === "edited"
                              ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20"
                              : decision === "rejected"
                                ? "border-border bg-muted/30 opacity-60"
                                : "border-border"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {field.label}
                              </p>
                              <p className="text-lg font-bold text-foreground mt-0.5">
                                {isEditing &&
                                editedValues[field.key] !== undefined
                                  ? String(editedValues[field.key])
                                  : `${field.value}${field.unit === "m" ? "m" : field.unit ? ` ${field.unit}` : ""}`}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span
                                  className={`text-xs font-medium ${
                                    confidenceBand(field.confidence) === "high"
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : confidenceBand(field.confidence) ===
                                          "medium"
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-red-600 dark:text-red-400"
                                  }`}
                                >
                                  {confidencePercent(field.confidence)}%
                                  confidence
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {SOURCE_LABELS[field.source] ?? field.source}
                                </span>
                                {field.verification ===
                                  "requires_confirmation" && (
                                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                    Requires confirmation
                                  </span>
                                )}
                              </div>
                              {field.evidence && (
                                <p className="mt-1 flex items-start gap-1 text-xs italic text-muted-foreground">
                                  <Ruler
                                    className="h-3 w-3 mt-0.5 shrink-0"
                                    aria-hidden="true"
                                  />
                                  {field.evidence}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setDecision(
                                    field.key,
                                    decision === "accepted"
                                      ? "pending"
                                      : "accepted",
                                  )
                                }
                                aria-label={`Accept ${field.label}`}
                                aria-pressed={decision === "accepted"}
                                className={`rounded-lg border p-2 transition-colors ${
                                  decision === "accepted"
                                    ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                    : "border-border text-muted-foreground hover:border-emerald-300 hover:text-emerald-600"
                                }`}
                              >
                                <Check className="h-4 w-4" aria-hidden="true" />
                              </button>
                              {enums && enums.length > 0 ? (
                                <select
                                  aria-label={`Change ${field.label}`}
                                  value={String(
                                    (decision === "edited"
                                      ? editedValues[field.key]
                                      : field.value) ?? "",
                                  )}
                                  onChange={(e) =>
                                    setEdited(field.key, e.target.value)
                                  }
                                  className="rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                >
                                  <option value={String(field.value)}>
                                    {enums.find((o) => o.value === field.value)
                                      ?.label ?? String(field.value)}
                                  </option>
                                  {enums
                                    .filter((o) => o.value !== field.value)
                                    .map((o) => (
                                      <option key={o.value} value={o.value}>
                                        {o.label}
                                      </option>
                                    ))}
                                </select>
                              ) : (
                                <label
                                  className="sr-only"
                                  htmlFor={`edit-${field.key}`}
                                >
                                  Edit {field.label}
                                </label>
                              )}
                              {!enums && (
                                <input
                                  id={`edit-${field.key}`}
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  defaultValue={String(field.value)}
                                  onChange={(e) =>
                                    setEdited(field.key, e.target.value)
                                  }
                                  aria-label={`Edit ${field.label} in ${field.unit || "meters"}`}
                                  className="w-24 rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setDecision(
                                    field.key,
                                    decision === "rejected"
                                      ? "pending"
                                      : "rejected",
                                  )
                                }
                                aria-label={`Reject ${field.label}`}
                                aria-pressed={decision === "rejected"}
                                className={`rounded-lg border p-2 transition-colors ${
                                  decision === "rejected"
                                    ? "border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/50 dark:text-red-300"
                                    : "border-border text-muted-foreground hover:border-red-300 hover:text-red-600"
                                }`}
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Missing required fields */}
          {missing.length > 0 && (
            <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Not detected — you can enter these in the next steps
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                The AI could not reliably read:{" "}
                {missing.map((k) => k.replace(/_/g, " ")).join(", ")}. Continue
                and type them in manually.
              </p>
            </div>
          )}

          {/* Apply */}
          <div className="mt-4">
            <button
              type="button"
              onClick={applyPatch}
              disabled={confirmedCount === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {applied ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Applied — continue below
                </>
              ) : (
                <>
                  Use {confirmedCount} confirmed{" "}
                  {confirmedCount === 1 ? "value" : "values"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
            {applied && (
              <p className="mt-2 text-center text-xs text-emerald-600 dark:text-emerald-400">
                Your estimate now uses the confirmed values. Review the next
                steps — you can still adjust anything there.
              </p>
            )}
          </div>
        </div>
      )}

      {phase === "analyzing" && (
        <div
          className="flex flex-col items-center gap-3 py-8"
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            Reading your{" "}
            {kind === "text_description" ? "description" : "document"}…
          </p>
        </div>
      )}
    </div>
  );
}

export default ConstructionExtractionPanel;
