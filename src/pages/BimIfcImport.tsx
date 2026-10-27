/**
 * BIM/IFC Import (Future Engine 15)
 *
 * Upload an architect's .ifc export and get a deterministic
 * material takeoff, parsed entirely in the browser - no upload
 * to any server, works offline. Quantities are reported only
 * when the file itself declares them; nothing is invented.
 */

import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { track } from "@/lib/analytics";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import {
  parseIfcTakeoff,
  type IfcParseResult,
} from "@/lib/estimation/ifc-parser";
import { readIfcZipFile } from "@/lib/estimation/ifczip";
import {
  validateIfcFile,
  type IfcValidationReport,
} from "@/lib/estimation/ifc-validation";
import AdSlot from "@/components/ui/AdSlot";
import { serializeIfcTakeoffExport } from "@/lib/estimation/ifc-takeoff-export";
import { Button } from "@/components/ui/shadcn/button";
import { Download } from "lucide-react";
import {
  parseIfcModel,
  type IfcModelParseResult,
} from "@/lib/bim/ifc-model-loader";
import {
  buildEstimateLines,
  elementIdsForLine,
  groupLinesByCategory,
  linesForElement,
  type BiLinkIndex,
  type EstimateCategory,
  type EstimateLine,
} from "@/lib/bim/model-estimate-link";

const IfcModelViewer = lazy(() => import("@/components/bim/IfcModelViewer"));

const CATEGORY_ORDER: EstimateCategory[] = [
  "concrete",
  "rebar",
  "formwork",
  "roof",
  "openings",
  "other",
];

