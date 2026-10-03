/**
 * BIM/IFC Import (Future Engine 15)
 *
 * Upload an architect's .ifc export and get a deterministic
 * material takeoff, parsed entirely in the browser — no upload
 * to any server, works offline. Quantities are reported only
 * when the file itself declares them; nothing is invented.
 */

import { useState } from "react";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import {
  parseIfcTakeoff,
  type IfcParseResult,
} from "@/lib/estimation/ifc-parser";
import AdSlot from "@/components/ui/AdSlot";

export default function BimIfcImport() {
  useSeo({
    title: "BIM/IFC Import — Instant Takeoff from Architect Files | FRELUX",
    description:
      "Upload an architect's .ifc (BIM) export and instantly get a material takeoff: walls, slabs, doors, windows and their declared quantities. Parsed entirely in your browser — nothing is uploaded, nothing is guessed.",
  });

  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<IfcParseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const onFile = async (file: File | null) => {
    setFileError(null);
    setResult(null);
    setFileName(null);
    if (!file) return;
    if (!/\.ifc$/i.test(file.name) && !/\\.ifczip$/i.test(file.name)) {
      setFileError(
        "Only .ifc files are supported. Compressed .ifczip exports must be extracted first — their contents are never guessed at.",
      );
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      const r = parseIfcTakeoff({
        file_text: text,
        file_name: file.name,
        rules: [],
      });
      setResult(r);
      setFileName(file.name);
      if (r.ok) track("bim_ifc_imported");
    } catch {
      setFileError(
        "The file could not be read. It may be corrupted — nothing is estimated on its behalf.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="BIM/IFC Import"
          subtitle="Upload an architect's .ifc (BIM) export and get an instant material takeoff — walls, slabs, roofs, doors, windows with the areas and volumes the file itself declares. Parsed entirely in your browser: the file never leaves your device, no AI is involved, and if the export contains no quantities you get honest element counts with a warning, never invented areas."
        />

        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          <label className="grid gap-2 text-sm font-medium">
            IFC file (.ifc)
            <input
              type="file"
              accept=".ifc"
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
                    ? "IFC standard SI units (m², m³, m, kg)"
                    : "counts only — nothing invented"}
                </p>
              </div>
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
                              no quantities declared — count only
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
      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