export default function BimIfcImport() {
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "BIM/IFC Import", path: "/bim-ifc-import" },
  ]);
  useSeo({
    title: "BIM/IFC Import: Instant Takeoff from Architect Files | FRELUX",
    description:
      "Upload an architect's .ifc (BIM) export and instantly get a material takeoff: walls, slabs, doors, windows and their declared quantities. Parsed entirely in your browser: nothing is uploaded, nothing is guessed.",
  });

  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<IfcParseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [validation, setValidation] = useState<IfcValidationReport | null>(
    null,
  );
  const [model, setModel] = useState<IfcModelParseResult | null>(null);
  const [linkIndex, setLinkIndex] = useState<BiLinkIndex | null>(null);
  const [selectedGlobalId, setSelectedGlobalId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [modelNote, setModelNote] = useState<string | null>(null);

  const onFile = async (file: File | null) => {
    setFileError(null);
    setResult(null);
    setFileName(null);
    setValidation(null);
    if (!file) return;
    if (!/\.ifc$/i.test(file.name) && !/\.ifczip$/i.test(file.name)) {
      setFileError(
        "Only .ifc and .ifczip files are supported. Their contents are never guessed at.",
      );
      return;
    }
    setModel(null);
    setLinkIndex(null);
    setSelectedGlobalId(null);
    setSelectedLineId(null);
    setModelNote(null);
    setBusy(true);
    let ifcBytes: Uint8Array | null = null;
    try {
      let ifcText: string;
      let displayName: string;
      if (/\.ifczip$/i.test(file.name)) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const zr = readIfcZipFile(bytes);
        if (!zr.ok) {
          setFileError(zr.errors.join(" "));
          return;
        }
        ifcText = zr.file_text ?? "";
        displayName = file.name;
      } else {
        ifcBytes = new Uint8Array(await file.arrayBuffer());
        ifcText = await file.text();
        displayName = file.name;
      }

      const report = validateIfcFile({
        file_text: ifcText,
        file_name: displayName,
      });
      setValidation(report);
      if (report.verdict === "invalid") {
        return;
      }

      const r = parseIfcTakeoff({
        file_text: ifcText,
        file_name: displayName,
        rules: [],
      });
      setResult(r);
      setFileName(displayName);
      if (r.ok) track("bim_ifc_imported");

      // Pillar 3: full web-ifc model parse (client-side, no server
      // roundtrip) for the 3D viewer and the linked Bill of Quantities.
      if (ifcBytes) {
        try {
          const parsed = await parseIfcModel(ifcBytes);
          setModel(parsed);
          setLinkIndex(buildEstimateLines(parsed.elements));
        } catch {
          setModelNote(
            "The 3D model could not be generated for this file (the deterministic text takeoff above is unaffected).",
          );
        }
      } else {
        setModelNote(
          "The 3D viewer is available for .ifc files; .ifczip exports keep the deterministic text takeoff only.",
        );
      }
    } catch {
      setFileError(
        "The file could not be read. It may be corrupted: nothing is estimated on its behalf.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Construction Tools", path: "/construction-tools" },
            { label: "BIM/IFC Import" },
          ]}
          title="BIM/IFC Import"
          subtitle="Upload an architect's .ifc (BIM) export and get an instant material takeoff: walls, slabs, roofs, doors, windows with the areas and volumes the file itself declares. Parsed entirely in your browser: the file never leaves your device, no AI is involved, and if the export contains no quantities you get honest element counts with a warning, never invented areas."
        />

        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          <label className="grid gap-2 text-sm font-medium">
            IFC file (.ifc or .ifczip)
            <input
              type="file"
              accept=".ifc,.ifczip"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            The file is parsed locally in your browser. Nothing is uploaded.
          </p>
          {busy && (
            <p className="mt-2 text-sm text-muted-foreground">Parsing…</p>
          )}
          {fileError && (
            <p className="mt-2 text-sm text-destructive">{fileError}</p>
          )}
        </div>

        {validation && (
          <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Import validation</p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  validation.verdict === "invalid"
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : validation.verdict === "valid_with_warnings"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {validation.verdict === "invalid"
                  ? "Refused"
                  : validation.verdict === "valid_with_warnings"
                    ? "Passed with warnings"
                    : "Passed"}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {validation.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-xs">
                  <span
                    aria-label={c.status}
                    className={
                      c.status === "pass"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : c.status === "warn"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                    }
                  >
                    {c.status === "pass"
                      ? "✓"
                      : c.status === "warn"
                        ? "!"
                        : "✗"}
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {c.label}:
                    </span>{" "}
                    {c.detail}
                  </span>
                </li>
              ))}
            </ul>
            {validation.warnings.length > 0 && (
              <ul className="mt-2 space-y-1">
                {validation.warnings.map((w, i) => (
                  <li
                    key={i}
                    className="text-xs text-amber-600 dark:text-amber-400"
                  >
                    {w}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Structural presence checks only: no IFC schema certification is
              claimed, and no quantity is ever invented.
            </p>
          </div>
        )}

        {result && !result.ok && (
          <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
            {result.warnings.map((w, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                {w}
              </p>
            ))}
            {result.warnings.length === 0 && (
              <p className="text-sm text-muted-foreground">
                The file could not be turned into a takeoff.
              </p>
            )}
          </div>
        )}

        {result?.ok && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  File
                </p>
                <p
                  className="mt-1 truncate text-lg font-semibold"
                  title={fileName ?? ""}
                >
                  {fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.entity_count.toLocaleString("en-NG")} STEP entities
                  parsed
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Elements
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {result.elements
                    .reduce((n, e) => n + e.count, 0)
                    .toLocaleString("en-NG")}
                </p>
                <p className="text-xs text-muted-foreground">
                  across {result.elements.length} IFC type(s)
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Quantities
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {result.has_quantities
                    ? "Declared by the file"
                    : "None declared"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.has_quantities
                    ? "Declared values; explicit supported units are converted to SI"
                    : "counts only: nothing invented"}
                </p>
              </div>
            </div>

            <section className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
              <h3 className="text-sm font-semibold">
                Observed IFC schema coverage
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Declared schema:{" "}
                {result.schema_coverage.schema ?? "not specified"} ·{" "}
                {result.schema_coverage.distinct_entity_types} entity types
                observed. This reports presence only, not schema validation or
                geometric quantities.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium">Spatial structures</p>
                  <p className="text-xs text-muted-foreground">
                    {Object.entries(result.schema_coverage.spatial_structures)
                      .map(
                        ([type, count]) =>
                          `${type.replace("IFC", "")} ${count}`,
                      )
                      .join(" · ") || "None observed"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium">
                    Recognized takeoff types
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Object.entries(result.schema_coverage.recognized_elements)
                      .map(
                        ([type, count]) =>
                          `${type.replace("IFC", "")} ${count}`,
                      )
                      .join(" · ") || "None observed"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium">
                    Geometry representation entities
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Object.entries(
                      result.schema_coverage.geometric_representations,
                    )
                      .map(
                        ([type, count]) =>
                          `${type.replace("IFC", "")} ${count}`,
                      )
                      .join(" · ") || "None observed"}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Unsupported entity types are retained in the portable JSON
                review record.
              </p>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 dark:border-white/5">
              <div>
                <h3 className="text-sm font-semibold">
                  Portable review record
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Export declared quantities and warnings as JSON. The source
                  IFC is not included.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const text = serializeIfcTakeoffExport(
                    fileName ?? "source.ifc",
                    result,
                  );
                  const url = URL.createObjectURL(
                    new Blob([text], { type: "application/json" }),
                  );
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${(fileName ?? "ifc-takeoff").replace(/\.ifc(z|x)?$/i, "")}-takeoff.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="mr-2 h-4 w-4" /> Export review record
              </Button>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
              <h3 className="mb-2 text-sm font-semibold">Material takeoff</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 text-left">IFC type</th>
                      <th className="py-2 text-right">Count</th>
                      <th className="py-2 text-left">
                        Declared quantities (file totals)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.elements.map((e) => (
                      <tr
                        key={e.type}
                        className="border-t border-border dark:border-white/5"
                      >
                        <td className="py-2 font-mono text-xs">{e.type}</td>
                        <td className="py-2 text-right font-mono text-xs">
                          {e.count}
                        </td>
                        <td className="py-2">
                          {Object.keys(e.quantity_totals).length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              no quantities declared: count only
                            </span>
                          ) : (
                            <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                              {Object.entries(e.quantity_totals).map(
                                ([qName, q]) => (
                                  <span key={qName}>
                                    <span className="font-medium">
                                      {qName}:
                                    </span>{" "}
                                    <span className="font-mono">
                                      {q.total.toLocaleString("en-NG")} {q.unit}
                                    </span>{" "}
                                    <span className="text-muted-foreground">
                                      ({q.elements} element
                                      {q.elements === 1 ? "" : "s"})
                                    </span>
                                  </span>
                                ),
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {modelNote && (
              <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground dark:border-white/5">
                {modelNote}
              </div>
            )}

            {model?.ok && model.elements.length > 0 && linkIndex && (
              <Bim5dSection
                model={model}
                linkIndex={linkIndex}
                selectedGlobalId={selectedGlobalId}
                selectedLineId={selectedLineId}
                onElementSelect={(id) => {
                  setSelectedGlobalId(id);
                  setSelectedLineId(null);
                }}
                onLineSelect={(lineId) => {
                  setSelectedLineId(lineId);
                  const [elementId] = elementIdsForLine(linkIndex, lineId);
                  setSelectedGlobalId(elementId ?? null);
                }}
              />
            )}

            {result.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {w}
                  </p>
                ))}
              </div>
            )}

            <details className="rounded-lg border border-border bg-card p-4 text-sm dark:border-white/5">
              <summary className="cursor-pointer font-medium">
                How this was determined
              </summary>
              <ul className="mt-2 space-y-1">
                {result.steps.map((s, i) => (
                  <li key={i}>
                    <span className="font-medium">{s.label}:</span>{" "}
                    <span className="text-muted-foreground">{s.detail}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
      <AdSlot slotKey="calculator_mid" className="mt-8" />
      <AdSlot slotKey="calculator_native" className="mt-8" />
    </Container>
  );
}
function Bim5dSection({
  model,
  linkIndex,
  selectedGlobalId,
  selectedLineId,
  onElementSelect,
  onLineSelect,
}: {
  model: IfcModelParseResult;
  linkIndex: BiLinkIndex;
  selectedGlobalId: string | null;
  selectedLineId: string | null;
  onElementSelect: (id: string | null) => void;
  onLineSelect: (lineId: string) => void;
}) {
  const handleViewerSelect = useCallback(onElementSelect, [onElementSelect]);
  const highlightedLineIds = useMemo(
    () =>
      new Set(linesForElement(linkIndex, selectedGlobalId).map((l) => l.id)),
    [linkIndex, selectedGlobalId],
  );
  const grouped = useMemo(() => groupLinesByCategory(linkIndex), [linkIndex]);
  const selectedElement = model.elements.find(
    (e) => e.globalId === selectedGlobalId,
  );

  return (
    <section
      data-testid="bim-5d-section"
      className="rounded-lg border border-border bg-card p-4 dark:border-white/5"
    >
      <h3 className="text-sm font-semibold">
        3D model and linked Bill of Quantities (5D)
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Parsed in your browser with web-ifc: nothing is uploaded. Click an
        element in the 3D model to highlight its concrete, rebar, formwork and
        roofing lines; click a Bill of Quantities line to highlight its model
        element. Derived lines are labelled indicative; declared lines come
        straight from IfcQuantityArea/Volume/Length.
      </p>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Suspense
            fallback={
              <div className="flex h-[420px] items-center justify-center rounded-xl border border-input bg-muted/40 text-sm text-muted-foreground">
                Loading the 3D viewer…
              </div>
            }
          >
            <IfcModelViewer
              elements={model.elements}
              selectedGlobalId={selectedGlobalId}
              onSelect={handleViewerSelect}
            />
          </Suspense>
          {selectedElement ? (
            <div
              data-testid="bim-selected-element"
              className="rounded-lg border border-border bg-muted/40 p-3 text-xs dark:border-white/5"
            >
              <p className="font-semibold">
                {selectedElement.ifcClass}
                {selectedElement.name ? `: ${selectedElement.name}` : ""}
              </p>
              <p className="mt-1 text-muted-foreground">
                {selectedElement.quantities.length === 0
                  ? "No quantities declared by the model for this element."
                  : selectedElement.quantities
                      .map(
                        (q) =>
                          `${q.name}: ${q.value.toLocaleString("en-NG")} ${q.kind}`,
                      )
                      .join(" · ")}
              </p>
              <p className="mt-1 text-muted-foreground">
                GlobalId {selectedElement.globalId}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No element selected. Click an element in the viewer or a line in
              the Bill of Quantities.
            </p>
          )}
        </div>

        <div data-testid="bim-boq-table" className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="py-2 text-left">Bill of Quantities</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Source</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORY_ORDER.filter((c) => grouped.has(c)).map((category) => {
                const lines = grouped.get(category) ?? [];
                const total = lines.reduce((n, l) => n + l.quantity, 0);
                const unit = lines[0]?.unit ?? "";
                return (
                  <FragmentWithKey key={category}>
                    <tr className="border-t border-border dark:border-white/5">
                      <td className="py-1.5 font-semibold capitalize">
                        {category}
                      </td>
                      <td className="py-1.5 text-right font-mono">
                        {total.toLocaleString("en-NG")}
                      </td>
                      <td className="py-1.5 text-right text-muted-foreground">
                        {lines.length} line{lines.length === 1 ? "" : "s"}
                      </td>
                    </tr>
                    {lines.map((line) => (
                      <BimBoqLineRow
                        key={line.id}
                        line={line}
                        highlighted={highlightedLineIds.has(line.id)}
                        clicked={selectedLineId === line.id}
                        onSelect={onLineSelect}
                      />
                    ))}
                  </FragmentWithKey>
                );
              })}
            </tbody>
          </table>
          {linkIndex.lines.length === 0 && (
            <p className="text-xs text-muted-foreground">
              The model declares no takeoff quantities: no line is invented.
            </p>
          )}
        </div>
      </div>

      {model.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-amber-600 dark:text-amber-400">
          {model.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BimBoqLineRow({
  line,
  highlighted,
  clicked,
  onSelect,
}: {
  line: EstimateLine;
  highlighted: boolean;
  clicked: boolean;
  onSelect: (lineId: string) => void;
}) {
  return (
    <tr
      data-testid="boq-line"
      onClick={() => onSelect(line.id)}
      className={`cursor-pointer border-t border-border transition-colors dark:border-white/5 ${
        highlighted
          ? "bg-blue-500/10"
          : clicked
            ? "bg-blue-500/20"
            : "hover:bg-muted/40"
      }`}
      title={line.note}
    >
      <td className="py-1.5 pl-4">{line.label}</td>
      <td className="py-1.5 text-right font-mono">
        {line.quantity.toLocaleString("en-NG")} {line.unit}
      </td>
      <td className="py-1.5 text-right text-muted-foreground">
        {line.provenance === "declared" ? "declared" : "indicative"}
      </td>
    </tr>
  );
}

function FragmentWithKey({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
